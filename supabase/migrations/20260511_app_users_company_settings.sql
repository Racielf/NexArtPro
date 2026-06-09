-- NexArtPro — SaaS Company Settings Persistence
-- Purpose: move Settings -> Company persistence from browser-local storage to Supabase app_users.
-- Run in Supabase SQL Editor before relying on cross-device company settings sync.

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS company_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_company_settings_update_at TIMESTAMPTZ;

UPDATE public.app_users
SET company_settings = '{}'::jsonb
WHERE company_settings IS NULL;

CREATE INDEX IF NOT EXISTS app_users_company_settings_gin
  ON public.app_users USING GIN (company_settings);

-- Keep the existing permissive Phase 1 RLS policies from 001_users_roles.sql.
-- Do not run db push from the app agent; apply this migration intentionally in Supabase SQL Editor.
