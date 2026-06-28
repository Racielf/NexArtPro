-- Add fiscal and address fields to investors table
-- Required for full investor profile (tax ID, mailing address, notes)

ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS tax_id    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS zip       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_notes TEXT NOT NULL DEFAULT '';
