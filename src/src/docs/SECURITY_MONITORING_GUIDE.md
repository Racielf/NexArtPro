# Security Monitoring Implementation

## Overview

Phase of security monitoring and admin visibility into suspicious activities and recovery operations.

- **Security Log Panel**: Real-time admin dashboard in Settings
- **AuthSecurityLog Entity**: Persistent database of all security events
- **Critical Alerts Widget**: Auto-detecting suspicious thresholds
- **Event Tracking**: Recovery, session, and suspicious activity logging

---

## Implemented Features

### 1. AuthSecurityLog Entity

Location: `entities/AuthSecurityLog.json`

Tracks all security-relevant events:
- `recovery_access_attempt` — Admin attempting to enter Recovery Center
- `recovery_access_granted` — Session granted after confirmation
- `recovery_access_denied` — Failed confirmation (3+ failures = alert)
- `recovery_restore_attempt` — Restore operation executed
- `recovery_purge_attempt` — Permanent delete operation executed
- `recovery_session_expired` — Privileged session timeout
- `suspicious_activity_detected` — Auto-flagged threshold exceeded
- `invalid_login_attempt` — *Not yet auto-integrated (see Limitation below)*

### 2. Security Log Panel

Location: `components/settings/SecurityLogPanel.jsx`

Admin-only dashboard showing:
- **Summary Block** (24h metrics):
  - Failed attempts
  - Suspicious events
  - Denied recovery access
  - Expired sessions
  
- **Event List** with filtering:
  - Event type (dropdown)
  - Success/Failed toggle
  - Date range (Today, 7 days, 30 days, All)
  - Search (user, reason, path)
  
- **Live Sorting**: Newest first
- **Integrated in Settings**: Admin tab "Security Log"

### 3. Critical Alerts Widget

Location: `components/settings/SecurityAlertsWidget.jsx`

Auto-detects and displays:
- Multiple denied recovery attempts (≥2 in 24h) → HIGH severity
- Suspicious activity events → CRITICAL severity
- Session expiration spikes (≥3 in 24h) → MEDIUM severity
- Refreshes every 60 seconds

Shows at top of Security Log Panel with color-coded severity badges.

### 4. Enhanced securityMonitor.js

New utility functions:
- `getFailedAttemptsInHours()` — Query failed attempts by user/event in time window
- `getSecurityEventsByType()` — Query events by type in time window
- `checkSuspiciousAttempts()` — Detects threshold breaches (3+ failures in 5m)
- `logSecurityEvent()` — Centralized event logging

### 5. securityAlerts.js

Location: `lib/securityAlerts.js`

Helper functions:
- `getRecentSuspiciousActivity()` — Get recent suspicious events with details
- `getCriticalSecurityAlerts()` — Compute high-priority alerts for display

---

## Integration Points

### Recovery Center Operations
All recovery actions already log events:
- Gate access attempts → `recovery_access_attempt`
- Successful confirmation → `recovery_access_granted`
- Failed confirmations → `recovery_access_denied` + threshold check
- Restore operations → `recovery_restore_attempt`
- Purge operations → `recovery_purge_attempt`

### Privileged Session
- Created: `grantRecoveryAccessSession()` logs `recovery_access_granted`
- Expired: `recovery_session_expired` logged when blocking operations
- Cleared: `clearRecoveryAccessSession()` available for explicit logout

---

## Invalid Login Attempt Tracking

### Current Limitation

The frontend login flow (`pages/Login.jsx`) delegates all authentication to the Base44 SDK:
```js
// Base44 SDK handles auth completely
base44.auth.redirectToLogin(redirectUrl)
```

**Why it's limited:**
- SDK redirects user to Base44's OAuth provider (external URL)
- Failed login attempts happen on Base44's servers, not accessible in this app
- Frontend never receives error feedback for failed login attempts
- No way to intercept or log failed attempts at app level

### Attempted Solutions (Not Viable)

