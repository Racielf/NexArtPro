# Production RLS Security Audit — nexartpro

> **Classification:** SAFE READ ONLY / DOC ONLY — no policies changed, no data touched.
> **Date:** 2026-06-11
> **Target inspected:** `nexartpro` (`hdiejuqbhqhebrpneymo`) — PRODUCTION — read-only catalog queries only (`pg_class`, `pg_policies`, `pg_stat_user_tables`)
> **Branch:** `integration/investor-hub-schema`
> **Investor Hub status:** unchanged — paused, bridge in `supabase/drafts/`, Phase 6 not approved

---

## 1. Executive Summary

**RLS is enabled on all 49 production tables — but it is effectively OFF.**

Nearly every table carries a policy `anon_full_access` (`FOR ALL TO anon USING (true) WITH CHECK (true)`). Because PostgreSQL combines permissive policies with **OR**, any well-designed scoped policy that coexists with a permissive one is nullified. The anon key ships in the frontend bundle by design, so today **anyone with the public anon key can read, insert, update, and delete in virtually every production table without a session** — including bank data, legal signature records, user accounts, and the audit trail itself.

Three findings rise above the rest:

1. **`app_users` allows anonymous UPDATE** → an attacker can modify user records, including role assignment → **privilege escalation**.
2. **`audit_logs`, `security_audit_logs`, `recovery_vault` allow anonymous ALL** → an attacker can erase or forge the audit trail that would record the attack.
3. **All NexArtSign tables (`signing_*`) allow anonymous ALL** → signature evidence (events, certificates, participants) can be tampered with anonymously, undermining the legal validity of signed documents.

Mitigating factor: properly scoped policies already exist on several tables (`users_own_estimates`, `anon_select_signing_packages USING (token IS NOT NULL)`, payroll owner policies). The hardened design was started — it is simply being overridden by the permissive layer. Hardening is therefore mostly **deletion of permissive policies**, not new design from zero.

---

## 2. Methodology

Read-only queries executed via Supabase MCP (SELECT on catalog views only):

```sql
-- RLS status + row counts
SELECT c.relname, c.relrowsecurity, s.n_live_tup
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
WHERE n.nspname='public' AND c.relkind='r';

-- All policies
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname='public';
```

No writes, no DDL, no data reads from business tables.

---

## 3. Global Findings

| Metric | Value |
|---|---|
| Tables in `public` | 49 |
| Tables with RLS **enabled** | **49 / 49** ✓ |
| Tables with RLS disabled | 0 |
| Tables with `anon` ALL `USING(true) WITH CHECK(true)` | **49 / 49** (`anon_full_access` present on every table) |
| Tables with additional `anon_all_<table>` duplicate (from `20260503_dev_permissive_rls.sql`) | ~33 |
| Tables with `Allow anon read` (SELECT to anon, `true`) | ~35 |
| Tables with `Allow all for authenticated` (`true/true`) | ~37 |
| Tables that ALSO have properly scoped policies (nullified by OR) | 11+ |

**Policy generations detected (layered over time, never cleaned):**

1. `Allow anon read` / `Allow all for authenticated` / `Allow anon insert/update` — early dev policies
2. `users_own_*` / `*_owner_*` — scoped `auth.uid()` policies (good design, currently ineffective)
3. `anon_all_<table>` — from `20260503_dev_permissive_rls.sql`
4. `anon_full_access` — a fourth blanket layer present on **every** table
5. Token-scoped NexArtSign policies (`anon_select_signing_packages`, `anon_update_signing_packages`) — good design, currently ineffective

---

## 4. Policies Granting Access to `anon` — Worst Offenders Detail

Every table has at least `anon_full_access`. The entries below use the required reporting format for the highest-impact cases.

