/**
 * invoiceMessageTemplates.js — Generate context-aware communication templates
 * Lightweight templates for payment reminders, overdue notices, follow-ups
 * No API integration — templates only
 */

/**
 * Generate payment reminder message
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
  if (invoice.due_date) {
    lines.push(`Due Date: ${invoice.due_date}`);
  }
  lines.push('', 'Please remit payment at your earliest convenience.');
  lines.push('Thank you for your business.');
  return lines.join('\n');
}

/**
 * Generate overdue notice message
 */
export function generateOverdueNotice(invoice) {
  if (!invoice) return '';
  const balanceDue = invoice.balance_due ?? (invoice.total - (invoice.amount_paid || 0));
  const lines = [
    `Hi ${invoice.client_name},`,
    '',
    `This invoice (#${invoice.invoice_number}) is now overdue.`,
    `Outstanding Balance: $${balanceDue.toFixed(2)}`,
  ];
  if (invoice.due_date) {
    lines.push(`Originally Due: ${invoice.due_date}`);
  }
  lines.push('', 'Please contact us immediately to arrange payment.');
  lines.push('We appreciate your prompt attention.');
  return lines.join('\n');
}

/**
 * Generate follow-up message
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
 * Get all available templates with labels
 */
export const MESSAGE_TEMPLATES = [
  { key: 'reminder', label: 'Payment Reminder', fn: generatePaymentReminder },
  { key: 'overdue', label: 'Overdue Notice', fn: generateOverdueNotice },
  { key: 'followup', label: 'Follow-up', fn: generateFollowUp },
];