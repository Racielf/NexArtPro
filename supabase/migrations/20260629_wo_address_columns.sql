-- Add missing address columns to work_orders
-- These columns may be missing if the table was created before this field was added.

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS client_address   TEXT,
  ADD COLUMN IF NOT EXISTS job_address      TEXT;

-- Backfill job_address from client_address where client_address exists
UPDATE work_orders
SET job_address = client_address
WHERE job_address IS NULL AND client_address IS NOT NULL;
