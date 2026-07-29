-- Fix a regression from 20260729h: dropping "Allow all for authenticated" from the
-- NexArtSign tables (as part of closing that policy everywhere) removed the ONLY
-- authenticated-role access path on those tables, since their full redesign is
-- deliberately deferred to a dedicated NexArtSign session. That left staff unable to
-- see their own signing packages inside the app (admin session went from 10 real rows
-- to 0). Restoring team-shared authenticated access here as a stand-in -- this does
-- NOT touch the anon-side policies (anon_full_access, anon_select_signing_packages,
-- etc.), which remain exactly as open/deferred as before. Only the internal
-- (logged-in) access path is restored.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29. Verified: admin session
-- sees signing_packages=10, signing_participants=11 (real counts) again; anon session
-- unchanged at signing_packages=10 (still deferred, not a regression either way).

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'signing_packages','signing_participants','signing_events','signing_certificates',
    'public_document_access'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY "%s_authenticated_team" ON %I FOR ALL TO authenticated USING (investor_user_role() IN (''admin'',''agent'')) WITH CHECK (investor_user_role() IN (''admin'',''agent''))', tbl, tbl);
  END LOOP;
END $$;
