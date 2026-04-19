import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildHtml({ greeting, message, clientLink, estimateNumber, clientName, total, attachments, estimatePdfFilename }) {
   const fmtTotal = total != null ? `$${Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null;

   // Build attachments list: estimate PDF + client attachments
   const allAttachments = [];
   if (estimatePdfFilename) {
     allAttachments.push({ file_name: estimatePdfFilename, is_estimate_pdf: true });
   }
   if (attachments && attachments.length > 0) {
     allAttachments.push(...attachments);
   }

   const attachmentsHtml = allAttachments.length > 0
     ? `<tr><td style="padding:24px 32px 0">
         <p style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px">Attached Documents</p>
         ${allAttachments.map(a => `<p style="margin:0 0 6px;font-size:14px"><span style="color:#666;font-size:14px">📎 ${a.file_name || 'Document'}</span>${a.is_estimate_pdf ? ' <span style="color:#999;font-size:12px">(auto-generated)</span>' : ''}</p>`).join('')}
        </td></tr>`
     : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">

  <!-- Header -->
  <tr><td style="background:#0f172a;padding:28px 32px;text-align:center">
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">RC Art Construction</h1>
    <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.04em">Professional Estimates &amp; Proposals</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 32px 0">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a">${greeting}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569;white-space:pre-line">${message}</p>
  </td></tr>

  <!-- Info card -->
  <tr><td style="padding:0 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <tr><td style="padding:16px 20px">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${estimateNumber ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0">Estimate #</td><td style="font-size:13px;font-weight:700;color:#0f172a;text-align:right;padding:4px 0">${estimateNumber}</td></tr>` : ''}
          ${clientName ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0">Client</td><td style="font-size:13px;font-weight:600;color:#0f172a;text-align:right;padding:4px 0">${clientName}</td></tr>` : ''}
          ${fmtTotal ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0">Total</td><td style="font-size:16px;font-weight:800;color:#0f172a;text-align:right;padding:4px 0">${fmtTotal}</td></tr>` : ''}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA Button -->
  <tr><td style="padding:28px 32px" align="center">
    <a href="${clientLink}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.02em">View Estimate</a>
  </td></tr>

  <!-- Fallback link -->
  <tr><td style="padding:0 32px 8px" align="center">
    <p style="margin:0;font-size:12px;color:#94a3b8">Or copy this link into your browser:</p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all"><a href="${clientLink}" style="color:#2563eb;text-decoration:none">${clientLink}</a></p>
  </td></tr>

  <!-- Attachments -->
  ${attachmentsHtml}

  <!-- Reply note -->
  <tr><td style="padding:24px 32px 0">
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px">
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">
      Have questions? Reply directly to this email or contact us at
      <a href="mailto:rcartconstruction@gmail.com" style="color:#2563eb;text-decoration:none;font-weight:600">rcartconstruction@gmail.com</a>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 32px 28px;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8">© ${new Date().getFullYear()} RC Art Construction · All rights reserved</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildPlainText({ greeting, message, clientLink, estimateNumber, clientName, total, attachments, estimatePdfFilename }) {
   const fmtTotal = total != null ? `$${Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '';
   let text = `${greeting}\n\n${message}\n\n`;
   if (estimateNumber) text += `Estimate #: ${estimateNumber}\n`;
   if (clientName) text += `Client: ${clientName}\n`;
   if (fmtTotal) text += `Total: ${fmtTotal}\n`;
   text += `\nView & approve your estimate here:\n${clientLink}\n`;

   // Build attachments list: estimate PDF + client attachments
   const allAttachments = [];
   if (estimatePdfFilename) {
     allAttachments.push({ file_name: estimatePdfFilename, is_estimate_pdf: true });
   }
   if (attachments && attachments.length > 0) {
     allAttachments.push(...attachments);
   }

   if (allAttachments.length > 0) {
     text += '\n📎 Attached documents:\n';
     allAttachments.forEach(a => {
       text += `• ${a.file_name || 'Document'}${a.is_estimate_pdf ? ' (auto-generated)' : ''}\n`;
       if (a.file_url) text += `  ${a.file_url}\n`;
     });
   }
   text += `\nHave questions? Reply to this email or contact us at rcartconstruction@gmail.com\n`;
   text += `\n© ${new Date().getFullYear()} RC Art Construction`;
   return text;
 }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { to, subject, from_name, client_name, estimate_number, total, client_link, message: userMessage, attachments } = payload;

    if (!to || !subject || !client_link) {
      return Response.json({ error: 'Missing required fields: to, subject, client_link' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const firstName = (client_name || '').split(' ')[0] || 'there';
    const greeting = `Hi ${firstName},`;
    const msg = userMessage || 'Please review your estimate and click the button below to view, approve, or decline.';

    // Extract estimate PDF filename for display in email body
    const estimatePdfFilename = attachments?.[0]?.filename || 'estimate.pdf';
    const clientAttachmentsList = attachments?.slice(1) || [];

    const templateData = {
      greeting,
      message: msg,
      clientLink: client_link,
      estimateNumber: estimate_number,
      clientName: client_name,
      total,
      attachments: clientAttachmentsList.map(a => ({ file_name: a.filename || a.url })),
      estimatePdfFilename,
    };

    const html = buildHtml(templateData);
    const text = buildPlainText(templateData);

    const senderName = from_name || 'RC Art Construction';
    const fromAddress = `${senderName} <estimates@rcartconstruction.com>`;

    // Build Resend attachments array: base64 PDFs + URLs
    const resendAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.content && att.contentType === 'application/pdf') {
          // Estimate PDF: base64 content
          resendAttachments.push({
            filename: att.filename,
            content: att.content,
          });
        } else if (att.url) {
          // Client attachment: URL reference
          resendAttachments.push({
            filename: att.filename,
            path: att.url,
          });
        }
      }
    }

    const emailBody = {
      from: fromAddress,
      to: [to],
      reply_to: 'rcartconstruction@gmail.com',
      subject,
      html,
      text,
    };

    // Only add attachments if there are any
    if (resendAttachments.length > 0) {
      emailBody.attachments = resendAttachments;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result?.message || result?.error || 'Resend API error';
      console.error('[sendEstimateEmail] Resend error:', JSON.stringify(result));
      return Response.json({ error: errorMsg }, { status: response.status });
    }

    return Response.json({ success: true, id: result.id });
  } catch (error) {
    console.error('[sendEstimateEmail] Unexpected error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});