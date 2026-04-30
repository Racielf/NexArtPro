import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── Supabase inline (sin import relativo) ────────────────────────────────────

function createSupabaseAdmin() {
  const url = Deno.env.get('VITE_SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

async function writeSecurityAuditLog(supabase: any, opts: {
  action: string;
  resourceType: string;
  resourceId: string | null;
  severity: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string;
  fingerprint: string | null;
}) {
  if (!supabase) return;
  try {
    await supabase.from('security_audit_logs').insert({
      action: opts.action,
      resource_type: opts.resourceType,
      resource_id: opts.resourceId,
      severity: opts.severity,
      metadata: opts.metadata,
      ip_address: opts.ipAddress,
      user_agent: opts.userAgent,
      fingerprint: opts.fingerprint,
      created_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Base44User {
  email: string;
  full_name?: string;
  role?: string;
  app_role?: string;
}

interface SigningPackage {
  id: string;
  status: string;
  document_title?: string;
  document_number?: string;
  document_type?: string;
  document_id?: string;
  signer_name?: string;
  signer_email?: string;
  company_id?: string;
  expires_at?: string;
  audit_summary?: Record<string, unknown>;
}

interface SigningParticipant {
  id: string;
  status: string;
  signing_order?: number;
  name?: string;
  email?: string;
  role?: string;
  company_id?: string;
  sent_at?: string;
  reminder_last_sent_at?: string;
  reminder_count?: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CLOSED_PACKAGE_STATUSES = new Set(['signed', 'declined', 'expired', 'voided']);
const CLOSED_PARTICIPANT_STATUSES = new Set(['signed', 'declined', 'skipped', 'voided']);
const ADMIN_ROLES = new Set(['admin', 'owner', 'superadmin']);

// ─── Helpers de respuesta ─────────────────────────────────────────────────────

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, code: string, status: number): Response {
  return response({ error: message, code }, status);
}

// ─── Helpers de token ─────────────────────────────────────────────────────────

function randomTokenPart(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

async function sha256Hex(value = ''): Promise<string> {
  const bytes = new TextEncoder().encode(String(value || ''));
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function buildParticipantToken(pkgId: string, participantId: string): string {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

function buildPackageToken(pkgId: string): string {
  return `ns_${pkgId}_${randomTokenPart()}`;
}

// ─── URL de firma ─────────────────────────────────────────────────────────────

function getOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (origin) return origin.replace(/\/$/, '');
  const referer = req.headers.get('referer') || '';
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch {
      return '';
    }
  }
  return '';
}

function buildSigningUrl(req: Request, rawToken: string): string {
  const origin = getOrigin(req);
  const baseUrl = origin || Deno.env.get('APP_ORIGIN') || '';
  if (!baseUrl) return `/sign-document?token=${encodeURIComponent(rawToken)}`;
  return `${baseUrl}/sign-document?token=${encodeURIComponent(rawToken)}`;
}

// ─── Email de recordatorio ────────────────────────────────────────────────────

interface EmailResult {
  sent: boolean;
  reason: string;
}

const NEXARTSIGN_LOGO = 'https://media.base44.com/images/public/69cc888bb34befdf803a06b0/6ffc5cf7b_LoGo.png';
const COMPANY_NAME = 'R.C Art Construction LLC';

function buildSigningEmailHtml(opts: { signerName: string; documentTitle: string; signingUrl: string; expiresAt: string; companyLogoUrl?: string; nexartLogoUrl?: string; companyName?: string }): string {
  const firstName = (opts.signerName || 'there').split(' ')[0];
  const company = opts.companyName || COMPANY_NAME;
  const nexartLogo = opts.nexartLogoUrl || NEXARTSIGN_LOGO;
  const companyLogoBlock = opts.companyLogoUrl
    ? `<img src="${opts.companyLogoUrl}" alt="${company}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;margin:0 auto 12px" />`
    : '';
  const expiryLine = opts.expiresAt
    ? `<p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center">This link expires on ${new Date(opts.expiresAt).toLocaleDateString()}.</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">

  <!-- Header -->
  <tr><td style="background:#0f172a;padding:32px 32px 24px;text-align:center">
    ${companyLogoBlock}
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.3px">${company}</h1>
    <p style="margin:0;font-size:13px;color:#94a3b8">${opts.documentTitle || 'Document ready for signature'}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 36px 0">
    <p style="margin:0 0 10px;font-size:19px;font-weight:700;color:#0f172a">Hello ${firstName},</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:#475569">
      Your document <strong>${opts.documentTitle || 'Document'}</strong> is ready for your secure electronic signature.
      Please review it carefully and click the button below to sign.
    </p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 36px 12px" align="center">
    <a href="${opts.signingUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 52px;border-radius:10px;letter-spacing:0.02em;box-shadow:0 4px 14px rgba(37,99,235,0.35)">Review &amp; Sign Document</a>
  </td></tr>

  <!-- Expiry + fallback -->
  <tr><td style="padding:0 36px 28px" align="center">
    ${expiryLine}
    <p style="margin:12px 0 0;font-size:11px;color:#94a3b8">Or copy this link: <a href="${opts.signingUrl}" style="color:#2563eb;text-decoration:none;word-break:break-all">${opts.signingUrl}</a></p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 36px 28px;text-align:center;border-top:1px solid #e2e8f0">
    <div style="display:inline-block;background:#1e293b;border-radius:10px;padding:12px 20px;margin-bottom:10px">
      <img src="${nexartLogo}" alt="NexArtSign Pro" style="max-width:100px;height:auto;display:block;margin:0 auto" />
    </div>
    <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:0.03em">Secured by NexArtSign Pro · Digital Signature, Limitless</p>
    <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1">© ${new Date().getFullYear()} ${company} · All rights reserved</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendReminderEmail(opts: {
  to: string;
  signerName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt: string;
  companyLogoUrl?: string;
  nexartLogoUrl?: string;
  companyName?: string;
}): Promise<EmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return { sent: false, reason: 'RESEND_API_KEY not configured' };

  const firstName = (opts.signerName || 'there').split(' ')[0];
  const plainText = [
    `Hello ${firstName},`,
    '',
    `Your document "${opts.documentTitle || 'Document'}" is ready for secure signature.`,
    '',
    opts.signingUrl,
    '',
    opts.expiresAt ? `This link expires on ${new Date(opts.expiresAt).toLocaleDateString()}.` : '',
    '',
    'Secured by NexArtSign Pro · Digital Signature, Limitless',
  ].filter(v => v !== undefined).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${opts.companyName || COMPANY_NAME} <estimates@rcartconstruction.com>`,
      to: [opts.to],
      subject: `${opts.documentTitle || 'Document'} is ready for your signature`,
      html: buildSigningEmailHtml(opts),
      text: plainText,
    }),
  });

  const result = await res.json().catch(() => ({})) as Record<string, string>;
  if (!res.ok) return { sent: false, reason: result?.message || result?.error || 'email_failed' };
  return { sent: true, reason: '' };
}

// ─── Autenticación ────────────────────────────────────────────────────────────

async function requireAdminUser(base44: ReturnType<typeof createClientFromRequest>): Promise<Base44User> {
  const user: Base44User | null = await base44.auth.me().catch(() => null);
  if (!user?.email) throw errorResponse('Unauthorized', 'unauthorized', 401);

  const role = String(user.role || user.app_role || '').toLowerCase();
  const isAllowed = ADMIN_ROLES.has(role) || user.email.toLowerCase().endsWith('@rcartconstruction.com');
  if (!isAllowed) throw errorResponse('Forbidden: insufficient role', 'forbidden', 403);

  return user;
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const base44 = createClientFromRequest(req);
    const supabase = createSupabaseAdmin();
    const user = await requireAdminUser(base44);

    const body = await req.json().catch(() => ({})) as {
      package_id?: string;
      participant_id?: string;
      mode?: 'reissue' | 'reminder';
      send_email?: boolean;
      expires_in_days?: number;
    };

    const { package_id, participant_id, mode = 'reissue', send_email = true, expires_in_days = 30 } = body;

    if (!package_id) return errorResponse('Missing package_id', 'missing_package_id', 400);

    // ── Buscar paquete ──────────────────────────────────────────────────────

    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ id: package_id });
    const pkg: SigningPackage | null = pkgRows?.[0] || null;

    if (!pkg) return errorResponse('Signing package not found', 'package_not_found', 404);
    if (CLOSED_PACKAGE_STATUSES.has(pkg.status)) return errorResponse('Signing package is closed', 'package_closed', 409);

    // ── Buscar participante ─────────────────────────────────────────────────

    const participants: SigningParticipant[] =
      (await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: pkg.id })) ?? [];

    const orderedParticipants = [...participants].sort((a, b) => (a.signing_order ?? 1) - (b.signing_order ?? 1));

    let participant: SigningParticipant | null = null;

    if (participant_id) {
      participant = orderedParticipants.find((p) => p.id === participant_id) ?? null;
    } else {
      participant =
        orderedParticipants.find((p) => p.status === 'active') ??
        orderedParticipants.find((p) => !CLOSED_PARTICIPANT_STATUSES.has(p.status)) ??
        null;
    }

    if (orderedParticipants.length > 0 && !participant) return errorResponse('No eligible participant found', 'participant_not_found', 404);
    if (participant && CLOSED_PARTICIPANT_STATUSES.has(participant.status)) return errorResponse('Participant already closed', 'participant_closed', 409);

    // ── Generar token y expiración ──────────────────────────────────────────

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + Math.max(1, Number(expires_in_days || 30)) * 24 * 60 * 60 * 1000).toISOString();

    const rawToken = participant?.id ? buildParticipantToken(pkg.id, participant.id) : buildPackageToken(pkg.id);
    const tokenHash = await sha256Hex(rawToken);
    const signingUrl = buildSigningUrl(req, rawToken);

    // ── Actualizar entidades ────────────────────────────────────────────────

    if (participant?.id) {
      await base44.asServiceRole.entities.SigningParticipant.update(participant.id, {
        status: participant.status === 'pending' ? 'active' : participant.status,
        token: '',
        token_hash: tokenHash,
        token_last_four: rawToken.slice(-4),
        token_created_at: now,
        token_revoked_at: '',
        sent_at: participant.sent_at || now,
        reminder_last_sent_at: send_email ? now : (participant.reminder_last_sent_at ?? ''),
        reminder_count: Number(participant.reminder_count ?? 0) + (send_email ? 1 : 0),
      });

      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
        status: pkg.status === 'draft' ? 'sent' : pkg.status,
        expires_at: expiresAt,
        signer_name: participant.name || pkg.signer_name || '',
        signer_email: participant.email || pkg.signer_email || '',
        audit_summary: {
          ...(pkg.audit_summary ?? {}),
          active_participant_id: participant.id,
          active_participant_role: participant.role || '',
          last_reissue_at: now,
          last_reissue_by: user.email,
        },
      });
    } else {
      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
        token: '',
        token_hash: tokenHash,
        token_last_four: rawToken.slice(-4),
        token_created_at: now,
        token_revoked_at: '',
        expires_at: expiresAt,
        status: pkg.status === 'draft' ? 'sent' : pkg.status,
        audit_summary: {
          ...(pkg.audit_summary ?? {}),
          last_reissue_at: now,
          last_reissue_by: user.email,
        },
      });
    }

    // ── Enviar email ────────────────────────────────────────────────────────

    const recipientEmail = participant?.email || pkg.signer_email || '';
    const recipientName = participant?.name || pkg.signer_name || '';

    const emailResult: EmailResult =
      send_email && recipientEmail
        ? await sendReminderEmail({
            to: recipientEmail,
            signerName: recipientName,
            documentTitle: pkg.document_title || pkg.document_number || 'Document',
            signingUrl,
            expiresAt,
          })
        : { sent: false, reason: send_email ? 'missing_recipient_email' : 'send_email_false' };

    // ── Auditoría ───────────────────────────────────────────────────────────

    await base44.asServiceRole.entities.SigningEvent.create({
      signing_package_id: pkg.id,
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      event_type: mode === 'reminder' ? 'reminder_sent' : 'access_reissued',
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      created_at: now,
      metadata: {
        mode,
        participant_id: participant?.id || '',
        participant_role: participant?.role || '',
        token_last_four: rawToken.slice(-4),
        token_hash_prefix: tokenHash.slice(0, 12),
        email_sent: emailResult.sent,
        email_reason: emailResult.reason,
        expires_at: expiresAt,
      },
      company_id: pkg.company_id || participant?.company_id || 'rc-art',
    });

    await writeSecurityAuditLog(supabase, {
      action: mode === 'reminder' ? 'nexartsign.reminder_sent' : 'nexartsign.access_reissued',
      resourceType: 'nexartsign_signing_package',
      resourceId: pkg.id,
      severity: 'info',
      metadata: {
        participant_id: participant?.id || '',
        participant_role: participant?.role || '',
        email_sent: emailResult.sent,
        expires_at: expiresAt,
      },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || '',
      fingerprint: null,
    });

    // ── Respuesta ───────────────────────────────────────────────────────────

    return response({
      success: true,
      mode,
      signing_url: signingUrl,
      token_last_four: rawToken.slice(-4),
      expires_at: expiresAt,
      email_sent: emailResult.sent,
      email_reason: emailResult.reason,
      participant_id: participant?.id || '',
      participant_name: participant?.name || '',
      participant_email: participant?.email || '',
    });

  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[reissueSigningAccess] error:', error);
    const err = error as { message?: string; code?: string };
    return errorResponse(err?.message || 'Server error', err?.code || 'server_error', 500);
  }
});