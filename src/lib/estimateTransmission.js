/**
 * estimateTransmission.js
 *
 * Manage EstimateTransmission records for send traceability.
 * Phase 6: Track each outbound delivery as its own record.
 */

import { base44 } from '@/api/base44Client';

/**
 * Create transmission record on successful send.
 */
export async function recordSuccessfulTransmission({
  estimateId,
  snapshotId,
  recipientEmail,
  messageId,
  subject,
  clientName,
  estimateNumber,
  documentType,
}) {
  try {
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.EstimateTransmission.create({
      estimate_id: estimateId,
      snapshot_id: snapshotId,
      recipient_email: recipientEmail,
      provider: 'resend',
      provider_message_id: messageId,
      status: 'sent',
      sent_at: now,
      subject,
      client_name: clientName,
      estimate_number: estimateNumber,
      document_type: documentType,
    });
  } catch (err) {
    console.warn('[recordSuccessfulTransmission] failed:', err?.message);
  }
}

/**
 * Create transmission record on failed send.
 */
export async function recordFailedTransmission({
  estimateId,
  recipientEmail,
  errorMessage,
  subject,
  clientName,
  estimateNumber,
  documentType,
}) {
  try {
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.EstimateTransmission.create({
      estimate_id: estimateId,
      recipient_email: recipientEmail,
      provider: 'resend',
      status: 'failed',
      failed_at: now,
      error_message: errorMessage,
      subject,
      client_name: clientName,
      estimate_number: estimateNumber,
      document_type: documentType,
    });
  } catch (err) {
    console.warn('[recordFailedTransmission] failed:', err?.message);
  }
}

/**
 * Get latest transmission for estimate (for inspection/debugging).
 */
export async function getLatestTransmission(estimateId) {
  try {
    const transmissions = await base44.asServiceRole.entities.EstimateTransmission.filter(
      { estimate_id: estimateId },
      '-created_date',
      1
    );
    return transmissions?.[0] || null;
  } catch (err) {
    console.warn('[getLatestTransmission] failed:', err?.message);
    return null;
  }
}

/**
 * List all transmissions for estimate (for transmission history).
 */
export async function listTransmissions(estimateId, limit = 20) {
  try {
    const transmissions = await base44.asServiceRole.entities.EstimateTransmission.filter(
      { estimate_id: estimateId },
      '-created_date',
      limit
    );
    return transmissions || [];
  } catch (err) {
    console.warn('[listTransmissions] failed:', err?.message);
    return [];
  }
}