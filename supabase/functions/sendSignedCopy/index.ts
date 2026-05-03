/**
 * sendSignedCopy — Edge Function (Supabase)
 * Sends the final signed PDF to client and company via Resend.
 * Ported from nexartsign-pro-app: replaces Base44 SDK with Supabase direct queries.
 */
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { json, corsOk } from '../_shared/signingContext.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const COMPANY_NAME = 'R.C Art Construction LLC';
const COMPANY_EMAIL = 'info@rcartconstruction.com';
const APP_NAME = 'NexArtSign Pro';

async function sendEmail(payload: Record<string, unknown>) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || 'Failed to send signed estimate email');
  }
  return result;
}

function htmlBody({ recipientName, estimateNumber, companySigner, clientSigner, signedLink }: Record<string, string>) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Signed Estimate #${estimateNumber}</h2>
      <p style="line-height: 1.65; color: #475569;">Hi ${recipientName},</p>
      <p style="line-height: 1.65; color: #475569;">
        The final signed document is ready. This archived PDF includes both the authorized company signature and the client signature.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:18px 0;">
        <p style="margin:0 0 6px;"><strong>Authorized representative:</strong> ${companySigner}</p>
        <p style="margin:0;"><strong>Client signer:</strong> ${clientSigner}</p>
      </div>
      <p style="margin:20px 0;">
        <a href="${signedLink}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">
          Open Signed PDF
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;">Sent securely by ${APP_NAME}</p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOk();
  try {
    if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not configured' }, 500);

    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);
    const { token } = await req.json();

    if (!token || typeof token !== 'string') return json({ error: 'Missing token' }, 400);

    // Find package by token (legacy direct match)
    const pkgRows = await entities.SigningPackage.filter({ token }).catch(() => []);
    const pkg = pkgRows?.[0];
    if (!pkg) return json({ error: 'Signing package not found' }, 404);
    if (pkg.status !== 'signed') return json({ error: 'Signing package is not finalized' }, 409);

    const estimateRows = await entities.Estimate.filter({ id: pkg.document_id }).catch(() => []);
    const estimate = estimateRows?.[0];
    if (!estimate) return json({ error: 'Estimate not found' }, 404);

    // Use Supabase Storage signed URL if internal path
    let signedLink = estimate.final_signed_pdf_url || pkg.final_pdf_url || '';
    if (signedLink && !signedLink.startsWith('http')) {
      // For internal storage paths, generate a signed URL via Supabase
      const { data } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(signedLink, 604800); // 7 days
      signedLink = data?.signedUrl || signedLink;
    }
    if (!signedLink) return json({ error: 'Signed PDF is not available yet' }, 409);

    const companySigner = estimate.company_signature_name || COMPANY_NAME;
    const clientSigner = estimate.signature_name || estimate.accepted_by || estimate.client_name || 'Client';
    const estimateNumber = String(estimate.estimate_number || '');

    // Build recipient list — batch send to both client and company
    const recipients: Array<{ email: string; name: string; subject: string }> = [];
    if (estimate.client_email) {
      recipients.push({
        email: estimate.client_email,
        name: estimate.client_name || 'there',
        subject: `Signed Estimate #${estimateNumber}`,
      });
    }
    if (COMPANY_EMAIL) {
      recipients.push({
        email: COMPANY_EMAIL,
        name: `${COMPANY_NAME} team`,
        subject: `Archive Copy • Signed Estimate #${estimateNumber}`,
      });
    }

    // Send emails in parallel for efficiency
    const emailPromises = recipients.map(recipient => {
      const payload: Record<string, unknown> = {
        from: `${APP_NAME} <estimates@rcartconstruction.com>`,
        to: [recipient.email],
        subject: recipient.subject,
        html: htmlBody({
          recipientName: recipient.name,
          estimateNumber,
          companySigner,
          clientSigner,
          signedLink,
        }),
      };

      if (signedLink.startsWith('http')) {
        payload.attachments = [{
          filename: estimate.final_signed_pdf_name || `Signed-Estimate-${estimateNumber}.pdf`,
          path: signedLink,
        }];
      }

      return sendEmail(payload).catch((err: any) => ({ error: err.message }));
    });

    await Promise.all(emailPromises);
    return json({ success: true, recipients_count: recipients.length });
  } catch (error: any) {
    console.error('[sendSignedCopy] Error:', error?.message);
    return json({ error: error.message || 'Server error' }, 500);
  }
});
