# Privileged Action Guard System

## Overview

Centralized abstraction for protecting sensitive admin actions. Prevents unauthorized destructive operations and enforces consistent confirmation flows.

---

## Authentication Stack Analysis

### Current Capabilities
- ✅ Session-based privileged state (sessionStorage)
- ✅ Explicit confirmation gates (modal + text entry)
- ✅ Suspicious activity detection (via securityMonitor.js)
- ✅ Comprehensive logging to AuthSecurityLog
- ❌ **No password reauth API** in base44 SDK
- ❌ **No OTP/2FA provider** in repo (Twilio not present)

### Result
**True password reauthentication is NOT currently possible.** The guard is hardened with:
1. Required existing privileged session
2. Per-action confirmation checks
3. Shorter expiry for destructive actions
4. Detailed audit logging
5. Clean extension points for future backend reauth/OTP

---

## Architecture

```
User attempts privileged action (restore/purge)
        ↓
validatePrivilegedActionExecution()
        ↓
isPrivilegedSessionValid()? (Check sessionStorage + expiry)
        ↓
If NO → logPrivilegedActionDenied() + deny
If YES → Allow action + checkSuspiciousActivity()
```

---

## Supported Privileged Actions

### 1. RECOVERY_ACCESS
- **Label:** Access Recovery Center
- **Severity:** high
- **Expiry:** 10 minutes
- **Requires confirmation:** Yes ("I understand the risks")
- **Flow:** RecoveryAccessModal → confirmPrivilegedAction()

### 2. RESTORE_RECORD
- **Label:** Restore Record
- **Severity:** high
- **Expiry:** 10 minutes
- **Requires confirmation:** Yes (inherited)
- **Flow:** RecoveryCenter restore button → validatePrivilegedActionExecution()

### 3. PURGE_RECORD
- **Label:** Permanently Delete Record
- **Severity:** critical
- **Expiry:** 5 minutes (shorter for destructive)
- **Requires confirmation:** Yes (inherited)
- **Flow:** RecoveryCenter purge button → validatePrivilegedActionExecution()

---

## Key Functions

### Session Management

```javascript
// Grant privileged session (after successful confirmation)
grantPrivilegedSession(durationMinutes = 10, metadata = {})

// Check if session is valid
isPrivilegedSessionValid() → boolean

// Get remaining time in seconds
getPrivilegedSessionTimeRemaining() → number

// Revoke session (manual invalidation)
revokePrivilegedSession(reason = 'manual_revocation')
```

### Action Protection

```javascript
// Check if action is currently allowed
canPerformPrivilegedAction(actionId)
  → { allowed, reason, session_valid, session_time_remaining }

// Request elevated confirmation (before showing modal)
requestPrivilegedActionConfirmation(actionId, userIdentifier, context)
  → { confirmed, metadata }

// Confirm action after user input
confirmPrivilegedAction(actionId, confirmationInput, userIdentifier, context)
  → { success, message, session_granted, duration_minutes }

// Validate action at execution time
validatePrivilegedActionExecution(actionId, userIdentifier)
  → { allowed, reason }

// Log denied action
logPrivilegedActionDenied(actionId, reason, userIdentifier, context)
```

---

## Security Events Logged

All actions are logged to `AuthSecurityLog`:

### New Event Types (in schema)
- `privileged_action_requested` — User initiates privileged action
- `privileged_action_granted` — Confirmation successful, session granted
- `privileged_action_denied` — Confirmation failed or session expired
- `privileged_action_expired` — Session expired (future use)

### Metadata Captured
```json
{
  "action_id": "restore_record",
  "severity": "high",
  "expiry_minutes": 10,
  "requires_confirmation": true,
  "denial_reason": "session_expired",
  "session_expired": true,
  "entity_id": "xyz123",
  "entity_type": "Invoice"
}
```

---

## Integration Points

### 1. Recovery Center Access
**File:** `components/settings/RecoveryAccessModal.jsx`

Before: Checked `grantRecoveryAccessSession()` (basic)
Now: Uses `confirmPrivilegedAction('RECOVERY_ACCESS', ...)`

**Flow:**
```
User clicks "Grant Access"
  → Modal appears
  → User types confirmation text
  → confirmPrivilegedAction() validates & logs
  → Session granted for 10 min
  → Recovery Center unlocked
```

### 2. Restore Action
**File:** `pages/RecoveryCenter`

Before: Checked `hasValidRecoveryAccessSession()` only
Now: Calls `validatePrivilegedActionExecution('RESTORE_RECORD', ...)`

**Additional checks:**
- Privileged session must be valid
- Session expiry checked per-action
- If expired → gate reopens automatically

