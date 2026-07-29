-- CRITICAL FIX 2026-07-29: found a third permissive-policy category the original TAREA
-- G audit methodology never checked -- "Allow all for authenticated" (roles:
-- {authenticated}, qual: true), present on 34 tables. This completely bypassed every
-- role-based restriction applied earlier today in batches 2-5 (bank_accounts/
-- bank_transactions admin-only, work_orders/payments admin-only-delete, log tables
-- admin-only-read) since any authenticated user -- any role -- matched this policy's
-- unconditional USING(true). Confirmed the hole directly: an agent session could
-- SELECT all of audit_logs despite the admin-only policy from batch 5.
--
-- Dropping it restores the intended restrictions on every table already fixed earlier
-- today. Also closed pre-emptively on recovery_vault, public_document_access, and the
-- signing_* tables (still deferred to a dedicated NexArtSign session for their anon-
-- side redesign, but this specific wide-open policy had no legitimate scoping at all
-- regardless of that deferral).
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-29. Verified: zero policies
-- remain anywhere in the database with roles={authenticated} AND qual=true. Re-verified
-- admin still sees real data on audit_logs/customers/company_config/payments/estimates
-- after this change.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'appointments','audit_logs','auth_security_logs','bank_accounts','bank_transactions',
    'comm_events','customers','document_logs','estimate_snapshots','estimate_transmissions',
    'estimate_version_histories','job_assignments','materials','payments','price_book_entries',
    'pricing_audit_events','project_photos','public_document_access','recovery_vault','services',
    'signing_certificates','signing_events','signing_packages','signing_participants',
    'time_entries','time_tracking_logs','work_order_daily_reports','work_order_expenses',
    'work_order_histories','work_order_receipts','work_order_time_entries','worker_documents',
    'worker_notes','workers'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "work_orders_authenticated_all" ON work_orders;
