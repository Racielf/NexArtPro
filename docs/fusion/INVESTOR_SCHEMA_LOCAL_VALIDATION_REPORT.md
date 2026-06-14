# Investor Hub Schema — Local Validation Report
**Phase:** 5.1 / 5.2 — Validate Investor Hub SQL  
**Date:** 2026-06-10 (5.1) / 2026-06-11 (5.2)  
**Branch:** `integration/investor-hub-schema`  
**Commit:** `1dae8d9`  
**Status:** ⏸️ PAUSED — Option A approved but blocked on staging project cost ($10/month, owner approval pending)

---

## Build Pre-Validation

```
npm run build: ✓ built in 6.20s — PASS
```

---

## Supabase Target Analysis

### Projects discovered via MCP

| Project | ID | Region | Status | Assessment |
|---------|-----|--------|--------|-----------|
| `nexartpro` | `hdiejuqbhqhebrpneymo` | us-east-2 | ACTIVE | **PRODUCTION — off limits** |
| `nexartwo-staging` | `switwhrtgcooemaqlmbw` | us-west-2 | ACTIVE | NexArtWO staging schema — incompatible PKs |
| `NexArtWO` | `udaeifoibydcokefcmbg` | us-east-1 | ACTIVE | NexArtWO production — off limits |
| `nexartsign-pro-app` | `fhxyhpxgjuftykhvsomb` | us-west-2 | ACTIVE | NexArtSign — unrelated |
| `flipos` | `ddmeaykplksyamzffdya` | us-west-1 | ACTIVE | FlipOS (Spanish schema) — unrelated |
| `salon-booking-saas` | `aqrbhtoieamnneitutyv` | us-east-1 | ACTIVE | Unrelated project |

---

## Why No Target Is Usable

### Option 1 — `nexartpro` (PRODUCTION): NO

The only project with a MAIN-compatible UUID schema for `work_orders` is production. It has 82 appointments, 17 estimates, 68 signing events, 40 audit logs, and real operational data. Applying new migrations to production without staging validation violates the rules.

### Option 2 — `nexartwo-staging`: NO

Schema inspection reveals:

```sql
-- work_orders.id
column_name | data_type | column_default
------------|-----------|---------------
id          | text      | null              ← TEXT, not UUID

-- projects.id
column_name | data_type | column_default
------------|-----------|---------------
id          | text      | 'PROJ-' || to_char(now(),'YYYY') || '-' || lpad(nextval('project_seq'),4,'0')
                                           ← TEXT sequential, not UUID
```

Our draft SQL has:
```sql
work_order_id UUID REFERENCES work_orders(id) ON DELETE RESTRICT
```

A UUID FK referencing a TEXT PK column is a PostgreSQL type error. The migration would fail at the first table that references `work_orders(id)` (`project_expenses`, `project_refunds`, `project_disbursements`).

Additionally, all 9 investor hub tables already exist in `nexartwo-staging` with the NexArtWO schema (TEXT/SERIAL PKs). While `CREATE TABLE IF NOT EXISTS` would skip them silently, the schema mismatch means none of our UUID FK constraints, triggers, or sequences would be applied to those existing tables. The validation result would be misleading.

### Option 3 — `flipos`: NO

Has a FlipOS schema (Spanish tables: `propiedades`, `socios`, `trabajos_orden`, etc.). No `work_orders` table exists. Completely different context.

---

## Bridge File Position

**`20260610_investor_hub_work_orders_bridge_draft.sql` is in `supabase/drafts/` — NOT in `supabase/migrations/`.**

Confirmed via guardrail check after commit `f8d276f` moved it out of migrations. It will NOT run automatically with `supabase db reset`.

---

## SQL Applied

| File | Applied |
|------|---------|
| `20260610_investor_hub_schema_draft.sql` | NO — no compatible target |
| `20260610_investor_hub_work_orders_bridge_draft.sql` | NO — not to be applied yet |

**Production touched: NO.**

---

## What Is Needed to Proceed

### Option A — Create NexArtPro Staging Project (Recommended)

Create a new Supabase project and apply MAIN migrations in order:

