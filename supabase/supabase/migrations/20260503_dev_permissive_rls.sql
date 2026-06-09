-- NexArtPro — Dev/Demo: Permissive RLS policies for anon key
-- Run this in Supabase SQL Editor to allow the frontend to read/write data
-- WARNING: Only for development/demo. Remove before production.

DO $$ 
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'leads', 'estimates', 'work_orders', 'invoices', 'appointments', 
    'proposals', 'customers', 'clients', 'services', 'materials',
    'workers', 'payments', 'time_entries', 'time_tracking_logs',
    'job_assignments', 'project_photos', 'work_order_daily_reports',
    'work_order_expenses', 'work_order_receipts', 'work_order_time_entries',
    'worker_notes', 'worker_documents', 'comm_events', 'document_logs',
    'estimate_snapshots', 'estimate_transmissions', 'estimate_version_histories',
    'signing_packages', 'signing_participants', 'signing_events', 'signing_certificates',
    'public_document_access', 'recovery_vault', 'price_book_entries', 'pricing_audit_events',
    'bank_accounts', 'bank_transactions', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop existing anon policy if exists (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON %I', t, t);
    -- Create permissive policy for anon
    EXECUTE format(
      'CREATE POLICY "anon_all_%s" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;
