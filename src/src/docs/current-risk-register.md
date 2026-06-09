# Current Risk Register — NexArtPro

_Generated: 2026-05-09 · Author: housekeeping audit_

---

## Scope

This document is a **snapshot only**. It records the current state of stale PRs, open risks, and pending items in the NexArtPro repository as of the date above.

**This document does not implement any changes.** No code, configuration, auth, Supabase functions, migrations, or dependencies are modified. Its sole purpose is to provide a clear baseline for future focused PRs.

---

## Stale PRs

| PR | Title / Description | Status | Recommendation |
|----|---------------------|--------|----------------|
| #1 | ClientEstimateView / FinalDocumentRenderer fix | **Obsolete** — already resolved in `main` | Close without merge |
| #2 | EstimateActionsPanel visual draft | **Stale** — superseded by a newer version of `EstimateActionsPanel` already in `main` | Close without merge |
| #6 | NexArtSign Supabase-only backend (draft) | **Stale draft** — do not merge; retain as historical reference for a future focused Supabase-only NexArtSign audit | Do **not** merge; keep as reference only |

> **Note:** Closing #1 and #2 is safe. Neither contains unreleased logic. PR #6 must remain open (or be archived, not merged) until a dedicated `audit/nexartsign-supabase-completion` PR supersedes it.

---

## Critical Risks

| # | Risk | Impact | Recommended Next Action | Priority |
|---|------|--------|------------------------|----------|
| R-01 | **AUTH BYPASS active in `App.jsx`** — `ProtectedRoute` allows unrestricted access; `/team-access` and `/login` redirect directly to `/dashboard` | **High** — any user can access admin routes without authentication | Restore `ProtectedRoute_Original` in a dedicated `auth/restore-protected-routes` PR | 🔴 Critical |
| R-02 | **Base44 hybrid dependency still present** — `package.json` and `vite.config.js` still include Base44 SDK; app runs in hybrid Base44 + Supabase mode | **Medium** — introduces dual-layer complexity; Base44 removal is a future architectural decision | Document the boundary explicitly before any migration attempt; do not remove yet | 🟡 Medium |
| R-03 | **Supabase fallback credentials hardcoded in `supabaseClient.js`** — URL and anon key have hardcoded fallback values | **High** — if env vars are missing in any environment, hardcoded keys are exposed | Replace hardcoded fallbacks with explicit error throwing; handled in a future cleanup PR | 🔴 High |
| R-04 | **NexArtSign Supabase completion needs focused audit** — PR #6 drafted a Supabase-only completion flow but was never merged; current state of signing completion in `main` is not fully audited | **Medium** — signing certificates / audit trails may be incomplete or partially written | Create dedicated `audit/nexartsign-supabase-completion` PR referencing PR #6 history | 🟡 Medium |
| R-05 | **No formal test script / QA baseline still incomplete** — `run-tests.js` exists under `agent/` but there is no CI pipeline, no automated test gate, and no minimum quality threshold | **Medium** — regressions can ship silently | Create `ci/minimum-quality-gates` PR to add at minimum a build-check and lint step | 🟡 Medium |

---

## Estimate Pipeline Status

| Item | Status |
|------|--------|
| `ConvertToWorkOrderButton` critical fixes | ✅ Applied in `main` |
| `updated_by` current-user field fix | ✅ Applied in `main` |
| Dead code stubs removal | ✅ Applied in `main` |
| `ProposalActionsPanel` numbering centralization | ✅ Applied in `main` |
| Request Changes flow (`ClientEstimateView`) | ⏳ Pending — optional enhancement |
| `/send-estimate` legacy route decision | ⏳ Pending — route still present; needs deprecation or formal redirect decision |
| `document_type` coercion in `EstimateEditor.loadEstimate` (PROPOSAL → ESTIMATE) | ⚠️ Pending verification — may cause silent coercion of `PROPOSAL` documents to `ESTIMATE` type on load; requires a targeted test before fix |
| `origin_type` on WorkOrder created from Proposal | ⚠️ Pending — value may be set to `"estimate"` instead of `"proposal"`; low urgency but worth correcting for traceability |

---

## Next Recommended PRs

Execute in the following order to minimize conflict risk:

| Order | Branch Name | Scope |
|-------|-------------|-------|
| 1 | `auth/restore-protected-routes` | Re-enable `ProtectedRoute_Original`; remove AUTH BYPASS comments; restore `/team-access` and `/login` flows |
| 2 | `audit/nexartsign-supabase-completion` | Audit NexArtSign signing completion, certificate generation, and audit trail writes against PR #6 reference |
| 3 | `cleanup/send-estimate-legacy-route` | Decide and execute: deprecate or formally redirect `/send-estimate` |
| 4 | `feature/client-request-changes` | Implement Request Changes flow in `ClientEstimateView` |
| 5 | `ci/minimum-quality-gates` | Add GitHub Actions build + lint check as a minimum CI gate |

---

## Non-goals

This document explicitly does **not**:

- Make any code changes
- Make any auth changes
- Remove or modify Base44 dependency
- Change Supabase functions or migrations
- Merge stale PRs (#1, #2, #6)
- Change runtime behavior in any way
- Fix any of the risks listed above
- Refactor any component
- Modify `src/`, `supabase/`, `package.json`, `vite.config.js`, or any configuration file

---

## Validation Checklist

- [x] Only `docs/current-risk-register.md` was created
- [x] No runtime files were modified
- [x] No configuration was modified
- [x] No dependencies were modified
- [x] No Supabase files were modified
- [x] No stale PRs were merged
- [x] No risks were resolved