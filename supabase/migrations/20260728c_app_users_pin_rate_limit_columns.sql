-- Rate-limiting columns for the pin-login Edge Function (PIN quick-login for field
-- agents). Simple in-table lockout instead of a separate attempts table, proportionate
-- to a 1-3 person team.
--
-- Applied to production hdiejuqbhqhebrpneymo on 2026-07-28.

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;
