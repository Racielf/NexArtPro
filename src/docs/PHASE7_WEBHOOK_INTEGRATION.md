# Phase 7: Resend Webhook Integration for EstimateTransmission

## Overview

Phase 7 connects Resend email delivery events to EstimateTransmission records via webhook, providing visibility into:
- Email delivery status
- Client email opens
- Link clicks
- Bounce events

**Critical constraint**: Webhooks update ONLY EstimateTransmission timestamps. Estimate business lifecycle remains unchanged.

---

## Architecture

### Data Model Extension

`EstimateTransmission` now includes:
- `delivered_at` — email successfully delivered
- `opened_at` — client opened email
- `clicked_at` — client clicked estimate link
- `bounced_at` — email bounced (permanent or temporary)
- `status` — enum: `sent`, `failed`, `bounced` (bounced added for hard bounces)

Initial `status = sent` remains unchanged by events.
Only hard bounces trigger `status = bounced`.

### Webhook Endpoint

**Function**: `resendWebhook` (Deno serverless)

**Path**: `/api/functions/resendWebhook` (auto-published by Base44)

**Security**:
- Validates Resend HMAC-SHA256 signature (x-resend-signature header)
- Requires `RESEND_WEBHOOK_SECRET` environment variable
- Returns 401 if signature invalid

**Payload**:
```json
{
  "type": "email.delivered|email.opened|email.clicked|email.bounced",
  "data": {
    "email_id": "<provider_message_id>",
    "...": "other Resend fields (ignored)"
  }
}
```

---

## Event Flow

```
Estimate sent → sendEstimateEmail returns message_id
              ↓
recordSuccessfulTransmission stores provider_message_id
              ↓
Resend sends email → client opens → Resend fires webhook
              ↓
resendWebhook receives event
              ↓
findTransmissionByMessageId(email_id)
              ↓
applyWebhookEvent updates timestamps
              ↓
EstimateTransmission now has delivery telemetry
```

---

## Configuration Required

### 1. Set Resend Webhook Secret

Get webhook signing secret from Resend dashboard → webhooks → copy secret.

Store in environment:
```bash
RESEND_WEBHOOK_SECRET=<your_resend_webhook_signing_secret>
```

### 2. Register Webhook Endpoint with Resend

In Resend dashboard, add webhook:

**URL**: `https://<your-app-domain>/api/functions/resendWebhook`

**Events**: 
- ✓ email.delivered
- ✓ email.opened
- ✓ email.clicked
- ✓ email.bounced

**Signing Secret**: (paste the same secret from step 1)

### 3. Verify Webhook

Test via Resend dashboard webhook testing UI.

Expected response: `{ "success": true }`

---

## Supported Events

| Resend Event | Action | Field Updated | Status Impact |
|---|---|---|---|
| `email.delivered` | Set delivery timestamp | `delivered_at` | No change |
| `email.opened` | Set open timestamp | `opened_at` | No change |
| `email.clicked` | Set click timestamp | `clicked_at` | No change |
| `email.bounced` | Set bounce timestamp, mark bounced | `bounced_at`, `status` | `sent` → `bounced` |

---

## Estimate Lifecycle Separation

**Important**: Webhook events DO NOT trigger estimate business state changes.

Estimate status remains:
- `draft` → `sent` (via sendEstimateEmail)
- `sent` → `viewed` (via client action or markEstimateViewed)
- `viewed` → `approved` or `declined` (via client action)

**EstimateTransmission** is a separate audit layer. It tracks email telemetry only.

**Example**:
- Estimate status: `sent`
- Transmission.delivered_at: set by webhook
- Estimate status: still `sent` ✓ (no auto-advance)

---

## Helpers

### `findTransmissionByMessageId(messageId)`
Lookup transmission by Resend message_id.

**Usage** (frontend):
```javascript
import { findTransmissionByMessageId } from '@/lib/estimateTransmissionWebhook';
const transmission = await findTransmissionByMessageId('msg_abc123');
```

### `applyWebhookEvent(transmission, event)`
Update transmission with webhook event (frontend utility, if needed).

**Note**: Webhook handler already applies events server-side. This helper is available for admin/debugging if needed.

---

## Limitations

- No dashboard UI yet (Phase 8+)
- No analytics reporting yet (Phase 8+)
- Webhook is fire-and-forget (no retry logic in webhook handler itself)
- Resend sends events best-effort; missed events not recovered
- Bounce event updates status to `bounced`; rebounce events do NOT revert status

---

## Testing

### Unit Test (Manual)

1. Send estimate via sendEstimateEmail → get message_id
2. Verify EstimateTransmission created with `provider_message_id`
3. Simulate Resend webhook:
   ```bash
   curl -X POST https://<app>/api/functions/resendWebhook \
     -H "x-resend-signature: <valid_hmac>" \
     -H "Content-Type: application/json" \
     -d '{"type":"email.delivered","data":{"email_id":"<message_id>"}}'
   ```
4. Verify EstimateTransmission.delivered_at updated

### Integration Test (Resend Dashboard)

1. Use Resend webhook testing UI
2. Send test event with valid message_id
3. Check transmission record updated

---

## Troubleshooting

**Signature validation fails**:
- Verify RESEND_WEBHOOK_SECRET is set and matches Resend dashboard
- Ensure signature is base64(HMAC-SHA256) not raw hex

**No transmission found for message_id**:
- Estimate may have been sent with different email provider (manual)
- Check EstimateTransmission.provider = 'resend'
- Verify provider_message_id matches Resend message_id format

**Webhook returns 405**:
- Endpoint only accepts POST
- Verify Content-Type: application/json

---

## Future Phases

Phase 8+ will add:
- Dashboard widget showing delivery metrics
- Analytics reporting on open/click rates
- Admin UI to manually resend or inspect transmission history
- Scheduled cleanup of old transmission records