-- ============================================================================
-- NexArt Pro — Supabase Phase 2: Customers Table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  display_name    TEXT,
  email           TEXT,
  phone           TEXT NOT NULL,
  customer_type   TEXT NOT NULL DEFAULT 'residential' CHECK (customer_type IN ('residential', 'commercial', 'contractor')),
  company_name    TEXT,
  service_address TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  notes           TEXT,
  internal_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read customers" ON customers
  FOR SELECT USING (true);

CREATE POLICY "Allow anon insert customers" ON customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update customers" ON customers
  FOR UPDATE USING (true);

CREATE POLICY "Allow anon delete customers" ON customers
  FOR DELETE USING (true);
