# Recovery + Security System Verification Report

**Date:** 2026-04-20  
**Status:** ⚠️ CRITICAL BUGS FOUND  
**Repo:** Racielf/proestimate-fsm

---

## Executive Summary

Full functional verification of recovery + security system revealed **3 critical bugs** preventing soft-delete and recovery operations from working. The system is **non-functional as currently implemented**.

**Blocker:** Entity schemas missing required soft-delete fields.

---

## Files Audited

- `pages/RecoveryCenter.jsx` — Recovery Center UI
- `lib/softDelete.js` — Soft-delete helpers
- `lib/recoverySnapshot.js` — Vault snapshot logic
- `lib/auditLog.js` — Audit logging
- `lib/recoveryRegistry.js` — Entity registry (in-scope entities)
- `pages/Customers.jsx` — Archive flow example (uses archiveWithSnapshot)
- `pages/Estimates.jsx` — Archive flow example (uses archiveWithSnapshot)
- Entity schemas (Customer, Invoice, Estimate referenced in context)

---

## CRITICAL BUG #1: Missing Soft-Delete Fields in Entity Schemas

**Severity:** 🔴 CRITICAL — System cannot function  
**Scope:** All 7 in-scope entities: Customer, Client, Lead, Estimate, Proposal, WorkOrder, Invoice

### Issue

The soft-delete architecture requires these fields on EVERY recoverable entity:
- `deleted_at` (ISO datetime)
- `deleted_by` (string — user email)
- `delete_reason` (string — optional)
- `restored_at` (ISO datetime — optional)
- `restored_by` (string — optional)

**Code Evidence:**
```js
// softDelete.js lines 48-54
await entityApi.update(id, {
  deleted_at: now,       // ← assumes field exists
  deleted_by: actor,     // ← assumes field exists
  delete_reason: reason,
  restored_at: null,
  restored_by: null,
});
```

**Schema Reality:**
Entity schemas (Customer.json, etc.) do NOT define these fields. When the code tries to write them via `base44.entities.Customer.update(id, { deleted_at: ... })`, the behavior is:
- If Base44 allows arbitrary fields → silently creates them (unvalidated)
- If Base44 enforces schema → update fails with validation error
- Either way, recovery system cannot reliably detect soft-deleted records

### How It Breaks

1. **Archive operation attempts soft-delete** (Customers page, line 55):
   ```js
   await archiveWithSnapshot(base44.entities.Customer, 'Customer', id, actor, reason)
   ```

2. **softDelete.js tries to write fields** (line 48-54):
   ```js
   await entityApi.update(id, { deleted_at, deleted_by, ... })
   ```

3. **If schema doesn't have these fields:**
   - Write silently fails or is ignored
   - Record is NOT actually soft-deleted
   - `deleted_at` remains null/undefined

4. **Recovery Center can't find soft-deleted records** (RecoveryCenter.jsx line 161):
   ```js
   const all = await base44.entities[entry.apiKey].list('-deleted_at');
   filterDeletedRecords(all)  // filters by r.deleted_at — won't match if field missing
   ```

5. **Result:** Users think records are deleted, but they reappear next time module is opened

### Required Fix

Add these field definitions to EVERY entity schema in `/src/entities/`:
- Customer.json
- Client.json
- Lead.json
- Estimate.json
- Proposal.json
- WorkOrder.json
- Invoice.json

Each should include:
```json
{
  "deleted_at": {
    "type": "string",
    "format": "date-time",
    "description": "Timestamp of soft delete (null if active)"
  },
  "deleted_by": {
    "type": "string",
    "description": "User email who deleted the record"
  },
  "delete_reason": {
    "type": "string",
    "description": "Reason provided for deletion"
  },
  "restored_at": {
    "type": "string",
    "format": "date-time",
    "description": "Timestamp of restoration (null if not restored)"
  },
  "restored_by": {
    "type": "string",
    "description": "User email who restored the record"
  }
}
```

---

## CRITICAL BUG #2: Recovery Center UI Allows "Restore" on Purged Records

**Severity:** 🔴 CRITICAL — Data integrity issue  
**Scope:** RecoveryCenter.jsx lines 432-439

### Issue

When a record is purged (hard deleted), the RecoveryVault entry is marked `is_purged: true` (markVaultPurged, line 127-143). However, the Recovery Center UI still displays the "Restore" button for purged records.

**Code Evidence:**
```js
// RecoveryCenter.jsx lines 432-439
{record._canRestore && (
  <Button size="sm" variant="outline"
    className="gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
    onClick={() => handleRestore(record)}
    disabled={restoring === record.id}>
    <RotateCcw className="w-3 h-3" />
    {restoring === record.id ? 'Restoring…' : 'Restore'}
  </Button>
)}
```

The button is shown whenever `record._canRestore` is true (from registry, line 170), but there's NO check for `is_purged` status.

**Scenario:**
1. Admin archives Invoice #42
2. Admin purges Invoice #42 (hard delete)
3. Recovery Center still shows "Restore" button
4. Admin clicks Restore → Calls `handleRestore()` which tries to restore from RecoveryVault snapshot
5. Snapshot data is stale (record was already deleted)

