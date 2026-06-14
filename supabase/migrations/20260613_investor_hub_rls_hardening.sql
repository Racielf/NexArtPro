-- Phase 7: Investor Hub RLS Hardening
-- Applied to production hdiejuqbhqhebrpneymo on 2026-06-13
-- Roles present in app_users: 'admin', 'agent'
--
-- Access matrix:
--   admin  → full access (SELECT + INSERT + UPDATE) on all investor hub tables
--   agent  → SELECT only on projects (to link work orders)
--   other  → no access (blocked by RLS)

CREATE OR REPLACE FUNCTION investor_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM app_users WHERE id = auth.uid() LIMIT 1;
$$;

-- projects: admin full, agent read-only
DROP POLICY IF EXISTS "projects_select_draft" ON projects;
DROP POLICY IF EXISTS "projects_insert_draft" ON projects;
DROP POLICY IF EXISTS "projects_update_draft" ON projects;
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (investor_user_role() IN ('admin', 'agent'));
CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- flip_analyses: admin only
DROP POLICY IF EXISTS "flip_analyses_select_draft" ON flip_analyses;
DROP POLICY IF EXISTS "flip_analyses_insert_draft" ON flip_analyses;
DROP POLICY IF EXISTS "flip_analyses_update_draft" ON flip_analyses;
CREATE POLICY "flip_analyses_select" ON flip_analyses
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "flip_analyses_insert" ON flip_analyses
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "flip_analyses_update" ON flip_analyses
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- investors / investor_companies: admin only
DROP POLICY IF EXISTS "investors_select_draft" ON investors;
DROP POLICY IF EXISTS "investors_insert_draft" ON investors;
DROP POLICY IF EXISTS "investors_update_draft" ON investors;
CREATE POLICY "investors_select" ON investors
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "investors_insert" ON investors
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "investors_update" ON investors
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

DROP POLICY IF EXISTS "investor_companies_select_draft" ON investor_companies;
DROP POLICY IF EXISTS "investor_companies_insert_draft" ON investor_companies;
DROP POLICY IF EXISTS "investor_companies_update_draft" ON investor_companies;
CREATE POLICY "investor_companies_select" ON investor_companies
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "investor_companies_insert" ON investor_companies
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "investor_companies_update" ON investor_companies
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- project_investors: admin only
DROP POLICY IF EXISTS "project_investors_select_draft" ON project_investors;
DROP POLICY IF EXISTS "project_investors_insert_draft" ON project_investors;
DROP POLICY IF EXISTS "project_investors_update_draft" ON project_investors;
CREATE POLICY "project_investors_select" ON project_investors
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_investors_insert" ON project_investors
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "project_investors_update" ON project_investors
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- capital_contributions / capital_calls: admin only
DROP POLICY IF EXISTS "capital_contributions_select_draft" ON capital_contributions;
DROP POLICY IF EXISTS "capital_contributions_insert_draft" ON capital_contributions;
DROP POLICY IF EXISTS "capital_contributions_update_draft" ON capital_contributions;
CREATE POLICY "capital_contributions_select" ON capital_contributions
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "capital_contributions_insert" ON capital_contributions
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "capital_contributions_update" ON capital_contributions
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

DROP POLICY IF EXISTS "capital_calls_select_draft" ON capital_calls;
DROP POLICY IF EXISTS "capital_calls_insert_draft" ON capital_calls;
DROP POLICY IF EXISTS "capital_calls_update_draft" ON capital_calls;
CREATE POLICY "capital_calls_select" ON capital_calls
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "capital_calls_insert" ON capital_calls
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
CREATE POLICY "capital_calls_update" ON capital_calls
  FOR UPDATE TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- project_expenses / refunds / disbursements: admin only, no UPDATE (immutable)
DROP POLICY IF EXISTS "project_expenses_select_draft" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert_draft" ON project_expenses;
CREATE POLICY "project_expenses_select" ON project_expenses
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_expenses_insert" ON project_expenses
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');

DROP POLICY IF EXISTS "project_refunds_select_draft" ON project_refunds;
DROP POLICY IF EXISTS "project_refunds_insert_draft" ON project_refunds;
CREATE POLICY "project_refunds_select" ON project_refunds
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_refunds_insert" ON project_refunds
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');

DROP POLICY IF EXISTS "project_disbursements_select_draft" ON project_disbursements;
DROP POLICY IF EXISTS "project_disbursements_insert_draft" ON project_disbursements;
CREATE POLICY "project_disbursements_select" ON project_disbursements
  FOR SELECT TO authenticated USING (investor_user_role() = 'admin');
CREATE POLICY "project_disbursements_insert" ON project_disbursements
  FOR INSERT TO authenticated WITH CHECK (investor_user_role() = 'admin');
