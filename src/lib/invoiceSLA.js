/**
 * invoiceSLA.js
 *
 * Collection SLA breach detection layer.
 * Pure functions only — no API calls, no side effects.
 *
 * Detects when collection rules are being violated:
 * - Missed follow-ups
 * - Broken promises
 * - Unassigned/stale billing issues
 * - Lack of contact on overdue invoices
 */

import { computeInvoiceDerivedFields, isInvoiceOverdue } from './invoiceHelpers';
import { getInvoiceFollowUpTiming } from './invoiceFollowUpTiming';

/**
 * detectSLABreaches — Main detection function.
 * Returns array of breach objects for a single invoice.
 *
 * Each breach has:
 * {
 *   type: string (missed_follow_up | broken_promise | unassigned_issue | stale_issue | no_recent_contact)
 *   severity: 'critical' | 'high'
 *   label: string (short title)
 *   description: string (human-readable reason)
 * }
 */
export function detectSLABreaches(invoice) {
  const breaches = [];

  if (!invoice) return breaches;

  // Filter: skip draft/cancelled/paid
  if (invoice.status === 'draft' || invoice.status === 'cancelled') return breaches;
  const { balance_due } = computeInvoiceDerivedFields(invoice);
  if (balance_due <= 0) return breaches;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Rule 1: Missed Follow-up (CRITICAL)
  const missedFollowUp = detectMissedFollowUp(invoice, today);
  if (missedFollowUp) breaches.push(missedFollowUp);

  // Rule 2: Broken Promise (CRITICAL)
  const brokenPromise = detectBrokenPromise(invoice, now, balance_due);
  if (brokenPromise) breaches.push(brokenPromise);

  // Rule 3: Unassigned Billing Issue (HIGH)
  const unassignedIssue = detectUnassignedIssue(invoice);
  if (unassignedIssue) breaches.push(unassignedIssue);

  // Rule 4: Stale Billing Issue (HIGH)
  const staleIssue = detectStaleIssue(invoice, now);
  if (staleIssue) breaches.push(staleIssue);

  // Rule 5: Overdue Without Action (HIGH)
  const noRecentContact = detectNoRecentContact(invoice, now);
  if (noRecentContact) breaches.push(noRecentContact);

  return breaches;
}

/**
 * Rule 1: Missed Follow-up (CRITICAL)
 *
 * Condition:
 * - timing.next_follow_up_in_days === 0 (due TODAY)
 * - AND last_contacted_at is NOT today
 * - AND balance_due > 0
 */
function detectMissedFollowUp(invoice, today) {
  const timing = getInvoiceFollowUpTiming(invoice);
  const { balance_due } = computeInvoiceDerivedFields(invoice);

  // Must have follow-up due today and unpaid
  if (!timing || timing.next_follow_up_in_days !== 0 || balance_due <= 0) {
    return null;
  }

  // Check if last contact was today
  const lastContactDate = invoice.last_contacted_at?.split('T')[0];
  if (lastContactDate === today) {
    return null; // Already contacted today
  }

  return {
    type: 'missed_follow_up',
    severity: 'critical',
    label: 'Missed Follow-up',
    description: `Follow-up due today but no contact yet.`,
  };
}

/**
 * Rule 2: Broken Promise (CRITICAL)
 *
 * Condition:
 * - promised_payment_date < today
 * - AND balance_due > 0
 */
function detectBrokenPromise(invoice, now, balance_due) {
  if (!invoice.promised_payment_date) return null;

  const promised = new Date(invoice.promised_payment_date);

  if (balance_due <= 0) return null; // Already paid
  if (promised >= now) return null; // Date is in future

  // Promised date has passed and still unpaid
  const daysPassed = Math.floor((now - promised) / (1000 * 60 * 60 * 24));
  return {
    type: 'broken_promise',
    severity: 'critical',
    label: 'Broken Promise',
    description: `Promised payment ${daysPassed}d ago (${invoice.promised_payment_date}) but $${balance_due.toFixed(2)} still due.`,
  };
}

/**
 * Rule 3: Unassigned Billing Issue (HIGH)
 *
 * Condition:
 * - billing_issue_status === "open"
 * - AND no billing_issue_owner
 */
