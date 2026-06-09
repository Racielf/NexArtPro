# Security Alert Delivery System

## Overview

This document describes the security alert layer implemented on top of the Recovery Center and Security event system.

The system detects critical security violations and sends **real email notifications** to the admin/owner.

---

## Architecture

```
AuthSecurityLog (event logged)
        ↓
logSecurityEvent() [securityMonitor.js]
        ↓
sendSecurityAlertIfNeeded() [async, non-blocking]
        ↓
shouldSendSecurityAlert() → check policy + throttle
        ↓
sendSecurityAlertEmail() → Resend API
        ↓
updateSecurityEventWithAlertMetadata() → log delivery result
```

---

## Alert Policies

Defined in `lib/securityAlertPolicy.js`:

### 1. **recovery_access_denied** (CRITICAL)
- **Trigger:** 3+ denials in 5-minute window
- **Channel:** Email
- **Example:** User fails Recovery Center confirmation 3 times

### 2. **suspicious_activity_detected** (CRITICAL)
- **Trigger:** Immediate (threshold = 1)
- **Channel:** Email
- **Example:** 3+ failed recovery attempts detected automatically

### 3. **recovery_session_expired** (HIGH)
- **Trigger:** 5+ expirations in 30-minute window
- **Channel:** Email
- **Example:** Session timeout spike (possible timeout loop or multiple concurrent attempts)

### 4. **recovery_restore_attempt_failed** (HIGH)
- **Trigger:** 3+ failures in 10-minute window
- **Channel:** Email
- **Example:** User attempts to restore and keeps failing

### 5. **recovery_purge_attempt_failed** (CRITICAL)
- **Trigger:** 2+ failures in 10-minute window
- **Channel:** Email
- **Example:** User attempts permanent delete and keeps failing

---

## Alert Deduplication & Throttling

**Local throttle cache** prevents spam:
- Same event type + user_identifier within 15 minutes = throttled
- Throttle is in-memory (session-scoped)
- When page refreshes, throttle resets (acceptable — allows fresh alert if incident persists)

**Future improvement:**
- Add server-side throttle via metadata_json to prevent cross-session spam

---

## Email Implementation

### Provider: Resend
- API Key: `RESEND_API_KEY` (already set in repo)
- Integration: `base44.integrations.Core.SendEmail()` (native Base44)
- Recipient: `admin@rcartconstruction.com` (currently hardcoded via appConfig)

### Email Content
- **Subject:** `[ALERT] {SEVERITY}: {Description}`
- **From:** `ProEstimate Security <{from_name}>`
- **Body:** HTML formatted with:
  - Event type & timestamp
  - User identifier
  - Origin path
  - Severity badge (color-coded)
  - Threshold context (if applicable)
  - Action instructions (link to Security Log)

### Delivery Tracking
- Result stored in `AuthSecurityLog.metadata_json`:
  - `alert_sent`: boolean
  - `alert_channel`: "email"
  - `alert_timestamp`: ISO string
  - `alert_message_id`: Resend message ID
  - `alert_error`: error message (if failed)

---

## SMS Architecture (Ready but Not Live)

### Current Status
- **NOT implemented** (no Twilio/SMS provider in repo)
- **Ready to extend:** `securityAlertDispatch.js` has structure for multiple channels

### Future SMS Integration
To add SMS alerts:

1. Add SMS provider (Twilio, AWS SNS, etc.) secret to environment
2. Add phone number to AppConfig or admin settings
3. Extend `ALERT_POLICY` entries with `channels: ['email', 'sms']`
4. Create `sendSecurityAlertSMS()` function in `securityAlertDispatch.js`
5. Update `sendSecurityAlertIfNeeded()` to dispatch via all channels

### Placeholder SMS Example
```javascript
// NOT IMPLEMENTED — placeholder for future
async function sendSecurityAlertSMS(payload) {
  // const twilio = require('twilio')(accountSid, authToken);
  // await twilio.messages.create({
  //   from: smsSenderNumber,
  //   to: adminPhoneNumber,
  //   body: `ALERT: ${payload.subject}`
  // });
}
```

---

## UI Surface

