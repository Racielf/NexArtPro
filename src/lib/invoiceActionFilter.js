/**
 * invoiceActionFilter.js — Filter invoices by operational urgency
 * Lightweight helpers for action-oriented views
 */

import { getInvoiceFollowUpTiming } from './invoiceFollowUpTiming';
import { isInvoiceOverdue } from './invoiceHelpers';

/**
 * Filter invoices by action type:
 * - 'all': no filter
 * - 'today': next_follow_up_in_days === 0
 * - 'overdue': isOverdue AND balance_due > 0
 * - 'high': urgency === 'high'
 */
export function filterInvoicesByAction(invoices = [], actionType = 'all') {
  if (actionType === 'all') return invoices;

  return invoices.filter(inv => {
    const timing = getInvoiceFollowUpTiming(inv);
    const overdue = isInvoiceOverdue(inv);

    switch (actionType) {
      case 'today':
        return timing && timing.next_follow_up_in_days === 0;
      case 'overdue':
        return overdue;
      case 'high':
        return timing && timing.urgency === 'high';
      default:
        return true;
    }
  });
}

/**
 * Sort invoices by operational priority:
 * 1. urgency (high → medium → low)
 * 2. overdue days (most overdue first)
 * 3. balance_due (highest first)
 */
export function sortInvoicesByUrgency(invoices = []) {
  const urgencyRank = { high: 0, medium: 1, low: 2 };

  return [...invoices].sort((a, b) => {
    const timingA = getInvoiceFollowUpTiming(a);
    const timingB = getInvoiceFollowUpTiming(b);
    const overdueA = isInvoiceOverdue(a);
    const overdueB = isInvoiceOverdue(b);

    const urgencyA = timingA?.urgency || 'low';
    const urgencyB = timingB?.urgency || 'low';

    // 1. Sort by urgency
    if (urgencyRank[urgencyA] !== urgencyRank[urgencyB]) {
      return urgencyRank[urgencyA] - urgencyRank[urgencyB];
    }

    // 2. Both overdue: sort by days overdue (desc)
    if (overdueA && overdueB) {
      const dueA = new Date(a.due_date);
      const dueB = new Date(b.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysOverdueA = Math.floor((today - dueA) / 86400000);
      const daysOverdueB = Math.floor((today - dueB) / 86400000);
      return daysOverdueB - daysOverdueA;
    }

    // 3. Sort by balance_due (desc)
    const balanceA = Math.max(0, (a.total || 0) - (a.amount_paid || 0));
    const balanceB = Math.max(0, (b.total || 0) - (b.amount_paid || 0));
    return balanceB - balanceA;
  });
}