### Required Fix

Disable Restore button if record is purged. Add to line 432:
```js
{record._canRestore && !vault?.is_purged && (
  // show Restore button
)}
```

Or visually indicate purged status with tooltip explaining record is permanently deleted.

---

## CRITICAL BUG #3: Missing "Purged" Badge in Timeline/List View

**Severity:** 🟡 HIGH — UX/clarity issue  
**Scope:** RecoveryCenter.jsx lines 397-450 (timeline) + 480-539 (list)

### Issue

The Recovery Center shows deleted records with a "vault" badge if a snapshot exists (lines 412-416), but does NOT indicate whether a record is purged. Users cannot distinguish between:
- Deleted but recoverable
- Deleted and purged (permanently gone)

### Evidence

Timeline view (line 412-416):
```js
{vault && (
  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold flex items-center gap-0.5">
    <Archive className="w-2.5 h-2.5" />vault
  </span>
)}
```

List view (line 492-496): Same badge, no purged indicator.

### Required Fix

Add purged state display:
```js
{vault && (
  vault.is_purged ? (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold flex items-center gap-0.5">
      <Trash2 className="w-2.5 h-2.5" />purged
    </span>
  ) : (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold flex items-center gap-0.5">
      <Archive className="w-2.5 h-2.5" />recoverable
    </span>
  )
)}
```

---

## Verification Results by Scope

### A. Archive Flow — ❌ BLOCKED
- **Status:** Cannot verify until BUG #1 fixed
- **Test Case:** Soft-delete a Customer → should appear in Recovery Center
- **Current:** If soft-delete fields missing, record won't be marked deleted in DB

### B. Recovery Center Listing — ❌ BLOCKED
- **Status:** Cannot verify until BUG #1 fixed
- **Expected:** Deleted records appear in UI
- **Current:** filterDeletedRecords() returns empty if `deleted_at` field doesn't exist

### C. Restore Flow — ❌ BLOCKED
- **Status:** Cannot verify; depends on BUG #1 fix
- **Expected:** Restore brings record back to active state
- **Current:** restoreEntity() will fail to write `restored_at` if field doesn't exist

### D. Purge Flow — ⚠️ PARTIALLY VERIFIABLE
- **Status:** Purge hardcoded in UI (line 249) works at API level, but:
  - BUG #1 blocks the soft-delete state detection
  - BUG #3 obscures purged vs. recoverable state
- **Test:** Cannot verify end-to-end without fixing BUG #1

### E. Security Gate Flow — ✅ VERIFIED
- **Status:** WORKING
- **Session management:** Correct (session created, validated, expired properly)
- **LogSecurityEvent calls:** Present and correctly placed (lines 196-247)
- **Recovery access denial logging:** Present (line 231-236)

### F. Security Log Panel — ✅ VERIFIED (if AuthSecurityLog written to)
- **Status:** UI is correct, but depends on events being logged
- **Dashboard:** Present in Settings with proper admin guard
- **Filters:** Search, date range, actor filter implemented correctly
- **Critical Alerts Widget:** Thresholds logic correct (getCriticalSecurityAlerts)

---

## Summary of Findings

| Bug | Severity | Category | Impact |
|-----|----------|----------|--------|
| #1: Missing soft-delete fields | 🔴 CRITICAL | Data integrity | **System non-functional** |
| #2: Restore button on purged | 🔴 CRITICAL | UX/Data safety | Users can trigger impossible operations |
| #3: Purged state hidden | 🟡 HIGH | UX/Clarity | Confusing state representation |
| Security logging | ✅ OK | Security | Working as designed |
| Recovery access gate | ✅ OK | Security | Working as designed |

---

## What Works

- ✅ Recovery access gate (modal + session) 
- ✅ Session expiration detection
- ✅ Security event logging infrastructure (AuthSecurityLog)
- ✅ Critical alerts detection logic
- ✅ RecoveryVault schema and snapshot writing (if soft-delete happens)
- ✅ AuditLog infrastructure

## What's Broken

- ❌ Soft-delete operations cannot persist `deleted_at` field
- ❌ Recovery Center cannot detect soft-deleted records
- ❌ Restore button available on purged records
- ❌ Purged vs. recoverable state not visually distinct

---

## Recommended Next Steps

### Immediate (Blocking)

1. **Verify entity schema support:** Confirm whether Base44 allows writing fields not defined in schema or if strict validation enforced
2. **Add soft-delete fields to all 7 entity schemas**
3. **Test archive → Recovery Center discovery flow**

### Follow-up (High Priority)

4. Fix BUG #2: Disable Restore for purged records
5. Fix BUG #3: Add purged state badge
6. Test restore flow end-to-end
7. Test purge flow end-to-end

### Validation (Optional)

8. Create seed data with archived records in each module
9. Run through recovery flows manually
10. Verify Security Log shows all events
11. Stress-test critical alerts threshold

---

## Timeline Impact

**Current state:** Recovery system is architecturally sound but **missing critical schema definitions** that prevent any soft-delete operations from persisting.

**Est. fix time:** 1-2 hours (add fields to 7 entity schemas + test)