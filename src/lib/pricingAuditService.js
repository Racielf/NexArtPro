/**
 * pricingAuditService.js — Persistence layer for PricingAuditEvent records.
 *
 * INTERNAL ONLY. Never imported by client-facing renderers/PDF/preview.
 * All writes are fire-and-forget (non-blocking).
 *
 * Event taxonomy (exhaustive — 4 types only):
 *   field_change              — unit_price or unit_cost modified
 *   loss_override             — manager/admin overrides loss pricing (PIN + reason)
 *   zero_profit_confirmation  — any role confirms zero-profit (standard confirmation)
 *   send_after_override       — document sent following a loss override
 *
 * Standardized payload shape:
 *   event_type, document_id, document_kind, user_email, user_role, metadata
 *
 * This service handles persistence ONLY. It does NOT:
 *   - decide whether an event should be logged (caller’s job)
 *   - enforce pricing rules or role-based logic
 *   - mix with session-only logs (usePriceAuditLog)
 */
import { nexartClient } from '@/api/nexartClient';

export const ALLOWED_EVENT_TYPES = ['field_change', 'loss_override', 'zero_profit_confirmation', 'send_after_override'];

// ── Internal ──────────────────────────────────────────────────────────────────

async function persistEvent(payload) {
  try {
    await nexartClient.entities.PricingAuditEvent.create(payload);
  } catch (err) {
    console.warn('[PricingAudit] persist failed:', err?.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Log a pricing field change (unit_price or unit_cost).
 * Caller must ensure the value actually changed before calling.
 *
 * metadata: { field_name, old_value, new_value, line_item_id, line_item_name,
 *             margin_at_event?, total_at_event? }
 */
export async function logFieldChange({ documentId, documentKind, userEmail, userRole, metadata }) {
  await persistEvent({
    event_type: 'field_change',
    document_id: documentId,
    document_kind: documentKind || 'estimate',
    user_email: userEmail || '',
    user_role: userRole || '',
    metadata: metadata || {},
  });
}

/**
 * Log a loss pricing override (manager/admin completed PIN + reason).
 *
 * metadata: { reason, lossItems, margin_at_event?, total_at_event? }
 */
export async function logLossOverride({ documentId, documentKind, userEmail, userRole, metadata }) {
  await persistEvent({
    event_type: 'loss_override',
    document_id: documentId,
    document_kind: documentKind || 'estimate',
    user_email: userEmail || '',
    user_role: userRole || '',
    metadata: metadata || {},
  });
}

/**
 * Log a zero-profit confirmation (any role, no PIN, no reason).
 *
 * metadata: { margin_at_event?, total_at_event? }
 */
export async function logZeroProfitConfirmation({ documentId, documentKind, userEmail, userRole, metadata }) {
  await persistEvent({
    event_type: 'zero_profit_confirmation',
    document_id: documentId,
    document_kind: documentKind || 'estimate',
    user_email: userEmail || '',
    user_role: userRole || '',
    metadata: metadata || {},
  });
}

/**
 * Log a send-after-override event.
 * Only call when a document is actually sent following a valid loss override.
 *
 * metadata: { margin_at_event?, total_at_event? }
 */
export async function logSendAfterOverride({ documentId, documentKind, userEmail, userRole, metadata }) {
  await persistEvent({
    event_type: 'send_after_override',
    document_id: documentId,
    document_kind: documentKind || 'estimate',
    user_email: userEmail || '',
    user_role: userRole || '',
    metadata: metadata || {},
  });
}

/**
 * Fetch audit history for a document (most recent first).
 */
export async function fetchAuditHistory(documentId, limit = 50) {
  try {
    const events = await nexartClient.entities.PricingAuditEvent.filter(
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