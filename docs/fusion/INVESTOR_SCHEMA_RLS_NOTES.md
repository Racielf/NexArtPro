# Investor Hub — RLS Notes
## Phase 5 — Security Design

> **Status:** DRAFT — analysis only, no policies applied  
> **Branch:** `integration/investor-hub-schema`  
> **Date:** 2026-06-10

---

## 1. Existing MAIN RLS Pattern

### 1.1 Current state: dev-permissive

MAIN has a single migration `20260503_dev_permissive_rls.sql` that sets ALL tables to:
```sql
CREATE POLICY "anon_all_<table>" ON <table> FOR ALL TO anon USING (true) WITH CHECK (true);
```

This covers: `leads`, `estimates`, `work_orders`, `invoices`, `appointments`, `proposals`, `customers`, `clients`, `services`, `materials`, `workers`, `payments`, `time_entries`, `time_tracking_logs`, `job_assignments`, `project_photos`, `work_order_daily_reports`, `work_order_expenses`, `work_order_receipts`, `work_order_time_entries`, `worker_notes`, `worker_documents`, `comm_events`, `document_logs`, `estimate_snapshots`, `estimate_transmissions`, `estimate_version_histories`, `signing_packages`, `signing_participants`, `signing_events`, `signing_certificates`, `public_document_access`, `recovery_vault`, `price_book_entries`, `pricing_audit_events`, `bank_accounts`, `bank_transactions`, `audit_logs`.

**Meaning:** Production RLS hardening is planned but NOT yet active for most tables. The investor tables in this draft will match this pattern for consistency in staging.

### 1.2 MAIN role system

From `20260428_dynamic_rbac.sql`:
```sql
-- Roles (in app_roles table):
'admin'        -- Owner / Admin: full access
'office_agent' -- Office Agent: estimates, WOs, invoices
'field_agent'  -- Field Agent: field work orders only

-- Permissions (in app_permissions table):
'admin:all'
'team:manage'
'office:access'
'field:access'
'settings:manage'
'security:view'
'finance:manage'
'documents:sign'
```

Auth user linkage: `app_users.auth_user_id UUID REFERENCES auth.users(id)`

### 1.3 NexArtWO role system (NOT adopted)

TWO uses `user_roles` table with: `owner`, `admin`, `field_user`, `viewer`.  
TWO uses `auth_role()` SECURITY DEFINER function.  
TWO uses `is_owner()` SECURITY DEFINER function.  
**Decision: excluded entirely.** MAIN's `app_roles` is the authority.

### 1.4 company_id as tenant marker

MAIN uses `company_id TEXT DEFAULT 'rc-art'` as a static single-tenant identifier. It is NOT enforced via RLS today — just a data marker. Future multi-tenant work would add `USING (company_id = current_setting('app.company_id'))` type policies.

---

## 2. Draft RLS Strategy for Investor Tables

### 2.1 Phase 5 (this draft): authenticated-only staging scaffold

All investor tables get:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- TO authenticated: prevents anon access even in staging
-- Investor/financial data must never be readable without a valid session
CREATE POLICY "<table>_select_draft" ON <table> FOR SELECT TO authenticated USING (true);
CREATE POLICY "<table>_insert_draft" ON <table> FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "<table>_update_draft" ON <table> FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- No DELETE policy = trigger blocks it (capital_contributions, project_expenses, etc.)
```

**Why `TO authenticated` and not `USING (true)` open to PUBLIC?**  
MAIN's existing tables use `USING (true)` without a role clause via `20260503_dev_permissive_rls.sql`. That pattern was acceptable for operational tables (customers, estimates, WOs) but investor and capital data is financially sensitive. Phase 5 deliberately diverges here: investor tables use `TO authenticated` as a minimum guard from day 1 in staging. This is not inconsistency — it is appropriate escalation for higher-risk data.

**Why not full role-based restriction yet?**  
Because MAIN's `app_roles` permission mapping for investor access has not been designed yet (Phase 6). The `TO authenticated USING (true)` pattern is a safe staging scaffold: no anon access, but no row filtering yet. The hardening to `app_roles`-based conditions is mandatory before any production data enters these tables.

### 2.2 Phase 6 (hardening): `app_roles`-based policies

When investor tables move toward production, replace the `TO authenticated USING (true)` scaffold with `app_roles`-based conditions:

```sql
-- Helper function (if not already present from MAIN auth migration):
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT r.key FROM app_users u
  JOIN app_roles r ON r.id = u.role_id
  WHERE u.auth_user_id = auth.uid()
$$;

-- projects: admin sees all, field_agent sees status only (via view — future)
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    current_user_role() = 'admin'
    -- field_agent uses restricted view in Phase 6, not direct table
  );

-- investor tables: admin only
DROP POLICY IF EXISTS "investor_companies_select" ON investor_companies;
CREATE POLICY "investor_companies_select" ON investor_companies
  FOR SELECT USING ( current_user_role() = 'admin' );
