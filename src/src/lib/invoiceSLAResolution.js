/**
 * invoiceSLAResolution.js
 *
 * Pure helpers for SLA breach resolution tracking.
 * Reutiliza detectSLABreaches sin duplicar lógica.
 */

import { detectSLABreaches } from '@/lib/invoiceSLA';

/**
 * Get active (unresolved) SLA breaches only
 */
export function getActiveSLABreaches(invoice = {}) {
  const allBreaches = detectSLABreaches(invoice);
  const resolvedTypes = invoice.sla_resolved_types || [];

  return allBreaches.filter(breach => !resolvedTypes.includes(breach.type));
}

/**
 * Check if a specific breach type is resolved
 */
export function isBreachResolved(invoice = {}, breachType) {
  const resolvedTypes = invoice.sla_resolved_types || [];
  return resolvedTypes.includes(breachType);
}

/**
 * Build invoice patch to mark a breach as resolved
 * Returns object only, no API call
 */
export function resolveSLABreach(invoice = {}, breachType, actor, note = '') {
  const resolvedTypes = invoice.sla_resolved_types || [];

  if (!resolvedTypes.includes(breachType)) {
    resolvedTypes.push(breachType);
  }

  const patch = {
    sla_resolved_types: resolvedTypes,
    sla_last_reviewed_at: new Date().toISOString(),
    sla_last_reviewed_by: actor,
  };

  // If resolution note is provided, append it
  if (note) {
    const existingNote = invoice.sla_resolution_note || '';
    const timestamp = new Date().toISOString();
    const newLine = `[${timestamp}] ${actor}: ${note}`;
    patch.sla_resolution_note = existingNote ? `${existingNote}\n${newLine}` : newLine;
  }

  // If all breaches are now resolved, mark sla_resolved_at
  const allBreaches = detectSLABreaches(invoice);
  const remaining = allBreaches.filter(b => !resolvedTypes.includes(b.type));
  if (remaining.length === 0) {
    patch.sla_resolved_at = new Date().toISOString();
  }

  return patch;
}

/**
 * Mark SLA status as reviewed (without resolving specific breaches)
 */
export function markSLAReviewed(invoice = {}, actor, note = '') {
  const patch = {
    sla_last_reviewed_at: new Date().toISOString(),
    sla_last_reviewed_by: actor,
  };

  if (note) {
    const existingNote = invoice.sla_resolution_note || '';
    const timestamp = new Date().toISOString();
    const newLine = `[${timestamp}] ${actor}: ${note}`;
    patch.sla_resolution_note = existingNote ? `${existingNote}\n${newLine}` : newLine;
  }

  return patch;
}

/**
 * Clean up resolved breaches if their conditions no longer exist
 * e.g., if invoice is now paid, remove 'broken_promise' from resolved list if it was due to non-payment
 */
export function clearResolvedBreachesIfConditionReturnedSafe(invoice = {}) {
  const resolvedTypes = invoice.sla_resolved_types || [];
  if (resolvedTypes.length === 0) return { sla_resolved_types: resolvedTypes };

  let updated = [...resolvedTypes];

  // If invoice is paid, remove payment-related breaches
  if (invoice.status === 'paid') {
    updated = updated.filter(t => t !== 'broken_promise' && t !== 'no_recent_contact');
  }

  // If invoice status changed, clear resolved_at if breaches exist again
  const activeBreaches = getActiveSLABreaches({ ...invoice, sla_resolved_types: updated });
  if (activeBreaches.length > 0) {
    return {
      sla_resolved_types: updated,
      sla_resolved_at: null,
    };
  }

  return { sla_resolved_types: updated };
}