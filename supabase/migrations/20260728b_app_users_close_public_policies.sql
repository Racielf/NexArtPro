-- Found while verifying the previous migration: app_users had additional policies
-- scoped to `public` (which includes anon, not just `authenticated`) that the
-- database-wide anon audit (docs/agent/OPEN_GAPS.md item 6) missed, because it only
-- searched for the literal 'anon' role, not 'public'. Closing these since app_users
-- is in-scope for this auth work. The deferred ~111-table sweep must also check
-- `TO public` policies -- at least 30 exist database-wide as of 2026-07-28, not just
-- the ones already found under literal `anon`.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-28. Verified after:
-- SET ROLE anon; SELECT count(*) FROM app_users; returns 0.

DROP POLICY IF EXISTS "Allow all for authenticated" ON app_users;
DROP POLICY IF EXISTS "Allow anon insert" ON app_users;
DROP POLICY IF EXISTS "Allow anon update" ON app_users;
DROP POLICY IF EXISTS "allow_anon_read" ON app_users;
