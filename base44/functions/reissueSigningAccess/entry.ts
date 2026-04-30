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

async function sendReminderEmail(opts: {
  to: string;
  signerName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt: string;
}): Promise<EmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return { sent: false, reason: 'RESEND_API_KEY not configured' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NexArtSign <estimates@rcartconstruction.com>',
      to: [opts.to],
      subject: `Reminder: ${opts.documentTitle || 'Document'} is ready for signature`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
          <h2>Signature reminder</h2>
          <p>Hello ${opts.signerName || 'there'},</p>
          <p>Your document is ready for secure signature.</p>
          <p>
            <a href="${opts.signingUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;">
              Review and sign document
            </a>
          </p>
          ${opts.expiresAt ? `<p style="font-size:12px;color:#64748b;">This link expires on ${new Date(opts.expiresAt).toLocaleDateString()}.</p>` : ''}
          <p style="font-size:12px;color:#64748b;">Powered by NexArtSign.</p>
        </div>
      `,
      text: [
        `Hello ${opts.signerName || 'there'},`,
        '',
        'Your document is ready for secure signature.',
        '',
        opts.signingUrl,
        '',
        opts.expiresAt ? `This link expires on ${new Date(opts.expiresAt).toLocaleDateString()}.` : '',
        'Powered by NexArtSign.',
      ].filter(Boolean).join('\n'),
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