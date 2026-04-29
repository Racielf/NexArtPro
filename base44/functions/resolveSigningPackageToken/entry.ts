import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  createSupabaseAdmin,
  recordTokenAttempt,
  runNexArtSignSecurityPreflight,
  writeSecurityAuditLog,
} from '../_shared/nexartsignSecurity.ts';
import {
  otpStateFromContext,
  otpVerificationStatus,
} from '../_shared/nexartsignOtp.ts';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sortParticipants(rows: any[] = []) {
  return [...rows].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
}

function getActiveParticipant(participants: any[] = []) {
  const ordered = sortParticipants(participants);
  return ordered.find((participant) => participant.status === 'active')
    || ordered.find((participant) => participant.status === 'pending')
    || null;
}

function randomTokenPart() {
  return crypto.randomUUID().replace(/-/g, '');
}

function buildParticipantToken(pkgId: string, participantId: string) {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

async function ensureParticipantToken(base44: any, pkgId: string, participant: any) {
  if (!participant) return '';
  if (participant.token) return participant.token;

  const token = buildParticipantToken(pkgId, participant.id || 'participant');
  await base44.asServiceRole.entities.SigningParticipant.update(participant.id, { token }).catch(() => {});
  participant.token = token;
  return token;
}

async function resolveSigningContext(base44: any, token: string) {
  const participantRows = await base44.asServiceRole.entities.SigningParticipant.filter({ token }).catch(() => []);
  let matchedParticipant = participantRows?.[0] || null;
  let pkg = null;

  if (matchedParticipant?.signing_package_id) {
    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ id: matchedParticipant.signing_package_id }).catch(() => []);
    pkg = pkgRows?.[0] || null;
  }

  if (!pkg) {
    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ token }).catch(() => []);
    pkg = pkgRows?.[0] || null;
  }

  if (!pkg) return null;

  const participants = await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
  const orderedParticipants = sortParticipants(participants);
  const hasParticipants = orderedParticipants.length > 0;
  let activeParticipant = hasParticipants ? getActiveParticipant(orderedParticipants) : null;

  if (activeParticipant && activeParticipant.status === 'pending') {
    await base44.asServiceRole.entities.SigningParticipant.update(activeParticipant.id, { status: 'active' }).catch(() => {});
    activeParticipant.status = 'active';
  }

  if (activeParticipant) {
    await ensureParticipantToken(base44, pkg.id, activeParticipant);
  }

  if (matchedParticipant) {
    matchedParticipant = orderedParticipants.find((participant) => participant.id === matchedParticipant.id) || matchedParticipant;
    if (!matchedParticipant.token) {
      await ensureParticipantToken(base44, pkg.id, matchedParticipant);
    }
  }

  return {
    pkg,
    participants: orderedParticipants,
    hasParticipants,
    matchedParticipant,
    activeParticipant,
  };
}

