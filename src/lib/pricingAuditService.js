/**
 * pricingAuditService.js — Persistence layer for PricingAuditEvent records.
 *
 * INTERNAL ONLY. Never imported by client-facing renderers/PDF/preview.
 * All methods are fire-and-forget (non-blocking) to avoid disrupting workflows.
 *
 * Event taxonomy (exhaustive):
 *   field_change              — unit_price or unit_cost modified
 *   override_loss_send        — manager/admin overrides loss pricing to send
 *   override_loss_approve     — manager/admin overrides loss pricing to approve
 *   zero_profit_confirmation  — any role confirms zero-profit (NOT an override)
 *   send_after_override       — document sent following a loss override
 *   approve_after_override    — document approved following a loss override
 *   manual_approval           — manual status change to approved
 *
 * This service handles persistence ONLY. It does NOT:
 *   - decide whether an event should be logged (that’s the caller’s job)
 *   - enforce pricing rules or role-based logic
 *   - mix with session-only logs (usePriceAuditLog)
 */
import { base44 } from '@/api/base44Client';

// ── Internal helper ───────────────────────────────────────────────────────────────

async function persistEvent(payload) {
  try {
    await base44.entities.PricingAuditEvent.create(payload);
  } catch (err) {
    console.warn('[PricingAudit] Failed to persist event:', err?.message);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Log a pricing field change (unit_price or unit_cost).
 * Caller must ensure oldValue !== newValue before calling.
 */
export async function logFieldChange({
  documentId,
  documentKind = 'estimate',
  documentNumber,
  lineItemId,
  lineItemName,
  fieldName,
  oldValue,
  newValue,
  userEmail,
  userRole,
  marginAtEvent,
  totalAtEvent,
}) {
  await persistEvent({
    document_id: documentId,
    document_kind: documentKind,
    document_number: documentNumber,
    line_item_id: lineItemId || '',
    line_item_name: lineItemName || '',
    event_type: 'field_change',
    field_name: fieldName,
    old_value: String(oldValue ?? ''),
    new_value: String(newValue ?? ''),
    user_email: userEmail || '',
    user_role: userRole || '',
    margin_at_event: marginAtEvent ?? null,
    total_at_event: totalAtEvent ?? null,
  });
}

/**
 * Log a loss pricing override (manager/admin completed PIN + reason).
 * eventType must be 'override_loss_send' or 'override_loss_approve'.
 */
export async function logLossOverride({
  documentId,
  documentKind = 'estimate',
  documentNumber,
  eventType,
  reason,
  userEmail,
  userRole,
  marginAtEvent,
  totalAtEvent,
  metadata,
}) {
  await persistEvent({
    document_id: documentId,
    document_kind: documentKind,
    document_number: documentNumber,
    event_type: eventType,
    reason: reason || '',
    user_email: userEmail || '',
    user_role: userRole || '',
    margin_at_event: marginAtEvent ?? null,
    total_at_event: totalAtEvent ?? null,
    metadata: metadata || {},
  });
}

/**
 * Log a zero-profit confirmation (any role, no PIN, no reason required).
 * This is NOT an override — it’s a standard acknowledgement.
 */
export async function logZeroProfitConfirmation({
  documentId,
  documentKind = 'estimate',
  documentNumber,
  userEmail,
  userRole,
  marginAtEvent,
  totalAtEvent,
}) {
  await persistEvent({
    document_id: documentId,
    document_kind: documentKind,
    document_number: documentNumber,
    event_type: 'zero_profit_confirmation',
    user_email: userEmail || '',
    user_role: userRole || '',
    margin_at_event: marginAtEvent ?? null,
    total_at_event: totalAtEvent ?? null,
  });
}

/**
 * Generic event logger for send_after_override, approve_after_override, manual_approval.
 */
export async function logActionEvent({
  documentId,
  documentKind = 'estimate',
  documentNumber,
  eventType,
  userEmail,
  userRole,
  marginAtEvent,
  totalAtEvent,
  metadata,
}) {
  await persistEvent({
    document_id: documentId,
    document_kind: documentKind,
    document_number: documentNumber,
    event_type: eventType,
    user_email: userEmail || '',
    user_role: userRole || '',
    margin_at_event: marginAtEvent ?? null,
    total_at_event: totalAtEvent ?? null,
    metadata: metadata || {},
  });
}

// Legacy alias — kept so existing callers don’t break.
// Prefer logLossOverride / logZeroProfitConfirmation / logActionEvent.
export const logOverrideAction = logLossOverride;

/**
 * Fetch audit history for a document (most recent first).
 */
export async function fetchAuditHistory(documentId, limit = 50) {
  try {
    const events = await base44.entities.PricingAuditEvent.filter(
      { document_id: documentId },
      '-created_date',
      limit
    );
    return events;
  } catch (err) {
    console.warn('[PricingAudit] Failed to fetch history:', err?.message);
    return [];
  }
}