/**
 * invoiceCollectionState.js — Derive A/R collection state from invoice fields.
 * Pure function — no storage, no API calls.
 *
 * States:
 *   "paid"        — balance is zero / status is paid
 *   "promised"    — client has an active payment promise (future date)
 *   "in_review"   — open billing issue (collections paused internally)
 *   "at_risk"     — overdue with no promise and no active issue
 *   "collectable" — sent, balance due, not overdue, no special state
 */

import { computeInvoiceDerivedFields, isInvoiceOverdue } from './invoiceHelpers';

/**
 * @param {Object} invoice
 * @returns {'paid'|'promised'|'in_review'|'at_risk'|'collectable'|null}
 *   Returns null for draft/cancelled — not in A/R scope.
 */
export function getInvoiceCollectionState(invoice) {
  if (!invoice) return null;

  const { status } = invoice;

  // Out of scope
  if (status === 'draft' || status === 'cancelled') return null;

  const { balance_due } = computeInvoiceDerivedFields(invoice);

  // Fully paid
  if (balance_due <= 0 || status === 'paid') return 'paid';

  // Active billing issue — collections paused for internal resolution
  if (invoice.billing_issue_status === 'open') return 'in_review';

  // Active payment promise with a future date
  if (invoice.promised_payment_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promised = new Date(invoice.promised_payment_date);
    promised.setHours(0, 0, 0, 0);
    if (promised >= today) return 'promised';
    // Broken promise falls through to at_risk / overdue
  }

  // Overdue and no promise
  if (isInvoiceOverdue(invoice)) return 'at_risk';

  // Sent and awaiting payment (normal state)
  return 'collectable';
}