# Security Implementation Notes / Next Steps

This file documents the security work added to the repo and leaves a clear path to continue later.

## What has been added

### 1. Supabase Auth + RBAC foundation
- App authorization moved toward Supabase Auth sessions.
- RBAC helpers were centralized in `src/lib/roleUtils.js`.
- Dynamic RBAC database schema was added in:
  - `supabase/migrations/20260428_dynamic_rbac.sql`

### 2. Audit logging
- Security audit log table and write function were added in:
  - `supabase/migrations/20260428_security_audit_logs.sql`
- Important changes to users, roles, and permissions are automatically logged.

### 3. Suspicious activity detection
- Backend-driven suspicious activity rules were added in:
  - `supabase/migrations/20260428_suspicious_activity_hardening.sql`
- Detection is now based on database rules, not frontend-only filtering.

### 4. Automatic attack blocking
- Automatic security block controls were added in:
  - `supabase/migrations/20260428_attack_auto_blocking.sql`
- Supports blocking by user, auth user, IP, and fingerprint.

### 5. Dynamic user risk scoring
- User risk scoring was added in:
  - `supabase/migrations/20260428_dynamic_user_risk_scoring.sql`
- Calculates `low`, `medium`, `high`, and `critical` risk levels.

### 6. Device/IP risk scoring
- Device and IP risk scoring was added in:
  - `supabase/migrations/20260428_device_ip_risk.sql`
- Adds origin-level risk scoring for IPs and device fingerprints.

### 7. Adaptive risk tuning
- Adaptive risk weight tuning was added in:
  - `supabase/migrations/20260428_adaptive_risk_tuning.sql`
- The system can tune risk weights based on recent security behavior.

---

## Required Supabase deployment steps

Run the migrations in this order:

```bash
supabase/migrations/20260428_dynamic_rbac.sql
supabase/migrations/20260428_security_audit_logs.sql
supabase/migrations/20260428_suspicious_activity_hardening.sql
supabase/migrations/20260428_attack_auto_blocking.sql
supabase/migrations/20260428_dynamic_user_risk_scoring.sql
supabase/migrations/20260428_device_ip_risk.sql
supabase/migrations/20260428_adaptive_risk_tuning.sql
```

Then schedule the security cycle in Supabase cron:

```sql
select cron.schedule(
  'security-risk-cycle',
  '* * * * *',
  $$ select run_security_risk_cycle(); $$
);
```

---

## Important follow-up work

### A. Finish frontend migration away from Base44 security logs
Some existing security UI still reads from Base44 entities:

- `src/components/settings/SecurityLogPanel.jsx`
- `src/components/settings/SecurityAlertsWidget.jsx`
- `src/components/settings/RecentSecurityAlertsWidget.jsx`
- `src/lib/securityAlerts.js`

Replace those reads with Supabase views:

- `security_audit_logs`
- `security_recent_alerts`
- `security_user_risk_overview`
- `security_origin_risk_overview`
- `security_active_blocks`
- `security_adaptive_risk_overview`

### B. Add frontend device fingerprint capture
Add a small utility that generates a stable browser fingerprint and calls:

```js
await supabase.rpc('register_security_device', {
  p_fingerprint: fingerprint,
  p_ip_address: userIp,
  p_metadata: metadata
});
```

For production, use a real device fingerprinting library instead of a simple user-agent hash.

### C. Enforce blocked sessions in `AuthContext`
After session load, call:

```js
await supabase.rpc('current_session_is_blocked')
```

Also check device/IP blocking with:

```js
await supabase.rpc('is_origin_blocked', {
  p_ip_address: userIp,
  p_fingerprint: fingerprint
})
```

If blocked, sign out the user and show a clear account protection message.

### D. Harden invite functions
The secure invite function scaffold exists, but complete invite acceptance should be finished in Supabase Edge Functions.

Recommended functions:

- `create-team-invite`
- `complete-team-invite`
- `toggle-team-user-active`

These functions should use `SUPABASE_SERVICE_ROLE_KEY`, verify admin permission server-side, and never trust frontend role claims.

### E. Review RLS policies for every business table
Apply `has_app_permission(...)` policies to sensitive tables such as:

- invoices
- estimates
- work_orders
- payments
- payroll
- customers
- documents/signatures

Example:

```sql
create policy "finance managers can read invoices"
on invoices
for select
using (has_app_permission('finance:manage'));
```

---

## Recommended next task

When continuing this project, start with:

```text
migrate SecurityLogPanel to Supabase security views
```

That will connect the existing UI to the new backend security system.
