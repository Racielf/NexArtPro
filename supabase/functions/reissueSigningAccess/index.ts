/**
 * reissueSigningAccess — Edge Function (Supabase)
 * Admin-only: reissues a signing link or sends a reminder email.
 * Ported from nexartsign-pro-app: replaces Base44 SDK with Supabase direct queries.
 */
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { createSupabaseAdmin, sha256Hex, writeSecurityAuditLog } from '../_shared/nexartsignSecurity.ts';
import { json, sortParticipants } from '../_shared/signingContext.ts';

const CLOSED_PACKAGE_STATUSES = new Set(['signed', 'declined', 'expired', 'voided']);
const CLOSED_PARTICIPANT_STATUSES = new Set(['signed', 'declined', 'skipped', 'voided']);
const COMPANY_NAME = 'R.C Art Construction LLC';

function randomTokenPart() { return crypto.randomUUID().replace(/-/g, ''); }
function buildParticipantToken(pkgId: string, pid: string) { return `nsp_${pkgId}_${pid}_${randomTokenPart()}`; }
function buildPackageToken(pkgId: string) { return `ns_${pkgId}_${randomTokenPart()}`; }

function getOrigin(req: Request) {
  const origin = req.headers.get('origin') || '';
  if (origin) return origin.replace(/\/$/, '');
  const referer = req.headers.get('referer') || '';
  if (referer) { try { const u = new URL(referer); return `${u.protocol}//${u.host}`; } catch { return ''; } }
  return '';
}

function buildSigningUrl(req: Request, rawToken: string) {
  const base = getOrigin(req) || Deno.env.get('APP_ORIGIN') || '';
  if (!base) return `/sign-document?token=${encodeURIComponent(rawToken)}`;
  return `${base}/sign-document?token=${encodeURIComponent(rawToken)}`;
}

