-- Investor hub tables: match MAIN RLS pattern (anon_full_access)
-- App uses custom auth (no Supabase JWT) — queries run as anon role
-- Same pattern as estimates, work_orders, invoices in MAIN

CREATE POLICY "anon_full_access" ON projects           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON investors          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON investor_companies FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_investors  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON capital_contributions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON capital_calls      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON flip_analyses      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_expenses   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_refunds    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_disbursements FOR ALL TO anon USING (true) WITH CHECK (true);
