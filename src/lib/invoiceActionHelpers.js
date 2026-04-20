/**
 * invoiceActionHelpers.js — Quick operational actions
 * Mark last contact, log follow-up activities
 */

import {
  generateOverdueNotice,
  generatePaymentReminder,
  generateFollowUp,
} from './invoiceMessageTemplates';

/**
 * Mark invoice as last contacted now
 * Useful for: sent email, made call, took action
 */
export async function markInvoiceContacted(invoiceId, base44) {
  if (!invoiceId || !base44) return null;
  const now = new Date().toISOString();
  await base44.entities.Invoice.update(invoiceId, { last_contacted_at: now });
  return now;
}

/**
 * Format last contact time for display
 */
export function getLastContactedDisplay(lastContactedAt) {
  if (!lastContactedAt) return 'Never';
  const days = Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

/**
 * Select the correct message template based on invoice context.
 * Pure function — no side effects.
 */
export function selectFollowUpMessage(invoice) {
  if (!invoice) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  const isOverdue = dueDate && dueDate < today && (invoice.total - (invoice.amount_paid || 0)) > 0;

  if (isOverdue) return generateOverdueNotice(invoice);
  if (invoice.client_response_status === 'has_question') return generateFollowUp(invoice);
  if (invoice.client_response_status === 'will_pay_soon') return generateFollowUp(invoice);
  return generatePaymentReminder(invoice);
}

/**
 * 1-click follow-up: select message, copy to clipboard, log contact.
 * Returns { message } on success.
 */
export async function executeOneClickFollowUp(invoice, base44) {
  if (!invoice || !base44) return null;
  const message = selectFollowUpMessage(invoice);
  await navigator.clipboard.writeText(message);
  await markInvoiceContacted(invoice.id, base44);
  return { message };
}