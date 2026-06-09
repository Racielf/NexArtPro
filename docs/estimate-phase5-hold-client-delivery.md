# Estimate Phase 5 — Client Delivery / Attachments / Signing

## Status

Phase 5 client-delivery blockers are RESOLVED.

The previous hold existed to protect the email attachment workflow and client approval flow before completing Estimate → WorkOrder conversion.

---

## Resolved items

### 1. Attachments remain separate from the estimate document

Status: ✅ Resolved

Client attachments are not embedded visually inside the estimate preview/PDF/email document by default.

Important:

- The estimate document stays clean.
- Client attachments still send separately with the email.
- Do not remove or redesign the current attachment sending mechanism.

---

### 2. Attachment checkbox no longer controls a fake document section

Status: ✅ Resolved

The attachment selection panel controls email attachment delivery.

The estimate document itself does not show `Included Documents` by default.

---

### 3. Email `View Estimate` link opens public client route

Status: ✅ Resolved

`/client-estimate?token=...` is treated as a public route and no longer gets blocked by admin/auth redirect behavior.

---

### 4. Signed / approved status is visible in admin

Status: ✅ Resolved

Admin UI shows signed/approved and declined status through the estimate transmission/admin panel.

Signed fields formalized in `base44/entities/Estimate.jsonc` include:

- `signed_at`
- `accepted_by`
- `signature_name`
- `signature_image`
- `signature_method`
- `terms_accepted`
- `legal_audit`
- `locked_after_signature`
- `final_signed_pdf_url`
- `final_signed_pdf_name`
- `legal_package_locked`

---

## Phase 5 conversion status

Status: ✅ Implemented

Estimate → WorkOrder conversion now preserves the approved/signed Estimate as a WorkOrder reference snapshot.

Important:

- This snapshot is reference-only.
- Real WorkOrder profitability must still come from invoices, expenses, and time entries.
- Do not change `jobFinancials.js` to use estimate snapshot as real profit.

---

## Auto-convert at signing

Status: ✅ Connected

The client approval flow in `src/pages/ClientEstimateView.jsx` calls:

```js
convertApprovedEstimateToWorkOrder(signedEstimate, { actor: 'client_approval' })
```

after approval/signature and signed PDF freeze.

Expected behavior:

1. Client opens public estimate link.
2. Client types signature and accepts terms.
3. Estimate is approved/signed.
4. Final signed PDF is frozen when possible.
5. Work Order is created automatically.
6. Estimate is marked as converted.
7. Admin sees signed/approved state and conversion reference.

---

## Do Not Break

Do not redesign Estimate.

Do not remove separate email attachment delivery.

Do not embed client attachments visually inside the Estimate document by default.

Do not create another calculation engine.

Do not replace real job profitability with estimate snapshot values.

---

## Future QA checklist

Before declaring production complete, manually test:

1. Create Estimate.
2. Attach a client-facing PDF.
3. Send Estimate.
4. Confirm email contains the Estimate PDF plus selected attachment.
5. Confirm the Estimate document does not visually show `Included Documents` by default.
6. Open `View Estimate` link without being logged in.
7. Approve/sign as client.
8. Confirm admin shows signed status.
9. Confirm a Work Order is created automatically.
10. Confirm WorkOrder has `source_estimate_snapshot` and inherited materials/cost context.
