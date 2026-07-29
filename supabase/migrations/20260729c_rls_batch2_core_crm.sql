-- TAREA G batch 2: core CRM tables (clients, estimates, invoices, leads, proposals,
-- work_orders, payroll_runs, payroll_entries, payments). These had a per-individual-
-- owner policy (auth.uid() = user_id) sitting under anon_full_access -- wrong model
-- for a single shared-company CRM, and confirmed via direct data check that user_id
-- is NULL on nearly all real rows (would have hidden everything: estimates had 27
-- real rows, 0 with user_id set). Replacing with team-shared policies: any active
-- admin/agent can read/create/update; only admin can delete (matches the app's
-- existing soft-delete convention -- real DELETE from the frontend was already never
-- used, per CLAUDE.md 6.1).
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29. Verified: SET ROLE anon
-- returns 0 on all 9; simulated admin AND agent sessions (SET request.jwt.claims) both
-- see the real row counts (clients=4, estimates=27, work_orders=2) -- confirms this
-- did not repeat the data-hiding mistake almost made here.

-- clients
DROP POLICY IF EXISTS "anon_full_access" ON clients;
DROP POLICY IF EXISTS "users_own_clients" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- estimates
DROP POLICY IF EXISTS "anon_full_access" ON estimates;
DROP POLICY IF EXISTS "users_own_estimates" ON estimates;
CREATE POLICY "estimates_select" ON estimates FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "estimates_insert" ON estimates FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "estimates_update" ON estimates FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "estimates_delete" ON estimates FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- invoices
DROP POLICY IF EXISTS "anon_full_access" ON invoices;
DROP POLICY IF EXISTS "users_own_invoices" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- leads
DROP POLICY IF EXISTS "anon_full_access" ON leads;
DROP POLICY IF EXISTS "users_own_leads" ON leads;
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- proposals
DROP POLICY IF EXISTS "anon_full_access" ON proposals;
DROP POLICY IF EXISTS "users_own_proposals" ON proposals;
CREATE POLICY "proposals_select" ON proposals FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "proposals_insert" ON proposals FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "proposals_update" ON proposals FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "proposals_delete" ON proposals FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- work_orders
DROP POLICY IF EXISTS "anon_full_access" ON work_orders;
DROP POLICY IF EXISTS "users_own_work_orders" ON work_orders;
CREATE POLICY "work_orders_select" ON work_orders FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "work_orders_insert" ON work_orders FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "work_orders_update" ON work_orders FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "work_orders_delete" ON work_orders FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- payroll_runs
DROP POLICY IF EXISTS "anon_full_access" ON payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_owner_all" ON payroll_runs;
CREATE POLICY "payroll_runs_select" ON payroll_runs FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payroll_runs_insert" ON payroll_runs FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payroll_runs_update" ON payroll_runs FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payroll_runs_delete" ON payroll_runs FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- payroll_entries
DROP POLICY IF EXISTS "anon_full_access" ON payroll_entries;
DROP POLICY IF EXISTS "payroll_entries_owner_all" ON payroll_entries;
CREATE POLICY "payroll_entries_select" ON payroll_entries FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payroll_entries_insert" ON payroll_entries FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payroll_entries_update" ON payroll_entries FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payroll_entries_delete" ON payroll_entries FOR DELETE TO authenticated USING (investor_user_role() = 'admin');

-- payments
DROP POLICY IF EXISTS "anon_full_access" ON payments;
DROP POLICY IF EXISTS "Allow anon read" ON payments;
DROP POLICY IF EXISTS "anon_all_payments" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated USING (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated USING (investor_user_role() IN ('admin','agent')) WITH CHECK (investor_user_role() IN ('admin','agent'));
CREATE POLICY "payments_delete" ON payments FOR DELETE TO authenticated USING (investor_user_role() = 'admin');
