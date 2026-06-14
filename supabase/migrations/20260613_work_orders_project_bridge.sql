-- Phase 6B: Bridge work_orders → projects
-- Adds nullable project_id FK to work_orders for cost aggregation.
-- Applied to production hdiejuqbhqhebrpneymo on 2026-06-13

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_project_id ON work_orders(project_id);
