-- Work Orders — add ALL columns that may be missing
-- Safe to run multiple times (IF NOT EXISTS on every column).
-- Apply in Supabase SQL Editor before creating work orders from the UI.

ALTER TABLE work_orders
  -- Basic info
  ADD COLUMN IF NOT EXISTS description         TEXT,
  ADD COLUMN IF NOT EXISTS notes               TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes      TEXT,
  ADD COLUMN IF NOT EXISTS scope_summary       TEXT,
  ADD COLUMN IF NOT EXISTS assumptions         TEXT,
  ADD COLUMN IF NOT EXISTS exclusions          TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms       TEXT,
  ADD COLUMN IF NOT EXISTS warranty_terms      TEXT,

  -- Client / address
  ADD COLUMN IF NOT EXISTS client_address      TEXT,
  ADD COLUMN IF NOT EXISTS client_email        TEXT,
  ADD COLUMN IF NOT EXISTS client_phone        TEXT,

  -- Scheduling
  ADD COLUMN IF NOT EXISTS scheduled_time      TEXT,
  ADD COLUMN IF NOT EXISTS arrival_time        TEXT,
  ADD COLUMN IF NOT EXISTS departure_time      TEXT,
  ADD COLUMN IF NOT EXISTS started_at          TEXT,
  ADD COLUMN IF NOT EXISTS completed_at        TEXT,

  -- Assignment
  ADD COLUMN IF NOT EXISTS assigned_user_id    TEXT,
  ADD COLUMN IF NOT EXISTS assigned_worker_id  TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_id      TEXT,
  ADD COLUMN IF NOT EXISTS assigned_user_name  TEXT,
  ADD COLUMN IF NOT EXISTS assigned_worker_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to         TEXT,
  ADD COLUMN IF NOT EXISTS assigned_user_email TEXT,
  ADD COLUMN IF NOT EXISTS assigned_worker_email TEXT,
  ADD COLUMN IF NOT EXISTS assigned_email      TEXT,
  ADD COLUMN IF NOT EXISTS assigned_worker_phone TEXT,
  ADD COLUMN IF NOT EXISTS assigned_by         TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at         TEXT,
  ADD COLUMN IF NOT EXISTS assignment_source   TEXT,
  ADD COLUMN IF NOT EXISTS assigned_crew       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS assigned_crew_ids   JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS assigned_crew_names JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS crew_size           INTEGER DEFAULT 0,

  -- Financials
  ADD COLUMN IF NOT EXISTS subtotal            NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total               NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_subtotal  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_cost      NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_costs_total   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost          NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_margin        NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_margin_pct    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost         NUMERIC DEFAULT 0,

  -- JSONB fields
  ADD COLUMN IF NOT EXISTS groups              JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS line_items          JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS materials           JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS other_costs         JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS field_notes         JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS execution_checklist JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tasks               JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS task_statuses       JSONB,

  -- Priority / progress
  ADD COLUMN IF NOT EXISTS priority            TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC DEFAULT 0,

  -- Field execution
  ADD COLUMN IF NOT EXISTS work_summary        TEXT,
  ADD COLUMN IF NOT EXISTS issues_found        TEXT,
  ADD COLUMN IF NOT EXISTS admin_correction_notes TEXT,
  ADD COLUMN IF NOT EXISTS completed_by_user   TEXT,
  ADD COLUMN IF NOT EXISTS completed_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS performed_by_worker_id   TEXT,
  ADD COLUMN IF NOT EXISTS performed_by_worker_name TEXT,

  -- Source document
  ADD COLUMN IF NOT EXISTS estimate_id         TEXT,
  ADD COLUMN IF NOT EXISTS source_estimate_id  TEXT,
  ADD COLUMN IF NOT EXISTS source_proposal_id  TEXT,

  -- Soft delete
  ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ,

  -- Misc
  ADD COLUMN IF NOT EXISTS company_id          TEXT DEFAULT 'rc-art';