function detectUnassignedIssue(invoice) {
  if (invoice.billing_issue_status !== 'open') return null;
  if (invoice.billing_issue_owner) return null; // Already assigned

  return {
    type: 'unassigned_issue',
    severity: 'high',
    label: 'Unassigned Issue',
    description: `Billing issue open but no owner assigned.`,
  };
}

/**
 * Rule 4: Stale Billing Issue (HIGH)
 *
 * Condition:
 * - billing_issue_status === "open"
 * - AND billing_issue_opened_at > 3 days ago
 */
function detectStaleIssue(invoice, now) {
  if (invoice.billing_issue_status !== 'open') return null;
  if (!invoice.billing_issue_opened_at) return null;

  const opened = new Date(invoice.billing_issue_opened_at);
  const daysSinceOpened = Math.floor((now - opened) / (1000 * 60 * 60 * 24));

  if (daysSinceOpened < 3) return null; // Less than 3 days = not stale yet

  return {
    type: 'stale_issue',
    severity: 'high',
    label: 'Stale Issue',
    description: `Billing issue unresolved for ${daysSinceOpened}d.`,
  };
}

/**
 * Rule 5: Overdue Without Action (HIGH)
 *
 * Condition:
 * - invoice is overdue
 * - AND daysSince(last_contacted_at) >= 3
 */
function detectNoRecentContact(invoice, now) {
  if (!isInvoiceOverdue(invoice)) return null;

  if (!invoice.last_contacted_at) {
    // Never contacted while overdue = breach
    return {
      type: 'no_recent_contact',
      severity: 'high',
      label: 'No Recent Contact',
      description: `Overdue but never contacted.`,
    };
  }

  const lastContact = new Date(invoice.last_contacted_at);
  const daysSinceContact = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));

  if (daysSinceContact >= 3) {
    return {
      type: 'no_recent_contact',
      severity: 'high',
      label: 'No Recent Contact',
      description: `Overdue but no contact in ${daysSinceContact}d.`,
    };
  }

  return null;
}

/**
 * Compute SLA severity summary for a list of invoices.
 *
 * Returns object:
 * {
 *   critical_count: number
 *   high_count: number
 *   by_type: {
 *     missed_follow_up: number
 *     broken_promise: number
 *     unassigned_issue: number
 *     stale_issue: number
 *     no_recent_contact: number
 *   }
 * }
 */
export function computeSLASummary(invoices) {
  const summary = {
    critical_count: 0,
    high_count: 0,
    by_type: {
      missed_follow_up: 0,
      broken_promise: 0,
      unassigned_issue: 0,
      stale_issue: 0,
      no_recent_contact: 0,
    },
  };

  (invoices || []).forEach(inv => {
    const breaches = detectSLABreaches(inv);
    breaches.forEach(breach => {
      if (breach.severity === 'critical') summary.critical_count++;
      else if (breach.severity === 'high') summary.high_count++;

      summary.by_type[breach.type]++;
    });
  });

  return summary;
}

/**
 * Group invoices by their primary breach type.
 *
 * Returns object: { breach_type: [invoices] }
 * Only includes invoices with breaches.
 */
export function groupInvoicesByBreach(invoices) {
  const grouped = {
    missed_follow_up: [],
    broken_promise: [],
    unassigned_issue: [],
    stale_issue: [],
    no_recent_contact: [],
  };

  (invoices || []).forEach(inv => {
    const breaches = detectSLABreaches(inv);
    if (breaches.length === 0) return; // No breaches

    // Use PRIMARY (most severe) breach type
    const critical = breaches.find(b => b.severity === 'critical');
    const primary = critical || breaches[0];
    grouped[primary.type].push(inv);
  });

  return grouped;
}

/**
 * Check if an invoice has any SLA breach.
 */
export function hasBreaches(invoice) {
  return detectSLABreaches(invoice).length > 0;
}

/**
 * Get the most critical breach for an invoice (if any).
 */
export function getPrimaryBreach(invoice) {
  const breaches = detectSLABreaches(invoice);
  if (breaches.length === 0) return null;

  // Return CRITICAL if exists, otherwise first HIGH
  return breaches.find(b => b.severity === 'CRITICAL') || breaches[0];
}