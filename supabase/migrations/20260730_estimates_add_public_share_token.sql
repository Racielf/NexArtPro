-- Fixes a live production bug: SendEstimateModal.jsx -> generatePublicShareToken()
-- (src/lib/estimateSalesLifecycle.js) has always tried to write public_share_token /
-- public_share_token_created_at onto `estimates`, but these columns were never present on the
-- live table (supabase/migrations/001_core_tables.sql declares them, but that file was never
-- actually applied to this project -- confirmed via list_migrations, which has no matching
-- entry). Result: the "send estimate to client" flow could never generate a working public link.
-- Purely additive, nullable columns -- no existing behavior changes for rows that don't have one.

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS public_share_token TEXT,
  ADD COLUMN IF NOT EXISTS public_share_token_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_estimates_public_share_token ON estimates(public_share_token)
  WHERE public_share_token IS NOT NULL;
