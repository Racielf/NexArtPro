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
 * Uses last_contacted_at as primary anchor to prevent over-contact.
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

  // Use last_contacted_at as primary anchor; fall back to sent_at
  const contactAnchor = invoice.last_contacted_at || invoice.sent_at;
  const daysSinceContact = daysSince(contactAnchor);
  const daysSinceSent = daysSince(invoice.sent_at);
  const daysUntilDue = dueDate ? daysUntil(invoice.due_date) : null;
  const isOverdue = dueDate && dueDate < today && balanceDue > 0;

  // Terminal states: no follow-up needed
  if (status === 'draft' || status === 'cancelled' || balanceDue <= 0) {
    return null;
  }

  // PROMISE TO PAY: if client gave a future payment date, suppress follow-up until that date
  if (invoice.promised_payment_date) {
    const promisedDate = new Date(invoice.promised_payment_date);
    promisedDate.setHours(0, 0, 0, 0);
    const daysUntilPromise = Math.floor((promisedDate - today) / 86400000);

    if (daysUntilPromise > 0) {
      // Promise still upcoming — suppress
      return {
        next_follow_up_in_days: daysUntilPromise,
        urgency: 'low',
        label: `Payment promised for ${invoice.promised_payment_date} — follow up in ${daysUntilPromise}d`,
      };
    }

    // Promise date passed and still unpaid — broken promise, elevated urgency
    if (daysUntilPromise <= 0 && balanceDue > 0) {
      const daysLate = Math.abs(daysUntilPromise);
      return {
        next_follow_up_in_days: 0,
        urgency: 'high',
        label: `Payment promise broken (${daysLate === 0 ? 'due today' : `${daysLate}d late`}) — follow up now`,
      };
    }
  }

  // OVERDUE + just contacted today → only re-suggest if critical (3+ days overdue)
  if (isOverdue) {
    const daysOverdue = Math.floor((today - dueDate) / 86400000);
    if (daysSinceContact === 0 && daysOverdue < 3) {
      return {
        next_follow_up_in_days: 1,
        urgency: 'high',
        label: `Contacted today — follow up tomorrow (overdue ${daysOverdue}d)`,
      };
    }
    return {
      next_follow_up_in_days: 0,
      urgency: 'high',
      label: `Follow up today (overdue ${daysOverdue}d)`,
    };
  }

  // CLIENT RESPONSE: has question — always immediate regardless of last contact
  if (invoice.client_response_status === 'has_question') {
    return {
      next_follow_up_in_days: 0,
      urgency: 'high',
      label: 'Respond today (client has a question)',
    };
  }

  // OVER-CONTACT GUARD: contacted today → hold off unless overdue/question
  if (daysSinceContact === 0) {
    return {
      next_follow_up_in_days: 2,
      urgency: 'low',
      label: 'Contacted today — check back in 2 days',
    };
  }

  // CLIENT RESPONSE: will pay soon — anchor from last contact
  if (invoice.client_response_status === 'will_pay_soon') {
    const waitDays = Math.max(0, 3 - (daysSinceContact || 0));
    if (waitDays > 0) {
      return {
        next_follow_up_in_days: waitDays,
        urgency: 'low',
        label: `Check in ${waitDays}d (client paying soon)`,
      };
    }
    return {
      next_follow_up_in_days: 0,
      urgency: 'medium',
      label: 'Follow up today — payment window passed',
    };
  }

  // CLIENT RESPONSE: needs time — anchor from last contact with longer window
  if (invoice.client_response_status === 'needs_time') {
    const graceDays = daysUntilDue !== null ? Math.max(1, daysUntilDue - 1) : 5;
    const waitDays = Math.max(0, Math.min(graceDays, 5 - (daysSinceContact || 0)));
    if (waitDays > 0) {
      return {
        next_follow_up_in_days: waitDays,
        urgency: 'low',
        label: `Follow up in ${waitDays}d (extension granted)`,
      };
    }
    return {
      next_follow_up_in_days: 0,
      urgency: 'medium',
      label: 'Extension window ended — follow up today',
    };
  }

  // PARTIAL PAYMENT: anchor from last contact
  if (amountPaid > 0 && balanceDue > 0) {
    const waitDays = Math.max(0, 3 - (daysSinceContact || 0));
    if (waitDays > 0) {
      return {
        next_follow_up_in_days: waitDays,
        urgency: 'medium',
        label: `Check in ${waitDays}d (partial payment: $${(amountPaid / total * 100).toFixed(0)}%)`,
      };
    }
    return {
      next_follow_up_in_days: 0,
      urgency: 'medium',
      label: `Follow up today (balance $${balanceDue.toFixed(2)} remaining)`,
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

  // No contact in 2+ days after sending: re-trigger based on days since last contact
  if (daysSinceContact !== null && daysSinceContact >= 2) {
    if (daysSinceContact >= 5) {
      return {
        next_follow_up_in_days: 0,
        urgency: 'medium',
        label: `Gentle reminder (last contact ${daysSinceContact}d ago)`,
      };
    }
    return {
      next_follow_up_in_days: Math.max(0, 2 - (daysSinceContact - 2)),
      urgency: 'low',
      label: `Check soon (last contact ${daysSinceContact}d ago)`,
    };
  }

  // Recently sent, no prior contact
  return {
    next_follow_up_in_days: 2,
    urgency: 'low',
    label: 'Check in 2 days',
  };
}