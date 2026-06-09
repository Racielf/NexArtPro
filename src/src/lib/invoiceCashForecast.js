/**
 * invoiceCashForecast.js — Estimate WHEN balance_due is likely to be collected.
 * Pure function — no storage, no API calls.
 *
 * Buckets:
 *   "immediate"   — expected within today–3 days
 *   "short_term"  — expected within 4–10 days
 *   "uncertain"   — no reliable timing signal
 */

import { computeInvoiceDerivedFields } from './invoiceHelpers';
import { getInvoiceCollectionState } from './invoiceCollectionState';

/**
 * @param {Object} invoice
 * @returns {{ expected_date: Date|null, confidence: 'high'|'medium'|'low', bucket: 'immediate'|'short_term'|'uncertain' } | null}
 *   Returns null for paid/draft/cancelled — nothing to forecast.
 */
export function getInvoiceCashForecast(invoice) {
  if (!invoice) return null;

  const state = getInvoiceCollectionState(invoice);

  // Nothing to forecast
  if (!state || state === 'paid') return null;

  const { balance_due } = computeInvoiceDerivedFields(invoice);
  if (balance_due <= 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // PROMISED: client gave an explicit future date → high confidence
  if (state === 'promised' && invoice.promised_payment_date) {
    const expected = new Date(invoice.promised_payment_date);
    expected.setHours(0, 0, 0, 0);
    const daysAway = Math.floor((expected - today) / 86400000);
    return {
      expected_date: expected,
      confidence: 'high',
      bucket: daysAway <= 3 ? 'immediate' : 'short_term',
    };
  }

  // COLLECTABLE: not overdue, normal collection cycle → medium confidence, 1–3 day window
  if (state === 'collectable') {
    // If due_date is set and within 10 days, use it; otherwise assume short-term
    if (invoice.due_date) {
      const due = new Date(invoice.due_date);
      due.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.floor((due - today) / 86400000);
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        return { expected_date: due, confidence: 'medium', bucket: 'immediate' };
      }
      if (daysUntilDue > 3 && daysUntilDue <= 10) {
        return { expected_date: due, confidence: 'medium', bucket: 'short_term' };
      }
    }
    // No due date or far out — short-term with medium confidence
    return { expected_date: null, confidence: 'medium', bucket: 'short_term' };
  }

  // AT_RISK / IN_REVIEW → uncertain
  return { expected_date: null, confidence: 'low', bucket: 'uncertain' };
}

/**
 * Aggregate forecast buckets across an invoice list.
 * Returns totals by bucket (balance_due basis).
 */
export function aggregateCashForecast(invoices = []) {
  const result = { expected_immediate: 0, expected_short_term: 0, expected_uncertain: 0 };

  invoices.forEach(inv => {
    const forecast = getInvoiceCashForecast(inv);
    if (!forecast) return;
    const { balance_due } = computeInvoiceDerivedFields(inv);
    if (forecast.bucket === 'immediate')   result.expected_immediate   += balance_due;
    else if (forecast.bucket === 'short_term') result.expected_short_term += balance_due;
    else                                    result.expected_uncertain   += balance_due;
  });

  return result;
}