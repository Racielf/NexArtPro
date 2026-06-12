# RLS Hardening — Phase 0 Plan (Backup/Restore + Local Preparation)

> **Classification:** SAFE READ ONLY / DOC ONLY — planning document. No SQL applied, no policies changed.
> **Date:** 2026-06-11
> **Branch:** `integration/investor-hub-schema`
> **Depends on:** `docs/fusion/PRODUCTION_RLS_SECURITY_AUDIT.md` (commit `0508599`), `docs/fusion/LOCAL_VALIDATION_SETUP_PLAN.md`

---

## 1. Confirmed Risk Summary (from audit `0508599`)

- **49/49** production tables have RLS **enabled**.
- **49/49** also carry **`anon_full_access`** — `FOR ALL TO anon USING (true) WITH CHECK (true)`.
- Up to 4 generations of permissive policies are layered (`Allow anon *`, `anon_all_<table>`, `anon_full_access`, plus early authenticated blankets).
- Existing **scoped policies** (`users_own_*`, token-bound signing policies, payroll owner policies) are currently **nullified** — PostgreSQL combines permissive policies with OR, so one `USING (true)` defeats every restriction beside it.
- Net effect: the public anon key grants read/write/delete on every production table, including `app_users` (privilege escalation), audit logs (trail tampering), and signature evidence (legal integrity).

---

## 2. Absolute Production Rule

```text
NO RLS change reaches production until:
1. Backup/restore is verified and practiced, AND
2. The exact policy change was applied and smoke-tested on the local stack.
Production is NEVER the first place a policy is dropped.
```

---

## 3. Backup / Restore Checklist (owner + agent, before RLS-1)

> **STATUS UPDATE 2026-06-11:** owner visually confirmed in the Supabase Dashboard for `nexartpro` (`hdiejuqbhqhebrpneymo`): **scheduled physical backups exist and restore buttons are visible**. Important caveat recorded: **Storage objects are NOT included in database backups** — signed PDFs/photos in Supabase Storage need a separate backup strategy before any risky operation involving Storage.

- [x] **Confirm backup availability** — VERIFIED 2026-06-11: scheduled physical backups visible in Dashboard, restore buttons present. Storage objects NOT covered.
- [x] **PITR or daily?** — DOCUMENTED 2026-06-12: Dashboard shows a list of **scheduled physical backups with per-backup restore buttons** — this UI pattern corresponds to **daily physical backups WITHOUT PITR** (when the PITR add-on is active, Supabase replaces the daily list with a point-in-time selector). Status recorded as: **daily physical backups, PITR presumed NOT enabled**. Final confirmation: Dashboard → Database → Backups → check for a "Point in Time" tab/section. Granularity: 1/day; data written after the last daily snapshot would be lost in a restore.
- [x] **Confirm restore procedure** — DOCUMENTED 2026-06-12 (from Dashboard observation + Supabase platform behavior):
  1. Dashboard → Project `nexartpro` → Database → Backups → choose backup → **Restore**.
  2. Restore is **in-place**: it overwrites the current production database with the snapshot. There is no built-in "restore to new project" button — restoring to a separate project requires a manual `pg_dump`/`pg_restore` (needs local CLI) or a support request.
  3. During restore the project is temporarily unavailable (downtime).
  4. Everything written AFTER the snapshot timestamp is lost — including rows created the same day.
  5. **Storage is NOT restored** — `storage.objects` metadata rows return to snapshot state but the files themselves are not part of the DB backup; mismatches are possible (see Storage Backup Strategy, §10).
  6. Complement before each RLS phase: `npx supabase db dump` (schema + policies) as a logical snapshot that allows policy-only rollback without a full in-place restore — far safer for RLS work, where data is never touched.
- [ ] **Restore target strategy** — decide in advance: restore in-place (overwrites production) vs. restore to a new project (cost implications — same $10/month consideration). Document the choice before it is ever needed under pressure.
- [ ] **Manual logical backup as belt-and-suspenders** — before each RLS phase, capture a `pg_dump --schema-only` of policies + full data dump if size permits. (Requires local CLI/psql from §4 — another reason local setup precedes everything.)
- [ ] **Rollback approval** — only the owner approves a production rollback. Record the explicit channel (this chat) and rule: agent proposes, owner approves, nothing automatic.
- [ ] **Rollback rehearsal** — at minimum, restore one backup into the local stack once, to prove the procedure works end-to-end.

