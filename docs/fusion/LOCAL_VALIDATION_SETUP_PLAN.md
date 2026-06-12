# Local Validation Setup Plan — Investor Hub Schema (Option B)

> **Classification:** DOC ONLY — this document plans future work. Nothing in it has been executed.
> **Date:** 2026-06-11
> **Branch:** `integration/investor-hub-schema`
> **Author:** NexArtPro Fusion Agent + R.C Art Construction LLC

---

## 1. Current Status

| Item | State |
|---|---|
| Branch | `integration/investor-hub-schema` |
| Latest known commit | `4b89842` |
| Investor Hub SQL | PAUSED — staging blocked by $10/month cost |
| Production (`nexartpro` / `hdiejuqbhqhebrpneymo`) | UNTOUCHED |
| Bridge | Protected in `supabase/drafts/` — NOT in `supabase/migrations/` |
| Phase 6 UI | NOT approved |
| Working tree | Clean |

---

## 2. Why Local Validation (Option B) Is Recommended

- **Free** — no $10/month staging project, no recurring charge.
- **Zero production risk** — runs entirely on the local machine inside Docker.
- **Correct sequence** — `supabase db reset` runs MAIN migrations + Investor Hub draft in the exact order production would eventually receive them. Better than partial/modified-SQL validation.
- **Permanent infrastructure** — the local stack will also serve the future `work_orders` bridge, financial views, RLS hardening, and every future schema phase. Installed once, used forever.

---

## 3. Windows Prerequisites

| Tool | Status today | Notes |
|---|---|---|
| Docker Desktop | NOT installed | Required — Supabase local runs on Docker. Installs WSL2 automatically if missing |
| WSL2 | Unknown | Docker Desktop installer handles it; may require one reboot |
| Supabase CLI | NOT installed | Install via Scoop (recommended on Windows) or direct download |
| Git | ✓ Present | |
| Node/npm | ✓ Present | Build already passing |

Supabase CLI install options (choose one, **do not run now**):

```powershell
# Option 1 — Scoop (recommended)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Option 2 — direct download
# https://github.com/supabase/cli/releases (supabase_windows_amd64.zip → add to PATH)
```

---

## 4. Installation Verification Checklist

After installing (future step), verify before anything else:

```powershell
docker --version
docker compose version
supabase --version
```

All three must return versions. If any fails → STOP (see §11).

---

## 5. Repo Preparation

```powershell
cd "D:\My Bussines\SQL BSE\Fusion System\Agent\02-working-main\NexArtPro-main"
git status            # must be: working tree clean
git log --oneline -8  # must show 4b89842 (or later) on integration/investor-hub-schema
npm run build         # must PASS before touching DB
```

---

## 6. Bridge Safety Check — MANDATORY before any local reset

```powershell
Get-ChildItem supabase\migrations | Select-String "investor_hub_work_orders_bridge"
Get-ChildItem supabase\drafts | Select-String "investor_hub_work_orders_bridge"
```

Expected:

- `supabase/migrations/` → **no match** (bridge NOT present)
- `supabase/drafts/` → `20260610_investor_hub_work_orders_bridge_draft.sql` present

If the bridge appears in `supabase/migrations/` → **STOP**. `db reset` would execute it.

---

## 7. Local Supabase Initialization

**Verified 2026-06-11: `supabase/config.toml` does NOT exist.** The repo has `supabase/migrations/`, `supabase/functions/`, and `supabase/drafts/` but was never initialized for the CLI.

Therefore `supabase init` will be required (future step, **do not execute now**):

```powershell
# FUTURE — creates supabase/config.toml; preserves existing migrations/ and functions/
supabase init
```

Notes:

- `supabase init` is non-destructive to existing `supabase/` contents.
- Two loose SQL files exist at `supabase/` root (`001_users_roles.sql`, `002_customers.sql`). They are NOT in `migrations/` and will NOT run with `db reset`. Leave them as-is; flag for future cleanup review.

---

## 8. Future Execution Flow — NOT TO RUN NOW

```powershell
# FUTURE ONLY
supabase start     # boots local Postgres + services in Docker
supabase db reset  # drops local DB, re-runs ALL files in supabase/migrations/ in order
```

`supabase db reset` executes every file in `supabase/migrations/` in lexicographic filename order against the **local** database only. This is why the bridge must stay in `supabase/drafts/` — anything inside `migrations/` runs automatically.

---

## 9. Migration Order Expectations

Lexicographic order of `supabase/migrations/` (verified):

```text
001_core_tables.sql                          ← creates work_orders with UUID PK
002_supporting_tables.sql
003_missing_columns_fix.sql
004_nexartsign_security_rpcs.sql
20260428_*.sql  (security / RBAC / hardening — 8 files)
20260429_*.sql  (NexArtSign phase 3/4 — 2 files)
20260503_dev_permissive_rls.sql
20260610_investor_hub_schema_draft.sql       ← runs LAST — work_orders UUID already exists
```

