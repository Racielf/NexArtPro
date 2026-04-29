-- Suspicious activity hardening
-- Depends on security_audit_logs and dynamic RBAC migrations.

create table if not exists security_detection_rules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  action_pattern text not null,
  window_minutes integer not null default 60 check (window_minutes > 0),
  threshold integer not null default 5 check (threshold > 0),
  severity text not null default 'warning' check (severity in ('debug', 'info', 'warning', 'critical')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into security_detection_rules (key, label, description, action_pattern, window_minutes, threshold, severity)
values
  ('failed_auth_burst', 'Failed auth burst', 'Multiple failed authentication events in a short window.', 'auth.%failed%', 15, 5, 'critical'),
  ('recovery_denied_burst', 'Recovery denied burst', 'Multiple denied recovery access events.', 'recovery.%denied%', 60, 3, 'critical'),
  ('privileged_change_burst', 'Privileged change burst', 'Multiple sensitive team or RBAC changes in a short period.', 'team.%', 30, 6, 'warning'),
  ('rbac_change_burst', 'RBAC permission change burst', 'Multiple role permission changes in a short period.', 'rbac.%', 30, 4, 'critical')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  action_pattern = excluded.action_pattern,
  window_minutes = excluded.window_minutes,
  threshold = excluded.threshold,
  severity = excluded.severity,
  updated_at = now();

alter table security_detection_rules enable row level security;

drop policy if exists "security viewers can read detection rules" on security_detection_rules;
create policy "security viewers can read detection rules"
on security_detection_rules
for select
to authenticated
using (has_app_permission('security:view'));

drop policy if exists "security managers can manage detection rules" on security_detection_rules;
create policy "security managers can manage detection rules"
on security_detection_rules
for all
to authenticated
using (has_app_permission('security:view'))
with check (has_app_permission('security:view'));

create or replace function detect_suspicious_security_activity()
returns table (
  rule_key text,
  severity text,
  event_count bigint,
  window_start timestamptz,
  last_event_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule record;
  v_count bigint;
  v_last_event timestamptz;
  v_window_start timestamptz;
begin
  if not has_app_permission('security:view') then
    raise exception 'Unauthorized';
  end if;

  for v_rule in select * from security_detection_rules where enabled = true loop
    v_window_start := now() - make_interval(mins => v_rule.window_minutes);

    select count(*), max(created_at)
      into v_count, v_last_event
    from security_audit_logs
    where created_at >= v_window_start
      and action like v_rule.action_pattern
      and action <> 'security.suspicious_activity_detected';

    if v_count >= v_rule.threshold then
      perform write_security_audit_log(
        'security.suspicious_activity_detected',
        'security_detection_rules',
        v_rule.key,
        v_rule.severity,
        jsonb_build_object(
          'rule_key', v_rule.key,
          'label', v_rule.label,
          'event_count', v_count,
          'threshold', v_rule.threshold,
          'window_minutes', v_rule.window_minutes,
          'last_event_at', v_last_event
        )
      );

      rule_key := v_rule.key;
      severity := v_rule.severity;
      event_count := v_count;
      window_start := v_window_start;
      last_event_at := v_last_event;
      return next;
    end if;
  end loop;
end;
$$;

create or replace view security_recent_alerts as
select
  l.id,
  l.action,
  l.resource_type,
  l.resource_id,
  l.severity,
  l.metadata,
  l.created_at,
  u.username as actor_username,
  u.display_name as actor_display_name
from security_audit_logs l
left join app_users u on u.id = l.actor_user_id
where l.severity in ('warning', 'critical')
   or l.action = 'security.suspicious_activity_detected';
