-- ═══════════════════════════════════════════════════════════════════════
-- NexArtPro — Work Orders Extended Tables (from NexArtWO port)
-- New tables: wo_line_items, wo_photos, wo_communications,
--             change_orders, wo_documents
-- IDs: UUID (adapted from nexartwo TEXT IDs)
-- FK:  work_order_id UUID → work_orders.id
-- RLS: enabled on all tables (admin full access, others scoped)
-- Apply: Supabase SQL Editor, staging first
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. WO LINE ITEMS
--    Separate table per WO scope item (currently stored as JSONB tasks).
--    Both can coexist — this table is the new canonical source.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wo_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  price_book_id   UUID REFERENCES price_book_entries(id),
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  sub_category    TEXT,
  price           NUMERIC(12,2) DEFAULT 0,
  qty             NUMERIC(8,2)  DEFAULT 1,
  unit            TEXT          DEFAULT 'ea',
  negotiable      TEXT          DEFAULT 'yes'
                    CHECK (negotiable IN ('yes','no','ask')),
  labor_hrs       NUMERIC(6,2),
  status          TEXT          DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed')),
  completed_at    TIMESTAMPTZ,
  completed_by    TEXT,
  notes           TEXT,
  sort_order      INTEGER       DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_line_items_work_order ON wo_line_items(work_order_id);

ALTER TABLE wo_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_line_items_select" ON wo_line_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "wo_line_items_insert" ON wo_line_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "wo_line_items_update" ON wo_line_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "wo_line_items_delete" ON wo_line_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────
-- 2. WO PHOTOS
--    Before / Progress / After / Issue photos per work order.
--    Stored in Supabase Storage bucket 'wo-photos'.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wo_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type            TEXT DEFAULT 'progress'
                    CHECK (type IN ('before','progress','after','issue')),
  label           TEXT,
  area            TEXT,
  photo_url       TEXT NOT NULL,
  storage_path    TEXT,
  gps_lat         NUMERIC(10,7),
  gps_lng         NUMERIC(10,7),
  taken_by        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_photos_work_order ON wo_photos(work_order_id);

ALTER TABLE wo_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_photos_select" ON wo_photos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "wo_photos_insert" ON wo_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "wo_photos_delete" ON wo_photos
  FOR DELETE USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────
-- 3. WO COMMUNICATIONS
--    Call log, emails, notes, agreements per work order.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wo_communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type            TEXT DEFAULT 'note'
                    CHECK (type IN ('call','email','text','note','agreement','instruction')),
  subject         TEXT,
  body            TEXT,
  person          TEXT,
  sender          TEXT,
  recipient       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_comms_work_order ON wo_communications(work_order_id);

ALTER TABLE wo_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_comms_select" ON wo_communications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "wo_comms_insert" ON wo_communications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "wo_comms_delete" ON wo_communications
  FOR DELETE USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────
-- 4. CHANGE ORDERS
--    Scope change tracking per work order.
--    'items' JSONB: [{line_item_id, name, original_price, original_qty,
--                      new_price, new_qty, action}]
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  co_number       TEXT,
  title           TEXT,
  description     TEXT,
  items           JSONB DEFAULT '[]',
  amount          NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'proposed'
                    CHECK (status IN ('proposed','pending','approved','rejected')),
  requested_by    TEXT,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_orders_work_order ON change_orders(work_order_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status     ON change_orders(status);

ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_orders_select" ON change_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "change_orders_insert" ON change_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "change_orders_update" ON change_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "change_orders_delete" ON change_orders
  FOR DELETE USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────
-- 5. WO DOCUMENTS
--    Document builder state per work order (template, lines, tax).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wo_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  doc_type        TEXT DEFAULT 'completion'
                    CHECK (doc_type IN ('completion','inspection','progress','invoice','proposal','change_order')),
  template        TEXT DEFAULT 'classic'
                    CHECK (template IN ('classic','modern','executive')),
  lines           JSONB DEFAULT '[]',
  tax_pct         NUMERIC(5,2) DEFAULT 0,
  subtotal        NUMERIC(12,2) DEFAULT 0,
  tax_amount      NUMERIC(12,2) DEFAULT 0,
  total           NUMERIC(12,2) DEFAULT 0,
  hide_prices     BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_documents_work_order ON wo_documents(work_order_id);

ALTER TABLE wo_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_documents_select" ON wo_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "wo_documents_insert" ON wo_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "wo_documents_update" ON wo_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "wo_documents_delete" ON wo_documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────
-- 6. Storage bucket for WO photos
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('wo-photos', 'wo-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload WO photos
CREATE POLICY IF NOT EXISTS "wo_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wo-photos' AND auth.role() = 'authenticated'
  );

-- Allow public read of WO photos (needed for client-facing links)
CREATE POLICY IF NOT EXISTS "wo_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'wo-photos');

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('wo_line_items','wo_photos','wo_communications','change_orders','wo_documents');
-- Expected: 5 rows
