/**
 * invoiceOperatorQueue.js — Derive operator queue groups from invoice state
 * Pure function — no storage, no API calls.
 *
 * Queue groups (priority order):
 *   urgent_now           — final notice/firm overdue + broken promises + unassigned issues
 *   follow_up_today      — action_today workload but not urgent
 *   billing_issues       — assigned billing issues in resolution
 *   no_queue             — everything else (promised future, will_pay_soon, etc.)
 */

import { getInvoiceWorkloadCategory } from './invoiceCollectionWorkload';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from './invoiceHelpers';
import { getEscalationBand, getOverdueDays } from './invoiceMessageTemplates';
import { getInvoiceFollowUpTiming } from './invoiceFollowUpTiming';

/**
 * Classify invoice into operator queue group.
 * @param {Object} invoice
 * @returns {'urgent_now'|'follow_up_today'|'billing_issues'|'no_queue'|null}
 */
export function getInvoiceQueueGroup(invoice) {
  if (!invoice || invoice.status === 'draft' || invoice.status === 'cancelled') {
    return null;
  }

  const { balance_due } = computeInvoiceDerivedFields(invoice);
  if (balance_due <= 0) return null; // paid

  const workloadCategory = getInvoiceWorkloadCategory(invoice);
  const timing = getInvoiceFollowUpTiming(invoice);

  // URGENT NOW: broken promises, unassigned billing issues, final notice overdue
  if (workloadCategory === 'broken_promise') {
    return 'urgent_now';
  }

  if (invoice.billing_issue_status === 'open' && !invoice.billing_issue_owner) {
    return 'urgent_now';
  }

  if (isInvoiceOverdue(invoice)) {
    const band = getEscalationBand(invoice);
    if (band === 'urgent' || band === 'firm') {
      return 'urgent_now';
    }
  }

  // FOLLOW-UP TODAY: needs action today (but not urgent)
  if (timing && timing.next_follow_up_in_days === 0) {
    return 'follow_up_today';
  }

  // BILLING ISSUES: assigned issues in resolution
  if (invoice.billing_issue_status === 'open' && invoice.billing_issue_owner) {
    return 'billing_issues';
  }

  // Everything else (promised future, will_pay_soon, monitoring, etc.)
  return 'no_queue';
}

/**
 * Sort invoices within their queue group.
 * Priority: urgency → overdue_days (desc) → balance_due (desc)
 */
function sortQueueInvoices(invoices) {
  return invoices.sort((a, b) => {
    // Urgency: high > medium > low
    const aUrgency = getInvoiceFollowUpTiming(a)?.urgency || 'low';
    const bUrgency = getInvoiceFollowUpTiming(b)?.urgency || 'low';
    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    if (urgencyOrder[aUrgency] !== urgencyOrder[bUrgency]) {
      return urgencyOrder[bUrgency] - urgencyOrder[aUrgency];
    }

    // Overdue days (descending)
    const aOverdue = isInvoiceOverdue(a) ? getOverdueDays(a) : -1;
    const bOverdue = isInvoiceOverdue(b) ? getOverdueDays(b) : -1;
    if (aOverdue !== bOverdue) {
      return bOverdue - aOverdue;
    }

    // Balance due (descending)
    const aBalance = computeInvoiceDerivedFields(a).balance_due;
    const bBalance = computeInvoiceDerivedFields(b).balance_due;
    return bBalance - aBalance;
  });
}

/**
 * Build queue groups from invoices.
 * Returns { urgent_now: [...], follow_up_today: [...], billing_issues: [...], no_queue: [...] }
 */
export function buildOperatorQueue(invoices = []) {
  const queue = {
    urgent_now: [],
    follow_up_today: [],
    billing_issues: [],
    no_queue: [],
  };

  invoices.forEach(inv => {
    const group = getInvoiceQueueGroup(inv);
    if (group && queue[group]) {
      queue[group].push(inv);
    }
  });

  // Sort within each group
  Object.keys(queue).forEach(key => {
    queue[key] = sortQueueInvoices(queue[key]);
  });

  return queue;
}

/**
 * Get human-readable queue group labels with icons and colors.
 */
export const QUEUE_LABELS = {
  urgent_now: {
    label: 'Urgent Now',
    description: 'Final notices, broken promises, unassigned issues',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: '🔴',
    order: 1,
  },
  follow_up_today: {
    label: 'Follow-up Today',
    description: 'Needs action today',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: '🟠',
    order: 2,
  },
  billing_issues: {
    label: 'Billing Issues',
    description: 'In resolution with assigned owner',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    icon: '🔵',
    order: 3,
  },
  no_queue: {
    label: 'Monitoring',
    description: 'No action needed now',
    color: 'text-slate-500',
    bg: 'bg-slate-50 border-slate-200',
    icon: '⚪',
    order: 4,
  },
};