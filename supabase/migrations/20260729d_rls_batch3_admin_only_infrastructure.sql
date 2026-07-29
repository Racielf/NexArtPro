-- TAREA G batch 3: admin-only sensitive/infrastructure tables. bank_accounts and
-- bank_transactions hold real account numbers; company_config and subscriptions are
-- company-wide singletons tied to Settings, which is already admin-only in the app
-- (src/App.jsx access="owner"). Agents get no access at all here.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29. Verified: anon returns 0
-- on all 4; simulated admin session sees company_config (real row exists), simulated
-- agent session correctly gets 0 on both bank_accounts and company_config.

-- bank_accounts
DROP POLICY IF EXISTS "anon_full_access" ON bank_accounts;
DROP POLICY IF EXISTS "Allow anon read" ON bank_accounts;
DROP POLICY IF EXISTS "anon_all_bank_accounts" ON bank_accounts;
CREATE POLICY "bank_accounts_admin_only" ON bank_accounts FOR ALL TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- bank_transactions
DROP POLICY IF EXISTS "anon_full_access" ON bank_transactions;
DROP POLICY IF EXISTS "Allow anon read" ON bank_transactions;
DROP POLICY IF EXISTS "anon_all_bank_transactions" ON bank_transactions;
CREATE POLICY "bank_transactions_admin_only" ON bank_transactions FOR ALL TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- company_config
DROP POLICY IF EXISTS "anon_full_access" ON company_config;
DROP POLICY IF EXISTS "anon_read_company_config" ON company_config;
DROP POLICY IF EXISTS "users_own_company_config" ON company_config;
CREATE POLICY "company_config_admin_only" ON company_config FOR ALL TO authenticated
  USING (investor_user_role() = 'admin') WITH CHECK (investor_user_role() = 'admin');

-- subscriptions (keep subscriptions_service_all for service_role/webhooks)
DROP POLICY IF EXISTS "anon_full_access" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_owner_read" ON subscriptions;
CREATE POLICY "subscriptions_admin_read" ON subscriptions FOR SELECT TO authenticated
  USING (investor_user_role() = 'admin');