### 1. Recent Alerts Widget
- **Location:** Settings → Security & Monitoring
- **Component:** `RecentSecurityAlertsWidget.jsx`
- **Shows:** Last 5 critical events in 24h with delivery status
- **Displays:**
  - Event type & severity
  - Timestamp & user
  - Delivery status (✓ Sent, ✗ Failed, ⏳ Pending)
  - Error message if delivery failed

### 2. Security Log Panel
- **Existing panel already integrated**
- Recent alerts widget added at top
- Full event log searchable/filterable below

---

## Admin Configuration

### Email Recipient
Currently hardcoded to `getAlertDestinationEmail()` in `securityAlertPolicy.js`:
```javascript
export function getAlertDestinationEmail() {
  // TODO: In production, look up from Settings/AppConfig entity
  return 'admin@rcartconstruction.com';
}
```

**To make configurable:**
1. Add `admin_alert_email` field to Settings entity
2. Update `getAlertDestinationEmail()` to query Settings
3. Add UI field in Settings > Security & Monitoring to configure

---

## Testing Alerts

### Manual Test Flow
1. Go to Recovery Center (Settings → Recovery Center)
2. Fail Recovery Center access confirmation **3 times in 5 minutes**
3. Check admin inbox — should receive alert email
4. Go back to Settings → Security & Monitoring
5. Recent Alerts widget should show the alert with ✓ Sent status

### Debug Logs
- Check browser console for `[securityAlertDispatch]` logs
- Check AuthSecurityLog entries for `alert_sent` metadata
- Verify Resend API key is set: check `Deno.env.get('RESEND_API_KEY')`

---

## Limitations & Future Work

### Current Limitations
1. **Email recipient hardcoded** — should be configurable per admin
2. **No SMS yet** — architecture ready, provider not integrated
3. **In-memory throttle only** — doesn't survive page refresh
4. **No alert persistence** — alerts not stored long-term, only in metadata
5. **No escalation** — no phone call / urgent SMS fallback yet

### Planned Improvements
- [ ] Configurable admin email via Settings entity
- [ ] SMS support via Twilio or AWS SNS
- [ ] Server-side alert dedup via dedicated AlertLog entity
- [ ] Escalation rules (SMS after 2 failed email sends)
- [ ] Alert preferences per admin (quiet hours, channel prefs, etc.)

---

## Files Modified/Created

### New Files
- `lib/securityAlertPolicy.js` — Alert policy definitions
- `lib/securityAlertDispatch.js` — Alert sending logic
- `components/settings/RecentSecurityAlertsWidget.jsx` — UI widget
- `docs/SECURITY_ALERTING_GUIDE.md` — This file

### Modified Files
- `lib/securityMonitor.js` — Integrated alert dispatch (non-blocking)
- `components/settings/SecurityLogPanel.jsx` — Added recent alerts widget
- `components/settings/RecoveryAccessModal.jsx` — Added alert dispatch comments

### Unchanged (Preserved)
- Recovery Center + flows
- AuditLog + RecoveryVault
- AuthSecurityLog schema
- Security session + privileged access gates

---

## Examples

### Alert Email Subject
```
[ALERT] CRITICAL: Multiple recovery center access denials
```

### Alert Email Recipient
```
admin@rcartconstruction.com
```

### Alert Metadata in AuthSecurityLog
```json
{
  "alert_sent": true,
  "alert_channel": "email",
  "alert_timestamp": "2026-04-20T18:45:00Z",
  "alert_message_id": "msg_abc123def456",
  "alert_error": null
}
```

---

## FAQ

**Q: Will alerts spam if someone keeps failing?**
A: No — 15-minute throttle prevents duplicate alerts for same incident. Only new incidents (>15 min apart) trigger new alerts.

**Q: What if email delivery fails?**
A: Failure is logged in metadata. Admin can see "Delivery failed" in Recent Alerts widget. System continues to log security events.

**Q: Can I change the alert recipient?**
A: Currently hardcoded to `admin@rcartconstruction.com`. To change, modify `getAlertDestinationEmail()` in `securityAlertPolicy.js` or wait for configurable implementation.

**Q: What about SMS?**
A: Not live yet, but architecture is ready. See "SMS Architecture (Ready but Not Live)" section above.

---