Requirements:

- MAIN migrations run first; `work_orders.id` must be UUID **before** the Investor Hub draft runs (its 3 FKs reference `work_orders(id)`).
- The bridge file must NOT run (stays in `drafts/`).

---

## 10. Validation Queries (run after successful `db reset` — FUTURE)

Connect via `supabase db` / local Studio (http://127.0.0.1:54323) and run:

```sql
-- 10.1 work_orders.id must be UUID
SELECT data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='work_orders' AND column_name='id';
-- expected: uuid

-- 10.2 All 9 Investor Hub tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
('projects','project_expenses','project_refunds','project_disbursements',
 'investor_companies','investors','project_investors','capital_contributions','capital_calls')
ORDER BY table_name;
-- expected: 9 rows

-- 10.3 Sequence exists
SELECT sequencename FROM pg_sequences WHERE sequencename='project_number_seq';
-- expected: 1 row, starts at 1000

-- 10.4 All 10 functions exist
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN
('investor_set_updated_at','generate_project_number',
 'prevent_expense_delete','prevent_expense_update',
 'prevent_refund_delete','prevent_refund_update',
 'prevent_disbursement_delete','prevent_disbursement_update',
 'prevent_contribution_delete','prevent_contribution_update')
ORDER BY proname;
-- expected: 10 rows

-- 10.5 project_number auto-generation
INSERT INTO projects (name) VALUES ('VALIDATION TEST') RETURNING id, project_number;
-- expected: UUID id + project_number like 'PROJ-2026-1000'

-- 10.6 Investor insert
INSERT INTO investors (name, type, status) VALUES ('Test Investor','person','active') RETURNING id;
-- expected: UUID returned

-- 10.7 project_investors FK (use ids from 10.5/10.6)
INSERT INTO project_investors (project_id, investor_id, role, ownership_percentage)
VALUES ('<project-uuid>','<investor-uuid>','equity_partner',50.00) RETURNING id;
-- expected: success; repeat with random project_id → must FAIL with FK violation

-- 10.8 capital_contributions insert
INSERT INTO capital_contributions (project_id, investor_id, amount, date, method, type, status)
VALUES ('<project-uuid>','<investor-uuid>',10000.00,CURRENT_DATE,'wire','initial','confirmed')
RETURNING id;
-- expected: success

-- 10.9 Immutability triggers
DELETE FROM capital_contributions WHERE id='<contribution-uuid>';
-- expected: ERROR raised by trg_no_delete_capital_contributions
UPDATE capital_contributions SET amount=99999 WHERE id='<contribution-uuid>';
-- expected: ERROR raised by trg_no_update_capital_contributions

-- 10.10 RLS policies are TO authenticated (31 policy clauses in draft)
SELECT tablename, policyname, roles FROM pg_policies
WHERE schemaname='public' AND tablename IN
('projects','project_expenses','project_refunds','project_disbursements',
 'investor_companies','investors','project_investors','capital_contributions','capital_calls')
ORDER BY tablename, policyname;
-- expected: roles = {authenticated} on all; NO anon policies on investor tables

-- 10.11 Bridge column must be ABSENT
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='work_orders' AND column_name='project_id';
-- expected: 0 rows (bridge not applied)
```

---

## 11. Failure Policy

| Failure | Action |
|---|---|
| Docker install/start fails | STOP — document error, do not improvise alternatives |
| Supabase CLI fails | STOP |
| `001_core_tables.sql` fails | STOP — core baseline broken, nothing else is valid |
| `work_orders.id` is not UUID after reset | STOP — draft FKs are invalid against this baseline |
| Investor Hub draft fails | Document the EXACT SQL error in the validation report, STOP |
| Bridge found in `supabase/migrations/` | STOP immediately — do not run `db reset` |
| Any security/NexArtSign migration fails | Document exact error; decide with owner whether it blocks Investor Hub validation. Never ignore silently |

In every STOP case: production is never a fallback target.

---

## 12. Output Template — Local Validation Result

```text
Local Validation Result

Branch:
Commit:
Docker version:
Supabase CLI version:
Build:
Supabase local started:
db reset:
work_orders.id type:
Investor Hub SQL applied:
Bridge applied:
Tables 9/9:
Functions 10/10:
Sequence:
Trigger tests:
RLS:
Errors:
Ready for bridge:
Ready for Phase 6:
```

Results go into `docs/fusion/INVESTOR_SCHEMA_LOCAL_VALIDATION_REPORT.md` as a new "Phase 5.3 — Local Validation" section, then commit.

---

## 13. Committing This Plan

```powershell
git add docs/fusion/LOCAL_VALIDATION_SETUP_PLAN.md
git commit -m "docs(schema): plan local Supabase validation setup"
```

---

*Option B — Local Validation Setup Plan (DOC ONLY — nothing executed)*
*R.C Art Construction LLC — NexArtPro*
