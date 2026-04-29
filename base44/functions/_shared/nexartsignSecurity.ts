import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://hdjeiugbhqhebrpneyma.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export const NEXARTSIGN_RATE_LIMIT_WINDOW_MINUTES = 10;
export const NEXARTSIGN_MAX_FAILED_ATTEMPTS = 5;
const NEXARTSIGN_BLOCK_DURATION_MINUTES = 30;

export function getIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || forwardedFor.split(',')[0].trim() || '';
}

export function getUserAgent(req: Request) {
  return req.headers.get('user-agent') || '';
}

export function normalizeFingerprint(value: unknown) {
  const fingerprint = String(value || '').trim();
  return fingerprint.length >= 12 ? fingerprint.slice(0, 255) : null;
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createSupabaseAdmin() {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function writeSecurityAuditLog(
  supabase: any,
  {
    action,
    resourceType,
    resourceId = null,
    severity = 'info',
    metadata = {},
    ipAddress = null,
    userAgent = '',
    fingerprint = null,
  }: {
    action: string;
    resourceType: string;
    resourceId?: string | null;
    severity?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string;
    fingerprint?: string | null;
  }
) {
  if (!supabase || !action || !resourceType) return null;

  const primaryPayload = {
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_severity: severity,
    p_metadata: metadata || {},
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || '',
    p_fingerprint: fingerprint || null,
  };

  const primary = await supabase.rpc('write_security_audit_log', primaryPayload);
  if (!primary.error) return primary.data;

  const fallback = await supabase.rpc('write_security_audit_log', {
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_severity: severity,
    p_metadata: {
      ...(metadata || {}),
      ip_address: ipAddress || null,
      user_agent: userAgent || '',
      fingerprint: fingerprint || null,
      fallback_origin_logging: true,
    },
  });

  return fallback.error ? null : fallback.data;
}

export async function recordTokenAttempt(
  supabase: any,
  {
    tokenHash,
    packageId = null,
    ipAddress = null,
    fingerprint = null,
    userAgent = '',
    success = false,
    reason = null,
  }: {
    tokenHash: string | null;
    packageId?: string | null;
    ipAddress?: string | null;
    fingerprint?: string | null;
    userAgent?: string;
    success?: boolean;
    reason?: string | null;
  }
) {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('record_nexartsign_token_attempt', {
    p_token_hash: tokenHash,
    p_package_id: packageId,
    p_ip_address: ipAddress || null,
    p_fingerprint: fingerprint || null,
    p_user_agent: userAgent || '',
    p_success: success,
    p_reason: reason,
  });

  if (error) return null;
  return data;
}

export async function recentFailedAttempts(
  supabase: any,
  {
    tokenHash,
    ipAddress = null,
    windowMinutes = NEXARTSIGN_RATE_LIMIT_WINDOW_MINUTES,
  }: {
    tokenHash: string | null;
    ipAddress?: string | null;
    windowMinutes?: number;
  }
) {
  if (!supabase) return 0;

  const { data, error } = await supabase.rpc('nexartsign_recent_failed_attempts', {
    p_token_hash: tokenHash,
    p_ip_address: ipAddress || null,
    p_window_minutes: windowMinutes,
  });

  if (error) return 0;
  return Number(data || 0);
}

export async function isOriginBlocked(
  supabase: any,
  {
    ipAddress = null,
    fingerprint = null,
  }: {
    ipAddress?: string | null;
    fingerprint?: string | null;
  }
) {
  if (!supabase || (!ipAddress && !fingerprint)) return false;

  const { data, error } = await supabase.rpc('is_origin_blocked', {
    p_ip_address: ipAddress || null,
    p_fingerprint: fingerprint || null,
  });

  if (error) return false;
  return Boolean(data);
}

export async function createOriginBlock(
  supabase: any,
  {
    ipAddress = null,
    fingerprint = null,
    tokenHash = null,
    packageId = null,
    failedAttempts = 0,
  }: {
    ipAddress?: string | null;
    fingerprint?: string | null;
    tokenHash?: string | null;
    packageId?: string | null;
    failedAttempts?: number;
  }
) {
  if (!supabase) return [];

  const results = [];
  const metadata = {
    source: 'nexartsign',
    failed_attempts: failedAttempts,
    token_hash_prefix: tokenHash ? String(tokenHash).slice(0, 12) : '',
    package_id: packageId || '',
  };

  if (ipAddress) {
    const response = await supabase.rpc('create_security_block', {
      p_block_type: 'ip',
      p_block_value: ipAddress,
      p_reason: 'NexArtSign token rate limit exceeded',
      p_duration_minutes: NEXARTSIGN_BLOCK_DURATION_MINUTES,
      p_severity: 'warning',
      p_metadata: metadata,
    });

    if (!response.error && response.data) results.push(response.data);
  }

  if (fingerprint) {
    const response = await supabase.rpc('create_security_block', {
      p_block_type: 'fingerprint',
      p_block_value: fingerprint,
      p_reason: 'NexArtSign token rate limit exceeded',
      p_duration_minutes: NEXARTSIGN_BLOCK_DURATION_MINUTES,
      p_severity: 'warning',
      p_metadata: metadata,
    });

    if (!response.error && response.data) results.push(response.data);
  }

  return results;
}

export async function runNexArtSignSecurityPreflight(
  supabase: any,
  {
    req,
    token,
    fingerprint,
    packageId = null,
    stage,
  }: {
    supabase?: any;
    req: Request;
    token: string;
    fingerprint?: string | null;
    packageId?: string | null;
    stage: 'resolve' | 'complete';
  }
) {
  const normalizedFingerprint = normalizeFingerprint(fingerprint);
  const ipAddress = getIp(req) || null;
  const userAgent = getUserAgent(req);
  const tokenHash = token ? await sha256Hex(token) : null;

  await writeSecurityAuditLog(supabase, {
    action: 'nexartsign.access_requested',
    resourceType: 'nexartsign_signing_package',
    resourceId: packageId,
    severity: 'info',
    metadata: {
      stage,
      token_hash_prefix: tokenHash ? tokenHash.slice(0, 12) : '',
    },
    ipAddress,
    userAgent,
    fingerprint: normalizedFingerprint,
  });

  if (await isOriginBlocked(supabase, { ipAddress, fingerprint: normalizedFingerprint })) {
    await recordTokenAttempt(supabase, {
      tokenHash,
      packageId,
      ipAddress,
      fingerprint: normalizedFingerprint,
      userAgent,
      success: false,
      reason: 'origin_blocked',
    });

    await writeSecurityAuditLog(supabase, {
      action: 'nexartsign.origin_blocked',
      resourceType: 'nexartsign_signing_package',
      resourceId: packageId,
      severity: 'critical',
      metadata: {
        stage,
        token_hash_prefix: tokenHash ? tokenHash.slice(0, 12) : '',
      },
      ipAddress,
      userAgent,
      fingerprint: normalizedFingerprint,
    });

    await writeSecurityAuditLog(supabase, {
      action: 'nexartsign.access_denied',
      resourceType: 'nexartsign_signing_package',
      resourceId: packageId,
      severity: 'critical',
      metadata: {
        stage,
        reason: 'origin_blocked',
        token_hash_prefix: tokenHash ? tokenHash.slice(0, 12) : '',
      },
      ipAddress,
      userAgent,
      fingerprint: normalizedFingerprint,
    });

    return {
      ok: false,
      status: 423,
      code: 'origin_blocked',
      message: 'Access to this signing session is blocked for security review.',
      tokenHash,
      ipAddress,
      userAgent,
      fingerprint: normalizedFingerprint,
    };
  }

  const failedAttempts = await recentFailedAttempts(supabase, {
    tokenHash,
    ipAddress,
  });

  if (failedAttempts >= NEXARTSIGN_MAX_FAILED_ATTEMPTS) {
    await recordTokenAttempt(supabase, {
      tokenHash,
      packageId,
      ipAddress,
      fingerprint: normalizedFingerprint,
      userAgent,
      success: false,
      reason: 'rate_limited',
    });

    await createOriginBlock(supabase, {
      ipAddress,
      fingerprint: normalizedFingerprint,
      tokenHash,
      packageId,
      failedAttempts,
    });

    await writeSecurityAuditLog(supabase, {
      action: 'nexartsign.rate_limited',
      resourceType: 'nexartsign_signing_package',
      resourceId: packageId,
      severity: 'critical',
      metadata: {
        stage,
        failed_attempts: failedAttempts,
        window_minutes: NEXARTSIGN_RATE_LIMIT_WINDOW_MINUTES,
        token_hash_prefix: tokenHash ? tokenHash.slice(0, 12) : '',
      },
      ipAddress,
      userAgent,
      fingerprint: normalizedFingerprint,
    });

    await writeSecurityAuditLog(supabase, {
      action: 'nexartsign.access_denied',
      resourceType: 'nexartsign_signing_package',
      resourceId: packageId,
      severity: 'critical',
      metadata: {
        stage,
        reason: 'rate_limited',
        failed_attempts: failedAttempts,
        window_minutes: NEXARTSIGN_RATE_LIMIT_WINDOW_MINUTES,
        token_hash_prefix: tokenHash ? tokenHash.slice(0, 12) : '',
      },
      ipAddress,
      userAgent,
      fingerprint: normalizedFingerprint,
    });

    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: 'Too many invalid attempts. This signing session is temporarily locked.',
      tokenHash,
      ipAddress,
      userAgent,
      fingerprint: normalizedFingerprint,
      failedAttempts,
    };
  }

  return {
    ok: true,
    tokenHash,
    ipAddress,
    userAgent,
    fingerprint: normalizedFingerprint,
    failedAttempts,
  };
}
