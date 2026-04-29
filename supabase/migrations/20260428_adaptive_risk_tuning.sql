-- Adaptive risk tuning
-- Depends on dynamic user risk scoring and device/IP risk migrations.

create table if not exists security_adaptive_risk_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default true,
  min_weight integer not null default 5 check (min_weight >= 0 and min_weight <= 100),
  max_weight integer not null default 80 check (max_weight >= 0 and max_weight <= 100),
  learning_window_hours integer not null default 72 check (learning_window_hours > 0),
  high_risk_rate_target numeric not null default 0.10 check (high_risk_rate_target > 0 and high_risk_rate_target < 1),
  adjustment_step integer not null default 3 check (adjustment_step > 0 and adjustment_step <= 20),
  cooldown_minutes integer not null default 60 check (cooldown_minutes > 0),
  last_tuned_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into security_adaptive_risk_config (key, enabled, min_weight, max_weight, learning_window_hours, high_risk_rate_target, adjustment_step, cooldown_minutes)
values ('default', true, 5, 80, 72, 0.10, 3, 60)
on conflict (key) do nothing;

create table if not exists security_adaptive_tuning_runs (
  id uuid primary key default gen_random_uuid(),
  config_key text not null default 'default',
  window_start timestamptz not null,
  window_end timestamptz not null default now(),
  total_events integer not null default 0,
  total_users_scored integer not null default 0,
  high_or_critical_users integer not null default 0,
  high_risk_rate numeric not null default 0,
  adjustments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table security_adaptive_risk_config enable row level security;
alter table security_adaptive_tuning_runs enable row level security;

drop policy if exists "security viewers read adaptive config" on security_adaptive_risk_config;
create policy "security viewers read adaptive config"
on security_adaptive_risk_config
for select
to authenticated
using (has_app_permission('security:view'));

drop policy if exists "security viewers manage adaptive config" on security_adaptive_risk_config;
create policy "security viewers manage adaptive config"
on security_adaptive_risk_config
for all
to authenticated
using (has_app_permission('security:view'))
with check (has_app_permission('security:view'));

drop policy if exists "security viewers read adaptive tuning runs" on security_adaptive_tuning_runs;
create policy "security viewers read adaptive tuning runs"
on security_adaptive_tuning_runs
for select
to authenticated
using (has_app_permission('security:view'));

create or replace function tune_adaptive_risk_weights(
  p_config_key text default 'default'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config record;
  v_window_start timestamptz;
  v_total_events integer := 0;
  v_total_users integer := 0;
  v_high_users integer := 0;
  v_high_rate numeric := 0;
  v_adjustments jsonb := '[]'::jsonb;
  v_weight record;
  v_action_events integer;
  v_action_critical integer;
  v_new_weight integer;
  v_direction text;
begin
  select * into v_config
  from security_adaptive_risk_config
  where key = p_config_key;

  if not found or not v_config.enabled then
    return jsonb_build_object('ok', false, 'reason', 'adaptive tuning disabled or missing config');
  end if;

  if v_config.last_tuned_at is not null
     and v_config.last_tuned_at > now() - make_interval(mins => v_config.cooldown_minutes) then
    return jsonb_build_object('ok', false, 'reason', 'cooldown active', 'last_tuned_at', v_config.last_tuned_at);
  end if;

  v_window_start := now() - make_interval(hours => v_config.learning_window_hours);

  select count(*) into v_total_events
  from security_audit_logs
  where created_at >= v_window_start;

  select count(*), count(*) filter (where risk_level in ('high', 'critical'))
  into v_total_users, v_high_users
  from security_user_risk_scores
  where last_calculated_at >= v_window_start;

  if v_total_users > 0 then
    v_high_rate := v_high_users::numeric / v_total_users::numeric;
  end if;

  for v_weight in
    select * from security_risk_weights where enabled = true
  loop
    select
      count(*),
      count(*) filter (where severity = 'critical')
    into v_action_events, v_action_critical
    from security_audit_logs
    where created_at >= v_window_start
      and action like v_weight.action_pattern;

    v_new_weight := v_weight.weight;
    v_direction := 'none';

    -- If too many users are high risk, reduce noisy non-critical signals.
    if v_high_rate > (v_config.high_risk_rate_target * 1.5)
       and v_action_critical = 0
       and v_action_events > 10 then
      v_new_weight := greatest(v_config.min_weight, v_weight.weight - v_config.adjustment_step);
      v_direction := 'down';
    end if;

    -- If critical events are happening but high-risk rate is below target, strengthen the signal.
    if v_action_critical > 0
       and v_high_rate < v_config.high_risk_rate_target then
      v_new_weight := least(v_config.max_weight, v_weight.weight + v_config.adjustment_step);
      v_direction := 'up';
    end if;

    if v_new_weight <> v_weight.weight then
      update security_risk_weights
      set weight = v_new_weight,
          updated_at = now()
      where id = v_weight.id;

      v_adjustments := v_adjustments || jsonb_build_array(
        jsonb_build_object(
          'action_pattern', v_weight.action_pattern,
          'previous_weight', v_weight.weight,
          'new_weight', v_new_weight,
          'direction', v_direction,
          'action_events', v_action_events,
          'critical_events', v_action_critical
        )
      );
    end if;
  end loop;

  insert into security_adaptive_tuning_runs (
    config_key,
    window_start,
    window_end,
    total_events,
    total_users_scored,
    high_or_critical_users,
    high_risk_rate,
    adjustments
  ) values (
    p_config_key,
    v_window_start,
    now(),
    v_total_events,
    v_total_users,
    v_high_users,
    v_high_rate,
    v_adjustments
  );

  update security_adaptive_risk_config
  set last_tuned_at = now(),
      updated_at = now(),
      metadata = metadata || jsonb_build_object(
        'last_high_risk_rate', v_high_rate,
        'last_total_events', v_total_events,
        'last_adjustments_count', jsonb_array_length(v_adjustments)
      )
  where key = p_config_key;

  perform write_security_audit_log(
    'security.risk_weights_tuned',
    'security_risk_weights',
    p_config_key,
    case when jsonb_array_length(v_adjustments) > 0 then 'warning' else 'info' end,
    jsonb_build_object(
      'high_risk_rate', v_high_rate,
      'target', v_config.high_risk_rate_target,
      'adjustments', v_adjustments
    )
  );

  return jsonb_build_object(
    'ok', true,
    'window_start', v_window_start,
    'total_events', v_total_events,
    'total_users_scored', v_total_users,
    'high_or_critical_users', v_high_users,
    'high_risk_rate', v_high_rate,
    'adjustments', v_adjustments
  );
end;
$$;

create or replace function run_security_risk_cycle(
  p_window_hours integer default 24,
  p_enable_adaptive_tuning boolean default true
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
  v_tuning jsonb := null;
begin
  perform expire_security_blocks();
  perform detect_suspicious_security_activity();
  perform recalculate_all_user_risk_scores(p_window_hours);
  perform recalculate_origin_risk_scores(p_window_hours);
  perform enforce_attack_auto_blocks();
  perform enforce_user_risk_blocks();
  perform enforce_origin_risk_blocks();

  if p_enable_adaptive_tuning then
    v_tuning := tune_adaptive_risk_weights('default');
    perform recalculate_all_user_risk_scores(p_window_hours);
    perform recalculate_origin_risk_scores(p_window_hours);
    perform enforce_user_risk_blocks();
    perform enforce_origin_risk_blocks();
  end if;

  select count(*) into v_recalc_users from security_user_risk_scores where last_calculated_at >= now() - interval '5 minutes';
  select count(*) into v_recalc_origins from security_origin_risk_scores where last_calculated_at >= now() - interval '5 minutes';
  select count(*) into v_block_count from security_blocks where active = true and created_at >= now() - interval '5 minutes';

  return jsonb_build_object(
    'ok', true,
    'recalculated_users_recently', v_recalc_users,
    'recalculated_origins_recently', v_recalc_origins,
    'new_or_recent_blocks', v_block_count,
    'adaptive_tuning', v_tuning,
    'window_hours', p_window_hours
  );
end;
$$;

create or replace view security_adaptive_risk_overview as
select
  c.key,
  c.enabled,
  c.min_weight,
  c.max_weight,
  c.learning_window_hours,
  c.high_risk_rate_target,
  c.adjustment_step,
  c.cooldown_minutes,
  c.last_tuned_at,
  c.metadata,
  (
    select jsonb_agg(jsonb_build_object(
      'action_pattern', w.action_pattern,
      'weight', w.weight,
      'severity_floor', w.severity_floor,
      'description', w.description,
      'enabled', w.enabled
    ) order by w.weight desc)
    from security_risk_weights w
  ) as current_weights,
  (
    select jsonb_agg(jsonb_build_object(
      'created_at', r.created_at,
      'high_risk_rate', r.high_risk_rate,
      'adjustments', r.adjustments
    ) order by r.created_at desc)
    from (
      select *
      from security_adaptive_tuning_runs tr
      where tr.config_key = c.key
      order by tr.created_at desc
      limit 10
    ) r
  ) as recent_runs
from security_adaptive_risk_config c;
