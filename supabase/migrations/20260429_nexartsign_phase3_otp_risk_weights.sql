-- NexArtSign Phase 3 OTP audit weights
-- Extends the security risk engine with OTP-related signing events.

insert into security_risk_weights (action_pattern, weight, severity_floor, description)
values
  ('nexartsign.otp_requested', 1, 'info', 'NexArtSign OTP requested for active signer.'),
  ('nexartsign.otp_verified', 2, 'info', 'NexArtSign OTP verified for active signer.'),
  ('nexartsign.otp_failed', 10, 'warning', 'NexArtSign OTP verification failed.'),
  ('nexartsign.otp_locked', 20, 'critical', 'NexArtSign OTP verification locked after repeated failures.')
on conflict (action_pattern) do update set
  weight = excluded.weight,
  severity_floor = excluded.severity_floor,
  description = excluded.description,
  updated_at = now();
