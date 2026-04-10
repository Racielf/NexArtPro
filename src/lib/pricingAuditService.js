/**
 * pricingAuditService.js — Thin service to persist PricingAuditEvent records.
 *
 * INTERNAL ONLY. Never imported by client-facing renderers/PDF/preview.
 * All methods are fire-and-forget (non-blocking) to avoid disrupting workflows.
 */
import { base44 } from '@/api/base44Client';

/**
 * Log a pricing field change (unit_price, unit_cost, quantity, etc.)
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
  try {
    await base44.entities.PricingAuditEvent.create({
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
      margin_at_event: marginAtEvent,
      total_at_event: totalAtEvent,
    });
  } catch (err) {
    console.warn('[PricingAudit] Failed to log field change:', err?.message);
  }
}

/**
 * Log a pricing override action (loss send, zero-profit send, low margin, etc.)
 */
export async function logOverrideAction({
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
  try {
    await base44.entities.PricingAuditEvent.create({
      document_id: documentId,
      document_kind: documentKind,
      document_number: documentNumber,
      event_type: eventType,
      reason: reason || '',
      user_email: userEmail || '',
      user_role: userRole || '',
      margin_at_event: marginAtEvent,
      total_at_event: totalAtEvent,
      metadata: metadata || {},
    });
  } catch (err) {
    console.warn('[PricingAudit] Failed to log override action:', err?.message);
  }
}

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