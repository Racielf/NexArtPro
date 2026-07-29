# NexArtSign — Product Context

Distilled from the standalone `nexartsign-pro-app` project (`D:\My Bussines\Strategy\NexArtSign\nexartsign-pro-app`),
which the owner tried building as an independent product before deciding to keep development
inside NexArtPro (see `CLAUDE.md` section 12.5). This captures the product/UX intent that isn't in
`docs/nexartsign-security-roadmap.md` (that file is security-hardening only).

## Product intent

NexArtSign is a signing engine that should not interrupt the estimate/calculation pipeline. The
main system prepares the estimate and generates the document; the client only enters NexArtSign
once the document is ready for review and signature.

## Intended client flow

1. Client receives a professional signing notification email.
2. The email must **not** show the document total — it should not turn into a price-first
   decision. It drives one action: open the secure signing room.
3. The signing room makes the client read/review the document first.
4. Signer verifies identity with OTP.
5. Signer enters their signing name and accepts electronic signature consent.
6. NexArtSign records the signature event, locks the final PDF as evidence, creates a
   certificate, and stores the package.
7. The signed copy goes back to the client and to the company archive email.

## Product principles

- Keep the document at the center of the experience — minimize app transitions between estimate
  send, document review, and signature.
- Never expose totals in signing-request emails.
- Support company branding (logo on the signing screen).
- Every security-relevant action leaves audit evidence.
- Signed copies must be traceable by certificate number and PDF hash.
- Reference UX patterns worth mirroring: DocuSign (email → signing session), Adobe Acrobat Sign
  (signing page with logo, agreement title, required fields, history), Dropbox Sign (required
  fields, completion state, auto-send completed PDF).

## Confirmed: NexArtPro already has the intended architecture

The standalone project's Edge Functions (`resolveSigningPackageToken`, `requestSigningOtp`,
`verifySigningOtp`, `completeSigningPackage`, `sendSignedCopy`, `resolveSigningCertificate`,
`issueSigningAccessLink`) are the **same ones already in `supabase/functions/`** inside NexArtPro.
This isn't a from-scratch port — the standalone attempt and the embedded version share lineage.
The public routes match too (`/sign-document`, `/verify-document`). The standalone project used
`/admin`, `/admin/packages`, `/admin/templates`, `/admin/settings` for the admin side; NexArtPro
uses a single `/nexartsign` page instead — a naming difference, not a missing feature, not urgent
to reconcile.

## Backlog carried over (not yet started, no priority order assigned)

1. Apply the brand-settings / package-delivery-policy migrations from the standalone attempt (not
   yet checked whether NexArtPro's schema already covers this).
2. Signing-request emails must omit totals and contain only a secure review/sign CTA — verify
   current NexArtPro email templates against this.
3. Visual template editor for placing signature fields on a document.
4. A reliable post-sign delivery job (signed copy to client + company archive) — verify
   `sendSignedCopy` already does this reliably.
5. A richer audit/certificate screen in the admin UI.

## Also worth knowing

The standalone project's `README.md` describes a longer-term vision: NexArtSign as an independent
e-signature platform with a REST API (`POST /api/v1/packages`) and webhooks, so any external
system (not just NexArtPro) could create signing packages and get notified on sign/decline. This
is the "connect to other projects later" possibility already noted in `CLAUDE.md` section 12.5 —
concrete shape for it, not a current requirement.