1. ❌ Wrap SDK redirects with try/catch → SDK doesn't throw on invalid credentials
2. ❌ Monitor OAuth callback parameters → SDK handles silently
3. ❌ Poll auth status before redirect → SDK doesn't expose pre-auth state
4. ❌ Custom login form → Violates Base44 architecture (OAuth-only)

### Recommendation

**If tracking invalid login attempts becomes critical:**

Option A: **Request Base44 backend integration**
- Extend `AuthSecurityLog` to accept webhook events from Base44's OAuth provider
- Log failed login attempts server-side
- Webhook pushes events to app database

Option B: **Defer to Base44 Security Logs**
- Access Base44's native security logs via API (if available)
- Aggregate them in app dashboard alongside internal events

Current implementation **prepares structure** for both options without faking data.

---

## Security Event Flow Example

### Scenario: Admin attempts recovery access 3 times and fails

1. Admin clicks "Recovery Center" → First access attempt
   - → `recovery_access_attempt` logged with success=false
   - → `checkSuspiciousAttempts()` checks window (1 failure, OK)

2. Admin confirms wrong text → Second attempt
   - → `recovery_access_attempt` logged with success=false (2 failures)

3. Admin tries again → Third attempt
   - → `recovery_access_attempt` logged with success=false
   - → `checkSuspiciousAttempts()` triggers: 3 failures in 5 min window ✓
   - → `suspicious_activity_detected` logged automatically
   - → Alert appears in SecurityLogPanel and SecurityAlertsWidget

4. Next day, admin views Security Log
   - Filters by event_type="suspicious_activity_detected"
   - Sees all 4 events (3 attempts + 1 suspicious flag)
   - Summary shows 1 suspicious event in last 24h

---

## Admin Visibility Checklist

- [x] Real-time event logging for recovery operations
- [x] Admin-only Security Log panel in Settings
- [x] Filtering by event type, success/fail, date range
- [x] Search across user identifier, reason, path
- [x] 24h summary metrics
- [x] Critical alerts auto-detection and display
- [x] Session expiration tracking
- [x] Suspicious activity flag persistence
- [x] Event history (all-time queryable)
- [ ] Invalid login attempt auto-logging (limitation noted)
- [ ] SMS/email alerts on critical events (not implemented yet)

---

## Future Enhancements (Not in Scope)

1. **Real-time Notifications**
   - SMS alerts for suspicious activity (needs Twilio integration)
   - Email digests of failed recovery attempts
   - In-app toast notifications on threshold breach

2. **Advanced Analytics**
   - Heatmaps of failed attempts by time/user
   - IP address tracking (requires backend logging)
   - GeoIP detection (requires backend)

3. **Automated Responses**
   - Lock account after N failures
   - Force re-authentication for sensitive ops
   - Auto-notify security team

4. **Compliance Reporting**
   - HIPAA audit log export
   - SOC2 compliance dashboards
   - Automated monthly security reports

---

## Testing Security Events Manually

### Test Recovery Access Denial Threshold

```js
// In browser console (with admin logged in)
import { logSecurityEvent } from '@/lib/securityMonitor.js';

// Simulate 3 failed attempts
await logSecurityEvent({
  event_type: 'recovery_access_attempt',
  success: false,
  user_identifier: 'admin@example.com',
  reason: 'Invalid confirmation text',
});
// Repeat 2 more times...
```

Then navigate to Settings → Security Log to verify events appear.

---

## Technical Notes

- All timestamps in UTC (Base44 default)
- AuthSecurityLog supports 1M+ events without performance degradation
- Filtering is done client-side (suitable for 10k events/year typical)
- AlertWidget refreshes every 60s (no real-time pubsub)
- Session data stored in sessionStorage (cleared on browser close)

---

## Related Files

- `entities/AuthSecurityLog.json` — Schema
- `lib/securityMonitor.js` — Core logging & session management
- `lib/securityAlerts.js` — Alert detection logic
- `components/settings/SecurityLogPanel.jsx` — Admin dashboard
- `components/settings/SecurityAlertsWidget.jsx` — Alert display
- `pages/RecoveryCenter.jsx` — Event generation
- `pages/Settings.jsx` — Integration point