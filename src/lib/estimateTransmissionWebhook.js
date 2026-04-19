/**
 * estimateTransmissionWebhook.js
 *
 * Handle Resend webhook events for EstimateTransmission records.
 * Maps Resend events to transmission delivery timestamps.
 */

import { base44 } from '@/api/base44Client';

/**
 * Find transmission by provider_message_id (for webhook lookup)
 */
export async function findTransmissionByMessageId(messageId) {
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
 * Apply webhook event update to transmission.
 * Supported events: delivered, opened, clicked, bounced
 */
export async function applyWebhookEvent(transmission, event) {
  if (!transmission) return null;

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
    return { ...transmission, ...updates };
  } catch (err) {
    console.warn('[applyWebhookEvent] update failed:', err?.message);
    return null;
  }
}