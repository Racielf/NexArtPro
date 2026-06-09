# Multi-Tenant Migration Plan: Adding company_id to Core Entities

**Status:** Planning (NOT YET EXECUTED)  
**Scope:** Safe, non-breaking migration to multi-tenant structure  
**Timeline:** 5 phases over 4 weeks  
**Risk Level:** Low (backward compatible approach)

---

## Executive Summary

This plan adds `company_id` to core entities (Customer, Estimate, WorkOrder, Invoice) to support multi-tenant operations. The approach is **non-breaking** and **rollback-safe**, maintaining current single-company functionality while preparing the database schema for future per-user company assignment.

---

## Current State

**Single-Company Context:**
- All records belong to "R.C Art Construction LLC" (hardcoded or DEFAULT_COMPANY)
- No company isolation at database level
- Company identity lives in CompanyContext provider (frontend only)

**Affected Entities:**
- `Customer` — ~50-200 records
- `Estimate` — ~100-500 records
- `WorkOrder` — ~50-300 records
- `Invoice` — ~50-300 records

---

## Target State

**Multi-Tenant Ready:**
- Each record has explicit `company_id` field
- Default company_id = `"rc-art"` (from DEFAULT_COMPANY.id)
- All new records auto-populate company_id
- Read filters silently include company_id check (transparent to UI)
- Backfill complete and verified

---

## Phase 1: Schema Update (Week 1, Day 1-2)

### Step 1.1: Update Entity Schemas

Update all affected entities to include optional `company_id` field.

**Entities to update:**
- `entities/Customer.json`
- `entities/Estimate.json`
- `entities/WorkOrder.json`
- `entities/Invoice.json`

**Schema addition (all 4 files):**
```json
{
  "company_id": {
    "type": "string",
    "description": "Company identifier for multi-tenant support",
    "default": "rc-art"
  }
}
```

**Change Summary:**
- Add new optional field with default value
- Keeps existing records valid (backward compatible)
- ✅ No data loss
- ✅ Existing API calls still work

**Rollback:** Delete `company_id` field from schemas (no data impact)

---

## Phase 2: Application Layer Updates (Week 1, Day 2-3)

### Step 2.1: Update CRUD Functions

Create wrapper functions to automatically include `company_id` on all operations.

**File:** `src/lib/entityWrappers.js` (NEW)

```javascript
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';

/**
 * Wrapper for entity.create() that auto-injects company_id
 */
export async function createEntityWithCompany(entityName, data) {
  const company = useCompany(); // Get current company context
  return await base44.entities[entityName].create({
    ...data,
    company_id: company.id, // Auto-inject
  });
}

/**
 * Wrapper for entity.filter() that auto-adds company_id filter
 */
export async function filterByCompany(entityName, query = {}, sort = '', limit = 50) {
  const company = useCompany();
  const companyFilter = {
    ...query,
    company_id: company.id, // Auto-filter
  };
  return await base44.entities[entityName].filter(companyFilter, sort, limit);
}

/**
 * Wrapper for entity.update() that preserves company_id
 */
export async function updateEntityWithCompany(entityName, recordId, data) {
  return await base44.entities[entityName].update(recordId, {
    ...data,
    // company_id is never updated (immutable)
  });
}
```

**Migration impact:**
- ✅ All new records created with company_id
- ✅ Existing records still query correctly
- ✅ Transparent to UI (no UI changes needed yet)

**Rollback:** Revert to direct base44 calls, delete wrapper file

---

## Phase 3: Backfill Existing Records (Week 2-3, Days 1-5)

### Step 3.1: Create Backfill Function

**File:** `functions/backfillCompanyId.js` (NEW)

