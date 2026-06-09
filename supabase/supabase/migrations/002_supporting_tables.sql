-- NexArtPro — Full Schema (Part 2: Supporting Tables)

CREATE TABLE IF NOT EXISTS signing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id TEXT, document_type TEXT, status TEXT DEFAULT 'draft',
  signer_name TEXT, signer_email TEXT, signer_phone TEXT,
  otp_code TEXT, otp_expires_at TIMESTAMPTZ, otp_verified BOOLEAN DEFAULT false,
  signing_url TEXT, signing_token TEXT, sent_at TIMESTAMPTZ, viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ, declined_at TIMESTAMPTZ, expired_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ, voided_by TEXT, voided_reason TEXT,
  signature_data JSONB, certificate_data JSONB, audit_trail JSONB DEFAULT '[]',
  device_fingerprint JSONB, ip_address TEXT, user_agent TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signing_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT, role TEXT DEFAULT 'signer', name TEXT, email TEXT, phone TEXT,
  status TEXT DEFAULT 'pending', signed_at TIMESTAMPTZ, signature_data JSONB,
  otp_verified BOOLEAN DEFAULT false, order_index INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT, event_type TEXT, actor TEXT, ip_address TEXT,
  user_agent TEXT, metadata JSONB, created_at TIMESTAMPTZ DEFAULT now(),
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signing_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT, estimate_id TEXT, certificate_number TEXT,
  document_hash TEXT, hash_algorithm TEXT DEFAULT 'SHA-256',
  signer_name TEXT, signer_email TEXT, signed_at TIMESTAMPTZ,
  certificate_data JSONB, generated_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id TEXT, snapshot_type TEXT, trigger_event TEXT, actor TEXT,
  snapshot_data JSONB, estimate_number INTEGER, version_number INTEGER,
  client_name TEXT, total NUMERIC, status TEXT, notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimate_transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id TEXT, estimate_number INTEGER, channel TEXT DEFAULT 'email',
  recipient_email TEXT, recipient_name TEXT, recipient_phone TEXT,
  subject TEXT, body TEXT, status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ, bounced_at TIMESTAMPTZ, error_message TEXT,
  share_url TEXT, share_token TEXT, metadata JSONB,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimate_version_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id TEXT, version_number INTEGER, action TEXT,
  actor TEXT, changes JSONB, snapshot_id TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, worker_id TEXT, worker_name TEXT,
  assigned_by TEXT, assigned_at TIMESTAMPTZ, unassigned_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, worker_id TEXT, worker_name TEXT,
  clock_in TIMESTAMPTZ, clock_out TIMESTAMPTZ,
  duration_minutes NUMERIC, break_minutes NUMERIC DEFAULT 0,
  notes TEXT, status TEXT DEFAULT 'active', approved_by TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, worker_id TEXT, worker_name TEXT,
  action TEXT, timestamp TIMESTAMPTZ, location JSONB,
  device_info TEXT, notes TEXT, session_id TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, worker_id TEXT, worker_name TEXT,
  date DATE, hours NUMERIC DEFAULT 0, hourly_rate NUMERIC,
  total_cost NUMERIC DEFAULT 0, description TEXT, approved BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, category TEXT, description TEXT,
  amount NUMERIC DEFAULT 0, vendor TEXT, receipt_url TEXT,
  expense_date DATE, approved BOOLEAN DEFAULT false, approved_by TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, worker_id TEXT, worker_name TEXT,
  report_date DATE, summary TEXT, issues TEXT,
  weather TEXT, photos JSONB DEFAULT '[]', hours_worked NUMERIC,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, action TEXT, actor TEXT,
  details JSONB, created_at TIMESTAMPTZ DEFAULT now(),
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, file_url TEXT, file_name TEXT,
  description TEXT, amount NUMERIC, uploaded_by TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT, photo_url TEXT, thumbnail_url TEXT,
  caption TEXT, category TEXT, taken_by TEXT, taken_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_book_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT, name TEXT, category TEXT, unit TEXT,
  unit_price NUMERIC DEFAULT 0, unit_cost NUMERIC DEFAULT 0,
  book_price NUMERIC DEFAULT 0, effective_date DATE,
  notes TEXT, is_active BOOLEAN DEFAULT true,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT, entity_id TEXT, field_name TEXT,
  old_value TEXT, new_value TEXT, changed_by TEXT,
  reason TEXT, metadata JSONB,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT, entity_id TEXT, action TEXT,
  actor TEXT, actor_role TEXT, details JSONB,
  ip_address TEXT, performed_at TIMESTAMPTZ DEFAULT now(),
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT, user_id TEXT, user_email TEXT,
  ip_address TEXT, user_agent TEXT, success BOOLEAN,
  failure_reason TEXT, metadata JSONB, risk_level TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT, entity_id TEXT, channel TEXT,
  recipient TEXT, subject TEXT, body TEXT,
  status TEXT DEFAULT 'sent', sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ, opened_at TIMESTAMPTZ, error_message TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT, document_id TEXT, action TEXT,
  actor TEXT, ip_address TEXT, user_agent TEXT,
  metadata JSONB,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT, document_id TEXT, token TEXT,
  expires_at TIMESTAMPTZ, accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0, ip_address TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recovery_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT, entity_id TEXT, entity_number TEXT,
  entity_label TEXT, snapshot_data JSONB,
  deleted_by TEXT, deleted_at TIMESTAMPTZ, delete_reason TEXT,
  restored BOOLEAN DEFAULT false, restored_at TIMESTAMPTZ, restored_by TEXT,
  metadata JSONB,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT, bank_name TEXT, account_type TEXT,
  account_number_last4 TEXT, routing_number_last4 TEXT,
  balance NUMERIC DEFAULT 0, is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id TEXT, transaction_type TEXT, category TEXT,
  amount NUMERIC DEFAULT 0, description TEXT, reference TEXT,
  transaction_date DATE, invoice_id TEXT, expense_id TEXT,
  reconciled BOOLEAN DEFAULT false, notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT, document_type TEXT, file_url TEXT,
  file_name TEXT, expiration_date DATE, notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT, note TEXT, author TEXT,
  created_date TIMESTAMPTZ DEFAULT now(), updated_date TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_estimates_client_id ON estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_client_id ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_wo ON time_entries(work_order_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_wo ON project_photos(work_order_id);
CREATE INDEX IF NOT EXISTS idx_signing_packages_estimate ON signing_packages(estimate_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ═══════════════════════════════════════
-- RLS: Enable Row Level Security (permissive for now)
-- ═══════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%' AND tablename != 'app_users'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon read" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow anon read" ON %I FOR SELECT TO anon USING (true)', t);
  END LOOP;
END $$;

