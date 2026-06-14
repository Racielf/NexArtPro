# Investor Hub — Schema Adaptation Plan
## Phase 5 — NexArtWO → MAIN UUID Adaptation

> **Status:** DRAFT — not applied to any database  
> **Branch:** `integration/investor-hub-schema`  
> **Date:** 2026-06-10  
> **Author:** Claude Sonnet 4.6 + R.C Art Construction LLC

---

## 1. Source Inspection — NexArtWO Tables Found

### 1.1 Migration files located

```
nexartwo-main/supabase/migrations/
  20260506_projects_financial_system.sql        ← Phase 1 (projects + financials)
  202605070001_investor_entities.sql            ← Phase 2B (investor hub)
  202605070002_project_expenses_created_by.sql  ← created_by column patch
  202605070003_work_orders_project_id.sql       ← WO ↔ project link

nexartwo-main/supabase/drafts/auth-rls/
  004a_user_roles_bootstrap.sql   ← DRAFT: user_roles table + helpers
  004b_user_roles_policies.sql    ← DRAFT: policies on user_roles
  005_rls_projects.sql            ← DRAFT: hardened RLS for projects
  006_rls_expenses_refunds.sql    ← DRAFT: hardened RLS for financials
  007_rls_disbursements.sql       ← DRAFT: hardened RLS for disbursements
  008_rls_financial_summaries.sql ← DRAFT: RLS for view/RPCs
  009_project_status_summary_view.sql ← DRAFT: restricted view for field_user
```

### 1.2 Tables inventoried in NexArtWO

| Table | PK Type | Notable |
|---|---|---|
| `projects` | `TEXT` (`PROJ-YYYY-NNNN`) | Sequential ID via `project_seq` |
| `project_expenses` | `SERIAL` | Immutable triggers; financial history |
| `project_refunds` | `SERIAL` | Immutable triggers; always positive |
| `project_disbursements` | `SERIAL` | Immutable triggers; payment records |
| `project_financial_summaries` | VIEW only | Computed from above |
| `investor_companies` | `UUID` | Already UUID — minimal changes needed |
| `investors` | `UUID` | Already UUID |
| `project_investors` | `UUID` | FK `project_id TEXT` → must adapt |
| `capital_contributions` | `UUID` | FK `project_id TEXT` → must adapt |
| `capital_calls` | `UUID` | FK `project_id TEXT` → must adapt |
| `work_orders` | `TEXT` in TWO | UUID in MAIN → FK patch needed |

### 1.3 Additional tables in NexArtWO drafts

| Table | Status | Phase 5 decision |
|---|---|---|
| `user_roles` | DRAFT only | ❌ Excluded — conflicts with MAIN `app_roles` system |
| `project_status_summary` | VIEW (draft) | Deferred to Phase 6 |
| `project_financial_summaries` | VIEW (live in TWO) | Deferred to Phase 6 (requires all financial tables first) |

---

## 2. MAIN Baseline — Existing Patterns

### 2.1 UUID standard
All production tables in MAIN use:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
Examples: `clients`, `customers`, `estimates`, `work_orders`, `invoices`, `workers`.

### 2.2 Soft delete pattern
MAIN uses `deleted_at TIMESTAMPTZ` on all core entities. NexArtWO uses `status = 'cancelled'` instead. **Decision:** add both to investor tables — `deleted_at` for MAIN compatibility, `status` enum for financial workflow integrity.

### 2.3 Timestamp convention
MAIN uses `created_date` / `updated_date` (not `created_at` / `updated_at`). NexArtWO uses `created_at` / `updated_at`.  
**Decision:** investor tables use `created_at` / `updated_at` (TWO convention) since these are new tables not inheriting MAIN naming. Document this inconsistency for future normalization.

### 2.4 company_id pattern
MAIN has `company_id TEXT DEFAULT 'rc-art'` on most tables (`customers`, `estimates`, `work_orders`, `invoices`, `workers`). This is a single-tenant marker, not a real FK.  
**Decision:** add `company_id TEXT NOT NULL DEFAULT 'rc-art'` to `projects` and all investor tables.

