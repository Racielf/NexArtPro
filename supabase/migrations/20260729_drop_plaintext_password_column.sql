-- TAREA H verified end-to-end 2026-07-29: real Supabase Auth sessions confirmed for
-- racinllerf@gmail.com and yaymirc@gmail.com (auth.users.last_sign_in_at populated),
-- both admin login and the PIN-login flow work without the plaintext password column.
-- It was already unreadable (app_users RLS closed to anon in 20260728_app_users_auth_wiring.sql)
-- and unused by any code path (userStore.authenticate(), the only reader, was removed
-- from src/lib/userStore.js). Dropping it now that the migration is fully verified.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29.

ALTER TABLE app_users DROP COLUMN IF EXISTS password;
