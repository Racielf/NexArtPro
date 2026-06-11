-- ============================================================
-- DRAFT ONLY — STAGING ONLY — SEPARATE REVIEW REQUIRED
-- NexArtPro — Phase 5 Bridge: work_orders.project_id
-- Migration: 20260610_investor_hub_work_orders_bridge_draft.sql
-- ============================================================
-- ⚠️  DO NOT APPLY TO PRODUCTION
-- ⚠️  DO NOT APPLY IN THE SAME STEP AS THE MAIN INVESTOR HUB DRAFT
-- ⚠️  Apply ONLY after:
--       1. 20260610_investor_hub_schema_draft.sql applied without errors
--       2. projects table confirmed present and functional in staging
--       3. Explicit approval from project owner
-- ============================================================
-- Why separated:
--   This ALTER TABLE touches work_orders — an existing production table
--   in the MAIN NexArtPro base. Phase 5 is schema-new-only. Bridging
--   to an existing module is a separate concern and must be reviewed
--   independently before applying.
-- ============================================================
-- Source: nexartwo-main/supabase/migrations/202605070003_work_orders_project_id.sql
--   Original: project_id TEXT REFERENCES projects(id)
--   Adapted:  project_id UUID REFERENCES projects(id)
-- ============================================================

-- Adds project_id UUID column to work_orders.
-- Nullable: existing work orders are not affected.
-- ON DELETE SET NULL: work orders survive if a project is archived/deleted.

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_project_id
  ON work_orders(project_id);

-- ============================================================
-- END OF BRIDGE DRAFT
-- ============================================================
-- What this does:
--   Allows a Work Order to be linked to a Project via UUID FK
--   Nullable — no existing WOs are broken
--   No data backfill required
--
-- What this does NOT do:
--   Does NOT add any UI to link WOs to Projects (Phase 6)
--   Does NOT modify work_orders RLS (already dev-permissive in MAIN)
--   Does NOT affect work order logic, estimates, invoices, or NexArtSign
-- ============================================================
