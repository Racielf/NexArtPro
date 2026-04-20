/**
 * invoiceMessageTemplates.js — Generate context-aware communication templates
 * Lightweight templates for payment reminders, overdue notices, follow-ups
 * No API integration — templates only
 *
 * Escalation bands (overdue days):
 *   0–4  → standard reminder
 *   5–9  → firm follow-up
 *   10+  → urgent / final notice
 */

/**
 * Compute how many days a given invoice is overdue (0 if not overdue).
 */
export function getOverdueDays(invoice) {
  if (!invoice?.due_date) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.due_date);
  const diff = Math.floor((today - due) / 86400000);
  return Math.max(0, diff);
}

/**
 * Return escalation band: 'standard' | 'firm' | 'urgent'
 */
export function getEscalationBand(invoice) {
  const days = getOverdueDays(invoice);
  if (days >= 10) return 'urgent';
  if (days >= 5) return 'firm';
  if (days > 0) return 'standard';
  return null; // not overdue
}

/**
 * Generate payment reminder message (pre-overdue or 0–4 days overdue)
 */
export function generatePaymentReminder(invoice) {
  if (!invoice) return '';
  const balanceDue = invoice.balance_due ?? (invoice.total - (invoice.amount_paid || 0));
  const lines = [
    `Hi ${invoice.client_name},`,
    '',
    `Reminder: Invoice #${invoice.invoice_number} is awaiting payment.`,
    `Amount Due: $${balanceDue.toFixed(2)}`,
  ];
  if (invoice.due_date) lines.push(`Due Date: ${invoice.due_date}`);
  lines.push('', 'Please remit payment at your earliest convenience.');
  lines.push('Thank you for your business.');
  return lines.join('\n');
}

/**
 * Generate firm follow-up message (5–9 days overdue)
 */
export function generateFirmFollowUp(invoice) {
  if (!invoice) return '';
  const balanceDue = invoice.balance_due ?? (invoice.total - (invoice.amount_paid || 0));
  const days = getOverdueDays(invoice);
  const lines = [
    `Hi ${invoice.client_name},`,
    '',
    `We want to follow up on Invoice #${invoice.invoice_number}, which is now ${days} days past due.`,
    `Outstanding Balance: $${balanceDue.toFixed(2)}`,
  ];
  if (invoice.due_date) lines.push(`Originally Due: ${invoice.due_date}`);
  lines.push('', 'Please arrange payment as soon as possible or contact us to discuss your account.');
  lines.push('We appreciate your prompt attention to this matter.');
  return lines.join('\n');
}

/**
 * Generate urgent / final notice message (10+ days overdue)
 */
export function generateUrgentNotice(invoice) {
  if (!invoice) return '';
  const balanceDue = invoice.balance_due ?? (invoice.total - (invoice.amount_paid || 0));
  const days = getOverdueDays(invoice);
  const lines = [
    `Hi ${invoice.client_name},`,
    '',
    `This is an urgent notice regarding Invoice #${invoice.invoice_number}, now ${days} days overdue.`,
    `Outstanding Balance: $${balanceDue.toFixed(2)}`,
  ];
  if (invoice.due_date) lines.push(`Due Date: ${invoice.due_date}`);
  lines.push('', 'Immediate payment is required. Please contact us today to resolve this balance.');
  lines.push('If we do not hear from you, we may need to take further action.');
  return lines.join('\n');
}

/**
 * Generate overdue notice message (generic, kept for backward compat)
 */
export function generateOverdueNotice(invoice) {
  if (!invoice) return '';
  const band = getEscalationBand(invoice);
  if (band === 'urgent') return generateUrgentNotice(invoice);
  if (band === 'firm') return generateFirmFollowUp(invoice);
  return generatePaymentReminder(invoice);
}

/**
 * Generate follow-up message (used when client has responded)
 */
export function generateFollowUp(invoice) {
  if (!invoice) return '';
  const balanceDue = invoice.balance_due ?? (invoice.total - (invoice.amount_paid || 0));
  const lines = [
    `Hi ${invoice.client_name},`,
    '',
    `Following up on Invoice #${invoice.invoice_number}.`,
    `Current Balance: $${balanceDue.toFixed(2)}`,
  ];
  lines.push('', 'If you have any questions or need to discuss payment terms, please let us know.');
  lines.push('Thank you.');
  return lines.join('\n');
}

/**
 * Select the right escalated message for a given invoice automatically.
 */
export function generateEscalatedMessage(invoice) {
  const band = getEscalationBand(invoice);
  if (band === 'urgent') return generateUrgentNotice(invoice);
  if (band === 'firm') return generateFirmFollowUp(invoice);
  return generatePaymentReminder(invoice);
}

/**
 * Get all available templates with labels
 */
export const MESSAGE_TEMPLATES = [
  { key: 'reminder', label: 'Payment Reminder', fn: generatePaymentReminder },
  { key: 'firm', label: 'Firm Follow-up', fn: generateFirmFollowUp },
  { key: 'urgent', label: 'Urgent Notice', fn: generateUrgentNotice },
  { key: 'overdue', label: 'Overdue Notice', fn: generateOverdueNotice },
  { key: 'followup', label: 'Follow-up', fn: generateFollowUp },
];