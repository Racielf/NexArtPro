# NexArtSign Security Roadmap

This file tracks the security hardening work for NexArtSign so the project can be resumed later without losing context.

## What NexArtSign is

An e-signature module built into NexArtPro (like DocuSign) — not a separate product. A document
(typically a signed `Estimate`) gets turned into a `SigningPackage`, which has one or more
`SigningParticipant`s who sign it in sequence via a public link (`/sign/:token`, no login required
for the signer). Once everyone signs, the backend (`completeSigningPackage` Edge Function) freezes
a final signed PDF, generates a `SigningCertificate`, and — if the source document was an
`Estimate` — can convert it into a `WorkOrder`. Admin-side management lives at `/nexartsign`.

**Architecture note (2026-07-29):** the owner tried developing NexArtSign as a project separate
from NexArtPro; it didn't work well. Decision: keep it inside NexArtPro (see `CLAUDE.md` section
12.5), and — unlike the general rule of only extending what exists — **architecture changes to
NexArtSign itself are explicitly allowed** when this roadmap is next picked up, not just
security-hardening within the current design. The current implementation has known gaps (see
"Still pending" below and `docs/agent/OPEN_GAPS.md` items 1-3) that may call for changing how it
works, not just patching it.

**Product/UX vision (2026-07-29):** this file only tracks security hardening. The intended client
flow, product principles, and feature backlog carried over from that standalone attempt are in
`docs/nexartsign-product-context.md` — read that too before redesigning anything here.

## Current status

### Phase 1 - Token hardening + audit foundation

**Status:** Implemented, verified directly against code on 2026-07-27. This entry previously said "Partially implemented" — that was stale; the pending items below were already done in a prior, undocumented session (see the `(del _fixed)` comment left in `completeSigningPackage/entry.ts` line ~181).

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

Verified done (2026-07-27):

- **Replace plain token lookup with token hash lookup.** Confirmed: zero `.filter({ token: ... })` lookups remain in `base44/functions/`; both canonical files look up exclusively by `token_hash` (`resolveSigningPackageToken/entry.ts` lines 34, 44; `completeSigningPackage/entry.ts` lines 188, 200).
- **Stop storing new tokens in plain text.** Confirmed: `base44/functions/_shared/nexartsignSecurity.ts` `buildIssuedTokenFields()` (line 35-42) returns `token: ''` and persists only `token_hash: await sha256Hex(rawToken)` plus `token_last_four` for support display.
- **Kill or revoke token after final signature or decline.** Confirmed: `completeSigningPackage/entry.ts` clears `token`, `token_hash`, `token_last_four` and sets `token_revoked_at` at multiple completion/decline paths (lines ~235-249, ~662-672, ~869-882).

Not verified either way (2026-07-27):

- **Fallback migration path for legacy tokens.** Did not find or rule out specific handling for pre-hardening records that might still carry a plain-text `token` value from before this hardening shipped. Needs a dedicated check (e.g. query for any `SigningPackage`/`SigningParticipant` rows with non-empty `token` and empty/mismatched `token_hash`) before this line item can be marked resolved. Treat as open until checked.

Important files:

- `base44/functions/resolveSigningPackageToken/entry.ts`
- `base44/functions/completeSigningPackage/entry.ts`
- `base44/functions/_shared/nexartsignSecurity.ts`

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

### Resolved since this audit (verified 2026-07-27, see Phase 1 above)

1. ~~Plain token lookup still exists in canonical functions.~~ RESOLVED. All lookups use `token_hash`; no plaintext `token` field is stored on issuance or ever used as a lookup key.

### Remaining important items outside the active phase line

2. Public PDF URLs can still be tightened later.
   - Target behavior: signed or temporary URLs with expiration and access logs.

3. Public verification endpoint still needs minimization.
   - Public verification should reveal minimum data only.
   - This is Phase 6 below — next recommended phase as of 2026-07-27.

---

## Next phases

### Phase 5 - Final PDF lock + certificate integrity

**Status:** Implemented in the active canonical backend path.

Goal:

Make certificate legally stronger by hashing the actual final signed PDF, not the source PDF, in every document branch.

Verified behavior:

- `completeSigningPackage` freezes a final PDF copy before package close.
- backend close now fails if the final PDF cannot be fetched, hashed, or uploaded.
- certificate generation is blocked unless `final_pdf_url` and `final_pdf_hash` exist.
- estimate legal finalization now reuses only frozen final PDF evidence and no longer falls back to source-PDF evidence.
- package audit summary and certificate records now persist the frozen final PDF hash as the integrity reference.

Important files:

- `base44/functions/completeSigningPackage/entry.ts`

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