### 3. Purge Action
**File:** `pages/RecoveryCenter`

Before: Checked `hasValidRecoveryAccessSession()` only
Now: Calls `validatePrivilegedActionExecution('PURGE_RECORD', ...)`

**Additional checks:**
- Shorter session expiry (5 min vs 10 min)
- User must have active privileged session
- Suspicious activity detection on failure

---

## UI Integration

### Privileged Session Indicator
**Location:** Settings → Security & Monitoring

Shows when session is active:
- ✓ Green badge "Privileged session active"
- Countdown timer (seconds remaining)
- Auto-updates every 5 seconds

Disappears when session expires.

---

## Suspicious Activity Detection

If action confirmation fails, `checkSuspiciousAttempts()` evaluates:
- Recent failed attempts for same action/user
- Threshold: 3+ denials in 5-minute window
- Result: Blocks further attempts temporarily + sends email alert

Example flow:
```
User fails confirm 3 times → Suspicious activity detected
  → logSecurityEvent({ event_type: 'suspicious_activity_detected' })
  → sendSecurityAlertIfNeeded() → Email to admin
  → User sees: "Too many failed attempts. Access denied temporarily."
```

---

## Extension Points for Future Auth

### Password Reauth (When Backend Supports)
```javascript
// FUTURE: In confirmPrivilegedAction()
if (action.requires_password_reauth) {
  const reauth = await validatePasswordReauth(password);
  if (!reauth.valid) {
    return { success: false, message: reauth.error };
  }
}

// Implementation needed in future:
async function validatePasswordReauth(password) {
  const response = await base44.functions.invoke('verifyPassword', { password });
  return { valid: response.ok, error: response.error };
}
```

### OTP / 2FA (When SMS Provider Available)
```javascript
// FUTURE: In action definition
PURGE_RECORD: {
  ...
  requires_otp: true,
  otp_channel: 'sms',
}

// Implementation needed in future:
async function generateAndSendOTP(phoneNumber) {
  const code = Math.random().toString().slice(2, 8);
  await twilio.messages.create({
    from: SMS_NUMBER,
    to: phoneNumber,
    body: `ProEstimate verification code: ${code}`
  });
  return code; // Store + validate on input
}
```

---

## Current Limitations

1. **No password reauth** — Confirmation only via typed text
2. **No OTP/2FA** — No SMS or TOTP integration available
3. **Session-only state** — Stored in sessionStorage (lost on browser close)
4. **No cross-tab sync** — If user opens Recovery Center in 2 tabs, both sessions are independent
5. **In-memory throttle** — Failed attempts reset on page refresh

## Accepted Tradeoffs

These limitations are acceptable because:
- Privileged actions only accessible to authenticated admins
- Multiple confirmation gates before destructive action
- Comprehensive security logging + email alerts
- Suspicious activity detection + temporary blocks
- Clear audit trail for all sensitive operations

---

## Testing Checklist

✅ Privileged session expires after duration
✅ Restore blocked if session expired
✅ Purge blocked if session expired
✅ Restoration immediately requires new session grant
✅ Failed confirmations logged to AuthSecurityLog
✅ Suspicious activity pattern detected after 3+ denials
✅ Email alert sent on suspicious pattern
✅ Privileged session indicator shows countdown
✅ Session revocation immediately blocks actions

---

## Files Modified/Created

### New Files
- `lib/privilegedActionGuard.js` — Central guard abstraction
- `docs/PRIVILEGED_ACTION_GUARD.md` — This file

### Modified Files
- `components/settings/RecoveryAccessModal.jsx` — Use guard for access gate
- `pages/RecoveryCenter.jsx` — Use guard for restore/purge validation
- `components/settings/SecurityLogPanel.jsx` — Add session indicator
- `src/entities/AuthSecurityLog.json` — Add new event types

### Unchanged (Preserved)
- Recovery Center flows
- AuditLog + RecoveryVault
- Security email alerts
- Suspicious activity detection

---

## Questions & Answers

**Q: Why not just check session once at Recovery Center entry?**
A: Actions (restore/purge) can take time. Session might expire during operation. Per-action validation ensures protection even in long sessions.

**Q: Can the session be stolen if page stays open?**
A: If another person gains access to the unlocked browser, they can perform actions within the session window. Close browser when away.

**Q: What if user tries to bypass confirmation text?**
A: Error is logged. If 3+ attempts fail, suspicious activity triggers email alert + temporary block.

**Q: How long until session expires?**
A: Recovery Center access: 10 min. Restore: 10 min. Purge: 5 min (shorter for destructive).

---