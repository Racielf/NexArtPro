-- ═══════════════════════════════════════════════════════════════
-- NexArtPro — Price Book: add sub_category, labor_hrs, negotiable
-- Apply in: Supabase SQL Editor (staging first, then production)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE price_book_entries
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS labor_hrs    DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS negotiable   TEXT DEFAULT 'yes';

-- Add check constraint only if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_price_book_negotiable'
      AND conrelid = 'price_book_entries'::regclass
  ) THEN
    ALTER TABLE price_book_entries
      ADD CONSTRAINT chk_price_book_negotiable
      CHECK (negotiable IN ('yes', 'no', 'ask'));
  END IF;
END $$;

-- Back-fill existing manual entries: leave negotiable = 'yes' (default)
-- No action needed — DEFAULT already set.
