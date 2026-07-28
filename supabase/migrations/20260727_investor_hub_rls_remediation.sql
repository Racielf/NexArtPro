-- Remediation: production Investor Hub tables were found with an "anon_full_access"
-- policy (roles: {anon}, cmd: ALL, USING (true)) granting unauthenticated read/write
-- access to all 10 tables, plus 3 orphaned "*_update_draft" policies (roles:
-- {authenticated}) allowing edits to tables meant to be immutable. Neither matches
-- any documented state -- CLAUDE.md and docs/fusion/FUSION_PHASES_STATUS.md both said
-- the state was "scaffold: TO authenticated USING (true)", and commit ba5c12c claimed
-- the admin/agent policies below were already applied to production on 2026-06-13.
-- Verified directly against pg_policies on 2026-07-27: neither was true. This
-- migration closes the anon exposure and applies the real admin/agent role-based
-- policies (roles verified live in app_users: 'admin' x2, 'agent' x1).
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-27. Verified after: zero
-- 'anon' role policies remain on any of the 10 tables below (queried pg_policies).

-- 1. Drop the wide-open anon policies
DROP POLICY IF EXISTS "anon_full_access" ON projects;
DROP POLICY IF EXISTS "anon_full_access" ON investors;
DROP POLICY IF EXISTS "anon_full_access" ON investor_companies;
DROP POLICY IF EXISTS "anon_full_access" ON project_investors;
DROP POLICY IF EXISTS "anon_full_access" ON capital_contributions;
DROP POLICY IF EXISTS "anon_full_access" ON capital_calls;
DROP POLICY IF EXISTS "anon_full_access" ON flip_analyses;
DROP POLICY IF EXISTS "anon_full_access" ON project_expenses;
DROP POLICY IF EXISTS "anon_full_access" ON project_refunds;
DROP POLICY IF EXISTS "anon_full_access" ON project_disbursements;

-- 2. Drop the orphaned open UPDATE policies on tables meant to be immutable
DROP POLICY IF EXISTS "project_expenses_update_draft" ON project_expenses;
DROP POLICY IF EXISTS "project_refunds_update_draft" ON project_refunds;
DROP POLICY IF EXISTS "project_disbursements_update_draft" ON project_disbursements;

-- 3. Helper function (already existed in prod with this exact definition; kept here
--    so this migration file is self-contained and re-runnable elsewhere)
CREATE OR REPLACE FUNCTION investor_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM app_users WHERE id = auth.uid() LIMIT 1;
$$;

-- 4. projects: admin full, agent read-only
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (investor_user_role() IN ('admin', 'agent'));
CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- 5. flip_analyses: admin only
CREATE POLICY "flip_analyses_select" ON flip_analyses
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "flip_analyses_insert" ON flip_analyses
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "flip_analyses_update" ON flip_analyses
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- 6. investors / investor_companies: admin only
CREATE POLICY "investors_select" ON investors
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "investors_insert" ON investors
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "investors_update" ON investors
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "investor_companies_select" ON investor_companies
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "investor_companies_insert" ON investor_companies
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "investor_companies_update" ON investor_companies
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- 7. project_investors: admin only
CREATE POLICY "project_investors_select" ON project_investors
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_investors_insert" ON project_investors
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "project_investors_update" ON project_investors
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- 8. capital_contributions / capital_calls: admin only
CREATE POLICY "capital_contributions_select" ON capital_contributions
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "capital_contributions_insert" ON capital_contributions
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "capital_contributions_update" ON capital_contributions
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "capital_calls_select" ON capital_calls
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "capital_calls_insert" ON capital_calls
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "capital_calls_update" ON capital_calls
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- 9. project_expenses / refunds / disbursements: admin only, no UPDATE (immutable)
CREATE POLICY "project_expenses_select" ON project_expenses
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_expenses_insert" ON project_expenses
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "project_refunds_select" ON project_refunds
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_refunds_insert" ON project_refunds
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');

CREATE POLICY "project_disbursements_select" ON project_disbursements
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_disbursements_insert" ON project_disbursements
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
