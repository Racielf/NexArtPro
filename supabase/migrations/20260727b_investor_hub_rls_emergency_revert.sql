-- EMERGENCY REVERT (2026-07-27): the investor_hub_rls_remediation migration applied earlier
-- today restricted these 10 tables to `TO authenticated`, assuming real Supabase Auth sessions
-- exist. Verified this app never calls signInWithPassword/signInWithOtp/signUp anywhere and
-- app_users has no auth_user_id column -- auth.uid() is always NULL in actual production usage,
-- so the authenticated-only policies made these tables inaccessible to everyone, including
-- admins, not just anon. Restoring anon access to match the rest of the (currently equally open)
-- database until real authentication is wired up. The admin/agent policies from the earlier
-- migration are left in place -- harmless now, become meaningful once real auth sessions exist.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-27. Verified after: SET ROLE anon;
-- SELECT count(*) FROM projects; returns real data again (was 0 before this revert).
--
-- DO NOT consider Investor Hub RLS hardening done. See docs/agent/OPEN_GAPS.md item 6 and
-- CLAUDE.md TAREA G/H -- real per-user RLS anywhere in this app is blocked on wiring actual
-- Supabase Auth sessions (see App.jsx / TeamAccess.jsx / userStore.js), not a policy-writing task.

CREATE POLICY "anon_full_access" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON investors FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON investor_companies FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_investors FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON capital_contributions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON capital_calls FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON flip_analyses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_expenses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_refunds FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON project_disbursements FOR ALL TO anon USING (true) WITH CHECK (true);