### 2.5 Role model
MAIN uses: `app_roles` table + `app_role_permissions` + roles: `admin`, `office_agent`, `field_agent`.  
NexArtWO uses: `user_roles` table + roles: `owner`, `admin`, `field_user`, `viewer`.  
**Decision:** MAIN roles win. TWO `user_roles` table NOT ported. RLS will use MAIN's `app_roles` pattern in Phase 6. For this draft, open policies with `USING (true)` matching MAIN's current dev-permissive state.

### 2.6 Work orders FK
MAIN `work_orders.id` is `UUID`. NexArtWO's `work_orders.project_id` is `TEXT REFERENCES projects(id)`. The bridge column must be `UUID REFERENCES projects(id)` in MAIN.

---

## 3. Primary Key Decision

### The problem
NexArtWO uses auto-generated TEXT IDs via a sequence:
```sql
id TEXT PRIMARY KEY DEFAULT 'PROJ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('project_seq')::text, 4, '0')
-- Example: PROJ-2026-1000
```

These are human-readable and operationally useful for construction teams.

### The decision
**MAIN UUIDs win.** UUID is the standard across all 40+ existing MAIN tables and 154 renamed files.

**Preserve human-readable IDs** via a separate column:
```sql
id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
project_number TEXT  UNIQUE NOT NULL,
-- project_number = 'PROJ-2026-1000', 'FLIP-001', etc.
-- Auto-generated via trigger or set manually
```

`project_number` is displayed in UI, used in PDF headers, referenced in communications — but never used as a FK. All FK references use UUID.

