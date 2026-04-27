# Estimate Phase 5 Hold — Client Delivery / Attachments / Signing

## Status

Phase 5 is PAUSED.

Do not implement Estimate → WorkOrder conversion changes until the Estimate client delivery issues below are fixed and verified.

This checkpoint exists to prevent future chats/agents from skipping the current blocker.

---

## What is currently working

The following behavior was observed as working:

- Print works.
- Document preview opens and displays the estimate.
- PDF download works.
- Send email sends the estimate document and the selected attachment.
- The separate email attachment workflow was difficult to implement and must not be broken.

Important: Do not remove or redesign the current attachment sending mechanism.

---

## Current blockers before Phase 5

### 1. Included Documents section appears inside the estimate document

Problem:

- The attached file appears inside the visual estimate preview under `Included Documents`.
- It also appears inside the email-rendered estimate document because the same document renderer is used.

Expected behavior:

- Client attachments must be sent separately with the email.
- Client attachments must NOT be embedded visually inside the estimate document preview/PDF/email document unless the user explicitly wants that later.
- The attachment selection panel should control what files are included as email attachments, not whether an `Included Documents` section is rendered inside the estimate document.

Do not break the current ability to send the attachment separately.

---

### 2. Attachment checkbox does not affect preview/document section

Problem:

- In Review & Send, unchecking the attachment marks it as excluded in the side panel.
- However, the `Included Documents` section still remains visible in the estimate preview.

Expected behavior:

- If an attachment is excluded from email sending, it should not appear as included in the preview/document output.
- Preferred fix: remove/hide the `Included Documents` section from the estimate document entirely and keep attachments separate in email delivery.

---

### 3. Email `View Estimate` button opens blank / does not reach client estimate

Problem:

- Email is received.
- Button text says `View Estimate`.
- Clicking the button opens `/client-estimate?token=...`, but the page is blank.

Expected behavior:

- The button should open the client-facing estimate portal.
- Client should be able to view the estimate and approve/sign/decline.

Must verify:

- public token generation
- token persistence on the Estimate
- client route loading logic
- client estimate fetch by token
- Base44 preview sandbox URL behavior

---

### 4. Signed document / approval notification is not yet verified

Expected behavior:

- Client can sign/approve the estimate from the client portal.
- Signed approval is saved back to the Estimate.
- Admin/office can see somewhere that the estimate was signed/approved.
- The signed document or signed status should be visible in the system.

Do not assume this works until verified end-to-end.

---

## Rules for the next agent/chat

Before changing anything:

1. Read this file.
2. Read `docs/estimate-system-status.md`.
3. Do not touch Phase 5 conversion yet.
4. Do not break the separate email attachment workflow.
5. Do not redesign Estimate.
6. Fix only the client delivery/signing blockers listed here.

Any proposed fix must identify exact files and explain why it does not break:

- Preview
- PDF download
- Print
- Email attachment sending
- Client signing flow

---

## Likely files to inspect next

- `src/components/estimates/EstimateSendReview.jsx`
- `src/lib/estimateSendOrchestrator.js`
- `src/lib/estimatePrint.js`
- `src/components/documents/DocumentAttachmentsSection.jsx`
- `src/lib/buildEstimateDocumentViewModel.js`
- client estimate route/page for `/client-estimate`
- public token lifecycle in `estimateSalesLifecycle.js`

---

## Current instruction

Pause Phase 5 until these are fixed.
