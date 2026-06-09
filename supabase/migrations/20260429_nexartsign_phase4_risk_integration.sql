-- NexArtSign Phase 4 risk integration
-- Extends the global security audit log with origin fields and wires NexArtSign actions into origin-aware scoring.

create or replace function write_security_audit_log(
  p_action text,
  p_resource_type text,
  p_resource_id text default null,
  p_severity text default 'info',
  p_metadata jsonb default '{}'::jsonb,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_fingerprint text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'Audit action is required';
  end if;

  if p_resource_type is null or length(trim(p_resource_type)) = 0 then
    raise exception 'Audit resource type is required';
  end if;

  if p_severity not in ('debug', 'info', 'warning', 'critical') then
    raise exception 'Invalid audit severity';
  end if;

  insert into security_audit_logs (
    actor_user_id,
    actor_auth_user_id,
    action,
    resource_type,
    resource_id,
    severity,
    metadata,
    ip_address,
    user_agent,
    fingerprint
  ) values (
    current_app_user_id(),
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_severity,
    coalesce(p_metadata, '{}'::jsonb),
    p_ip_address,
    coalesce(p_user_agent, ''),
    p_fingerprint
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

create or replace function record_nexartsign_token_attempt(
  p_token_hash text default null,
  p_package_id text default null,
  p_ip_address inet default null,
  p_fingerprint text default null,
  p_user_agent text default null,
  p_success boolean default false,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_action text;
  v_severity text;
begin
  insert into nexartsign_token_attempts (
    token_hash,
    package_id,
    ip_address,
    fingerprint,
    user_agent,
    success,
    reason
  ) values (
    p_token_hash,
    p_package_id,
    p_ip_address,
    p_fingerprint,
    p_user_agent,
    coalesce(p_success, false),
    p_reason
  ) returning id into v_id;

  v_action := case when p_success then 'nexartsign.token.resolved' else 'nexartsign.token.invalid' end;
  v_severity := case when p_success then 'info' else 'warning' end;

  perform write_security_audit_log(
    v_action,
    'nexartsign_signing_package',
    p_package_id,
    v_severity,
    jsonb_build_object(
      'token_hash_prefix', left(coalesce(p_token_hash, ''), 12),
      'ip_address', p_ip_address,
      'fingerprint', p_fingerprint,
      'success', p_success,
      'reason', p_reason,
      'attempt_id', v_id
    ),
    p_ip_address,
    p_user_agent,
    p_fingerprint
  );

  return v_id;
end;
$$;

insert into security_risk_weights (action_pattern, weight, severity_floor, description)
values
  ('nexartsign.access_requested', 1, 'info', 'NexArtSign secure signing session requested.'),
  ('nexartsign.access_denied', 8, 'warning', 'NexArtSign signing access denied.'),
  ('nexartsign.origin_blocked', 22, 'critical', 'Blocked NexArtSign origin attempted access.')
on conflict (action_pattern) do update set
  weight = excluded.weight,
  severity_floor = excluded.severity_floor,
  description = excluded.description,
  updated_at = now();
