/**
 * invoiceActionHelpers.js — Quick operational actions
 * Mark last contact, log follow-up activities
 */

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