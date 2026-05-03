// sendEstimateEmail — Alias that redirects to the generic sendEmail function.
// The sendEmail function already handles the estimate email template when
// it receives { message, client_link, estimate_number, total } in the payload.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const DEFAULT_FROM_DOMAIN = "rcartconstruction.com";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
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
      attachments,
    } = payload;

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }



    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;text-align:center;">
    <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">${from_name || "R.C Art Construction LLC"}</h1>
    <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.5px;">PROFESSIONAL ESTIMATE</p>
  </div>
  <div style="padding:32px;">
    ${client_name ? `<p style="margin:0 0 8px;font-size:14px;color:#64748b;">Dear ${client_name},</p>` : ""}
    <div style="font-size:14px;line-height:1.7;color:#1e293b;white-space:pre-line;margin-bottom:24px;">${message || subject}</div>
    ${estimate_number ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Estimate Reference</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">#${estimate_number}</p>
    </div>` : ""}
    ${client_link ? `<div style="text-align:center;margin:28px 0;">
      <a href="${client_link}" style="display:inline-block;background:linear-gradient(135deg,#0f172a 0%,#334155 100%);color:#fff;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">
        📄 Review & Sign Document
      </a>
    </div>
    <p style="font-size:13px;color:#475569;text-align:center;margin:8px 0 0;line-height:1.5;">Please review the complete scope of work, terms, and project details before making your decision.</p>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:16px;">🔒 This is a secure signing link. Do not share it with others.</p>` : ""}
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Powered by NexArt Pro · NexArtSign™ Secure Document Signing</p>
  </div>
</div>
</body>
</html>`;

    const fromAddress = `${from_name || "NexArt Pro"} <noreply@${DEFAULT_FROM_DOMAIN}>`;

    const resendPayload: Record<string, unknown> = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: htmlBody,
    };

    // Handle attachments (base64 or URL)
    if (Array.isArray(attachments) && attachments.length > 0) {
      resendPayload.attachments = attachments
        .filter((att: { filename?: string; content?: string; url?: string }) => att?.filename && (att?.content || att?.url))
        .map((att: { filename: string; content?: string; url?: string }) => {
          if (att.content) return { filename: att.filename, content: att.content };
          return { filename: att.filename, path: att.url };
        });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("[sendEstimateEmail] Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: resendData?.message || "Email delivery failed" }),
        { status: resendRes.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sendEstimateEmail] Sent estimate #${estimate_number} to ${to} — id: ${resendData?.id}`);

    return new Response(
      JSON.stringify({ success: true, id: resendData?.id }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sendEstimateEmail] Error:", err?.message);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
