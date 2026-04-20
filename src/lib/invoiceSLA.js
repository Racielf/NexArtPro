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

/**
 * detectSLABreaches — Main detection function.
 * Returns array of breach objects for a single invoice.
 *
 * Each breach has:
 * {
 *   breach_type: string (missed_follow_up | broken_promise | unassigned_issue | stale_issue | no_recent_contact)
 *   severity: "CRITICAL" | "HIGH"
 *   details: string (human-readable reason)
 *   breached_at: Date (when violation started)
 * }
 */
export function detectSLABreaches(invoice) {
  const breaches = [];

  if (!invoice) return breaches;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Filter: skip if fully paid
  const balance_due = (invoice.total || 0) - (invoice.amount_paid || 0);
  if (balance_due <= 0) return breaches;

  // Rule 1: Missed Follow-up (CRITICAL)
  const missedFollowUp = detectMissedFollowUp(invoice, today);
  if (missedFollowUp) breaches.push(missedFollowUp);

  // Rule 2: Broken Promise (CRITICAL)
  const brokenPromise = detectBrokenPromise(invoice, now);
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
 * - followUpTiming.next_follow_up_in_days === 0 (due TODAY)
 * - AND last_contacted_at is NOT today
 * - AND unpaid
 */
function detectMissedFollowUp(invoice, today) {
  if (!invoice.last_contacted_at) {
    // Never contacted = missed follow-up on first day unpaid
    if (invoice.status !== 'paid') {
      return {
        breach_type: 'missed_follow_up',
        severity: 'CRITICAL',
        details: `Never contacted. Created ${invoice.created_date ? new Date(invoice.created_date).toLocaleDateString() : 'unknown'}.`,
        breached_at: invoice.created_date || new Date().toISOString(),
      };
    }
    return null;
  }

  const lastContactDate = invoice.last_contacted_at?.split('T')[0];
  if (lastContactDate === today) {
    // Contacted today — no breach
    return null;
  }

  // Check if next follow-up is due today (based on timing logic)
  // This is derived externally, but we can infer from client response state
  // If promised_payment_date exists and is today, mark as missed
  if (invoice.promised_payment_date) {
    const promised = new Date(invoice.promised_payment_date);
    const nowDate = new Date(today);
    if (promised.toDateString() === nowDate.toDateString()) {
      // Today is promised date but no contact today = missed
      return {
        breach_type: 'missed_follow_up',
        severity: 'CRITICAL',
        details: `Promised payment today (${invoice.promised_payment_date}) but no contact recorded.`,
        breached_at: invoice.promised_payment_date,
      };
    }
  }

  return null;
}

/**
 * Rule 2: Broken Promise (CRITICAL)
 *
 * Condition:
 * - promised_payment_date < today
 * - AND balance_due > 0
 */
function detectBrokenPromise(invoice, now) {
  if (!invoice.promised_payment_date) return null;

  const promised = new Date(invoice.promised_payment_date);
  const balance_due = (invoice.total || 0) - (invoice.amount_paid || 0);

  if (balance_due <= 0) return null; // Already paid
  if (promised >= now) return null; // Date is in future

  // Promised date has passed and still unpaid
  const daysPassed = Math.floor((now - promised) / (1000 * 60 * 60 * 24));
  return {
    breach_type: 'broken_promise',
    severity: 'CRITICAL',
    details: `Promised payment ${daysPassed}d ago (${invoice.promised_payment_date}) but balance due $${balance_due.toFixed(2)}.`,
    breached_at: invoice.promised_payment_date,
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
    breach_type: 'unassigned_issue',
    severity: 'HIGH',
    details: `Billing issue opened (${invoice.billing_issue_opened_at ? new Date(invoice.billing_issue_opened_at).toLocaleDateString() : 'unknown'}) but no owner assigned.`,
    breached_at: invoice.billing_issue_opened_at || new Date().toISOString(),
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
    breach_type: 'stale_issue',
    severity: 'HIGH',
    details: `Billing issue unresolved for ${daysSinceOpened}d (opened ${invoice.billing_issue_opened_at}).`,
    breached_at: invoice.billing_issue_opened_at,
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
  if (!invoice.due_date) return null;

  const dueDate = new Date(invoice.due_date);
  if (now <= dueDate) return null; // Not yet overdue

  // Invoice is overdue
  if (!invoice.last_contacted_at) {
    // Never contacted while overdue = breach
    return {
      breach_type: 'no_recent_contact',
      severity: 'HIGH',
      details: `Overdue since ${invoice.due_date} but never contacted.`,
      breached_at: invoice.due_date,
    };
  }

  const lastContact = new Date(invoice.last_contacted_at);
  const daysSinceContact = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));

  if (daysSinceContact >= 3) {
    return {
      breach_type: 'no_recent_contact',
      severity: 'HIGH',
      details: `Overdue but no contact in ${daysSinceContact}d (last: ${lastContact.toLocaleDateString()}).`,
      breached_at: new Date(lastContact.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Breach occurred 3 days after last contact
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
      if (breach.severity === 'CRITICAL') summary.critical_count++;
      else if (breach.severity === 'HIGH') summary.high_count++;

      summary.by_type[breach.breach_type]++;
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
    const critical = breaches.find(b => b.severity === 'CRITICAL');
    const primary = critical || breaches[0];
    grouped[primary.breach_type].push(inv);
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