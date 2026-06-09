-- Device and IP risk scoring
-- Depends on security audit logs, attack auto blocking, and dynamic user risk scoring migrations.

alter table security_audit_logs
  add column if not exists fingerprint text;

create index if not exists security_audit_logs_ip_created_idx on security_audit_logs(ip_address, created_at desc) where ip_address is not null;
create index if not exists security_audit_logs_fingerprint_created_idx on security_audit_logs(fingerprint, created_at desc) where fingerprint is not null;

create table if not exists security_device_registry (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid references app_users(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  fingerprint text not null,
  first_ip inet,
  last_ip inet,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  trusted boolean not null default false,
  blocked boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  unique (auth_user_id, fingerprint)
);

create index if not exists security_device_registry_user_idx on security_device_registry(app_user_id, last_seen_at desc);
create index if not exists security_device_registry_fingerprint_idx on security_device_registry(fingerprint);
create index if not exists security_device_registry_blocked_idx on security_device_registry(blocked) where blocked = true;

create table if not exists security_origin_risk_scores (
  id uuid primary key default gen_random_uuid(),
  origin_type text not null check (origin_type in ('ip', 'fingerprint')),
  origin_value text not null,
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  contributing_events integer not null default 0,
  distinct_users integer not null default 0,
  last_event_at timestamptz,
  last_calculated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (origin_type, origin_value)
);

create index if not exists security_origin_risk_scores_level_idx on security_origin_risk_scores(origin_type, risk_level, risk_score desc);
create index if not exists security_origin_risk_scores_calculated_idx on security_origin_risk_scores(last_calculated_at desc);

alter table security_device_registry enable row level security;
alter table security_origin_risk_scores enable row level security;

drop policy if exists "security viewers read devices" on security_device_registry;
create policy "security viewers read devices"
on security_device_registry
for select
to authenticated
using (has_app_permission('security:view'));

drop policy if exists "users read own devices" on security_device_registry;
create policy "users read own devices"
on security_device_registry
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "security viewers manage devices" on security_device_registry;
create policy "security viewers manage devices"
on security_device_registry
for all
to authenticated
using (has_app_permission('security:view'))
with check (has_app_permission('security:view'));

drop policy if exists "security viewers read origin risk" on security_origin_risk_scores;
create policy "security viewers read origin risk"
on security_origin_risk_scores
for select
to authenticated
using (has_app_permission('security:view'));

create or replace function register_security_device(
  p_fingerprint text,
  p_ip_address inet default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device_id uuid;
  v_app_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_fingerprint is null or length(trim(p_fingerprint)) < 12 then
    raise exception 'Valid device fingerprint is required';
  end if;

  v_app_user_id := current_app_user_id();

  insert into security_device_registry (
    app_user_id,
    auth_user_id,
    fingerprint,
    first_ip,
    last_ip,
    metadata
  ) values (
    v_app_user_id,
    auth.uid(),
    p_fingerprint,
    p_ip_address,
    p_ip_address,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (auth_user_id, fingerprint)
  do update set
    app_user_id = excluded.app_user_id,
    last_ip = excluded.last_ip,
    last_seen_at = now(),
    metadata = security_device_registry.metadata || excluded.metadata
  returning id into v_device_id;

  perform write_security_audit_log(
    'security.device.seen',
    'security_device_registry',
    v_device_id::text,
    'info',
    jsonb_build_object('fingerprint', p_fingerprint, 'ip_address', p_ip_address)
  );

  return v_device_id;
end;
$$;

create or replace function is_origin_blocked(
  p_ip_address inet default null,
  p_fingerprint text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (p_ip_address is not null and is_security_blocked('ip', p_ip_address::text))
    or
    (p_fingerprint is not null and is_security_blocked('fingerprint', p_fingerprint)),
    false
  )
$$;

create or replace function calculate_origin_risk_score(
  p_origin_type text,
  p_origin_value text,
  p_window_hours integer default 24
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer := 0;
  v_count integer := 0;
  v_distinct_users integer := 0;
  v_last_event timestamptz;
  v_metadata jsonb;
begin
  if p_origin_type not in ('ip', 'fingerprint') then
    raise exception 'Invalid origin type';
  end if;

  if p_origin_value is null or length(trim(p_origin_value)) = 0 then
    raise exception 'Origin value is required';
  end if;

  if p_origin_type = 'ip' then
    select
      least(100, coalesce(sum(w.weight), 0) + greatest(count(distinct l.actor_auth_user_id) - 1, 0) * 15)::integer,
      count(l.id)::integer,
      count(distinct l.actor_auth_user_id)::integer,
      max(l.created_at),
      jsonb_agg(jsonb_build_object('action', l.action, 'severity', l.severity, 'created_at', l.created_at, 'weight', w.weight) order by l.created_at desc) filter (where l.id is not null)
    into v_score, v_count, v_distinct_users, v_last_event, v_metadata
    from security_audit_logs l
    join security_risk_weights w on w.enabled = true and l.action like w.action_pattern
    where l.ip_address = p_origin_value::inet
      and l.created_at >= now() - make_interval(hours => p_window_hours);
  else
    select
      least(100, coalesce(sum(w.weight), 0) + greatest(count(distinct l.actor_auth_user_id) - 1, 0) * 20)::integer,
      count(l.id)::integer,
      count(distinct l.actor_auth_user_id)::integer,
      max(l.created_at),
      jsonb_agg(jsonb_build_object('action', l.action, 'severity', l.severity, 'created_at', l.created_at, 'weight', w.weight) order by l.created_at desc) filter (where l.id is not null)
    into v_score, v_count, v_distinct_users, v_last_event, v_metadata
    from security_audit_logs l
    join security_risk_weights w on w.enabled = true and l.action like w.action_pattern
    where l.fingerprint = p_origin_value
      and l.created_at >= now() - make_interval(hours => p_window_hours);
  end if;

  insert into security_origin_risk_scores (
    origin_type,
    origin_value,
    risk_score,
    risk_level,
    contributing_events,
    distinct_users,
    last_event_at,
    last_calculated_at,
    metadata
  ) values (
    p_origin_type,
    p_origin_value,
    v_score,
    risk_level_for_score(v_score),
    v_count,
    v_distinct_users,
    v_last_event,
    now(),
    jsonb_build_object('window_hours', p_window_hours, 'events', coalesce(v_metadata, '[]'::jsonb))
  )
  on conflict (origin_type, origin_value) do update set
    risk_score = excluded.risk_score,
    risk_level = excluded.risk_level,
    contributing_events = excluded.contributing_events,
    distinct_users = excluded.distinct_users,
    last_event_at = excluded.last_event_at,
    last_calculated_at = excluded.last_calculated_at,
    metadata = excluded.metadata;

  return v_score;
end;
$$;

create or replace function recalculate_origin_risk_scores(
  p_window_hours integer default 24
)
returns table (
  origin_type text,
  origin_value text,
  risk_score integer,
  risk_level text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origin record;
  v_score integer;
begin
  if not has_app_permission('security:view') then
    raise exception 'Unauthorized';
  end if;

  for v_origin in
    select 'ip'::text as type, ip_address::text as value
    from security_audit_logs
    where ip_address is not null
      and created_at >= now() - make_interval(hours => p_window_hours)
    group by ip_address
    union
    select 'fingerprint'::text as type, fingerprint as value
    from security_audit_logs
    where fingerprint is not null
      and created_at >= now() - make_interval(hours => p_window_hours)
    group by fingerprint
  loop
    v_score := calculate_origin_risk_score(v_origin.type, v_origin.value, p_window_hours);
    origin_type := v_origin.type;
    origin_value := v_origin.value;
    risk_score := v_score;
    risk_level := risk_level_for_score(v_score);
    return next;
  end loop;
end;
$$;

create or replace function enforce_origin_risk_blocks()
returns table (
  origin_type text,
  origin_value text,
  risk_score integer,
  risk_level text,
  block_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origin record;
  v_block_id uuid;
begin
  perform expire_security_blocks();

  for v_origin in
    select *
    from security_origin_risk_scores
    where risk_level in ('high', 'critical')
      and not is_security_blocked(origin_type, origin_value)
  loop
    v_block_id := create_security_block(
      v_origin.origin_type,
      v_origin.origin_value,
      case when v_origin.risk_level = 'critical'
        then 'Critical origin risk score'
        else 'High origin risk score'
      end,
      case when v_origin.risk_level = 'critical' then 240 else 60 end,
      case when v_origin.risk_level = 'critical' then 'critical' else 'warning' end,
      jsonb_build_object(
        'risk_score', v_origin.risk_score,
        'risk_level', v_origin.risk_level,
        'contributing_events', v_origin.contributing_events,
        'distinct_users', v_origin.distinct_users
      )
    );

    origin_type := v_origin.origin_type;
    origin_value := v_origin.origin_value;
    risk_score := v_origin.risk_score;
    risk_level := v_origin.risk_level;
    block_id := v_block_id;
    return next;
  end loop;
end;
$$;

create or replace function run_security_risk_cycle(
  p_window_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recalc_users integer;
  v_recalc_origins integer;
  v_block_count integer;
begin
  perform expire_security_blocks();
  perform detect_suspicious_security_activity();
  perform recalculate_all_user_risk_scores(p_window_hours);
  perform recalculate_origin_risk_scores(p_window_hours);
  perform enforce_attack_auto_blocks();
  perform enforce_user_risk_blocks();
  perform enforce_origin_risk_blocks();

  select count(*) into v_recalc_users from security_user_risk_scores where last_calculated_at >= now() - interval '5 minutes';
  select count(*) into v_recalc_origins from security_origin_risk_scores where last_calculated_at >= now() - interval '5 minutes';
  select count(*) into v_block_count from security_blocks where active = true and created_at >= now() - interval '5 minutes';

  return jsonb_build_object(
    'ok', true,
    'recalculated_users_recently', v_recalc_users,
    'recalculated_origins_recently', v_recalc_origins,
    'new_or_recent_blocks', v_block_count,
    'window_hours', p_window_hours
  );
end;
$$;

create or replace view security_origin_risk_overview as
select
  s.origin_type,
  s.origin_value,
  s.risk_score,
  s.risk_level,
  s.contributing_events,
  s.distinct_users,
  s.last_event_at,
  s.last_calculated_at,
  exists (
    select 1
    from security_blocks b
    where b.block_type = s.origin_type
      and b.block_value = s.origin_value
      and b.active = true
      and (b.expires_at is null or b.expires_at > now())
  ) as is_blocked,
  s.metadata
from security_origin_risk_scores s;
