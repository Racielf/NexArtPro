/**
 * invoiceCollectionWorkload.js — Derive collections workload categories from invoice state
 * Pure function — no storage, no API calls.
 *
 * Workload categories:
 *   action_today     — needs follow-up today (overdue, broken promise, unassigned issue, etc.)
 *   urgent           — escalated priority (urgent band overdue, unassigned issue)
 *   broken_promise   — client missed a promised payment date
 *   billing_issue    — open billing issue blocking collection
 *   no_action        — everything else (promised future, will_pay_soon, etc.)
 */

import { getInvoiceFollowUpTiming } from './invoiceFollowUpTiming';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from './invoiceHelpers';
import { getEscalationBand, getOverdueDays } from './invoiceMessageTemplates';

/**
 * Classify a single invoice's workload category.
 * @param {Object} invoice
 * @returns {'action_today'|'urgent'|'broken_promise'|'billing_issue'|'no_action'|null}
 */
export function getInvoiceWorkloadCategory(invoice) {
  if (!invoice || invoice.status === 'draft' || invoice.status === 'cancelled') {
    return null;
  }

  const { balance_due } = computeInvoiceDerivedFields(invoice);
  if (balance_due <= 0) return null; // paid

  const timing = getInvoiceFollowUpTiming(invoice);

  // BROKEN PROMISE: client promised a payment date and passed it
  if (invoice.promised_payment_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promised = new Date(invoice.promised_payment_date);
    promised.setHours(0, 0, 0, 0);
    if (promised < today) {
      return 'broken_promise';
    }
  }

  // BILLING ISSUE OPEN: active issue blocking collection
  if (invoice.billing_issue_status === 'open') {
    // Unassigned issue → urgent
    if (!invoice.billing_issue_owner) {
      return 'urgent';
    }
    // Assigned issue → billing_issue
    return 'billing_issue';
  }

  // ACTION TODAY: follow-up timing indicates action needed today
  if (timing && timing.next_follow_up_in_days === 0) {
    // URGENT: overdue at final-notice or firm band
    if (isInvoiceOverdue(invoice)) {
      const band = getEscalationBand(invoice);
      if (band === 'urgent' || band === 'firm') {
        return 'urgent';
      }
    }
    return 'action_today';
  }

  // Everything else (promised future, will_pay_soon, check_in_n_days, etc.)
  return 'no_action';
}

/**
 * Aggregate workload metrics across invoices.
 * Returns counts and amounts for each category.
 */
export function aggregateCollectionWorkload(invoices = []) {
  const workload = {
    action_today_count: 0,
    action_today_amount: 0,
    urgent_count: 0,
    urgent_amount: 0,
    broken_promise_count: 0,
    broken_promise_amount: 0,
    billing_issue_count: 0,
    billing_issue_amount: 0,
    no_action_count: 0,
    no_action_amount: 0,
  };

  invoices.forEach(inv => {
    const category = getInvoiceWorkloadCategory(inv);
    if (!category) return;

    const { balance_due } = computeInvoiceDerivedFields(inv);
    const key = category;

    workload[`${key}_count`] += 1;
    workload[`${key}_amount`] += balance_due;
  });

  return workload;
}

/**
 * Get human-readable workload labels with icons and colors.
 */
export const WORKLOAD_LABELS = {
  action_today: {
    label: 'Action today',
    description: 'Follow-up required',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  urgent: {
    label: 'Urgent',
    description: 'High escalation',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
  broken_promise: {
    label: 'Broken promises',
    description: 'Missed payment dates',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
  billing_issue: {
    label: 'Billing issues',
    description: 'Blocked from collection',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  no_action: {
    label: 'Monitoring',
    description: 'No action needed',
    color: 'text-slate-500',
    bg: 'bg-slate-50 border-slate-200',
  },
};