---

## 4. Local Validation Dependency

- Execution environment comes from **`docs/fusion/LOCAL_VALIDATION_SETUP_PLAN.md`** (Docker Desktop + Supabase CLI + `supabase init/start`).
- Additional requirement for RLS work: **reproduce the current production policy state locally** before testing cleanup. Method: export production policies read-only (`pg_policies` catalog query → generate `CREATE POLICY` statements into a local-only seed file) so the local DB starts as permissive as production. Drops are then tested against a faithful replica of the problem.
- Docker + Supabase CLI **must be installed and verified** before any policy cleanup is tested anywhere. → **VERIFIED 2026-06-11:** WSL 2.7.8.0 (default v2), Docker 29.5.3, Docker Compose v5.1.4, Supabase CLI 2.106.0 via `npx`. Local stack itself (`init`/`start`/`db reset`) still NOT run — pending owner go-ahead.
- Production is never the first target. No exceptions.

---

## 5. Policy Cleanup Strategy

**Do NOT delete all permissive policies at once.** One batch per phase, one phase per PR, smoke tests between batches.

Priority order — most dangerous tables first:

```text
Batch A (identity & audit integrity):
  app_users, audit_logs, security_audit_logs, auth_security_logs, recovery_vault

Batch B (legal signature evidence & documents):
  signing_packages, signing_participants, signing_events, signing_certificates,
  document_logs, public_document_access

Batch C (customer PII & pricing):
  customers, clients, estimates, estimate_snapshots, estimate_transmissions
```

Per-table method (tested locally first, always):

1. List every policy on the table (`pg_policies`).
2. Classify each: blanket permissive (drop candidate) vs. scoped/intentional (keep).
3. Drop ONLY the blanket policies (`anon_full_access`, `anon_all_*`, `Allow anon read/insert/update`, blanket `Allow all for authenticated` where a scoped alternative exists).
4. Verify the surviving policy set supports the app's real access patterns.
5. Run smoke tests (§7). Only then move to the next table.

---

## 6. Public Signing Exception — DO NOT BREAK `/sign/:token`

The public signing flow legitimately requires `anon` access. The token-scoped policies already define the correct contract:

```text
KEEP: anon_select_signing_packages   — SELECT USING (token IS NOT NULL)
KEEP: anon_update_signing_packages   — UPDATE token-bound, blocks already-signed status
KEEP (review first): anon_insert_signing_events — needed for public signing audit trail;
      verify it can be constrained to token-validated flows or moved behind a
      SECURITY DEFINER RPC before keeping as-is.
```

Remove **only** the blanket permissive policies on signing tables, and only after local testing confirms the `/sign/:token` flow works end-to-end with just the scoped policies. If the flow breaks locally, redesign the scoped policy or route the operation through an Edge Function (service role) — never re-add a blanket policy as the fix.

---

## 7. Smoke Tests — Required After EACH Local Policy Batch

| # | Test | Expected |
|---|---|---|
| 1 | Login | Works |
| 2 | Dashboard loads | Works, no missing data for authorized user |
| 3 | Estimates list (authorized user) | Loads |
| 4 | Estimate detail | Loads |
| 5 | Signing link `/sign/:token` | Works end-to-end |
| 6 | Signing event insert | Works ONLY through the intended flow |
| 7 | Anon read on protected table (e.g. `customers` with anon key, no session) | **FAILS** |
| 8 | Anon write on protected table (e.g. UPDATE `app_users` with anon key) | **FAILS** |

Tests 7–8 are the proof the hardening works; tests 1–6 are the proof it didn't break the product. All eight must pass before a batch is considered locally validated.

---

## 8. Proposed Hardening Phases

