import { Resend } from 'npm:resend@3.2.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const apiKey = Deno.env.get('RESEND_API_KEY');
const resend = new Resend(apiKey);

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const payload = await req.json();
    const {
      to,
      subject,
      message,
      client_link,
      client_name,
      estimate_number,
      total,
      from_name,
      estimate_pdf_filename,
      attachments = [],
    } = payload;

    if (!to || !subject || !estimate_number) {
      return Response.json({ error: 'Missing required fields: to, subject, estimate_number' }, { status: 400 });
    }

    // Build email body
    const messageText = message || `Please review the attached estimate and click the link below to approve or decline.\n\nSecure link: ${client_link}`;

    // Build attachments array: only include base64 content, ignore URLs
     // (URLs should be embedded in the email body instead)
     const emailAttachments = attachments
       .filter(a => a.content && a.filename) // Only real base64 attachments
       .map(a => ({
         filename: a.filename,
         content: a.content, // Pass base64 string directly to Resend
       }));

    // Send via Resend
     const result = await resend.emails.send({
       from: `${from_name || 'R.C Art Construction LLC'} <noreply@rc-art-construction.com>`,
      to,
      subject,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">New Estimate for ${client_name || 'You'}</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            ${messageText.split('\n').join('<br />')}
          </p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <p style="color: #9ca3af; font-size: 12px; text-transform: uppercase; margin: 0 0 4px 0;">Estimate #</p>
                <p style="color: #1f2937; font-weight: 700; font-size: 18px; margin: 0;">${estimate_number}</p>
              </div>
              <div style="text-align: right;">
                <p style="color: #9ca3af; font-size: 12px; text-transform: uppercase; margin: 0 0 4px 0;">Total</p>
                <p style="color: #1f2937; font-weight: 700; font-size: 18px; margin: 0;">$${(total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <p style="margin: 20px 0; text-align: center;">
            <a href="${client_link}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Review Estimate
            </a>
          </p>

          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            This is a secure, time-limited link. You can also download the attached PDF for offline review.
          </p>
        </div>
      `,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });

    if (result.error) {
      console.error('[sendEstimateEmail] Resend error:', result.error);
      return Response.json(
        { error: `Failed to send email: ${result.error.message}` },
        { status: 500 }
      );
    }

    console.log(`[sendEstimateEmail] Successfully sent estimate #${estimate_number} to ${to}`);
     return Response.json({
       success: true,
       message_id: result.data?.id,
       estimate_number,
     });
    } catch (error) {
     console.error('[sendEstimateEmail] Server error:', error.message);
     return Response.json(
       { error: error.message || 'Internal server error' },
       { status: 500 }
     );
    }
    };