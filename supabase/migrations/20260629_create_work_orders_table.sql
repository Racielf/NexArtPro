-- CREATE work_orders table — complete schema
-- Run this in Supabase SQL Editor if the table does not exist.
-- Safe: uses CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS work_orders (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number               INTEGER,

  -- Source document links
  estimate_id                     TEXT,
  estimate_version                INTEGER DEFAULT 1,
  source_estimate_id              TEXT,
  source_estimate_number          INTEGER,
  source_estimate_version         INTEGER DEFAULT 1,
  source_document_type            TEXT,
  source_estimate_status          TEXT,
  source_estimate_total           NUMERIC DEFAULT 0,
  source_estimate_signed_at       TIMESTAMPTZ,
  source_estimate_signed_by       TEXT,
  source_estimate_final_pdf_url   TEXT,
  source_estimate_snapshot        JSONB,
  source_proposal_id              TEXT,
  source_proposal_number          INTEGER,
  source_close_outcome            TEXT,
  source_selected_pricing_option_id    TEXT,
  source_selected_pricing_option_title TEXT,

  -- Client
  client_id                       TEXT,
  client_name                     TEXT,
  client_email                    TEXT,
  client_address                  TEXT,
  client_phone                    TEXT,

  -- Basic info
  title                           TEXT,
  description                     TEXT,
  notes                           TEXT,
  internal_notes                  TEXT,
  scope_summary                   TEXT,
  assumptions                     TEXT,
  exclusions                      TEXT,
  payment_terms                   TEXT,
  warranty_terms                  TEXT,
  admin_correction_notes          TEXT,

  -- Status & priority
  status                          TEXT DEFAULT 'draft',
  priority                        TEXT DEFAULT 'normal',
  progress_percentage             NUMERIC DEFAULT 0,

  -- Assignment — lead worker
  assigned_user_id                TEXT,
  assigned_worker_id              TEXT,
  assigned_to_id                  TEXT,
  assigned_user_name              TEXT,
  assigned_worker_name            TEXT,
  assigned_to                     TEXT,
  assigned_user_email             TEXT,
  assigned_worker_email           TEXT,
  assigned_email                  TEXT,
  assigned_worker_phone           TEXT,
  assigned_by                     TEXT,
  assigned_at                     TEXT,
  assignment_source               TEXT,

  -- Assignment — crew
  assigned_crew                   JSONB DEFAULT '[]',
  assigned_crew_ids               JSONB DEFAULT '[]',
  assigned_crew_names             JSONB DEFAULT '[]',
  crew_size                       INTEGER DEFAULT 0,

  -- Reassignment tracking
  previous_worker_id              TEXT,
  previous_worker_name            TEXT,
  reassigned_at                   TEXT,
  reassigned_by                   TEXT,

  -- Field execution
  performed_by_worker_id          TEXT,
  performed_by_worker_name        TEXT,
  performed_by_corrected_at       TEXT,
  performed_by_corrected_by       TEXT,
  completed_by_user               TEXT,
  completed_by_user_id            TEXT,
  work_summary                    TEXT,
  issues_found                    TEXT,

  -- Scheduling
  scheduled_date                  DATE,
  scheduled_time                  TEXT,
  arrival_time                    TEXT,
  departure_time                  TEXT,
  started_at                      TEXT,
  completed_at                    TEXT,

  -- Line items & materials (JSONB for legacy; new rows use wo_line_items table)
  groups                          JSONB DEFAULT '[]',
  line_items                      JSONB DEFAULT '[]',
  materials                       JSONB DEFAULT '[]',
  other_costs                     JSONB DEFAULT '[]',
  field_notes                     JSONB DEFAULT '[]',
  execution_checklist             JSONB DEFAULT '[]',
  tasks                           JSONB DEFAULT '[]',
  task_statuses                   JSONB,

  -- Financials
  subtotal                        NUMERIC DEFAULT 0,
  total                           NUMERIC DEFAULT 0,
  materials_subtotal              NUMERIC DEFAULT 0,
  materials_cost                  NUMERIC DEFAULT 0,
  other_costs_total               NUMERIC DEFAULT 0,
  total_cost                      NUMERIC DEFAULT 0,
  actual_cost                     NUMERIC DEFAULT 0,
  gross_margin                    NUMERIC DEFAULT 0,
  gross_margin_pct                NUMERIC DEFAULT 0,

  -- Projects bridge (nullable — project module is optional)
  project_id                      UUID,

  -- Soft delete
  deleted_at                      TIMESTAMPTZ,

  -- Metadata
  company_id                      TEXT DEFAULT 'rc-art',
  created_date                    TIMESTAMPTZ DEFAULT now(),
  updated_date                    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_status       ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_client_id    ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_worker_id    ON work_orders(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled    ON work_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_deleted_at   ON work_orders(deleted_at);

-- RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "work_orders_authenticated_all"
  ON work_orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
