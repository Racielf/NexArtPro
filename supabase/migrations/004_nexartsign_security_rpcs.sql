-- ============================================================================
-- NexArtSign Security RPC Functions
-- Required by Edge Functions: nexartsignSecurity.ts
-- ============================================================================

-- 1. write_security_audit_log — writes to security_audit_logs table
CREATE OR REPLACE FUNCTION write_security_audit_log(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT '',
  p_fingerprint TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO security_audit_logs (
    action, resource_type, resource_id, severity,
    metadata, ip_address, user_agent, fingerprint, created_at
  ) VALUES (
    p_action, p_resource_type, p_resource_id, p_severity,
    p_metadata, p_ip_address, p_user_agent, p_fingerprint, NOW()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: log failure shouldn't break signing flow
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. record_nexartsign_token_attempt — tracks token access attempts
CREATE OR REPLACE FUNCTION record_nexartsign_token_attempt(
  p_token_hash TEXT,
  p_package_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT '',
  p_success BOOLEAN DEFAULT false,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO nexartsign_token_attempts (
    token_hash, package_id, ip_address, fingerprint,
    user_agent, success, reason, created_at
  ) VALUES (
    p_token_hash, p_package_id, p_ip_address, p_fingerprint,
    p_user_agent, p_success, p_reason, NOW()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. nexartsign_recent_failed_attempts — count recent failures for rate limiting
CREATE OR REPLACE FUNCTION nexartsign_recent_failed_attempts(
  p_token_hash TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_window_minutes INT DEFAULT 10
) RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM nexartsign_token_attempts
  WHERE success = false
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL
    AND (
      (p_token_hash IS NOT NULL AND token_hash = p_token_hash)
      OR (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    );
  RETURN COALESCE(v_count, 0);
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. is_origin_blocked — check if IP or fingerprint is blocked
CREATE OR REPLACE FUNCTION is_origin_blocked(
  p_ip_address TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_blocked BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM nexartsign_security_blocks
    WHERE active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        (block_type = 'ip' AND block_value = p_ip_address)
        OR (block_type = 'fingerprint' AND block_value = p_fingerprint)
      )
  ) INTO v_blocked;
  RETURN COALESCE(v_blocked, false);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. create_security_block — block an IP or fingerprint
CREATE OR REPLACE FUNCTION create_security_block(
  p_block_type TEXT,
  p_block_value TEXT,
  p_reason TEXT DEFAULT '',
  p_duration_minutes INT DEFAULT 30,
  p_severity TEXT DEFAULT 'warning',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO nexartsign_security_blocks (
    block_type, block_value, reason, severity, metadata,
    active, created_at, expires_at
  ) VALUES (
    p_block_type, p_block_value, p_reason, p_severity, p_metadata,
    true, NOW(), NOW() + (p_duration_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- Supporting tables (if not exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  severity TEXT DEFAULT 'info',
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT DEFAULT '',
  fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexartsign_token_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT,
  package_id TEXT,
  ip_address TEXT,
  fingerprint TEXT,
  user_agent TEXT DEFAULT '',
  success BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexartsign_security_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type TEXT NOT NULL,     -- 'ip' or 'fingerprint'
  block_value TEXT NOT NULL,
  reason TEXT DEFAULT '',
  severity TEXT DEFAULT 'warning',
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action ON security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_resource ON security_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_token_attempts_hash ON nexartsign_token_attempts(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_attempts_ip ON nexartsign_token_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_token_attempts_created ON nexartsign_token_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_security_blocks_active ON nexartsign_security_blocks(active, block_type, block_value);
CREATE INDEX IF NOT EXISTS idx_security_blocks_expires ON nexartsign_security_blocks(expires_at);

-- RLS: security tables only accessible via service role (Edge Functions)
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexartsign_token_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexartsign_security_blocks ENABLE ROW LEVEL SECURITY;

-- No public access policies — only service_role can read/write these tables