async function sendReminderEmail(opts: any) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return { sent: false, reason: 'RESEND_API_KEY not configured' };

  const firstName = (opts.signerName || 'there').split(' ')[0];
  const company = opts.companyName || COMPANY_NAME;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${company} <estimates@rcartconstruction.com>`,
      to: [opts.to],
      subject: `${opts.documentTitle || 'Document'} is ready for your signature`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
        <h2>Hello ${firstName},</h2>
        <p>Your document <strong>${opts.documentTitle || 'Document'}</strong> is ready for signature.</p>
        <p style="margin:20px 0"><a href="${opts.signingUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 40px;border-radius:10px;font-weight:700;text-decoration:none">Review & Sign Document</a></p>
        ${opts.expiresAt ? `<p style="font-size:13px;color:#94a3b8">Expires: ${new Date(opts.expiresAt).toLocaleDateString()}</p>` : ''}
        <p style="font-size:11px;color:#94a3b8">Secured by NexArtSign Pro</p>
      </div>`,
      text: `Hello ${firstName},\n\nYour document "${opts.documentTitle}" is ready for signature.\n\n${opts.signingUrl}\n\nSecured by NexArtSign Pro`,
    }),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, reason: result?.message || 'email_failed' };
  return { sent: true, reason: '' };
}

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);
    const supabase = createSupabaseAdmin();

    // Auth: require valid JWT
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Unauthorized', code: 'unauthorized' }, 401);

    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user?.email) return json({ error: 'Unauthorized', code: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({})) as any;
    const { package_id, participant_id, mode = 'reissue', send_email = true, expires_in_days = 30 } = body;
    if (!package_id) return json({ error: 'Missing package_id', code: 'missing_package_id' }, 400);

    const pkgRows = await entities.SigningPackage.filter({ id: package_id });
    const pkg = pkgRows?.[0] || null;
    if (!pkg) return json({ error: 'Signing package not found', code: 'package_not_found' }, 404);
    if (CLOSED_PACKAGE_STATUSES.has(pkg.status)) return json({ error: 'Signing package is closed', code: 'package_closed' }, 409);

    const participants = (await entities.SigningParticipant.filter({ signing_package_id: pkg.id })) ?? [];
    const ordered = sortParticipants(participants);

    let participant: any = null;
    if (participant_id) {
      participant = ordered.find((p: any) => p.id === participant_id) ?? null;
    } else {
      participant = ordered.find((p: any) => p.status === 'active')
        ?? ordered.find((p: any) => !CLOSED_PARTICIPANT_STATUSES.has(p.status))
        ?? null;
    }

    if (ordered.length > 0 && !participant) return json({ error: 'No eligible participant found', code: 'participant_not_found' }, 404);
    if (participant && CLOSED_PARTICIPANT_STATUSES.has(participant.status)) return json({ error: 'Participant already closed', code: 'participant_closed' }, 409);

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + Math.max(1, Number(expires_in_days || 30)) * 86400000).toISOString();

    const rawToken = participant?.id ? buildParticipantToken(pkg.id, participant.id) : buildPackageToken(pkg.id);
    const tokenHash = await sha256Hex(rawToken);
    const signingUrl = buildSigningUrl(req, rawToken);

    // Batch: update participant + package in parallel where possible
    if (participant?.id) {
      await Promise.all([
        entities.SigningParticipant.update(participant.id, {
          status: participant.status === 'pending' ? 'active' : participant.status,
          token: '', token_hash: tokenHash, token_last_four: rawToken.slice(-4),
          token_created_at: now, token_revoked_at: '',
          sent_at: participant.sent_at || now,
          reminder_last_sent_at: send_email ? now : (participant.reminder_last_sent_at ?? ''),
          reminder_count: Number(participant.reminder_count ?? 0) + (send_email ? 1 : 0),
        }),
        entities.SigningPackage.update(pkg.id, {
          status: pkg.status === 'draft' ? 'sent' : pkg.status,
          expires_at: expiresAt,
          signer_name: participant.name || pkg.signer_name || '',
          signer_email: participant.email || pkg.signer_email || '',
          audit_summary: {
            ...(pkg.audit_summary ?? {}),
            active_participant_id: participant.id,
            last_reissue_at: now,
            last_reissue_by: user.email,
          },
        }),
      ]);
    } else {
      await entities.SigningPackage.update(pkg.id, {
        token: '', token_hash: tokenHash, token_last_four: rawToken.slice(-4),
        token_created_at: now, token_revoked_at: '',
        expires_at: expiresAt,
        status: pkg.status === 'draft' ? 'sent' : pkg.status,
        audit_summary: {
          ...(pkg.audit_summary ?? {}),
          last_reissue_at: now,
          last_reissue_by: user.email,
        },
      });
    }

    // Send email
    const recipientEmail = participant?.email || pkg.signer_email || '';
    const recipientName = participant?.name || pkg.signer_name || '';

    const emailResult = send_email && recipientEmail
      ? await sendReminderEmail({
          to: recipientEmail, signerName: recipientName,
          documentTitle: pkg.document_title || pkg.document_number || 'Document',
          signingUrl, expiresAt,
          companyName: (pkg.audit_summary?.company_name as string) || COMPANY_NAME,
        })
      : { sent: false, reason: send_email ? 'missing_recipient_email' : 'send_email_false' };

    // Audit event + security log in parallel
    await Promise.all([
      entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type, document_id: pkg.document_id,
        event_type: mode === 'reminder' ? 'reminder_sent' : 'access_reissued',
        actor_name: user.user_metadata?.full_name || user.email,
        actor_email: user.email,
        created_at: now,
        metadata: {
          mode, participant_id: participant?.id || '',
          email_sent: emailResult.sent, expires_at: expiresAt,
        },
        company_id: pkg.company_id || 'rc-art',
      }),
      writeSecurityAuditLog(supabase, {
        action: mode === 'reminder' ? 'nexartsign.reminder_sent' : 'nexartsign.access_reissued',
        resourceType: 'nexartsign_signing_package',
        resourceId: pkg.id,
        severity: 'info',
        metadata: { participant_id: participant?.id || '', email_sent: emailResult.sent, expires_at: expiresAt },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || '',
        fingerprint: null,
      }),
    ]);

    return json({
      success: true, mode, signing_url: signingUrl,
      token_last_four: rawToken.slice(-4), expires_at: expiresAt,
      email_sent: emailResult.sent, email_reason: emailResult.reason,
      participant_id: participant?.id || '',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[reissueSigningAccess] error:', error);
    const err = error as any;
    return json({ error: err?.message || 'Server error', code: 'server_error' }, 500);
  }
});
