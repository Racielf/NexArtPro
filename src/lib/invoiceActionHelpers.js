/**
 * invoiceActionHelpers.js — Quick operational actions
 * Mark last contact, log follow-up activities
 */

import {
  generateEscalatedMessage,
  generateFollowUp,
} from './invoiceMessageTemplates';

/**
 * Mark invoice as last contacted now
 * Useful for: sent email, made call, took action
 */
export async function markInvoiceContacted(invoiceId, nexartClient) {
  if (!invoiceId || !nexartClient) return null;
  const now = new Date().toISOString();
  await nexartClient.entities.Invoice.update(invoiceId, { last_contacted_at: now });
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
 * Select the correct escalated message based on invoice context.
 * Pure function — no side effects.
 * Uses escalation bands for overdue invoices (0–4d / 5–9d / 10+d).
 */
export function selectFollowUpMessage(invoice) {
  if (!invoice) return '';
  if (invoice.client_response_status === 'has_question') return generateFollowUp(invoice);
  if (invoice.client_response_status === 'will_pay_soon') return generateFollowUp(invoice);
  return generateEscalatedMessage(invoice);
}

/**
 * 1-click follow-up: select message, copy to clipboard, log contact.
 * Returns { message } on success.
 */
export async function executeOneClickFollowUp(invoice, nexartClient) {
  if (!invoice || !nexartClient) return null;
  const message = selectFollowUpMessage(invoice);
  await navigator.clipboard.writeText(message);
  await markInvoiceContacted(invoice.id, nexartClient);
  return { message };
}