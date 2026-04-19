/**
 * estimateSalesLifecycle.js
 * 
 * Phase 2+3 lifecycle: draft → sent → viewed → approved/declined
 * Only 5 allowed statuses. Only 8 allowed tracking fields.
 */

import { base44 } from '@/api/base44Client';

function now() {
  return new Date().toISOString();
}

/**
 * Generate public share token for estimate.
 */
export async function generatePublicShareToken(estimate) {
  const estimateId = estimate.id;
  const clientEmail = estimate.client_email || '';
  
  const data = new TextEncoder().encode(estimateId + clientEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${estimateId}_${signature}`;
}

/**
 * Mark estimate as sent.
 */
export async function markEstimateSent(estimateId, { documentConfig, estimate } = {}) {
  const ts = now();
  const currentCount = estimate?.follow_up_count || 0;
  
  const payload = {
    status: 'sent',
    sent_at: ts,
    last_contacted_at: ts,
    follow_up_count: currentCount + 1,
    document_config: documentConfig || estimate?.document_config,
  };
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Mark estimate as viewed by client.
 * Only transitions from sent → viewed.
 */
export async function markEstimateViewed(estimateId, currentEstimate) {
  const ts = now();
  
  const payload = {
    viewed_at: ts,
  };
  
  if (currentEstimate.status === 'sent') {
    payload.status = 'viewed';
  }
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Approve estimate.
 */
export async function approveEstimate(estimateId, { approvedBy, estimate } = {}) {
  const ts = now();
  
  const payload = {
    status: 'approved',
    approved_at: ts,
    accepted_by: approvedBy,
  };
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Decline estimate.
 */
export async function declineEstimate(estimateId, { declinedReason } = {}) {
  const ts = now();
  
  const payload = {
    status: 'declined',
    declined_at: ts,
    declined_reason: declinedReason || '',
  };
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}