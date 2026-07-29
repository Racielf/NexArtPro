-- TAREA G batch 5: logs/audit tables. src/lib/auditLog.js writes directly from the
-- frontend (not via service_role), so any active admin/agent needs INSERT so their
-- own actions get logged. Only admin can SELECT (view the audit/security trail) --
-- matches Security Dashboard now being admin-only (src/App.jsx). No UPDATE/DELETE
-- policy at all: logs are append-only, and no frontend code ever updates or deletes
-- them.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'audit_logs','security_audit_logs','auth_security_logs','pricing_audit_events',
    'document_logs','nexartsign_security_blocks','nexartsign_token_attempts','recovery_vault'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_full_access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon read" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_all_' || tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_select_admin" ON %I FOR SELECT TO authenticated USING (investor_user_role() = ''admin'')', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert_team" ON %I FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN (''admin'',''agent''))', tbl, tbl);
  END LOOP;
END $$;
