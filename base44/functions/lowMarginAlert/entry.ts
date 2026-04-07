/**
 * lowMarginAlert — Backend function (event-driven, internal only)
 *
 * Triggered when an estimate is saved with gross_margin_pct < 25%.
 * Sends a push notification via Firebase Cloud Messaging (primary)
 * and optionally an SMS via Twilio if configured.
 *
 * Anti-spam: max 1 alert per estimate every 30 minutes.
 * Security: no sensitive financial data in notification payload.
 * Skips: if triggered user is admin (handled in caller).
 *
 * Env vars required:
 *   FIREBASE_SERVER_KEY     — FCM legacy HTTP API key (or use v1 with service account)
 *   FIREBASE_TOPIC          — default topic to broadcast (e.g. "admin-alerts")
 *   TWILIO_ACCOUNT_SID      — (optional) Twilio account SID
 *   TWILIO_AUTH_TOKEN       — (optional) Twilio auth token
 *   TWILIO_FROM_NUMBER      — (optional) Twilio sender phone number
 *   TWILIO_TO_NUMBER        — (optional) Admin phone number to receive SMS
 *   APP_BASE_URL            — public base URL of the app (e.g. https://myapp.base44.app)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MARGIN_THRESHOLD    = 25;       // percent
const SPAM_WINDOW_MINUTES = 30;       // min minutes between alerts per estimate
const SPAM_WINDOW_MS      = SPAM_WINDOW_MINUTES * 60 * 1000;

// ── Anti-spam: check EstimateVersionHistory for a recent LOW_MARGIN_ALERT event ──
async function wasRecentlyAlerted(base44, estimateId) {
  try {
    const recent = await base44.asServiceRole.entities.EstimateVersionHistory.filter({
      estimate_id: estimateId,
      archived_reason: 'manual_override',
    });
    // Look for entries with changes_note starting with "LOW_MARGIN_ALERT"
    const alertEntries = recent.filter(e =>
      typeof e.changes_note === 'string' && e.changes_note.startsWith('LOW_MARGIN_ALERT')
    );
    if (!alertEntries.length) return false;
    // Sort by created_date desc
    alertEntries.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const lastAlerted = new Date(alertEntries[0].created_date).getTime();
    return Date.now() - lastAlerted < SPAM_WINDOW_MS;
  } catch {
    return false; // on error, allow alert
  }
}

// ── Log alert event to EstimateVersionHistory (audit trail) ──
async function logAlertEvent(base44, { estimateId, estimateNumber, marginPct, userName }) {
  try {
    await base44.asServiceRole.entities.EstimateVersionHistory.create({
      estimate_id:     estimateId,
      estimate_number: estimateNumber,
      version:         0,
      archived_reason: 'manual_override',
      changes_note:    `LOW_MARGIN_ALERT | margin: ${parseFloat(marginPct).toFixed(1)}% | triggered_by: ${userName} | ts: ${new Date().toISOString()}`,
      archived_by:     userName,
    });
  } catch (err) {
    console.warn('[lowMarginAlert] Audit log failed:', err.message);
  }
}

// ── Build notification message (no sensitive data) ──
function buildMessage({ estimateNumber, clientName, marginPct, userName, appBaseUrl, estimateId }) {
  const marginStr = `${parseFloat(marginPct).toFixed(1)}%`;
  // Link requires authenticated session — routes to internal estimate editor
  const link = `${appBaseUrl}/estimate-editor?id=${estimateId}`;

  return {
    title: `⚠️ Low Margin Alert — Est. #${estimateNumber}`,
    body:  `Client: ${clientName} | Margin: ${marginStr} (below 25%) | Saved by: ${userName}`,
    data: {
      estimate_id:     String(estimateId),
      estimate_number: String(estimateNumber),
      margin_pct:      marginStr,
      user_name:       userName,
      timestamp:       new Date().toISOString(),
      link,
    },
  };
}

// ── Firebase Cloud Messaging (FCM legacy API) ──
async function sendFCM({ title, body, data }) {
  const serverKey = Deno.env.get('FIREBASE_SERVER_KEY');
  const topic     = Deno.env.get('FIREBASE_TOPIC') || 'admin-alerts';

  if (!serverKey) {
    console.log('[lowMarginAlert] FIREBASE_SERVER_KEY not set — skipping FCM');
    return { skipped: true, reason: 'no_firebase_key' };
  }

  const payload = {
    to: `/topics/${topic}`,
    notification: { title, body },
    data,
  };

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method:  'POST',
    headers: {
      'Authorization': `key=${serverKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || json.failure > 0) {
    console.warn('[lowMarginAlert] FCM error:', JSON.stringify(json));
    return { success: false, fcm: json };
  }
  return { success: true, fcm: json };
}

// ── Twilio SMS (optional) ──
async function sendSMS({ title, body }) {
  const sid    = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from   = Deno.env.get('TWILIO_FROM_NUMBER');
  const to     = Deno.env.get('TWILIO_TO_NUMBER');

  if (!sid || !token || !from || !to) {
    console.log('[lowMarginAlert] Twilio not configured — skipping SMS');
    return { skipped: true, reason: 'twilio_not_configured' };
  }

  const message = `${title}\n${body}`;
  const params  = new URLSearchParams({ From: from, To: to, Body: message });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    console.warn('[lowMarginAlert] Twilio error:', JSON.stringify(json));
    return { success: false, sms: json };
  }
  return { success: true, sms: { sid: json.sid, status: json.status } };
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth — must be a registered user (non-admin callers only, enforced in frontend)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      estimate_id,
      estimate_number,
      client_name,
      margin_pct,
    } = body;

    // Basic validation
    if (!estimate_id || margin_pct === undefined || margin_pct === null) {
      return Response.json({ error: 'Missing required fields: estimate_id, margin_pct' }, { status: 400 });
    }

    const marginNum = parseFloat(margin_pct);

    // Only alert if actually below threshold
    if (marginNum >= MARGIN_THRESHOLD) {
      return Response.json({ skipped: true, reason: 'margin_above_threshold', margin_pct: marginNum });
    }

    // Anti-spam check
    const alreadyAlerted = await wasRecentlyAlerted(base44, estimate_id);
    if (alreadyAlerted) {
      return Response.json({
        skipped: true,
        reason:  'rate_limited',
        message: `Alert already sent within the last ${SPAM_WINDOW_MINUTES} minutes`,
      });
    }

    const userName   = user.full_name || user.email || 'Unknown';
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://app.base44.app';

    const msg = buildMessage({
      estimateNumber: estimate_number,
      clientName:     client_name || 'Unknown',
      marginPct:      marginNum,
      userName,
      appBaseUrl,
      estimateId: estimate_id,
    });

    // Fire notifications in parallel
    const [fcmResult, smsResult] = await Promise.all([
      sendFCM(msg),
      sendSMS(msg),
    ]);

    // Log audit event (non-blocking — alert was sent, log it)
    await logAlertEvent(base44, {
      estimateId:     estimate_id,
      estimateNumber: estimate_number,
      marginPct:      marginNum,
      userName,
    });

    return Response.json({
      success: true,
      event:   'LOW_MARGIN_ALERT',
      margin_pct: marginNum,
      fcm: fcmResult,
      sms: smsResult,
    });

  } catch (error) {
    console.error('[lowMarginAlert] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});