```
Table: app_users
Policy: anon_full_access (plus "Allow anon update" UPDATE TO public USING(true), "Allow anon insert", "Allow anon read")
Command: ALL (+ separate anon UPDATE/INSERT/SELECT)
Roles: {anon}, {public}
USING: true
WITH CHECK: true
Risk: CRITICAL — anonymous role escalation. An attacker can UPDATE app_users (e.g. role assignment) or INSERT a new privileged user with only the public anon key.
Recommended future hardening: drop all permissive policies; SELECT/UPDATE own row via auth.uid() = auth_user_id; admin management via service role or admin-role policy.
```

```
Table: audit_logs / security_audit_logs / auth_security_logs
Policy: anon_full_access (+ anon_all_audit_logs, Allow anon read)
Command: ALL
Roles: {anon}
USING: true
WITH CHECK: true
Risk: CRITICAL — audit trail can be read, forged, or deleted anonymously. Defeats the entire security-hardening investment of the 20260428/20260429 migrations.
Recommended future hardening: INSERT via service role / SECURITY DEFINER RPCs only; SELECT admin-only; no UPDATE/DELETE for any client role (append-only).
```

```
Table: recovery_vault (40 rows)
Policy: anon_full_access (+ anon_all_recovery_vault, Allow anon read)
Command: ALL
Roles: {anon}
USING: true
WITH CHECK: true
Risk: CRITICAL — recovery/backup material readable and writable anonymously.
Recommended future hardening: service-role only; no client access at all.
```

```
Table: bank_accounts / bank_transactions
Policy: anon_full_access (+ anon_all_*, Allow anon read)
Command: ALL
Roles: {anon}
USING: true
WITH CHECK: true
Risk: CRITICAL — banking data exposed anonymously (0 rows today, but schema is live; risk materializes with first row).
Recommended future hardening: admin/finance role only via app_roles; no anon policies.
```

```
Table: signing_packages / signing_participants / signing_events / signing_certificates
Policy: anon_full_access (+ anon_all_*, Allow anon read, anon_insert_signing_events)
Command: ALL
Roles: {anon}
USING: true
WITH CHECK: true
Risk: CRITICAL — legal signature evidence can be modified or deleted anonymously. Note: scoped policies anon_select_signing_packages (USING token IS NOT NULL) and anon_update_signing_packages (token-bound, blocks signed status) already exist and define the CORRECT public-signing access — they are currently redundant because the blanket policies override them.
Recommended future hardening: drop blanket policies; keep ONLY the token-scoped anon policies (public /sign/:token flow keeps working); authenticated full access can remain initially.
```

```
Table: customers / clients / estimates / estimate_snapshots / estimate_transmissions / estimate_version_histories / document_logs / public_document_access / comm_events
Policy: anon_full_access (+ generation-1/3 duplicates)
Command: ALL
Roles: {anon}
USING: true
WITH CHECK: true
Risk: CRITICAL — real customer PII (8 customers, 3 clients) and 17 live estimates with pricing readable/writable anonymously. document_logs (29 rows) and comm_events (36 rows) leak communication metadata.
Recommended future hardening: TO authenticated first pass; then app_roles row filtering. estimates already has users_own_estimates ready.
```

```
Table: invoices / proposals / work_orders / payments / payroll_runs / payroll_entries / time_entries / workers / worker_documents / worker_notes / subscriptions / appointments (82 rows)
Policy: anon_full_access (+ duplicates)
Command: ALL
Roles: {anon}
USING: true
WITH CHECK: true
Risk: HIGH — operational and HR/financial data writable anonymously. payroll_*, subscriptions, work_orders already have scoped owner policies that will take over once blanket policies are dropped.
Recommended future hardening: TO authenticated first pass; verify scoped owner policies match actual app usage before relying on them.
```

```
Table: services / materials / price_book_entries / pricing_audit_events / project_photos / job_assignments / time_tracking_logs / work_order_* (5 tables) / company_config / profiles / leads / nexartsign_token_attempts / nexartsign_security_blocks
Policy: anon_full_access (+ duplicates)
Command: ALL
Roles: {anon}
USING: true
WITH CHECK: true
Risk: MEDIUM — pricing intelligence (38 price book entries) and config exposed; less PII. nexartsign_token_attempts/blocks being anon-writable lets an attacker reset their own brute-force counters (raises this pair to HIGH in practice).
Recommended future hardening: TO authenticated; nexartsign_* tables service-role/RPC only.
```

