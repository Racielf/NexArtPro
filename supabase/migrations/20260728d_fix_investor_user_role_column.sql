-- Bug found 2026-07-28 while testing real auth for the first time: this function
-- compared app_users.id = auth.uid(), but the column that actually matches a real
-- Supabase Auth session is auth_user_id, not id (app_users' own primary key). This
-- silently made every admin-role check return NULL for everyone -- it was masked
-- until now because no real session ever existed before today to expose it.
-- Symptom: logged-in admin only saw their own row in Settings -> Team & Access
-- instead of all team members.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-28.
CREATE OR REPLACE FUNCTION investor_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;
