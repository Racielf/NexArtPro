/**
 * verifySigningOtp — Edge Function (Supabase)
 * Verifies the OTP code entered by the signer.
 * Ported from nexartsign-pro-app: replaces Base44 SDK with Supabase direct queries.
 */
import {
  createSupabaseAdmin,
  runNexArtSignSecurityPreflight,
  writeSecurityAuditLog,
} from '../_shared/nexartsignSecurity.ts';
import {
  buildOtpCodeHash,
  NEXARTSIGN_OTP_LOCK_MINUTES,
  otpScopeFromContext,
  otpStateFromContext,
  persistOtpState,
} from '../_shared/nexartsignOtp.ts';
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { json, corsOk, resolveSigningContext } from '../_shared/signingContext.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOk();
  try {
    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);
    const supabase = createSupabaseAdmin();
    const { token, otp_code, fingerprint } = await req.json();

    if (!token || typeof token !== 'string' || !otp_code || typeof otp_code !== 'string') {
      return json({ error: 'Missing token or code', code: 'invalid_request' }, 400);
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
    const otpState = otpStateFromContext(context);
    if (!otpState?.code_hash) {
      return json({ error: 'Verification code not requested yet', code: 'otp_not_requested' }, 409);
    }

    if (otpState.locked_until && new Date(otpState.locked_until) > new Date()) {
      return json({ error: 'OTP verification is temporarily locked.', code: 'otp_locked', locked_until: otpState.locked_until }, 423);
    }

    if (otpState.expires_at && new Date(otpState.expires_at) < new Date()) {
      return json({ error: 'Verification code expired.', code: 'otp_expired' }, 410);
    }

    const codeHash = await buildOtpCodeHash(scope.id, otp_code.trim());
    if (codeHash !== otpState.code_hash) {
      const attempts = Number(otpState.attempts || 0) + 1;
      const maxAttempts = Number(otpState.max_attempts || 5);
      const nextState: Record<string, unknown> = { ...otpState, attempts };

      let lockedUntil = '';
      if (attempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + NEXARTSIGN_OTP_LOCK_MINUTES * 60 * 1000).toISOString();
        nextState.locked_until = lockedUntil;
      }

      await persistOtpState(supabaseAdmin, context, nextState);

      await entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: attempts >= maxAttempts ? 'otp_locked' : 'otp_failed',
        actor_name: scope.name || pkg.signer_name || '',
        actor_email: scope.email || pkg.signer_email || '',
        ip_address: preflight.ipAddress || '',
        user_agent: preflight.userAgent || '',
        created_at: new Date().toISOString(),
        metadata: {
          otp_scope: scope.type,
          otp_attempts: attempts,
          otp_max_attempts: maxAttempts,
          otp_locked_until: lockedUntil,
        },
        company_id: scope.companyId,
      }).catch(() => {});

      await writeSecurityAuditLog(supabase, {
        action: attempts >= maxAttempts ? 'nexartsign.otp_locked' : 'nexartsign.otp_failed',
        resourceType: 'nexartsign_signing_package',
        resourceId: pkg.id,
        severity: attempts >= maxAttempts ? 'critical' : 'warning',
        metadata: {
          otp_scope: scope.type,
          otp_attempts: attempts,
          otp_max_attempts: maxAttempts,
          otp_locked_until: lockedUntil,
          participant_id: matchedParticipant?.id || '',
        },
        ipAddress: preflight.ipAddress || null,
        userAgent: preflight.userAgent || '',
        fingerprint: preflight.fingerprint || null,
      });

      return json({
        error: attempts >= maxAttempts ? 'OTP verification locked.' : 'Invalid verification code.',
        code: attempts >= maxAttempts ? 'otp_locked' : 'otp_invalid',
        attempts,
        remaining_attempts: Math.max(maxAttempts - attempts, 0),
        locked_until: lockedUntil,
      }, attempts >= maxAttempts ? 423 : 401);
    }

    // OTP verified successfully
    const verifiedAt = new Date().toISOString();
    const nextState = {
      ...otpState,
      attempts: Number(otpState.attempts || 0),
      locked_until: '',
      verified_at: verifiedAt,
      verified_ip: preflight.ipAddress || '',
      verified_fingerprint: preflight.fingerprint || '',
      verified_token_hash_prefix: preflight.tokenHash ? preflight.tokenHash.slice(0, 12) : '',
      code_hash: '',
    };

    await persistOtpState(supabaseAdmin, context, nextState);

    await entities.SigningEvent.create({
      signing_package_id: pkg.id,
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      event_type: 'otp_verified',
      actor_name: scope.name || pkg.signer_name || '',
      actor_email: scope.email || pkg.signer_email || '',
      ip_address: preflight.ipAddress || '',
      user_agent: preflight.userAgent || '',
      created_at: verifiedAt,
      metadata: {
        otp_scope: scope.type,
        participant_id: matchedParticipant?.id || '',
      },
      company_id: scope.companyId,
    }).catch(() => {});

    await writeSecurityAuditLog(supabase, {
      action: 'nexartsign.otp_verified',
      resourceType: 'nexartsign_signing_package',
      resourceId: pkg.id,
      severity: 'info',
      metadata: {
        otp_scope: scope.type,
        participant_id: matchedParticipant?.id || '',
      },
      ipAddress: preflight.ipAddress || null,
      userAgent: preflight.userAgent || '',
      fingerprint: preflight.fingerprint || null,
    });

    return json({
      success: true,
      code: 'otp_verified',
      verified_at: verifiedAt,
      otp_scope: scope.type,
    });
  } catch (error: any) {
    return json({ error: error?.message || 'Server error', code: 'server_error' }, 500);
  }
});