---

## 5. Risk Classification Summary

| Risk | Tables | Anon exposure today |
|---|---|---|
| **CRITICAL** | app_users, audit_logs, security_audit_logs, auth_security_logs, recovery_vault, bank_accounts, bank_transactions, signing_packages, signing_participants, signing_events, signing_certificates, customers, clients, estimates, estimate_snapshots, estimate_transmissions, estimate_version_histories, document_logs, public_document_access | Full ALL access |
| **HIGH** | invoices, proposals, work_orders, payments, payroll_runs, payroll_entries, time_entries, workers, worker_documents, worker_notes, appointments, subscriptions, comm_events, nexartsign_token_attempts, nexartsign_security_blocks | Full ALL access |
| **MEDIUM** | services, materials, price_book_entries, pricing_audit_events, project_photos, job_assignments, time_tracking_logs, work_order_expenses, work_order_receipts, work_order_time_entries, work_order_daily_reports, work_order_histories | Full ALL access |
| **LOW** | company_config, profiles, leads | Full ALL access (low data volume/sensitivity today) |

There are **zero** tables without anon full access. The classification orders the hardening, not the exposure — exposure is uniform.

---

## 6. Key Technical Facts for the Hardening Design

1. **Permissive policies are OR-combined.** Dropping `anon_full_access` + `anon_all_*` + `Allow anon *` instantly activates the existing scoped policies. No new policy is needed for tables that already have generation-2/5 policies — but those must be verified against real app behavior first.
2. **The public signing flow (`/sign/:token`) legitimately requires anon access** — but only the token-scoped policies. Hardening must NOT remove `anon_select_signing_packages` / `anon_update_signing_packages`.
3. **The app may currently rely on anon access** if `nexartClient` performs reads before/without a session. This must be tested locally (Docker stack from `LOCAL_VALIDATION_SETUP_PLAN.md`) before dropping anything in production — otherwise login, dashboard, estimates or the client portal could break.
4. **Edge Functions using the service role are unaffected** by any of this hardening (service role bypasses RLS).
5. Policy cleanup should also remove the duplicate layers (4 generations) to leave one intentional policy set per table.

---

## 7. Recommended Hardening Phases

```
Phase RLS-0:
Backup/restore verification before any production RLS change.
Also: stand up the local Docker/Supabase stack (LOCAL_VALIDATION_SETUP_PLAN.md)
and reproduce the current policy state locally to test every drop before
it is applied to production.

Phase RLS-1:
Protect signature/document/estimate tables first.
signing_* (keep token-scoped anon policies), estimate_*, document_logs,
public_document_access, recovery_vault, audit/security logs, app_users.
app_users and audit tables are the priority inside the priority.

Phase RLS-2:
Protect customers/clients/work_orders/invoices.
customers, clients, appointments, work_orders + wo_* satellites,
invoices, proposals, leads, comm_events.

Phase RLS-3:
Protect financial/bank/payroll-related tables.
bank_accounts, bank_transactions, payments, payroll_runs, payroll_entries,
subscriptions, time_entries, workers, worker_documents, worker_notes.

Phase RLS-4:
Replace dev-permissive policies with role-aware policies using
app_roles/app_permissions (admin / office_agent / field_agent),
remove duplicate policy generations, and document the final policy
matrix per table. Investor Hub tables adopt the same model here
(they are already TO authenticated by design in the draft).
```

Each phase: test locally → backup → apply in a timestamped migration → smoke test the app (login, dashboard, estimates, signing link, client portal) → next phase. One phase per PR, per the project's existing rules.

---

## 8. What This Audit Did NOT Do

- No policy was created, altered, or dropped.
- No migration was applied.
- No business data was read (catalog metadata only).
- Investor Hub, bridge, and Phase 6 remain untouched.

---

*Production RLS Security Audit — SAFE READ ONLY / DOC ONLY*
*R.C Art Construction LLC — NexArtPro*
