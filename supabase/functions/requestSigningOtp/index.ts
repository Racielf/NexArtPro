/**
 * requestSigningOtp — Edge Function (Supabase)
 * Generates and sends an OTP code to the signer's email via Resend.
 * Ported from nexartsign-pro-app: replaces Base44 SDK with Supabase direct queries.
 */
import {
  createSupabaseAdmin,
  runNexArtSignSecurityPreflight,
  writeSecurityAuditLog,
} from '../_shared/nexartsignSecurity.ts';
import {
  buildOtpCodeHash,
  generateOtpCode,
  maskEmail,
  NEXARTSIGN_OTP_EXPIRY_MINUTES,
  otpScopeFromContext,
  otpStateFromContext,
  persistOtpState,
} from '../_shared/nexartsignOtp.ts';
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { json, corsOk, resolveSigningContext } from '../_shared/signingContext.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_NAME = 'NexArtSign Pro';

async function sendEmailOtp({ to, recipientName, code, expiresAt }: Record<string, string>) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const expirationLabel = new Date(expiresAt).toLocaleString('en-US', { timeZone: 'UTC' });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${APP_NAME} <estimates@rcartconstruction.com>`,
      to: [to],
      subject: 'Your NexArtSign verification code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <h2 style="margin-bottom:12px">Verification code</h2>
          <p>Hello ${recipientName || 'there'},</p>
          <p>Use this code to continue signing your document in NexArtSign:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;padding:18px 0">${code}</div>
          <p>This code expires at ${expirationLabel} UTC and can only be used on the active signing session.</p>
        </div>
      `,
      text: [
        `Hello ${recipientName || 'there'},`,
        '',
        'Use this code to continue signing your document in NexArtSign:',
        '',
        code,
        '',
        `This code expires at ${expirationLabel} UTC and can only be used on the active signing session.`,
      ].join('\n'),
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || 'Failed to send OTP email');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOk();
  try {
    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);
    const supabase = createSupabaseAdmin();
    const { token, fingerprint } = await req.json();

    if (!token || typeof token !== 'string') {
      return json({ error: 'Missing token', code: 'invalid_request' }, 400);
    }

    const preflight = await runNexArtSignSecurityPreflight(supabase, {
      req, token, fingerprint, stage: 'complete',
    });

    if (!preflight.ok) {
      return json({ error: preflight.message, code: preflight.code }, preflight.status);
    }

    const context = await resolveSigningContext(entities, preflight.tokenHash);
    if (!context?.pkg) {
      return json({ error: 'Signing package not found', code: 'invalid_token' }, 404);
    }

    const { pkg, hasParticipants, matchedParticipant, activeParticipant } = context;
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      return json({ error: 'Signing package expired', code: 'package_expired' }, 410);
    }

    if (['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      return json({ error: 'Signing package is closed', code: 'package_closed' }, 409);
    }

    if (hasParticipants) {
      if (!matchedParticipant) {
        return json({ error: 'Participant signing token required', code: 'participant_token_required' }, 409);
      }
      if (!activeParticipant || matchedParticipant.id !== activeParticipant.id || matchedParticipant.status !== 'active') {
        return json({ error: 'This signing link is not active for the current signer', code: 'participant_not_active' }, 409);
      }
    }

    const scope = otpScopeFromContext(context);
    if (!scope?.email) {
      return json({ error: 'No email destination available for OTP', code: 'otp_delivery_unavailable' }, 409);
    }

    const currentOtp = otpStateFromContext(context);
    if (currentOtp?.locked_until && new Date(currentOtp.locked_until) > new Date()) {
      return json({
        error: 'OTP verification is temporarily locked.',
        code: 'otp_locked',
        locked_until: currentOtp.locked_until,
      }, 423);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + NEXARTSIGN_OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    const code = generateOtpCode();
    const codeHash = await buildOtpCodeHash(scope.id, code);
    const resendCount = Number(currentOtp?.resend_count || 0) + 1;

    await sendEmailOtp({
      to: scope.email,
      recipientName: scope.name,
      code,
      expiresAt,
    });

    const nextOtp = {
      required: true,
      delivery_channel: 'email',
      masked_destination: maskEmail(scope.email),
      code_hash: codeHash,
      requested_at: now.toISOString(),
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: currentOtp?.max_attempts || 5,
      resend_count: resendCount,
      locked_until: '',
      verified_at: '',
      verified_fingerprint: '',
      verified_token_hash_prefix: '',
      last_requested_ip: preflight.ipAddress || '',
      last_requested_fingerprint: preflight.fingerprint || '',
    };

    await persistOtpState(supabaseAdmin, context, nextOtp);

    await entities.SigningEvent.create({
      signing_package_id: pkg.id,
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      event_type: 'otp_requested',
      actor_name: scope.name || pkg.signer_name || '',
      actor_email: scope.email,
      ip_address: preflight.ipAddress || '',
      user_agent: preflight.userAgent || '',
      created_at: now.toISOString(),
      metadata: {
        otp_delivery_channel: 'email',
        otp_masked_destination: maskEmail(scope.email),
        otp_scope: scope.type,
        otp_resend_count: resendCount,
      },
      company_id: scope.companyId,
    }).catch(() => {});

    await writeSecurityAuditLog(supabase, {
      action: 'nexartsign.otp_requested',
      resourceType: 'nexartsign_signing_package',
      resourceId: pkg.id,
      severity: 'info',
      metadata: {
        otp_scope: scope.type,
        otp_masked_destination: maskEmail(scope.email),
        participant_id: matchedParticipant?.id || '',
      },
      ipAddress: preflight.ipAddress || null,
      userAgent: preflight.userAgent || '',
      fingerprint: preflight.fingerprint || null,
    });

    return json({
      success: true,
      code: 'otp_requested',
      delivery_channel: 'email',
      masked_destination: maskEmail(scope.email),
      expires_at: expiresAt,
      resend_count: resendCount,
    });
  } catch (error: any) {
    return json({ error: error?.message || 'Server error', code: 'server_error' }, 500);
  }
});
