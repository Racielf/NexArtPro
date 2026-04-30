import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const COMPANY_NAME = 'R.C Art Construction LLC';
const COMPANY_EMAIL = 'info@rcartconstruction.com';
const APP_NAME = 'NexArtSign Pro';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function maybeSignedFileUrl(base44: any, fileUrl: string) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http')) return fileUrl;

  try {
    const signed = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUrl,
      expires_in: 604800,
    });
    return signed?.signed_url || fileUrl;
  } catch {
    return fileUrl;
  }
}

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

function textBody({ recipientName, estimateNumber, companySigner, clientSigner, signedLink }: Record<string, string>) {
  return [
    `Hi ${recipientName},`,
    '',
    `The final signed copy for Estimate #${estimateNumber} is ready.`,
    'This archived PDF includes both the authorized company signature and the client signature.',
    '',
    `Authorized representative: ${companySigner}`,
    `Client signer: ${clientSigner}`,
    '',
    `Open signed PDF: ${signedLink}`,
    '',
    `Sent securely by ${APP_NAME}`,
  ].join('\n');
}

Deno.serve(async (req) => {
  try {
    if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not configured' }, 500);

    const base44 = createClientFromRequest(req);
    const { package_id } = await req.json();

    if (!package_id || typeof package_id !== 'string') {
      return json({ error: 'Missing package_id' }, 400);
    }

    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ id: package_id }).catch(() => []);
    const pkg = pkgRows?.[0];
    if (!pkg) return json({ error: 'Signing package not found' }, 404);
    if (pkg.status !== 'signed') return json({ error: 'Signing package is not finalized' }, 409);

    const estimateRows = await base44.asServiceRole.entities.Estimate.filter({ id: pkg.document_id }).catch(() => []);
    const estimate = estimateRows?.[0];
    if (!estimate) return json({ error: 'Estimate not found' }, 404);

    const signedLink = await maybeSignedFileUrl(base44, estimate.final_signed_pdf_url || pkg.final_pdf_url || '');
    if (!signedLink) return json({ error: 'Signed PDF is not available yet' }, 409);

    const companySigner = estimate.company_signature_name || COMPANY_NAME;
    const clientSigner = estimate.signature_name || estimate.accepted_by || estimate.client_name || 'Client';
    const estimateNumber = String(estimate.estimate_number || '');

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

    for (const recipient of recipients) {
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
        text: textBody({
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

      await sendEmail(payload);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: error.message || 'Server error' }, 500);
  }
});