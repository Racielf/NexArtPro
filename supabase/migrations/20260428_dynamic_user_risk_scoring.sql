-- Dynamic user risk scoring
-- Depends on dynamic RBAC, security audit logs, suspicious activity hardening, and attack auto blocking migrations.

create table if not exists security_risk_weights (
  id uuid primary key default gen_random_uuid(),
  action_pattern text not null unique,
  weight integer not null check (weight >= 0 and weight <= 100),
  severity_floor text not null default 'info' check (severity_floor in ('debug', 'info', 'warning', 'critical')),
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into security_risk_weights (action_pattern, weight, severity_floor, description)
values
  ('auth.%failed%', 12, 'warning', 'Failed authentication or credential-related event.'),
  ('recovery.%denied%', 18, 'warning', 'Denied privileged recovery access.'),
  ('security.suspicious_activity_detected', 35, 'critical', 'Detected suspicious activity event.'),
  ('security.block.created', 45, 'critical', 'A security block was created.'),
  ('team.user.role_changed', 22, 'warning', 'Sensitive user role change.'),
  ('team.user.auth_link_changed', 40, 'critical', 'User auth identity link changed.'),
  ('rbac.%', 25, 'warning', 'RBAC permission or role mutation.'),
  ('team.user.disabled', 15, 'warning', 'User was disabled.'),
  ('team.user.deleted', 45, 'critical', 'User profile was deleted.')
on conflict (action_pattern) do update set
  weight = excluded.weight,
  severity_floor = excluded.severity_floor,
  description = excluded.description,
  updated_at = now();

create table if not exists security_user_risk_scores (
  app_user_id uuid primary key references app_users(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  contributing_events integer not null default 0,
  last_event_at timestamptz,
  last_calculated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists security_user_risk_scores_level_idx on security_user_risk_scores(risk_level, risk_score desc);
create index if not exists security_user_risk_scores_calculated_idx on security_user_risk_scores(last_calculated_at desc);

alter table security_risk_weights enable row level security;
alter table security_user_risk_scores enable row level security;

drop policy if exists "security viewers read risk weights" on security_risk_weights;
create policy "security viewers read risk weights"
on security_risk_weights
for select
to authenticated
using (has_app_permission('security:view'));

drop policy if exists "security viewers manage risk weights" on security_risk_weights;
create policy "security viewers manage risk weights"
on security_risk_weights
for all
to authenticated
using (has_app_permission('security:view'))
with check (has_app_permission('security:view'));

drop policy if exists "security viewers read user risk scores" on security_user_risk_scores;
create policy "security viewers read user risk scores"
on security_user_risk_scores
for select
to authenticated
using (has_app_permission('security:view'));

create or replace function risk_level_for_score(p_score integer)
returns text
language sql
immutable
as $$
  select case
    when p_score >= 85 then 'critical'
    when p_score >= 65 then 'high'
    when p_score >= 35 then 'medium'
    else 'low'
  end
$$;

create or replace function calculate_user_risk_score(
  p_app_user_id uuid,
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
  v_last_event timestamptz;
  v_auth_user_id uuid;
  v_metadata jsonb;
begin
  if p_app_user_id is null then
    raise exception 'App user id is required';
  end if;

  select auth_user_id into v_auth_user_id
  from app_users
  where id = p_app_user_id;

  select
    least(100, coalesce(sum(w.weight), 0))::integer,
    count(l.id)::integer,
    max(l.created_at),
    jsonb_agg(
      jsonb_build_object(
        'action', l.action,
        'severity', l.severity,
        'created_at', l.created_at,
        'weight', w.weight
      ) order by l.created_at desc
    ) filter (where l.id is not null)
  into v_score, v_count, v_last_event, v_metadata
  from security_audit_logs l
  join security_risk_weights w
    on w.enabled = true
   and l.action like w.action_pattern
  where l.actor_user_id = p_app_user_id
    and l.created_at >= now() - make_interval(hours => p_window_hours);

  insert into security_user_risk_scores (
    app_user_id,
    auth_user_id,
    risk_score,
    risk_level,
    contributing_events,
    last_event_at,
    last_calculated_at,
    metadata
  ) values (
    p_app_user_id,
    v_auth_user_id,
    v_score,
    risk_level_for_score(v_score),
    v_count,
    v_last_event,
    now(),
    jsonb_build_object('window_hours', p_window_hours, 'events', coalesce(v_metadata, '[]'::jsonb))
  )
  on conflict (app_user_id) do update set
    auth_user_id = excluded.auth_user_id,
    risk_score = excluded.risk_score,
    risk_level = excluded.risk_level,
    contributing_events = excluded.contributing_events,
    last_event_at = excluded.last_event_at,
    last_calculated_at = excluded.last_calculated_at,
    metadata = excluded.metadata;

  return v_score;
end;
$$;

create or replace function recalculate_all_user_risk_scores(
  p_window_hours integer default 24
)
returns table (
  app_user_id uuid,
  risk_score integer,
  risk_level text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_score integer;
begin
  if not has_app_permission('security:view') then
    raise exception 'Unauthorized';
  end if;

  for v_user in select id from app_users where active = true loop
    v_score := calculate_user_risk_score(v_user.id, p_window_hours);

    app_user_id := v_user.id;
    risk_score := v_score;
    risk_level := risk_level_for_score(v_score);
    return next;
  end loop;
end;
$$;

create or replace function enforce_user_risk_blocks()
returns table (
  app_user_id uuid,
  auth_user_id uuid,
  risk_score integer,
  risk_level text,
  block_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_risk record;
  v_block_id uuid;
begin
  perform expire_security_blocks();

  for v_risk in
    select s.*, u.auth_user_id as current_auth_user_id
    from security_user_risk_scores s
    join app_users u on u.id = s.app_user_id
    where s.risk_level in ('high', 'critical')
      and u.auth_user_id is not null
      and not is_security_blocked('auth_user', u.auth_user_id::text)
  loop
    v_block_id := create_security_block(
      'auth_user',
      v_risk.current_auth_user_id::text,
      case when v_risk.risk_level = 'critical'
        then 'Critical dynamic risk score'
        else 'High dynamic risk score'
      end,
      case when v_risk.risk_level = 'critical' then 240 else 60 end,
      case when v_risk.risk_level = 'critical' then 'critical' else 'warning' end,
      jsonb_build_object(
        'risk_score', v_risk.risk_score,
        'risk_level', v_risk.risk_level,
        'contributing_events', v_risk.contributing_events
      )
    );

    app_user_id := v_risk.app_user_id;
    auth_user_id := v_risk.current_auth_user_id;
    risk_score := v_risk.risk_score;
    risk_level := v_risk.risk_level;
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
  v_recalc_count integer;
  v_block_count integer;
begin
  perform expire_security_blocks();
  perform detect_suspicious_security_activity();
  perform recalculate_all_user_risk_scores(p_window_hours);
  perform enforce_attack_auto_blocks();
  perform enforce_user_risk_blocks();

  select count(*) into v_recalc_count from security_user_risk_scores where last_calculated_at >= now() - interval '5 minutes';
  select count(*) into v_block_count from security_blocks where active = true and created_at >= now() - interval '5 minutes';

  return jsonb_build_object(
    'ok', true,
    'recalculated_recently', v_recalc_count,
    'new_or_recent_blocks', v_block_count,
    'window_hours', p_window_hours
  );
end;
$$;

create or replace view security_user_risk_overview as
select
  s.app_user_id,
  s.auth_user_id,
  u.username,
  u.display_name,
  coalesce(r.key, u.role) as role_key,
  s.risk_score,
  s.risk_level,
  s.contributing_events,
  s.last_event_at,
  s.last_calculated_at,
  exists (
    select 1
    from security_blocks b
    where b.block_type = 'auth_user'
      and b.block_value = s.auth_user_id::text
      and b.active = true
      and (b.expires_at is null or b.expires_at > now())
  ) as is_blocked,
  s.metadata
from security_user_risk_scores s
join app_users u on u.id = s.app_user_id
left join app_roles r on r.id = u.role_id;
