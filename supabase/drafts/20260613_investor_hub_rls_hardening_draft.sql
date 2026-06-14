-- ============================================================
-- DRAFT — DO NOT APPLY WITHOUT REVIEW
-- NexArtPro — Phase 7: Investor Hub RLS Hardening
-- Migration: 20260613_investor_hub_rls_hardening_draft.sql
-- ============================================================
-- Current state (scaffold):
--   All investor hub tables have: TO authenticated USING (true)
--   = any logged-in user can read/write everything
--
-- Target state (this migration):
--   admin        → full access to all tables
--   office_agent → read/write projects, work_orders bridge — NO investor/capital/flip data
--   field_agent  → no access to any investor hub tables
--
-- Role source: app_users.role column (per src/lib/roleUtils.js)
-- Role check: subquery against app_users using auth.uid()
-- JWT claim: If roles are embedded in JWT, replace subqueries with:
--   (auth.jwt() ->> 'user_role') = 'admin'
-- ============================================================
-- BEFORE APPLYING:
--   1. Confirm role storage: are roles in JWT claims or only in app_users?
--   2. Test on staging with each role to verify access matrix
--   3. Never apply while active users are in production
-- ============================================================

-- Helper: inline role check (replace if using JWT claims instead)
-- Returns true if authenticated user has the given role in app_users
-- Usage: user_has_role('admin')

CREATE OR REPLACE FUNCTION investor_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT role FROM app_users WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── projects ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "projects_select_draft" ON projects;
DROP POLICY IF EXISTS "projects_insert_draft" ON projects;
DROP POLICY IF EXISTS "projects_update_draft" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated
  USING (investor_user_role() IN ('admin', 'office_agent'));

CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin')
  WITH CHECK (investor_user_role() = 'admin');

-- ─── investors & investor_companies ─────────────────────────────────────────

DROP POLICY IF EXISTS "investors_select_draft" ON investors;
DROP POLICY IF EXISTS "investors_insert_draft" ON investors;
DROP POLICY IF EXISTS "investors_update_draft" ON investors;
DROP POLICY IF EXISTS "investor_companies_select_draft" ON investor_companies;
DROP POLICY IF EXISTS "investor_companies_insert_draft" ON investor_companies;
DROP POLICY IF EXISTS "investor_companies_update_draft" ON investor_companies;

CREATE POLICY "investors_select" ON investors
  FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');

CREATE POLICY "investors_insert" ON investors
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "investors_update" ON investors
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin')
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "investor_companies_select" ON investor_companies
  FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');

CREATE POLICY "investor_companies_insert" ON investor_companies
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "investor_companies_update" ON investor_companies
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin')
  WITH CHECK (investor_user_role() = 'admin');

-- ─── project_investors ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "project_investors_select_draft" ON project_investors;
DROP POLICY IF EXISTS "project_investors_insert_draft" ON project_investors;
DROP POLICY IF EXISTS "project_investors_update_draft" ON project_investors;

CREATE POLICY "project_investors_select" ON project_investors
  FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');

CREATE POLICY "project_investors_insert" ON project_investors
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "project_investors_update" ON project_investors
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin')
  WITH CHECK (investor_user_role() = 'admin');

-- ─── capital_contributions & capital_calls ───────────────────────────────────

DROP POLICY IF EXISTS "capital_contributions_select_draft" ON capital_contributions;
DROP POLICY IF EXISTS "capital_contributions_insert_draft" ON capital_contributions;
DROP POLICY IF EXISTS "capital_contributions_update_draft" ON capital_contributions;
DROP POLICY IF EXISTS "capital_calls_select_draft" ON capital_calls;
DROP POLICY IF EXISTS "capital_calls_insert_draft" ON capital_calls;
DROP POLICY IF EXISTS "capital_calls_update_draft" ON capital_calls;

CREATE POLICY "capital_contributions_select" ON capital_contributions
  FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');

CREATE POLICY "capital_contributions_insert" ON capital_contributions
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "capital_contributions_update" ON capital_contributions
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin')
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "capital_calls_select" ON capital_calls
  FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');

CREATE POLICY "capital_calls_insert" ON capital_calls
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "capital_calls_update" ON capital_calls
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin')
  WITH CHECK (investor_user_role() = 'admin');

-- ─── flip_analyses ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "flip_analyses_select_draft" ON flip_analyses;
DROP POLICY IF EXISTS "flip_analyses_insert_draft" ON flip_analyses;
DROP POLICY IF EXISTS "flip_analyses_update_draft" ON flip_analyses;

CREATE POLICY "flip_analyses_select" ON flip_analyses
  FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');

CREATE POLICY "flip_analyses_insert" ON flip_analyses
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "flip_analyses_update" ON flip_analyses
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin')
  WITH CHECK (investor_user_role() = 'admin');

-- ─── project_expenses / project_refunds / project_disbursements ─────────────

DROP POLICY IF EXISTS "project_expenses_select_draft" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert_draft" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_update_draft" ON project_expenses;

CREATE POLICY "project_expenses_select" ON project_expenses
  FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');

CREATE POLICY "project_expenses_insert" ON project_expenses
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');

-- project_expenses / refunds / disbursements are immutable — no UPDATE policy

DROP POLICY IF EXISTS "project_refunds_select_draft" ON project_refunds;
DROP POLICY IF EXISTS "project_refunds_insert_draft" ON project_refunds;
DROP POLICY IF EXISTS "project_disbursements_select_draft" ON project_disbursements;
DROP POLICY IF EXISTS "project_disbursements_insert_draft" ON project_disbursements;

CREATE POLICY "project_refunds_select" ON project_refunds
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_refunds_insert" ON project_refunds
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "project_disbursements_select" ON project_disbursements
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_disbursements_insert" ON project_disbursements
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');

-- ============================================================
-- END OF HARDENING DRAFT
-- Access matrix result:
--   admin        → ALL tables: SELECT + INSERT + UPDATE
--   office_agent → projects: SELECT only
--   field_agent  → no access (RLS blocks all)
-- ============================================================
