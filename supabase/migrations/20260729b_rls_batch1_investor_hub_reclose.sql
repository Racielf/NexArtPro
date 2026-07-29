-- TAREA G batch 1: re-close Investor Hub tables now that auth.uid() works (TAREA H)
-- and the investor_user_role() bug is fixed (20260728d). The correct admin/agent
-- policies from the original TAREA F attempt are already in place -- only the anon
-- override needs to go.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29. Verified: SET ROLE anon
-- returns 0 on all 10; a simulated authenticated admin session (SET request.jwt.claims)
-- still sees real data (projects count matched production).

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