-- etc.
```

### 2.3 Financial immutability (keeps from TWO — independent of RLS)

The following triggers from NexArtWO are kept because they are **data integrity rules, not auth rules**:

| Trigger | Table | Rule |
|---|---|---|
| `trg_no_delete_capital_contributions` | `capital_contributions` | No hard delete — set status = 'cancelled' |
| `trg_no_update_capital_contributions` | `capital_contributions` | Immutable: amount, date, investor_id, project_id |
| `trg_no_delete_expenses` | `project_expenses` | No delete — set status = 'cancelled' |
| `trg_no_update_expenses` | `project_expenses` | Immutable: amount, tax, project_id, receipt_date, vendor |
| `trg_no_delete_refunds` | `project_refunds` | No delete |
| `trg_no_update_refunds` | `project_refunds` | Immutable historical fields |
| `trg_no_delete_disbursements` | `project_disbursements` | No delete |
| `trg_no_update_disbursements` | `project_disbursements` | Immutable financial fields |

These triggers enforce MAIN's soft-delete rule (Rule 6.1: "Soft delete siempre") at the database level for financial records.

---

## 3. Deferred Policies — Phase 6

These policies exist in NexArtWO drafts but are NOT included in Phase 5 because they depend on a role model not yet integrated:

| Policy / File | Reason deferred |
|---|---|
| `005_rls_projects.sql` — `auth_role() IN ('owner', 'admin')` | Needs MAIN `app_roles` equivalent |
| `006_rls_expenses_refunds.sql` | Needs `finance:manage` permission check |
| `007_rls_disbursements.sql` | Same |
| `008_rls_financial_summaries.sql` | Needs RPC design in MAIN context |
| `009_project_status_summary_view.sql` | Needs field_agent restricted view |
| `prevent_non_owner_project_financial_update()` trigger | Depends on `auth_role()` function not in MAIN |

---

## 4. Financial Exposure Risks

| Risk | Severity | Status |
|---|---|---|
| `capital_contributions` readable by all authenticated users (dev-permissive) | **High** | Acceptable for staging only. Must be restricted in Phase 6 before any real investor data |
| `projects` financials (purchase_price, loan_amount, etc.) readable by field_agent | **High** | Requires restricted view pattern from TWO's 009 draft |
| No row-level company isolation | Medium | Single tenant today — company_id column ready for future enforcement |
| `flip_analyses` (when created) contains profit/reparto data | High | Table not created yet — design with strict RLS from day 1 |
| `project_investors` shows ownership percentages | High | Admin-only in Phase 6 hardening |
| `capital_calls` shows requested amounts | Medium | Admin-only in Phase 6 |

**CRITICAL RULE:** Before any real investor or financial data is entered into these tables, the Phase 6 RLS hardening must be applied. The `USING (true)` policies in this draft are staging scaffolding only.

---

## 5. Staging Checklist (Before Applying Draft)

- [ ] Confirm branch is `integration/investor-hub-schema` (not main)
- [ ] Confirm target is local Supabase or staging project (NOT `nexartpro` / `hdiejuqbhqhebrpneymo`)
- [ ] Confirm triple-check: target ID does NOT match `hdiejuqbhqhebrpneymo`
- [ ] Run `npm run build` passes before applying migration
- [ ] Inspect migration file for any `DROP TABLE` or `DROP COLUMN` statements (should be none)
- [ ] Verify `project_number_seq` doesn't conflict with any existing sequence
- [ ] Verify `investor_set_updated_at()` function is new — scoped name does NOT overwrite any MAIN function
- [ ] Verify `generate_project_number()` function is new and doesn't conflict
- [ ] Confirm bridge file is in `supabase/drafts/` not `supabase/migrations/`
- [ ] After applying: verify tables exist with `\dt` or Supabase Table Editor
- [ ] After applying: run `SELECT * FROM projects LIMIT 1` as authenticated user (should work; anon should be blocked)
- [ ] After applying: test INSERT into `projects` with project_number = NULL (trigger should auto-assign)
- [ ] After applying: test DELETE on `capital_contributions` (should RAISE EXCEPTION)

---

## 6. Phase 6 RLS Hardening Checklist

When MAIN-wide RLS hardening is activated:

- [ ] Create `current_user_role()` helper (or reuse MAIN pattern)
- [ ] Replace `USING (true)` on `projects` with `app_roles`-based policy
- [ ] Replace `USING (true)` on `investor_companies`, `investors`, `project_investors` with admin-only
- [ ] Replace `USING (true)` on `capital_contributions`, `capital_calls` with admin-only
- [ ] Replace `USING (true)` on `project_expenses`, `project_refunds`, `project_disbursements` with finance role
- [ ] Create restricted view for field_agent (project status only, no financials)
- [ ] Add `prevent_non_owner_project_financial_update()` trigger adapted to MAIN role system
- [ ] QA: verify field_agent cannot read purchase_price, loan_amount, sale_price
- [ ] QA: verify office_agent cannot read investor ownership_percentage or capital amounts
- [ ] QA: verify admin can read all investor and financial data
- [ ] QA: verify immutability triggers still fire after RLS hardening

---

*Phase 5 — Investor Hub RLS Notes*  
*R.C Art Construction LLC — NexArtPro*
