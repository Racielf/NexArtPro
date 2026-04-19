/**
 * resendWebhook.js
 *
 * Receives Resend email events and updates EstimateTransmission records.
 * Validates Resend webhook signature.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Webhook secret must be set in environment
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET');

/**
 * Validate Resend webhook signature using x-resend-signature header.
 * Resend uses HMAC-SHA256: signature = base64(HMAC-SHA256(body, secret))
 */
async function validateResendSignature(body, signature) {
  if (!RESEND_WEBHOOK_SECRET) {
    console.warn('[validateResendSignature] RESEND_WEBHOOK_SECRET not set');
    return false;
  }

  try {
    const bodyBytes = new TextEncoder().encode(body);
    const secretBytes = new TextEncoder().encode(RESEND_WEBHOOK_SECRET);

    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', key, bodyBytes);
    const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    return computed === signature;
  } catch (err) {
    console.warn('[validateResendSignature] validation failed:', err?.message);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    // Only POST allowed
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Read raw body for signature validation
    const body = await req.text();

    // Validate signature
    const signature = req.headers.get('x-resend-signature');
    if (!signature || !(await validateResendSignature(body, signature))) {
      console.warn('[resendWebhook] Invalid or missing signature');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse event
    const event = JSON.parse(body);

    if (!event.type || !event.data?.email_id) {
      console.warn('[resendWebhook] Missing event.type or email_id');
      return Response.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    // Get service role client (no user auth needed for webhook)
    const base44 = createClientFromRequest(req);

    // Find transmission by provider_message_id
    const messageId = event.data.email_id;
    const transmissions = await base44.asServiceRole.entities.EstimateTransmission.filter(
      { provider_message_id: messageId },
      '-created_date',
      1
    );

    if (!transmissions || transmissions.length === 0) {
      // Transmission not found — could be from different app or test event
      // Don't error; Resend may send test webhooks
      console.info('[resendWebhook] No transmission found for message_id:', messageId);
      return Response.json({ success: true, message: 'No matching transmission' }, { status: 200 });
    }

    const transmission = transmissions[0];

    // Apply event update
    const updates = {};
    const now = new Date().toISOString();

    switch (event.type) {
      case 'email.delivered':
        if (!transmission.delivered_at) {
          updates.delivered_at = now;
        }
        break;

      case 'email.opened':
        if (!transmission.opened_at) {
          updates.opened_at = now;
        }
        break;

      case 'email.clicked':
        if (!transmission.clicked_at) {
          updates.clicked_at = now;
        }
        break;

      case 'email.bounced':
        if (!transmission.bounced_at) {
          updates.bounced_at = now;
          updates.status = 'bounced';
        }
        break;

      default:
        // Unsupported event — still return 200 to acknowledge receipt
        return Response.json({ success: true, message: `Event type ${event.type} not processed` }, { status: 200 });
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.EstimateTransmission.update(transmission.id, updates);
      console.info('[resendWebhook] Updated transmission:', transmission.id, 'with event:', event.type);
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[resendWebhook] Unexpected error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});