/**
 * resendWebhook.js
 *
 * Server-side webhook handler for Resend email delivery events.
 * Receives Resend webhook payloads, validates signature, and updates EstimateTransmission records.
 *
 * Required environment: RESEND_WEBHOOK_SECRET
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createHmac } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET');

/**
 * Find transmission by provider_message_id
 */
async function findTransmissionByMessageId(base44, messageId) {
  try {
    const transmissions = await base44.asServiceRole.entities.EstimateTransmission.filter(
      { provider_message_id: messageId },
      '-created_date',
      1
    );
    return transmissions?.[0] || null;
  } catch (err) {
    console.warn('[findTransmissionByMessageId] failed:', err?.message);
    return null;
  }
}

/**
 * Apply webhook event update to transmission
 * Supported events: email.delivered, email.opened, email.clicked, email.bounced
 */
async function applyWebhookEvent(base44, transmission, eventType) {
  if (!transmission) return null;

  const updates = {};
  const now = new Date().toISOString();

  switch (eventType) {
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
      // Unsupported event type — silently ignore
      return null;
  }

  // Apply update only if there are changes
  if (Object.keys(updates).length === 0) {
    return transmission;
  }

  try {
    await base44.asServiceRole.entities.EstimateTransmission.update(
      transmission.id,
      updates
    );
    console.log(`[resendWebhook] transmission ${transmission.id} updated:`, Object.keys(updates));
    return { ...transmission, ...updates };
  } catch (err) {
    console.warn('[applyWebhookEvent] update failed:', err?.message);
    return null;
  }
}

/**
 * Validate Resend HMAC signature
 * Resend sends: x-resend-signature header with base64(HMAC-SHA256(body, secret))
 */
async function validateResendSignature(body, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('[validateResendSignature] RESEND_WEBHOOK_SECRET not set — skipping validation');
    return true; // Allow if secret not configured (for local testing only)
  }

  try {
    // Create HMAC-SHA256 hash
    const encoder = new TextEncoder();
    const keyData = encoder.encode(WEBHOOK_SECRET);
    const messageData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature_bytes = await crypto.subtle.sign('HMAC', key, messageData);
    const computed = btoa(String.fromCharCode(...new Uint8Array(signature_bytes)));

    const isValid = computed === signature;
    if (!isValid) {
      console.warn('[validateResendSignature] signature mismatch');
    }
    return isValid;
  } catch (err) {
    console.warn('[validateResendSignature] validation error:', err?.message);
    return false;
  }
}

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Read raw body for signature validation
    const body = await req.text();
    const signature = req.headers.get('x-resend-signature');

    // Validate signature
    const isValid = await validateResendSignature(body, signature);
    if (!isValid) {
      console.warn('[resendWebhook] invalid signature');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      console.warn('[resendWebhook] invalid JSON');
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Extract event data
    const eventType = payload?.type;
    const messageId = payload?.data?.email_id;

    if (!eventType || !messageId) {
      console.warn('[resendWebhook] missing event type or message id');
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Base44 service role client
    const base44 = createClientFromRequest(req);

    // Find transmission by message_id
    const transmission = await findTransmissionByMessageId(base44, messageId);
    if (!transmission) {
      console.warn(`[resendWebhook] transmission not found for message_id: ${messageId}`);
      // Return 200 (no-op safe path — webhook not found is not a server error)
      return Response.json({ success: true, message: 'No transmission found (safe no-op)' });
    }

    // Apply event update
    const result = await applyWebhookEvent(base44, transmission, eventType);
    if (!result) {
      console.warn(`[resendWebhook] failed to apply event ${eventType} to transmission ${transmission.id}`);
      // Return 200 (update failed but request was valid)
      return Response.json({ success: false, message: 'Event type unsupported or update failed' });
    }

    console.log(`[resendWebhook] success: ${eventType} applied to transmission ${transmission.id}`);
    return Response.json({ success: true, transmission: result });
  } catch (err) {
    console.error('[resendWebhook] unhandled error:', err?.message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});