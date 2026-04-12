/**
 * estimateSalesLifecycle.js
 *
 * Centralized sales lifecycle layer for estimates.
 * Controls status transitions, timestamps, tracking fields, and follow-up state.
 *
 * Each function:
 *   1. Builds the update payload
 *   2. Persists to Base44 entity
 *   3. Returns the payload for local state merge
 *
 * Does NOT handle: logComm, businessNotifications, version archiving.
 * Those remain in the calling components for flexibility.
 */
import { base44 } from '@/api/base44Client';

// ─── Sales stage derivation ────────────────────────────────────────────────
const STATUS_TO_STAGE = {
  draft: 'lead',
  scheduled: 'lead',
  on_my_way: 'lead',
  visit_completed: 'lead',
  sent: 'presented',
  viewed: 'engaged',
  changes_requested: 'negotiation',
  approved: 'won',
  signed: 'won',
  declined: 'lost',
  converted: 'converted',
};

function deriveSalesStage(status) {
  return STATUS_TO_STAGE[status] || 'lead';
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function now() {
  return new Date().toISOString();
}

// Default follow-up: 2 business days from now
function defaultFollowUpDate() {
  const d = new Date();
  let added = 0;
  while (added < 2) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString();
}

// ─── Lifecycle functions ───────────────────────────────────────────────────

/**
 * Mark estimate as sent.
 * Called from EstimateSendReview after email is dispatched.
 */
export async function markEstimateSent(estimateId, { documentConfig } = {}) {
  const ts = now();
  const payload = {
    status: 'sent',
    sent_at: ts,
    sales_stage: deriveSalesStage('sent'),
    last_client_event: 'sent',
    next_follow_up_at: defaultFollowUpDate(),
    follow_up_status: 'pending',
    follow_up_stage: 'initial',
  };
  if (documentConfig) {
    payload.document_config = documentConfig;
  }
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Mark estimate as viewed by client.
 * Increments view_count, updates last_viewed_at.
 * Only transitions status from 'sent' → 'viewed'.
 */
export async function markEstimateViewed(estimateId, currentEstimate) {
  const ts = now();
  const currentCount = currentEstimate.view_count || 0;
  const shouldTransition = currentEstimate.status === 'sent';

  const payload = {
    viewed_at: currentEstimate.viewed_at || ts,
    last_viewed_at: ts,
    view_count: currentCount + 1,
    last_client_event: 'viewed',
    sales_stage: shouldTransition ? deriveSalesStage('viewed') : (currentEstimate.sales_stage || deriveSalesStage(currentEstimate.status)),
  };

  if (shouldTransition) {
    payload.status = 'viewed';
  }

  // Update follow-up if still pending
  if (!currentEstimate.follow_up_status || currentEstimate.follow_up_status === 'pending') {
    payload.follow_up_status = 'pending';
    payload.follow_up_stage = 'post_view';
    payload.next_follow_up_at = defaultFollowUpDate();
  }

  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Approve estimate (without signature).
 */
export async function approveEstimate(estimateId, { approvedBy }) {
  const ts = now();
  const payload = {
    status: 'approved',
    approved_at: ts,
    approved_by: approvedBy,
    sales_stage: deriveSalesStage('approved'),
    last_client_event: 'approved',
    follow_up_status: 'completed',
    follow_up_stage: 'won',
    next_follow_up_at: null,
  };
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Sign estimate (with digital signature).
 */
export async function signEstimate(estimateId, { signerName, signerEmail, signatureBase64 }) {
  const ts = now();
  const payload = {
    status: 'signed',
    signed_at: ts,
    signer_name: signerName,
    signer_email: signerEmail,
    signature_image_base64: signatureBase64,
    sales_stage: deriveSalesStage('signed'),
    last_client_event: 'signed',
    follow_up_status: 'completed',
    follow_up_stage: 'won',
    next_follow_up_at: null,
  };
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Decline estimate.
 */
export async function declineEstimate(estimateId) {
  const ts = now();
  const payload = {
    status: 'declined',
    declined_at: ts,
    sales_stage: deriveSalesStage('declined'),
    last_client_event: 'declined',
    follow_up_status: 'completed',
    follow_up_stage: 'lost',
    next_follow_up_at: null,
  };
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

/**
 * Request changes to estimate.
 * Note: Version archiving is handled by the calling component.
 */
export async function requestEstimateChanges(estimateId, { note, currentVersion }) {
  const ts = now();
  const payload = {
    status: 'changes_requested',
    changes_requested_at: ts,
    changes_requested_note: note,
    version: (currentVersion || 1) + 1,
    sales_stage: deriveSalesStage('changes_requested'),
    last_client_event: 'changes_requested',
    follow_up_status: 'action_required',
    follow_up_stage: 'revision',
    next_follow_up_at: now(), // Immediate action needed
  };
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}