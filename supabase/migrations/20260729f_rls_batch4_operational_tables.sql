-- TAREA G batch 4: operational detail tables, team-shared (same pattern as batch 2 --
-- admin/agent read/create/update, admin-only delete). No users_own_X trap found on
-- these -- only the sloppy anon policies existed.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29. Verified: anon returns 0
-- across all 20; simulated admin session sees real row counts (workers=0, customers=9,
-- services=0, matching production).

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'appointments','customers','comm_events','job_assignments','materials',
    'price_book_entries','services','time_entries','time_tracking_logs',
    'work_order_daily_reports','work_order_expenses','work_order_histories',
    'work_order_receipts','work_order_time_entries','worker_documents','worker_notes',
    'workers','project_photos','estimate_snapshots','estimate_transmissions',
    'estimate_version_histories'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_full_access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon read" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_all_' || tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (investor_user_role() IN (''admin'',''agent''))', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (investor_user_role() IN (''admin'',''agent''))', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (investor_user_role() IN (''admin'',''agent'')) WITH CHECK (investor_user_role() IN (''admin'',''agent''))', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (investor_user_role() = ''admin'')', tbl, tbl);
  END LOOP;
END $$;
