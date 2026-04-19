/**
 * invoiceFollowUpTiming.js — Derive follow-up timing intelligence
 * Based on: overdue, payment_status, client_response, days since sent
 * Pure functions — no API calls, no stored state.
 */

export function daysSince(isoStr) {
  if (!isoStr) return null;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}

export function daysUntil(isoStr) {
  if (!isoStr) return null;
  return Math.floor((new Date(isoStr).getTime() - Date.now()) / 86400000);
}

/**
 * getInvoiceFollowUpTiming(invoice) → { next_follow_up_in_days, urgency, label }
 *
 * Derives WHEN to follow up and HOW URGENT.
 * Does NOT store — purely computed from invoice state.
 *
 * Returns:
 * - next_follow_up_in_days: number (0 = today, -1 = overdue, null = no action)
 * - urgency: 'low' | 'medium' | 'high' | null
 * - label: human-readable string
 */
export function getInvoiceFollowUpTiming(invoice) {
  if (!invoice) return null;

  const status = invoice.status;
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const amountPaid = invoice.amount_paid || 0;
  const total = invoice.total || 0;
  const balanceDue = Math.max(0, total - amountPaid);

  const daysSinceSent = daysSince(invoice.sent_at);
  const daysSinceResponse = daysSince(invoice.client_response_at);
  const daysUntilDue = dueDate ? daysUntil(invoice.due_date) : null;

  // Terminal states: no follow-up needed
  if (status === 'draft' || status === 'cancelled' || balanceDue <= 0) {
    return null;
  }

  // OVERDUE: highest urgency, follow up TODAY
  if (dueDate && dueDate < today && balanceDue > 0) {
    const daysOverdue = Math.floor((today - dueDate) / 86400000);
    return {
      next_follow_up_in_days: 0,
      urgency: 'high',
      label: `Follow up today (overdue ${daysOverdue}d)`,
    };
  }

  // CLIENT RESPONSE: paid soon — low urgency, monitor in few days
  if (invoice.client_response_status === 'will_pay_soon') {
    return {
      next_follow_up_in_days: 2,
      urgency: 'low',
      label: 'Check in 2 days (client paying soon)',
    };
  }

  // CLIENT RESPONSE: has question — medium urgency, reply quickly
  if (invoice.client_response_status === 'has_question') {
    return {
      next_follow_up_in_days: 0,
      urgency: 'high',
      label: 'Respond today (client question)',
    };
  }

  // CLIENT RESPONSE: needs time — low urgency, respect timeline
  if (invoice.client_response_status === 'needs_time') {
    const gracePeriod = daysUntilDue || 5; // default 5 days if no due date
    return {
      next_follow_up_in_days: Math.max(1, gracePeriod - 1),
      urgency: 'low',
      label: `Follow up in ${Math.max(1, gracePeriod - 1)}d (extension granted)`,
    };
  }

  // PARTIAL PAYMENT: medium urgency, follow up soon
  if (amountPaid > 0 && balanceDue > 0) {
    return {
      next_follow_up_in_days: 3,
      urgency: 'medium',
      label: `Check in 3 days (partial payment: $${(amountPaid / total * 100).toFixed(0)}%)`,
    };
  }

  // DUE SOON (3 days or less): medium urgency
  if (daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue > 0) {
    return {
      next_follow_up_in_days: 0,
      urgency: 'medium',
      label: `Follow up today (due in ${daysUntilDue}d)`,
    };
  }

  // SENT > 5 days, no response: medium urgency, gentle reminder
  if (daysSinceSent !== null && daysSinceSent > 5) {
    return {
      next_follow_up_in_days: 0,
      urgency: 'medium',
      label: `Gentle reminder (sent ${daysSinceSent}d ago)`,
    };
  }

  // SENT 2-5 days: low urgency, monitor
  if (daysSinceSent !== null && daysSinceSent >= 2) {
    return {
      next_follow_up_in_days: 1,
      urgency: 'low',
      label: `Check tomorrow (sent ${daysSinceSent}d ago)`,
    };
  }

  // Just sent: no action yet
  return {
    next_follow_up_in_days: 1,
    urgency: 'low',
    label: 'Check tomorrow',
  };
}