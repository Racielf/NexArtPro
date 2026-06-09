-- NexArtSign Phase 1 hardening
-- Adds token hardening metadata and audit/risk labels.
-- This migration is written defensively because existing Base44 entity storage may not be plain Postgres tables.
-- If SigningPackage is still Base44-only, use this as the target schema when migrating packages to Supabase.

create table if not exists nexartsign_token_attempts (
  id uuid primary key default gen_random_uuid(),
  token_hash text,
  package_id text,
  ip_address inet,
  fingerprint text,
  user_agent text,
  success boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists nexartsign_token_attempts_hash_created_idx
on nexartsign_token_attempts(token_hash, created_at desc)
where token_hash is not null;

create index if not exists nexartsign_token_attempts_ip_created_idx
on nexartsign_token_attempts(ip_address, created_at desc)
where ip_address is not null;

create index if not exists nexartsign_token_attempts_package_created_idx
on nexartsign_token_attempts(package_id, created_at desc)
where package_id is not null;

alter table nexartsign_token_attempts enable row level security;

drop policy if exists "security viewers read nexartsign token attempts" on nexartsign_token_attempts;
create policy "security viewers read nexartsign token attempts"
on nexartsign_token_attempts
for select
to authenticated
using (has_app_permission('security:view'));

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
    )
  );

  return v_id;
end;
$$;

create or replace function nexartsign_recent_failed_attempts(
  p_token_hash text default null,
  p_ip_address inet default null,
  p_window_minutes integer default 10
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from nexartsign_token_attempts
  where success = false
    and created_at >= now() - make_interval(mins => p_window_minutes)
    and (
      (p_token_hash is not null and token_hash = p_token_hash)
      or (p_ip_address is not null and ip_address = p_ip_address)
    )
$$;

insert into security_risk_weights (action_pattern, weight, severity_floor, description)
values
  ('nexartsign.token.invalid', 16, 'warning', 'Invalid or abused NexArtSign signing token.'),
  ('nexartsign.token.resolved', 2, 'info', 'Successful NexArtSign signing token resolution.'),
  ('nexartsign.signed', 8, 'info', 'NexArtSign document signed.'),
  ('nexartsign.declined', 10, 'warning', 'NexArtSign document declined.'),
  ('nexartsign.replay_blocked', 24, 'warning', 'Attempted reuse of closed NexArtSign package token.'),
  ('nexartsign.rate_limited', 28, 'critical', 'NexArtSign signing token rate limit triggered.')
on conflict (action_pattern) do update set
  weight = excluded.weight,
  severity_floor = excluded.severity_floor,
  description = excluded.description,
  updated_at = now();
