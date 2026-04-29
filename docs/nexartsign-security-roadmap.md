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
- Add direct calls to `record_nexartsign_token_attempt(...)` from Base44/Supabase functions.
- Add rate-limit enforcement before resolving signing links.
- Kill/revoke token after final signature or decline.

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

**Status:** Explicitly deferred / disabled.

Decision:

OTP is not part of the active NexArtSign flow until it can be implemented end-to-end.

Why:

- there is no production-ready OTP delivery path connected in the canonical backend
- the signing UI does not implement a complete OTP UX
- leaving partial OTP scaffolding in place creates false security expectations

Current behavior:

- NexArtSign signing does **not** require OTP in the active canonical flow
- incomplete OTP scaffolding has been removed from the active repo path
- OTP should only return when request, delivery, verify, enforcement, retry limits, and audit are all implemented together

Rule going forward:

- do not reintroduce OTP partially
- OTP comes back only as a full closed phase with backend, UX, delivery, and audit all verified together

---

## Post-Phase-3 audit findings

### Critical

1. Plain token lookup still exists in canonical functions.
   - Current pattern: `SigningPackage.filter({ token })`
   - Target pattern: hash token, then lookup by `token_hash`.

2. PDF finalization/certification still needs hardening.
   - Current certificate path can still depend on package/source hash fallbacks.
   - Target behavior: generate final locked PDF first, hash final PDF, then issue certificate.

3. Public PDF URLs may still expose documents.
   - Target behavior: signed/temporary URLs with expiration and access logs.

### Important

4. NexArtSign is not yet fully connected to the global risk engine.
   - Should use `is_origin_blocked(...)` before resolving/signing.
   - Should write to `security_audit_logs` for all signing security events.

5. Certificate verification endpoint exposes too much.
   - Public verification should reveal minimum data only.

---

## Next phase

### Phase 4 - Risk-based NexArtSign security

**Status:** Not implemented yet.

Goal:

Connect NexArtSign to the existing global security engine so signing flows react to user/IP/device risk.

Planned behavior:

- Low risk: normal flow.
- Medium risk: stronger logging and throttling.
- High risk: stricter attempt limits or stepped verification.
- Critical risk: block access.

Implementation checklist:

1. In `base44/functions/resolveSigningPackageToken/entry.ts`:
   - Read IP and fingerprint.
   - Check `is_origin_blocked(ip, fingerprint)`.
   - Log successful/failed token attempts.
   - Enforce token/IP rate limit.

2. In signing/security helpers:
   - log:
     - `nexartsign.access_requested`
     - `nexartsign.access_denied`
     - `nexartsign.origin_blocked`
     - `nexartsign.rate_limited`

3. In `base44/functions/completeSigningPackage/entry.ts`:
   - block or tighten behavior after repeated failures
   - integrate with global security audit

4. In `SignDocumentView.jsx`:
   - generate/send device fingerprint when phase 4 requires it
   - show clearer security/risk error states

---

## Later phases

### Phase 5 - Final PDF lock + certificate integrity

Goal:

Make certificate legally stronger by hashing the actual final signed PDF, not the source PDF.

Checklist:

- Generate final PDF first.
- Add signature/audit page.
- Hash final PDF.
- Store final PDF hash in package and certificate.
- Prevent certificate generation if final PDF hashing fails.

### Phase 6 - Public verification minimization

Goal:

Make `/verify-document` safe for public use.

Checklist:

- Do not expose full signer email publicly.
- Do not expose IP/user-agent publicly.
- Do not expose full audit trail publicly.
- Show only:
  - certificate number
  - document status
  - signed date
  - hash verification result
  - provider

### Phase 7 - Supabase/RLS migration for NexArtSign

Goal:

Move NexArtSign packages/events/certificates from Base44 entity calls to Supabase tables protected by RLS.

Checklist:

- Create Supabase tables for signing packages, participants, events, certificates.
- Apply RLS policies using `has_app_permission(...)`.
- Replace admin panel reads in `NexArtSign.jsx`.
- Replace public signing functions with Supabase Edge Functions.

---

## Recommended next command

When ready to continue, use:

```text
fase 4 implementa risk NexArtSign
```

Start with `base44/functions/resolveSigningPackageToken/entry.ts`, then `base44/functions/completeSigningPackage/entry.ts`, and finish with the signing UI only where needed.