```text
RLS-0: Backup/restore verification + local validation environment setup.   ← this plan
RLS-1: Protect app_users, audit_logs, security_audit_logs,
       auth_security_logs, recovery_vault.
RLS-2: Protect signing_* and document tables, preserving the
       token-scoped public signing flow.
RLS-3: Protect customers, clients, estimates (+ estimate satellites).
RLS-4: Protect work_orders (+ wo_* satellites), invoices, proposals,
       appointments, operational tables.
RLS-5: Protect bank_accounts, bank_transactions, payments, payroll_runs,
       payroll_entries, subscriptions, workers, worker_documents,
       worker_notes, time_entries.
RLS-6: Final role-aware policies with app_roles/app_permissions
       (admin / office_agent / field_agent), removal of remaining
       duplicate policy generations, documented policy matrix per table.
       Investor Hub tables adopt the same model here.
```

Each phase: local test → owner approval → backup snapshot → timestamped migration to production → production smoke test → report in `docs/fusion/`. One phase per PR.

---

## 9. Phase 0 Output Statement

```text
No SQL applied.
No production touched.
No policies created or dropped.
Only documentation committed.
```

Phase RLS-0 is complete when: backup/restore checklist (§3) is fully checked, local stack is running (per LOCAL_VALIDATION_SETUP_PLAN.md), and production policy state is reproduced locally. Then RLS-1 may be proposed for owner approval.

---

## 10. Storage Backup Strategy

> Added 2026-06-12. **Database backups do NOT include Storage objects.** Signed PDFs, estimate documents, logos, photos, and attachments live in Supabase Storage and need their own backup path before any risky production operation.

### 10.1 Buckets in use (verified read-only 2026-06-12)

| Bucket | Public | Objects | Size | Contents (per app usage) |
|---|---|---|---|---|
| `documents` | **true** ⚠️ | 24 | ~169 MB | Signed PDFs, estimate documents, uploads via `nexartClient.integrations.Core.UploadFile` |

This is the **only** bucket in production. All critical objects (signed PDFs, estimate documents, company logos, project photos, attachments) live in it.

**⚠️ Security flag (do not act yet — recorded for hardening phases):** the bucket is `public: true`, meaning any object is readable by URL without authentication. Combined with `documents`-table metadata being anon-readable (see audit `0508599`), object URLs are discoverable. Bucket privacy + signed URLs should be evaluated in RLS-2 (documents phase). **No objects are deleted, moved, or modified in Phase 0.**

### 10.2 Rules

- Do NOT delete, move, or rename any Storage object during backup work.
- Storage backup must exist BEFORE any production change that touches documents, signing, or estimates flows.
- Backup destination must be OUTSIDE Supabase (local disk + ideally one off-site copy).

### 10.3 Future backup options (choose when executing, not now)

1. **Supabase CLI export** — `npx supabase storage cp -r ss:///documents ./storage-backup/documents --experimental` (CLI ≥ 1.151; available in verified 2.106.0). Simple, scriptable, repeatable.
2. **Download/export script** — Node script using `@supabase/supabase-js` with service role key: `storage.from('documents').list()` + `download()` per object. More control, supports manifest with checksums.
3. **Manual bucket export** — Dashboard → Storage → download objects manually. Acceptable once for 24 objects; not repeatable.
4. **Separate backup location** — versioned folder outside Supabase, e.g. `D:\Backups\nexartpro-storage\YYYY-MM-DD\` plus an off-site/cloud copy for the ~169 MB.

Recommended: option 1 or 2, run before RLS-2, with a manifest (object path, size, hash, date) committed to `docs/fusion/` as evidence.

### 10.4 Phase 0 status fields

```text
PITR status:                       presumed NOT enabled (daily list UI) — final check pending in Dashboard
Daily backup status:               CONFIRMED — scheduled physical backups with restore buttons
Restore method:                    Dashboard in-place restore (overwrites production; downtime; post-snapshot data lost)
                                   + npx supabase db dump as policy-level logical snapshot before each RLS phase
Storage backup required:           YES — bucket `documents` (24 objects, ~169 MB, public) not covered by DB backups
Owner approval required before any restore: YES — agent proposes, owner approves in writing; nothing automatic
```

---

*RLS Hardening Phase 0 Plan — SAFE READ ONLY / DOC ONLY*
*R.C Art Construction LLC — NexArtPro*
