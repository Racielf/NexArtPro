import { sha256Hex } from './nexartsignSecurity.ts';

export const NEXARTSIGN_OTP_EXPIRY_MINUTES = 10;
export const NEXARTSIGN_OTP_MAX_ATTEMPTS = 5;
export const NEXARTSIGN_OTP_LOCK_MINUTES = 30;

function randomDigit() {
  return crypto.getRandomValues(new Uint32Array(1))[0] % 10;
}

export function generateOtpCode(length = 6) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += String(randomDigit());
  }
  return code;
}

export async function buildOtpCodeHash(scopeId: string, code: string) {
  return sha256Hex(`${scopeId}:${String(code || '').trim()}`);
}

export function maskEmail(email: string) {
  const normalized = String(email || '').trim().toLowerCase();
  const [localPart = '', domain = ''] = normalized.split('@');
  if (!localPart || !domain) return '';

  const visibleStart = localPart.slice(0, 2);
  const visibleDomain = domain.slice(0, 2);
  return `${visibleStart}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${visibleDomain}${'*'.repeat(Math.max(domain.length - 2, 2))}`;
}

export function otpStateFromContext(context: any) {
  if (!context?.pkg) return null;
  if (context.hasParticipants && context.matchedParticipant) {
    return context.matchedParticipant?.metadata?.nexartsign_otp || null;
  }
  return context.pkg?.audit_summary?.nexartsign_otp || null;
}

export function otpScopeFromContext(context: any) {
  if (!context?.pkg) return null;
  if (context.hasParticipants && context.matchedParticipant) {
    return {
      type: 'participant',
      id: context.matchedParticipant.id,
      email: context.matchedParticipant.email || context.pkg.signer_email || '',
      name: context.matchedParticipant.name || context.pkg.signer_name || '',
      companyId: context.matchedParticipant.company_id || context.pkg.company_id || 'rc-art',
    };
  }

  return {
    type: 'package',
    id: context.pkg.id,
    email: context.pkg.signer_email || '',
    name: context.pkg.signer_name || context.pkg.client_name || '',
    companyId: context.pkg.company_id || 'rc-art',
  };
}

export function otpVerificationStatus(otpState: any, tokenHash: string | null, fingerprint: string | null) {
  if (!otpState?.verified_at) return false;
  if (otpState.locked_until && new Date(otpState.locked_until) > new Date()) return false;
  if (otpState.expires_at && new Date(otpState.expires_at) < new Date()) return false;

  const tokenHashPrefix = tokenHash ? tokenHash.slice(0, 12) : '';
  if ((otpState.verified_token_hash_prefix || '') !== tokenHashPrefix) return false;

  const expectedFingerprint = String(otpState.verified_fingerprint || '').trim();
  if (expectedFingerprint && expectedFingerprint !== String(fingerprint || '').trim()) return false;

  return true;
}

/**
 * Persist OTP state — uses Supabase admin client directly (replaces Base44 SDK).
 * @param supabase — Supabase admin client from createSupabaseAdmin()
 * @param context — signing context with pkg, matchedParticipant, etc.
 * @param otpState — OTP state to persist
 */
export async function persistOtpState(supabase: any, context: any, otpState: Record<string, unknown> | null) {
  if (!supabase || !context?.pkg) return;

  if (context.hasParticipants && context.matchedParticipant?.id) {
    const existingMetadata = context.matchedParticipant.metadata || {};
    await supabase
      .from('signing_participants')
      .update({
        metadata: {
          ...existingMetadata,
          nexartsign_otp: otpState,
        },
      })
      .eq('id', context.matchedParticipant.id)
      .then(() => {})
      .catch(() => {});
    return;
  }

  const existingAudit = context.pkg.audit_summary || {};
  await supabase
    .from('signing_packages')
    .update({
      audit_summary: {
        ...existingAudit,
        nexartsign_otp: otpState,
      },
    })
    .eq('id', context.pkg.id)
    .then(() => {})
    .catch(() => {});
}
