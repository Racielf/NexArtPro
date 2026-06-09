-- Automatic attack blocking controls
-- Depends on dynamic RBAC, security audit logs, and suspicious activity hardening migrations.

create table if not exists security_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null check (block_type in ('user', 'auth_user', 'ip', 'fingerprint')),
  block_value text not null,
  reason text not null,
  severity text not null default 'critical' check (severity in ('warning', 'critical')),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by_user_id uuid references app_users(id) on delete set null,
  lift_reason text,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists security_blocks_active_unique_idx
on security_blocks(block_type, block_value)
where active = true;

create index if not exists security_blocks_lookup_idx
on security_blocks(block_type, block_value, active, expires_at);

create index if not exists security_blocks_created_at_idx
on security_blocks(created_at desc);

alter table security_blocks enable row level security;

drop policy if exists "security viewers can read blocks" on security_blocks;
create policy "security viewers can read blocks"
on security_blocks
for select
to authenticated
using (has_app_permission('security:view'));

drop policy if exists "security viewers can manage blocks" on security_blocks;
create policy "security viewers can manage blocks"
on security_blocks
for all
to authenticated
using (has_app_permission('security:view'))
with check (has_app_permission('security:view'));

create or replace function is_security_blocked(
  p_block_type text,
  p_block_value text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from security_blocks
    where block_type = p_block_type
      and block_value = p_block_value
      and active = true
      and (expires_at is null or expires_at > now())
  )
$$;

create or replace function create_security_block(
  p_block_type text,
  p_block_value text,
  p_reason text,
  p_duration_minutes integer default 60,
  p_severity text default 'critical',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block_id uuid;
  v_expires_at timestamptz;
begin
  if p_block_type not in ('user', 'auth_user', 'ip', 'fingerprint') then
    raise exception 'Invalid block type';
  end if;

  if p_block_value is null or length(trim(p_block_value)) = 0 then
    raise exception 'Block value is required';
  end if;

  if p_duration_minutes is not null and p_duration_minutes > 0 then
    v_expires_at := now() + make_interval(mins => p_duration_minutes);
  else
    v_expires_at := null;
  end if;

  insert into security_blocks (
    block_type,
    block_value,
    reason,
    severity,
    expires_at,
    created_by_user_id,
    created_by_auth_user_id,
    metadata
  ) values (
    p_block_type,
    p_block_value,
    p_reason,
    p_severity,
    v_expires_at,
    current_app_user_id(),
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (block_type, block_value) where active = true
  do update set
    reason = excluded.reason,
    severity = excluded.severity,
    expires_at = excluded.expires_at,
    metadata = security_blocks.metadata || excluded.metadata
  returning id into v_block_id;

  perform write_security_audit_log(
    'security.block.created',
    'security_blocks',
    v_block_id::text,
    p_severity,
    jsonb_build_object(
      'block_type', p_block_type,
      'block_value', p_block_value,
      'reason', p_reason,
      'duration_minutes', p_duration_minutes
    ) || coalesce(p_metadata, '{}'::jsonb)
  );

  return v_block_id;
end;
$$;

create or replace function lift_security_block(
  p_block_id uuid,
  p_reason text default 'Manual unblock'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_app_permission('security:view') then
    raise exception 'Unauthorized';
  end if;

  update security_blocks
  set active = false,
      lifted_at = now(),
      lifted_by_user_id = current_app_user_id(),
      lift_reason = p_reason
  where id = p_block_id
    and active = true;

  if not found then
    return false;
  end if;

  perform write_security_audit_log(
    'security.block.lifted',
    'security_blocks',
    p_block_id::text,
    'warning',
    jsonb_build_object('reason', p_reason)
  );

  return true;
end;
$$;

create or replace function expire_security_blocks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update security_blocks
  set active = false,
      lifted_at = now(),
      lift_reason = 'Expired automatically'
  where active = true
    and expires_at is not null
    and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function enforce_attack_auto_blocks()
returns table (
  block_id uuid,
  block_type text,
  block_value text,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failed record;
  v_suspicious record;
  v_block_id uuid;
begin
  perform expire_security_blocks();

  -- Block auth users with repeated critical/warning security events in the last 15 minutes.
  for v_failed in
    select actor_auth_user_id::text as value, count(*) as event_count
    from security_audit_logs
    where actor_auth_user_id is not null
      and created_at >= now() - interval '15 minutes'
      and severity in ('warning', 'critical')
      and action <> 'security.block.created'
    group by actor_auth_user_id
    having count(*) >= 5
  loop
    v_block_id := create_security_block(
      'auth_user',
      v_failed.value,
      'Repeated high-risk security events',
      60,
      'critical',
      jsonb_build_object('event_count', v_failed.event_count, 'window_minutes', 15)
    );

    block_id := v_block_id;
    block_type := 'auth_user';
    block_value := v_failed.value;
    reason := 'Repeated high-risk security events';
    return next;
  end loop;

  -- Block actors that triggered suspicious activity detection more than once in 30 minutes.
  for v_suspicious in
    select actor_auth_user_id::text as value, count(*) as event_count
    from security_audit_logs
    where actor_auth_user_id is not null
      and created_at >= now() - interval '30 minutes'
      and action = 'security.suspicious_activity_detected'
    group by actor_auth_user_id
    having count(*) >= 2
  loop
    v_block_id := create_security_block(
      'auth_user',
      v_suspicious.value,
      'Repeated suspicious activity detections',
      120,
      'critical',
      jsonb_build_object('event_count', v_suspicious.event_count, 'window_minutes', 30)
    );

    block_id := v_block_id;
    block_type := 'auth_user';
    block_value := v_suspicious.value;
    reason := 'Repeated suspicious activity detections';
    return next;
  end loop;
end;
$$;

create or replace function current_session_is_blocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and is_security_blocked('auth_user', auth.uid()::text)
$$;

create or replace view security_active_blocks as
select
  b.*,
  u.username as created_by_username,
  u.display_name as created_by_display_name
from security_blocks b
left join app_users u on u.id = b.created_by_user_id
where b.active = true
  and (b.expires_at is null or b.expires_at > now());
