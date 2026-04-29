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
- `src/functions/resolveSigningPackageToken.js`
- `src/functions/completeSigningPackage.js`

---

### Phase 2 - OTP before signing

**Status:** Implemented.

Added:

- `base44/entities/SigningOtpChallenge.jsonc`
- `src/functions/requestSigningOtp.js`
- OTP validation in `src/functions/completeSigningPackage.js`

Current behavior:

- Signing and declining now require a 6-digit OTP.
- OTP is stored as a SHA-256 hash, not plain text.
- OTP expires.
- OTP has attempt limits.
- OTP status transitions:
  - `pending`
  - `verified`
  - `used`
  - `expired`
  - `failed`
- Signing events now include:
  - `otp_verified`
  - `otp_failed`
- Completed signature/decline stores `otp_challenge_id` in metadata.

Known limitations:

- `requestSigningOtp.js` currently logs OTP to server console for development.
- Email/SMS delivery provider is not connected yet.
- Frontend UI still needs full polished OTP UX.
- OTP is not yet risk-based.
- OTP is not yet bound to fingerprint/IP.

Important files:

- `src/functions/requestSigningOtp.js`
- `src/functions/completeSigningPackage.js`
- `src/pages/SignDocumentView.jsx`

---

## Post-Phase-2 audit findings

### Critical

1. Plain token lookup still exists in legacy functions.
   - Current pattern: `SigningPackage.filter({ token })`
   - Target pattern: hash token, then lookup by `token_hash`.

2. OTP delivery is not production-ready.
   - Current behavior: OTP is generated and logged in dev.
   - Target behavior: deliver via email/SMS provider and audit delivery status.

3. PDF finalization/certification still needs hardening.
   - Current certificate path can use `source_pdf_hash` as `final_pdf_hash`.
   - Target behavior: generate final locked PDF first, hash final PDF, then issue certificate.

4. Public PDF URLs may still expose documents.
   - Target behavior: signed/temporary URLs with expiration and access logs.

### Important

5. NexArtSign is not yet fully connected to the global risk engine.
   - Should use `is_origin_blocked(...)` before resolving/signing.
   - Should write to `security_audit_logs` for all signing security events.

6. OTP request rate limit is not fully enforced yet.
   - Add IP/token/fingerprint-based throttling.

7. Certificate verification endpoint exposes too much.
   - Public verification should reveal minimum data only.

---

## Next phase

### Phase 3 - Risk-based NexArtSign security

**Status:** Not implemented yet.

Goal:

Connect NexArtSign to the existing global security engine so signing flows react to user/IP/device risk.

Planned behavior:

- Low risk: normal flow.
- Medium risk: OTP required.
- High risk: OTP required + stricter attempt limits.
- Critical risk: block access.

Implementation checklist:

1. In `resolveSigningPackageToken.js`:
   - Read IP and fingerprint.
   - Check `is_origin_blocked(ip, fingerprint)`.
   - Log successful/failed token attempts.
   - Enforce token/IP rate limit.

2. In `requestSigningOtp.js`:
   - Check IP/fingerprint block status.
   - Limit OTP requests per token/IP/fingerprint.
   - Log:
     - `nexartsign.otp_requested`
     - `nexartsign.otp_rate_limited`
     - `nexartsign.otp_delivery_failed`

3. In `completeSigningPackage.js`:
   - Log OTP failures to global audit.
   - Block after repeated OTP failures.
   - Apply stricter behavior when origin risk is high.

4. In `SignDocumentView.jsx`:
   - Generate/send device fingerprint.
   - Show risk-based error messages.
   - Add OTP UX:
     - send code
     - resend cooldown
     - enter code
     - error states

5. Add security events to risk weights if missing:
   - `nexartsign.otp_requested`
   - `nexartsign.otp_failed`
   - `nexartsign.otp_verified`
   - `nexartsign.access_denied`
   - `nexartsign.origin_blocked`

---

## Later phases

### Phase 4 - Final PDF lock + certificate integrity

Goal:

Make certificate legally stronger by hashing the actual final signed PDF, not the source PDF.

Checklist:

- Generate final PDF first.
- Add signature/audit page.
- Hash final PDF.
- Store final PDF hash in package and certificate.
- Prevent certificate generation if final PDF hashing fails.

### Phase 5 - Public verification minimization

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

### Phase 6 - Supabase/RLS migration for NexArtSign

Goal:

Move NexArtSign packages/events/certificates from Base44 entity calls to Supabase tables protected by RLS.

Checklist:

- Create Supabase tables for signing packages, participants, events, certificates, OTP challenges.
- Apply RLS policies using `has_app_permission(...)`.
- Replace admin panel reads in `NexArtSign.jsx`.
- Replace public signing functions with Supabase Edge Functions.

---

## Recommended next command

When ready to continue, use:

```text
fase 3 implementa risk NexArtSign
```

Start with `resolveSigningPackageToken.js`, then `requestSigningOtp.js`, then `completeSigningPackage.js`, and finish with `SignDocumentView.jsx`.
