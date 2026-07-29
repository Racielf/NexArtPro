-- TAREA G batch 3b: profiles is a personal account row (auth.uid() = id), not shared
-- business data -- the existing users_own_profile policy is correct as-is. Only the
-- anon override needs to go.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29. Verified: anon returns 0.

DROP POLICY IF EXISTS "anon_full_access" ON profiles;
