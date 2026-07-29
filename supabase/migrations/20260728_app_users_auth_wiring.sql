-- Phase 1 of wiring real Supabase Auth: add the missing link column + PIN support,
-- link the 2 existing real auth.users records to their app_users rows, and tighten
-- app_users RLS (this table is inseparable from auth itself -- unlike the broader
-- ~111-table RLS sweep, which stays deferred, see docs/agent/OPEN_GAPS.md item 6/7).
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-28.

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

UPDATE app_users SET auth_user_id = '2ba63af3-65a0-43e2-9a08-c2d619b1dd4b'
  WHERE username = 'admin';

UPDATE app_users SET auth_user_id = 'cf48268b-54a9-4a96-ba0c-5457c0570a01'
  WHERE username = 'admin_test@example.com';

-- Reuse the existing SECURITY DEFINER helper (already proven in production for the
-- Investor Hub) to avoid RLS recursion when checking "is this user an admin".
DROP POLICY IF EXISTS "anon_full_access" ON app_users;
DROP POLICY IF EXISTS "Allow anon read" ON app_users;

CREATE POLICY "app_users_select_own_or_admin" ON app_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR investor_user_role() = 'admin');

CREATE POLICY "app_users_update_own_or_admin" ON app_users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR investor_user_role() = 'admin')
  WITH CHECK (auth_user_id = auth.uid() OR investor_user_role() = 'admin');

CREATE POLICY "app_users_insert_admin_only" ON app_users
  FOR INSERT TO authenticated
  WITH CHECK (investor_user_role() = 'admin');
