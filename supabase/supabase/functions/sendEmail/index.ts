import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * sendEmail — Generic email Edge Function via Resend API.
 *
 * Accepts the same shape as the legacy base44.integrations.Core.SendEmail:
 *   { to, subject, body, from_name, html?, attachments? }
 *
 * Also supports the richer shape used by sendEstimateEmail:
 *   { to, subject, message, client_link, client_name, estimate_number, total, from_name, attachments }
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const DEFAULT_FROM_DOMAIN = "rcartconstruction.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const payload = await req.json();
    const {
      to,
      subject,
      body,
      html,
      from_name,
      message,
      client_link,
      client_name,
      estimate_number,
      total,
      attachments,
    } = payload;

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("[sendEmail] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Build HTML body
    let htmlBody = html || "";
    if (!htmlBody && body) {
      // Convert plain text body to simple HTML
      htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${body
        .split("\n")
        .map((line: string) => (line.trim() === "" ? "<br>" : `<p style="margin: 4px 0;">${line}</p>`))
        .join("")}</div>`;
    }

    // If this is an estimate email with client_link, build a rich template
    if (!htmlBody && message && client_link) {
      htmlBody = buildEstimateEmailHtml({
        message,
        client_link,
        client_name: client_name || "",
        estimate_number: estimate_number || "",
        total: total || 0,
        from_name: from_name || "R.C Art Construction LLC",
      });
    }

    if (!htmlBody) {
      htmlBody = `<p>${subject}</p>`;
    }

    // Build Resend payload
    const fromAddress = `${from_name || "NexArt Pro"} <noreply@${DEFAULT_FROM_DOMAIN}>`;

    const resendPayload: Record<string, unknown> = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: htmlBody,
    };

    // Handle attachments
    if (Array.isArray(attachments) && attachments.length > 0) {
      resendPayload.attachments = attachments
        .filter((att: { filename?: string; content?: string; url?: string }) => att?.filename && (att?.content || att?.url))
        .map((att: { filename: string; content?: string; url?: string; contentType?: string }) => {
          if (att.content) {
            // Base64 content
            return { filename: att.filename, content: att.content };
          }
          // URL-based attachment (Resend fetches it)
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
      console.error("[sendEmail] Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: resendData?.message || "Email delivery failed", details: resendData }),
        { status: resendRes.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sendEmail] Sent to ${to} — subject: "${subject}" — id: ${resendData?.id}`);

    return new Response(
      JSON.stringify({ success: true, id: resendData?.id }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sendEmail] Unexpected error:", err?.message);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

function buildEstimateEmailHtml({
  message,
  client_link,
  client_name,
  estimate_number,
  total,
  from_name,
}: {
  message: string;
  client_link: string;
  client_name: string;
  estimate_number: string;
  total: number;
  from_name: string;
}) {
  const formattedTotal = typeof total === "number" ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:#0f172a;padding:24px 32px;text-align:center;">
    <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">${from_name}</h1>
  </div>
  <div style="padding:32px;">
    ${client_name ? `<p style="margin:0 0 8px;font-size:14px;color:#64748b;">Dear ${client_name},</p>` : ""}
    <div style="font-size:14px;line-height:1.6;color:#1e293b;white-space:pre-line;margin-bottom:24px;">${message}</div>
    ${estimate_number ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;">Estimate</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">#${estimate_number}</p>
      ${formattedTotal ? `<p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#0f172a;">${formattedTotal}</p>` : ""}
    </div>` : ""}
    <div style="text-align:center;margin:24px 0;">
      <a href="${client_link}" style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
        Review & Sign Document
      </a>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:24px;">This is a secure link. Do not share it with others.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Powered by NexArt Pro · NexArtSign™</p>
  </div>
</div>
</body>
</html>`;
}