### Auto-generation of project_number
```sql
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := 'PROJ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('project_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Schema Adaptation — Table by Table

### 4.1 `projects`

| Column | NexArtWO (original) | MAIN adaptation | Notes |
|---|---|---|---|
| `id` | `TEXT` (seq) | `UUID DEFAULT gen_random_uuid()` | **Core change** |
| `project_number` | _(was `id`)_ | `TEXT UNIQUE NOT NULL` | New column, auto-generated |
| `company_id` | absent | `TEXT DEFAULT 'rc-art'` | MAIN standard |
| `name` | `TEXT NOT NULL` | unchanged | |
| `address` | `TEXT` | unchanged | |
| `purchase_date` | `DATE` | unchanged | |
| `status` | `TEXT DEFAULT 'planning'` | unchanged | planning/active/completed/on_hold/cancelled |
| `responsible` | `TEXT` | unchanged | |
| `purchase_price` | `NUMERIC` | unchanged | |
| `down_payment` | `NUMERIC` | unchanged | |
| `loan_amount` | `NUMERIC` | unchanged | |
| `realtor_fee` | `NUMERIC` | unchanged | |
| `title_company` | `TEXT` | unchanged | |
| `title_company_fee` | `NUMERIC` | unchanged | |
| `closing_costs` | `NUMERIC` | unchanged | |
| `inspection_fee` | `NUMERIC` | unchanged | |
| `insurance` | `NUMERIC` | unchanged | |
| `sale_price` | `NUMERIC` | unchanged | |
| `selling_agent_commission` | `NUMERIC` | unchanged | |
| `seller_closing_costs` | `NUMERIC` | unchanged | |
| `buying_agent` | `TEXT` | unchanged | |
| `buying_agent_company` | `TEXT` | unchanged | |
| `selling_agent` | `TEXT` | unchanged | |
| `lender_name` | `TEXT` | unchanged | |
| `lender_contact` | `TEXT` | unchanged | |
| `property_type` | `TEXT` | unchanged | |
| `beds` | `INTEGER` | unchanged | |
| `baths` | `NUMERIC` | unchanged | |
| `sqft` | `INTEGER` | unchanged | |
| `year_built` | `INTEGER` | unchanged | |
| `notes` | `TEXT` | unchanged | |
| `deleted_at` | absent | `TIMESTAMPTZ` | MAIN soft-delete pattern |
| `project_seq` | global sequence | replaced by `project_number_seq` + trigger | |

### 4.2 `project_expenses`

| Column | NexArtWO | MAIN adaptation |
|---|---|---|
| `id` | `SERIAL` | `UUID DEFAULT gen_random_uuid()` |
| `project_id` | `TEXT REFERENCES projects(id)` | `UUID REFERENCES projects(id)` |
| `work_order_id` | `TEXT REFERENCES work_orders(id)` | `UUID REFERENCES work_orders(id)` (MAIN WO UUID) |
| `company_id` | absent | `TEXT DEFAULT 'rc-art'` |
| `created_by` | added in 202605070002 | `UUID REFERENCES auth.users(id)` |
| all other columns | unchanged | unchanged |

### 4.3 `project_refunds`

Same pattern as `project_expenses`: `id SERIAL → UUID`, `project_id TEXT → UUID`, `work_order_id TEXT → UUID`, add `company_id`.

### 4.4 `project_disbursements`

Same pattern. Also: `work_order_id TEXT → UUID`.

### 4.5 `investor_companies`

Already has `id UUID PRIMARY KEY`. Only change: add `company_id TEXT DEFAULT 'rc-art'`.

### 4.6 `investors`

Already has `id UUID PRIMARY KEY`. Only change: add `company_id TEXT DEFAULT 'rc-art'`.

### 4.7 `project_investors`

| Column | NexArtWO | MAIN adaptation |
|---|---|---|
| `id` | `UUID` | unchanged |
| `project_id` | `TEXT REFERENCES projects(id)` | **`UUID REFERENCES projects(id)`** |
| `investor_id` | `UUID REFERENCES investors(id)` | unchanged |
| `role` | TEXT CHECK | unchanged |
| `ownership_percentage` | `NUMERIC(5,2)` | unchanged |
| `profit_split_percentage` | `NUMERIC(5,2)` | unchanged |
| `status` | TEXT CHECK | unchanged |
| `agreement_notes` | `TEXT` | unchanged |
| `company_id` | absent | `TEXT DEFAULT 'rc-art'` |
| UNIQUE | `(project_id, investor_id, role)` | unchanged (but now UUID project_id) |

### 4.8 `capital_contributions`

| Column | NexArtWO | MAIN adaptation |
|---|---|---|
| `id` | `UUID` | unchanged |
| `project_id` | `TEXT REFERENCES projects(id)` | **`UUID REFERENCES projects(id)`** |
| `investor_id` | `UUID REFERENCES investors(id)` | unchanged |
| `amount` | `NUMERIC(12,2) CHECK (> 0)` | unchanged |
| `date` | `DATE NOT NULL` | unchanged |
| `method` | TEXT CHECK (cash/wire/check/company_payment) | unchanged |
| `type` | TEXT CHECK (initial/additional/closing/reimbursement) | unchanged |
| `status` | TEXT CHECK (pending/confirmed/cancelled) | unchanged |
| `evidence_reference` | `TEXT` | unchanged |
| `notes` | `TEXT` | unchanged |
| `company_id` | absent | `TEXT DEFAULT 'rc-art'` |
| immutability triggers | present | **kept — financial integrity rule** |

### 4.9 `capital_calls`

Same pattern: `project_id TEXT → UUID`, add `company_id`.

### 4.10 `work_orders` bridge column

NexArtWO adds `project_id TEXT REFERENCES projects(id)`. MAIN must add the UUID equivalent:
```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
```

⚠️ This touches an existing production table and is **NOT included in the main draft SQL**.  
It lives in its own file: `supabase/drafts/20260610_investor_hub_work_orders_bridge_draft.sql`

**Application order:**
1. Apply `20260610_investor_hub_schema_draft.sql` first — confirm all 9 investor/project tables created successfully
2. Only then apply the bridge file — with explicit approval from project owner
3. The bridge column is nullable, so no existing work orders are affected

---

## 5. Migration Files — Phase 5 Deliverables

| File | Scope | Apply when |
|------|-------|------------|
| `supabase/migrations/20260610_investor_hub_schema_draft.sql` | 9 new tables, triggers, sequences, functions | Staging only — after approval |
| `supabase/drafts/20260610_investor_hub_work_orders_bridge_draft.sql` | `work_orders.project_id UUID` column only | After main draft confirmed; explicit approval required |

The main draft SQL does **not** touch `work_orders` or any other existing MAIN table.

---

## 6. Columns Omitted and Why

| Column / Table | Reason for omission |
|---|---|
| `project_seq` sequence | Replaced by `project_number_seq` + trigger |
| `user_roles` table (TWO) | Conflicts with MAIN `app_roles` system — different role names, different approach |
| `project_financial_summaries` VIEW | Deferred to Phase 6 — requires all financial tables stable first |
| `project_status_summary` VIEW | Deferred — restricted view for field_user, Phase 6 |
| `flip_analyses` | Not in TWO source yet — per CLAUDE.md spec, design separately in Phase 5/6 |
| TWO `auth_role()` function | Conflicts with MAIN auth model — needs redesign using `app_roles` |
| TWO `is_owner()` function | Same — MAIN has no `owner` role |

---

## 7. Risks

| Risk | Level | Mitigation |
|---|---|---|
| `work_orders.project_id` touches production table | High | Separate review required; nullable column — no data impact |
| `project_number_seq` gaps if inserts fail | Low | Acceptable for project numbers (not financial records) |
| `created_at` vs `created_date` naming inconsistency | Low | Document for future normalization phase |
| RLS policies `USING (true)` expose financial data | Medium | Matches MAIN's current dev-permissive state; Phase 6 hardens with `app_roles` |
| Two role systems (MAIN `app_roles` + TWO `user_roles`) | Medium | TWO system excluded; MAIN wins; Phase 6 maps permissions to `app_roles` |
| `company_id` as static TEXT not enforced | Low | Current MAIN pattern — single tenant; multi-tenant hardening is future scope |

---

## 8. Pending Decisions (Before Phase 6)

1. **`project_number` format**: confirm `PROJ-YYYY-NNNN` or allow custom? Should it be user-editable after creation?
2. **`created_by` column**: UUID FK to `auth.users(id)` or TEXT (like `responsible`)? TWO added it as TEXT patch.
3. **`work_orders.project_id` review**: explicit approval needed before applying to production.
4. **`flip_analyses` table**: not in TWO source — design from CLAUDE.md spec in Phase 6.
5. **RLS hardening timing**: currently `USING (true)` — when does Phase 6 activate `app_roles`-based policies?
6. **`project_financial_summaries` view**: deferred — include in Phase 6 with full financial table set.
7. **Investor access control**: CLAUDE.md mentions roles `administrador`, `capataz`, `socio`. These don't exist in MAIN's `app_roles` (`admin`, `office_agent`, `field_agent`). Need to decide: extend `app_roles` or use a separate investor-specific roles table?

---

## 9. Phase 6 Plan

Phase 6 can proceed when:
- [ ] Draft SQL applied to local/staging Supabase without errors
- [ ] `npm run build` passes on branch
- [ ] `work_orders.project_id UUID` column reviewed and approved
- [ ] RLS hardening design confirmed (which `app_roles` map to investor access)
- [ ] `flip_analyses` table spec approved
- [ ] `project_financial_summaries` view adapted for UUID project IDs

Phase 6 deliverables:
- Apply staging migration
- Connect `Projects.jsx` to `projectsApi.js` (CRUD)
- Port investor entities UI (React + TanStack Query + shadcn)
- Port capital contributions form
- Add `project_financial_summaries` view
- Smoke tests from TWO `qa/` adapted to UUID

---

*Phase 5 — Schema Adaptation Plan*  
*R.C Art Construction LLC — NexArtPro*