async function deny(
  supabase: any,
  preflight: any,
  {
    status,
    code,
    message,
    packageId = null,
    reason,
    severity = 'warning',
    metadata = {},
  }: {
    status: number;
    code: string;
    message: string;
    packageId?: string | null;
    reason: string;
    severity?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await recordTokenAttempt(supabase, {
    tokenHash: preflight?.tokenHash || null,
    packageId,
    ipAddress: preflight?.ipAddress || null,
    fingerprint: preflight?.fingerprint || null,
    userAgent: preflight?.userAgent || '',
    success: false,
    reason,
  });

  await writeSecurityAuditLog(supabase, {
    action: 'nexartsign.access_denied',
    resourceType: 'nexartsign_signing_package',
    resourceId: packageId,
    severity,
    metadata: {
      stage: 'resolve',
      reason,
      code,
      ...(metadata || {}),
    },
    ipAddress: preflight?.ipAddress || null,
    userAgent: preflight?.userAgent || '',
    fingerprint: preflight?.fingerprint || null,
  });

  return json({ error: message, code }, status);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const supabase = createSupabaseAdmin();
    const { token, fingerprint } = await req.json();

    if (!token || typeof token !== 'string') {
      return json({ error: 'Invalid or missing token', code: 'invalid_token' }, 400);
    }

    const preflight = await runNexArtSignSecurityPreflight(supabase, {
      req,
      token,
      fingerprint,
      stage: 'resolve',
    });

    if (!preflight.ok) {
      return json({ error: preflight.message, code: preflight.code }, preflight.status);
    }

    const context = await resolveSigningContext(base44, token);
    if (!context?.pkg) {
      return await deny(supabase, preflight, {
        status: 404,
        code: 'invalid_token',
        message: 'Signing package not found',
        reason: 'invalid_token',
      });
    }

    const { pkg, hasParticipants, matchedParticipant, activeParticipant } = context;
    const otpState = otpStateFromContext(context);
    const otpVerified = otpVerificationStatus(otpState, preflight.tokenHash, preflight.fingerprint);

    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { status: 'expired' });
      return await deny(supabase, preflight, {
        status: 410,
        code: 'package_expired',
        message: 'Signing package expired',
        packageId: pkg.id,
        reason: 'package_expired',
      });
    }

    if (hasParticipants) {
      if (!matchedParticipant) {
        return await deny(supabase, preflight, {
          status: 409,
          code: 'participant_token_required',
          message: 'Participant signing link required',
          packageId: pkg.id,
          reason: 'participant_token_required',
        });
      }

      if (!['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
        if (!activeParticipant || matchedParticipant.id !== activeParticipant.id || matchedParticipant.status !== 'active') {
          return await deny(supabase, preflight, {
            status: 409,
            code: 'participant_not_active',
            message: 'This signing link is not active for the current signer',
            packageId: pkg.id,
            reason: 'participant_not_active',
            metadata: {
              participant_id: matchedParticipant.id,
              participant_role: matchedParticipant.role,
            },
          });
        }
      }
    }

    let resolvedStatus = pkg.status;
    let resolvedViewedAt = pkg.viewed_at;

    if (!['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      const viewedAt = new Date().toISOString();
      resolvedStatus = pkg.status === 'draft' || pkg.status === 'sent' ? 'viewed' : pkg.status;
      resolvedViewedAt = pkg.viewed_at || viewedAt;

      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
        status: resolvedStatus,
        viewed_at: resolvedViewedAt,
      });

      if (hasParticipants && matchedParticipant) {
        await base44.asServiceRole.entities.SigningParticipant.update(matchedParticipant.id, {
          viewed_at: matchedParticipant.viewed_at || viewedAt,
        }).catch(() => {});
      }

      await base44.asServiceRole.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'viewed',
        actor_name: matchedParticipant?.name || pkg.signer_name || pkg.client_name || '',
        actor_email: matchedParticipant?.email || pkg.signer_email || '',
        user_agent: req.headers.get('user-agent') || '',
        ip_address: preflight.ipAddress || '',
        metadata: hasParticipants && matchedParticipant
          ? {
              participant_id: matchedParticipant.id,
              role: matchedParticipant.role,
              signing_order: matchedParticipant.signing_order || 1,
            }
          : {},
        created_at: viewedAt,
      });
    }

    await recordTokenAttempt(supabase, {
      tokenHash: preflight.tokenHash,
      packageId: pkg.id,
      ipAddress: preflight.ipAddress || null,
      fingerprint: preflight.fingerprint || null,
      userAgent: preflight.userAgent || '',
      success: true,
      reason: 'token_resolved',
    });

    return json({
      package: {
        id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        document_number: pkg.document_number,
        document_title: pkg.document_title,
        status: resolvedStatus,
        signer_name: matchedParticipant?.name || pkg.signer_name,
        signer_email: matchedParticipant?.email || pkg.signer_email,
        client_name: pkg.client_name,
        source_pdf_url: pkg.source_pdf_url,
        source_pdf_name: pkg.source_pdf_name,
        final_pdf_url: pkg.final_pdf_url,
        final_pdf_name: pkg.final_pdf_name,
        certificate_id: pkg.certificate_id || '',
        provider: pkg.provider,
        signing_mode: pkg.signing_mode,
        expires_at: pkg.expires_at || '',
        viewed_at: resolvedViewedAt || '',
        participant_id: matchedParticipant?.id || '',
        participant_role: matchedParticipant?.role || '',
        token_scope: hasParticipants ? 'participant' : 'package',
        signature_brand_logo_url: pkg.signature_brand_logo_url || '',
        otp_required: true,
        otp_verified: otpVerified,
        otp_delivery_channel: otpState?.delivery_channel || 'email',
        otp_masked_destination: otpState?.masked_destination || '',
        otp_requested_at: otpState?.requested_at || '',
        otp_expires_at: otpState?.expires_at || '',
        otp_locked_until: otpState?.locked_until || '',
      },
    });
  } catch (error: any) {
    return json({ error: error.message || 'Server error', code: 'server_error' }, 500);
  }
});