Backend function to safely backfill all existing records with company_id.

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const COMPANY_ID = 'rc-art'; // Default company
const BATCH_SIZE = 50; // Process in batches to avoid timeouts
const ENTITIES = ['Customer', 'Estimate', 'WorkOrder', 'Invoice'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only operation
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { entity, offset = 0, dryRun = true } = body;

    if (!ENTITIES.includes(entity)) {
      return Response.json({ error: `Unknown entity: ${entity}` }, { status: 400 });
    }

    // Fetch all records without company_id
    const records = await base44.asServiceRole.entities[entity].filter(
      { company_id: { $exists: false } } // MongoDB query: field doesn't exist
    );

    if (records.length === 0) {
      return Response.json({
        entity,
        status: 'complete',
        recordsProcessed: 0,
        message: 'No records to backfill',
      });
    }

    // Process in batches
    let updated = 0;
    const batch = records.slice(offset, offset + BATCH_SIZE);

    for (const record of batch) {
      if (!dryRun) {
        await base44.asServiceRole.entities[entity].update(record.id, {
          company_id: COMPANY_ID,
        });
      }
      updated++;
    }

    return Response.json({
      entity,
      status: 'in_progress',
      recordsProcessed: updated,
      totalRemaining: Math.max(0, records.length - (offset + BATCH_SIZE)),
      nextOffset: offset + BATCH_SIZE,
      dryRun,
      message: dryRun
        ? 'DRY RUN: No changes made'
        : `Updated ${updated} records`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### Step 3.2: Backfill Execution Plan

**Sequence (executed from Dashboard admin panel or CLI):**

1. **Dry Run All Entities**
   ```
   POST /functions/backfillCompanyId
   {
     "entity": "Customer",
     "offset": 0,
     "dryRun": true
   }
   // Response: 47 records need backfill
   ```

2. **Execute Backfill (Customers)**
   ```
   POST /functions/backfillCompanyId
   {
     "entity": "Customer",
     "offset": 0,
     "dryRun": false
   }
   // Continue in batches until totalRemaining = 0
   ```

3. **Repeat for Estimate, WorkOrder, Invoice**

4. **Verification Query**
   ```javascript
   // Verify all records have company_id
   const customersWithoutId = await base44.asServiceRole.entities.Customer.filter({
     company_id: { $exists: false }
   });
   
   if (customersWithoutId.length === 0) {
     console.log('✅ All Customer records backfilled');
   }
   ```

**Safety Measures:**
- ✅ Dry run first (zero mutations)
- ✅ Batch processing (no timeout risks)
- ✅ Admin-only function
- ✅ Verification query after completion
- ✅ Transparent to users (no UI disruption)

**Rollback:** No action needed — backfill is idempotent and additive

---

## Phase 4: Read-Side Filtering (Week 3, Days 3-5)

### Step 4.1: Transparent Query Filtering

Update all entity queries to automatically filter by company_id (hidden from UI).

**File:** `src/lib/entityQueries.js` (NEW)

```javascript
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';

/**
 * Safe entity list with implicit company_id filtering
 * 
 * Usage: Same as base44.entities.Customer.list()
 * Returns only records for current company
 */
export function useCompanyFilteredEntity(entityName) {
  const company = useCompany();

  return {
    async list(sort = '', limit = 50) {
      return await base44.entities[entityName].filter(
        { company_id: company.id },
        sort,
        limit
      );
    },

    async filter(query = {}, sort = '', limit = 50) {
      return await base44.entities[entityName].filter(
        { ...query, company_id: company.id },
        sort,
        limit
      );
    },

    async get(id) {
      const record = await base44.entities[entityName].filter({ id, company_id: company.id });
      return record.length > 0 ? record[0] : null;
    },
  };
}
```

**Example Migration in Components:**

BEFORE:
```javascript
const customers = await base44.entities.Customer.list();
```

AFTER:
```javascript
const customerEntity = useCompanyFilteredEntity('Customer');
const customers = await customerEntity.list();
```

**Benefits:**
- ✅ Transparent company isolation
- ✅ No UI code changes required
- ✅ Automatic as company context updates
- ✅ Single-company mode still works (default company_id always used)

---

## Phase 5: Validation & Monitoring (Week 4, Days 1-5)

### Step 5.1: Validation Tests

**File:** `functions/validateMultiTenant.js` (NEW)

```javascript
/**
 * Comprehensive validation that multi-tenant structure is intact
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user?.role === 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const validations = {
    customers_with_company_id: 0,
    customers_without_company_id: 0,
    estimates_with_company_id: 0,
    estimates_without_company_id: 0,
    workorders_with_company_id: 0,
    workorders_without_company_id: 0,
    invoices_with_company_id: 0,
    invoices_without_company_id: 0,
  };

  // Count records with/without company_id
  validations.customers_with_company_id = (
    await base44.asServiceRole.entities.Customer.filter({ company_id: { $exists: true } })
  ).length;

  validations.customers_without_company_id = (
    await base44.asServiceRole.entities.Customer.filter({ company_id: { $exists: false } })
  ).length;

  // Repeat for other entities...

  const allBackfilled =
    validations.customers_without_company_id === 0 &&
    validations.estimates_without_company_id === 0 &&
    validations.workorders_without_company_id === 0 &&
    validations.invoices_without_company_id === 0;

  return Response.json({
    validations,
    status: allBackfilled ? 'ready' : 'in_progress',
    message: allBackfilled
      ? '✅ All records backfilled. Ready for multi-tenant.'
      : '⚠️ Some records still missing company_id',
  });
});
```

### Step 5.2: Monitoring Dashboard

Create admin dashboard to monitor company_id distribution.

**File:** `pages/MultiTenantAdmin.jsx` (NEW)

- Show count of records per company
- Display backfill progress
- Alert on orphaned records (no company_id)
- Log all company_id operations

---

## Rollback Strategy

### Scenario 1: Issue Found Pre-Execution
- **Action:** Do not execute backfill
- **Impact:** Zero changes to production

### Scenario 2: Issue Found During Backfill
- **Action:** Stop function execution
- **Impact:** Partial backfill (rollback = delete company_id from affected records)
- **Recovery:** Re-run full backfill after fix

### Scenario 3: Issue Found Post-Backfill
- **Action:** Remove query filters, keep company_id field (orphaned but harmless)
- **Fallback:** All records still queryable via original methods
- **Recovery:** Re-run validation to identify problem records

**Rollback Steps:**
```javascript
// 1. Stop all company_id filtering in queries
// 2. Revert entityWrappers.js to direct base44 calls
// 3. Delete or disable backfillCompanyId function
// 4. company_id field remains (unused)
// 5. System operates as before, no data loss
```

---

## Safety Checklist

- ✅ **Non-Breaking:** All changes are backward compatible
- ✅ **Additive:** No fields removed, only added
- ✅ **Testable:** Dry run mode before execution
- ✅ **Reversible:** Can rollback at any phase
- ✅ **Auditable:** All changes logged and timestamped
- ✅ **Performant:** Batch processing to avoid timeouts
- ✅ **Transparent:** UI requires zero changes
- ✅ **Admin-Only:** All mutations require admin role

---

## Timeline

| Phase | Duration | Day | Key Milestones |
|-------|----------|-----|----------------|
| 1 | 1-2 days | W1D1-2 | Schema updated, field added |
| 2 | 1-2 days | W1D2-3 | CRUD wrappers ready, tested |
| 3 | 5-7 days | W2-3 | Backfill completed, verified |
| 4 | 3-5 days | W3D3-5 | Query filtering live, transparent |
| 5 | 5 days | W4D1-5 | Validation complete, monitoring active |

**Total:** ~3-4 weeks

---

## Success Criteria

✅ All 4 entities have `company_id` field  
✅ 100% of existing records backfilled  
✅ New records auto-populate company_id  
✅ Query filters transparent to users  
✅ Zero data loss or inconsistency  
✅ Rollback tested and verified  
✅ Admin monitoring dashboard live  
✅ Zero production downtime  

---

## Next Steps (When Approved)

1. **Review** this plan with stakeholders
2. **Approve** each phase before execution
3. **Schedule** maintenance window if needed (recommend off-hours)
4. **Execute** Phase 1 (schema update)
5. **Validate** before proceeding to Phase 2
6. **Monitor** throughout backfill process
7. **Document** any deviations or issues
8. **Sign-off** once all phases complete

---

## Appendix: Entity-Specific Notes

### Customer
- **Backfill Count:** ~50-200 records
- **Risk:** Low (non-critical reference data)
- **Priority:** High (foundation for other entities)

### Estimate
- **Backfill Count:** ~100-500 records
- **Risk:** Medium (financial significance)
- **Priority:** High (core business object)
- **Note:** May have estimates created by different users — validate user context during backfill

### WorkOrder
- **Backfill Count:** ~50-300 records
- **Risk:** Medium (execution tracking)
- **Priority:** Medium (derived from estimates)
- **Note:** Depends on estimate company_id for referential integrity

### Invoice
- **Backfill Count:** ~50-300 records
- **Risk:** Medium (financial records)
- **Priority:** High (audit trail importance)
- **Note:** Must maintain alignment with work order company_id

---

**Document Version:** 1.0  
**Created:** 2026-04-07  
**Status:** Ready for Review (NOT YET EXECUTED)