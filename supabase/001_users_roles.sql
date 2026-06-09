-- ============================================================================
-- NexArt Pro — Supabase Phase 1: Users & Roles Foundation
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- 1. App users (replaces localStorage userStore)
CREATE TABLE IF NOT EXISTS app_users (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password     TEXT NOT NULL,            -- Phase 1: plain text (migrate to Supabase Auth later)
  role         TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seed default users (same as current localStorage defaults)
INSERT INTO app_users (username, password, role, display_name) VALUES
  ('admin',  'admin', 'admin', 'Administrator'),
  ('agent1', 'admin', 'agent', 'Agent 1')
ON CONFLICT (username) DO NOTHING;

-- 3. Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow anon reads (login needs to query by username)
CREATE POLICY "Allow anon read" ON app_users
  FOR SELECT USING (true);

-- Phase 1: allow anon insert/update from frontend (tighten in Phase 2 with Supabase Auth)
CREATE POLICY "Allow anon insert" ON app_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update" ON app_users
  FOR UPDATE USING (true);
