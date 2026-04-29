# NexArtSign Security Roadmap

This file tracks the security hardening work for NexArtSign so the project can be resumed later without losing context.

## Current status

### Phase 1 - Token hardening + audit foundation

**Status:** Partially implemented / foundation added.

Added:

- `supabase/migrations/20260428_nexartsign_phase1_hardening.sql`
- `nexartsign_token_attempts`
- `record_nexartsign_token_attempt(...)`
- `nexartsign_recent_failed_attempts(...)`
- risk weights for NexArtSign events:
  - `nexartsign.token.invalid`
  - `nexartsign.token.resolved`
  - `nexartsign.signed`
  - `nexartsign.declined`
  - `nexartsign.replay_blocked`
  - `nexartsign.rate_limited`

Still pending in Phase 1:

- Replace plain token lookup with token hash lookup.
- Stop storing new tokens in plain text.
- Add fallback migration path for legacy tokens.
- Kill or revoke token after final signature or decline.

Important files:

- `src/lib/nexArtSign.js`
- `base44/functions/resolveSigningPackageToken/entry.ts`
- `base44/functions/completeSigningPackage/entry.ts`

---

### Phase 2 - Sequential multi-signer flow

**Status:** Implemented.

Added / verified:

- real participant creation during package issuance and package reuse
- participant synchronization from signing configuration
- first participant activation on package preparation
- participant-scoped token flow already enforced by canonical backend
- sequential completion already enforced by canonical backend
- signing events for:
  - `participants_created`
  - `participant_activated`

Current behavior:

- estimates can now issue real `SigningParticipant` records
- the first signer becomes `active`
- later signers remain `pending`
- only the active participant token can advance the signing flow
- package closes only after the final signer completes

Important files:

- `src/lib/nexArtSign.js`
- `base44/functions/resolveEstimatePublicToken/entry.ts`
- `base44/functions/resolveSigningPackageToken/entry.ts`
- `base44/functions/completeSigningPackage/entry.ts`

---

### Phase 3 - OTP before signing

**Status:** Implemented.

Added / verified:

- OTP is now enforced before `approve` on the active signing session
- public signing UI can request and verify a one-time code for the active signer
- OTP delivery runs through email to the active signer destination
- OTP state includes expiration, retry counter, and temporary lock after repeated failures
- OTP verification is bound to the active token hash prefix and device fingerprint used in the public session
- OTP audit events now include:
  - `otp_requested`
  - `otp_verified`
  - `otp_failed`
  - `otp_locked`
- global security audit now records:
  - `nexartsign.otp_requested`
  - `nexartsign.otp_verified`
  - `nexartsign.otp_failed`
  - `nexartsign.otp_locked`

Current behavior:

- the signer can still open and review the document before OTP
- signing approval is blocked until OTP verification succeeds
- expired or locked OTP states block signing until a new valid verification path exists
- decline can still close the package without OTP because it is not a signature approval event

Important files:

- `src/pages/SignDocumentView.jsx`
- `base44/functions/requestSigningOtp/entry.ts`
- `base44/functions/verifySigningOtp/entry.ts`
- `base44/functions/completeSigningPackage/entry.ts`
- `base44/functions/_shared/nexartsignOtp.ts`

---

### Phase 4 - Risk-based NexArtSign security

**Status:** Implemented.

Added / verified:

- Base44 signing functions now open a Supabase service-role client to reach the canonical security engine
- `resolveSigningPackageToken` now performs:
  - `nexartsign.access_requested` audit
  - origin block check through `is_origin_blocked(...)`
  - recent failure check through `nexartsign_recent_failed_attempts(...)`
  - automatic temporary block creation after rate-limit abuse
  - success and failure logging through `record_nexartsign_token_attempt(...)`
  - explicit `nexartsign.access_denied` audit for security denials
- `completeSigningPackage` now performs the same risk preflight before signature or decline
- replay attempts against already-closed packages now emit `nexartsign.replay_blocked`
- final sign and decline events now emit `nexartsign.signed` and `nexartsign.declined` into the global audit layer
- public signing UI now sends a deterministic device fingerprint and shows explicit states for:
  - `origin_blocked`
  - `rate_limited`
  - `participant_token_required`
  - `participant_not_active`
  - `package_closed`
  - `package_expired`
- Supabase migration added to let `write_security_audit_log(...)` persist:
  - `ip_address`
  - `user_agent`
  - `fingerprint`
- Phase 4 event weights were added for:
  - `nexartsign.access_requested`
  - `nexartsign.access_denied`
  - `nexartsign.origin_blocked`

Important files:

- `base44/functions/_shared/nexartsignSecurity.ts`
- `base44/functions/resolveSigningPackageToken/entry.ts`
- `base44/functions/completeSigningPackage/entry.ts`
- `src/pages/SignDocumentView.jsx`
- `src/lib/deviceFingerprint.js`
- `supabase/migrations/20260429_nexartsign_phase4_risk_integration.sql`

Residual note:

- Phase 4 is closed on the active signing path, but Phase 1 token hashing migration is still pending as a separate hardening step.

---

## Post-Phase-4 audit findings

### Remaining critical item outside the active phase line

1. Plain token lookup still exists in canonical functions.
   - Current pattern: `SigningPackage.filter({ token })`
   - Target pattern: hash token, then lookup by `token_hash`.

### Remaining important items outside the active phase line

2. PDF finalization/certification can be hardened further.
   - Current certificate path is functional and backend-driven.
   - Target behavior: make final PDF hash the only certificate source of truth in every branch.

3. Public PDF URLs can still be tightened later.
   - Target behavior: signed or temporary URLs with expiration and access logs.

4. Public verification endpoint still needs minimization.
   - Public verification should reveal minimum data only.

---

## Next phases

### Phase 5 - Final PDF lock + certificate integrity

Goal:

Make certificate legally stronger by hashing the actual final signed PDF, not the source PDF, in every document branch.

Checklist:

- Generate final PDF first.
- Add signature or audit page.
- Hash final PDF.
- Store final PDF hash in package and certificate.
- Prevent certificate generation if final PDF hashing fails.

### Phase 6 - Public verification minimization

Goal:

Make `/verify-document` safe for public use.

Checklist:

- Do not expose full signer email publicly.
- Do not expose IP or user-agent publicly.
- Do not expose full audit trail publicly.
- Show only:
  - certificate number
  - document status
  - signed date
  - hash verification result
  - provider

### Phase 7 - Supabase/RLS migration for NexArtSign

Goal:

Move NexArtSign packages, participants, events, and certificates from Base44 entity calls to Supabase tables protected by RLS.

Checklist:

- Create Supabase tables for signing packages, participants, events, certificates.
- Apply RLS policies using `has_app_permission(...)`.
- Replace admin panel reads in `NexArtSign.jsx`.
- Replace public signing functions with Supabase Edge Functions.