```bash
# 1. Create new Supabase project via dashboard → name: "nexartpro-staging"
# 2. Configure .env with the staging URL/anon key
# 3. Apply core MAIN migrations to establish work_orders with UUID PK:
supabase db push --db-url postgresql://postgres:<pass>@db.<staging-id>.supabase.co:5432/postgres
# OR apply individually with psql:
psql <staging-url> -f supabase/migrations/001_core_tables.sql
psql <staging-url> -f supabase/migrations/002_supporting_tables.sql
psql <staging-url> -f supabase/migrations/003_missing_columns_fix.sql
psql <staging-url> -f supabase/migrations/004_nexartsign_security_rpcs.sql
# (skip security hardening migrations for staging if desired)
psql <staging-url> -f supabase/migrations/20260610_investor_hub_schema_draft.sql
```

This establishes `work_orders` with UUID PK (from `001_core_tables.sql`) before applying the investor hub schema.

**NOTE:** If using `create_project` MCP, stop and request explicit cost approval from owner before confirming.

### Option B — Apply to Production (Requires Explicit Approval)

The investor hub tables do NOT exist in `nexartpro` (production). All 9 tables in our draft are new — `CREATE TABLE IF NOT EXISTS` would not touch any existing data. The draft SQL does NOT alter any existing table and does NOT touch `work_orders` (bridge is separate).

**If the user explicitly approves application to production `nexartpro` (hdiejuqbhqhebrpneymo):**
- Risk is LOW for existing data (new tables only)
- Risk is MEDIUM for schema state (no staging rollback practice)
- The `USING (true) TO authenticated` RLS is STRICTER than existing tables' `anon USING (true)`
- Immutability triggers are safe and beneficial
- **Bridge file must still be applied separately with explicit approval**

This option requires explicit written approval: "Apply investor hub schema to nexartpro production."

### Option C — Validate with Modified SQL Against nexartwo-staging

Temporarily remove the 3 `work_order_id UUID REFERENCES work_orders(id)` FK constraints from the draft (replacing with plain `UUID` columns without FK), apply to `nexartwo-staging`, and validate everything except WO FK integrity.

This tests: sequences, functions, triggers (including immutability), project_number auto-generation, capital_contributions immutability, RLS policies, all 9 table structures.

**Downside:** The SQL file would differ from what ultimately runs on production. This is a validation shortcut, not a full equivalence test.

---

## Phase 5.2 — Staging Creation Attempt (2026-06-11)

Option A (create `nexartpro-staging`) was selected and attempted via Supabase MCP.

**Execution log:**

| Step | Result |
|------|--------|
| `list_organizations` | One org: `R.C Art Construction` (`vwxjylyfjlmoqssaubtb`) |
| `get_cost` (type: project) | **$10.00 / month — recurring** |
| `create_project` | **NOT EXECUTED** — stopped per cost guardrail |

**Outcome: ⛔ BLOCKED ON COST APPROVAL**

- Supabase MCP returned a recurring monthly charge of $10/month for a new project in this org
- Per owner rules, no recurring cost may be confirmed automatically
- Owner decision (2026-06-11): **do not approve the $10/month yet — pause Option A**
- Project creation not executed
- Production (`nexartpro` / `hdiejuqbhqhebrpneymo`) untouched
- SQL not applied to any database
- Bridge not applied — remains in `supabase/drafts/`

**Paths forward (owner to decide with no time pressure):**

1. Approve $10/month and create `nexartpro-staging` (full validation, can be deleted after 1 month)
2. Validate locally by installing Docker + Supabase CLI (free, requires local setup)
3. Apply to production `nexartpro` with backup + explicit written approval
4. Pause Investor Hub validation until staging has budget

---

## Pending Decisions for User

1. **Staging target decision:** Create `nexartpro-staging` project (stop for cost approval), use production with approval, or validate with modified SQL on nexartwo-staging?

2. **Bridge file location:** CONFIRMED in `supabase/drafts/` — safe from accidental execution.

3. **Production application:** If Option B is chosen, explicit written approval required.

---

## Ready for Work Orders Bridge: NO — pending primary schema validation

## Ready for Phase 6 React UI: Conditional

Phase 6 React UI (connecting stubs to real data) can proceed independently of staging validation IF the production project is the eventual target. The React components use nexartClient which reads from whatever project the env vars point to. If VITE_INVESTOR_HUB_ENABLED remains false, no investor data is accessible from the app regardless of whether the tables exist in the DB.

---

*Phase 5.1 / 5.2 — Local Validation Report*  
*R.C Art Construction LLC — NexArtPro*
