/**
 * invoiceCollectionCapacity.js — Derive team collection capacity and workload distribution
 * Pure function — no storage, no API calls.
 *
 * Shows per-owner:
 *   - urgent items
 *   - action today
 *   - billing issues
 *   - total balance
 *   - unassigned workload visibility
 */

import { getInvoiceWorkloadCategory } from './invoiceCollectionWorkload';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from './invoiceHelpers';
import { getEscalationBand } from './invoiceMessageTemplates';

/**
 * Build capacity view grouped by owner
 * @param {Array} invoices
 * @returns {Object} { byOwner: Map(owner -> metrics), unassigned: { ... }, total: { ... } }
 */
export function buildCollectionCapacityByOwner(invoices = []) {
  const byOwner = new Map();
  const unassigned = {
    urgent_count: 0,
    urgent_amount: 0,
    action_today_count: 0,
    action_today_amount: 0,
    billing_issue_count: 0,
    billing_issue_amount: 0,
    total_balance: 0,
  };
  const total = {
    owner_count: 0,
    urgent_count: 0,
    urgent_amount: 0,
    action_today_count: 0,
    action_today_amount: 0,
    billing_issue_count: 0,
    billing_issue_amount: 0,
    total_balance: 0,
  };

  invoices.forEach(inv => {
    const { balance_due } = computeInvoiceDerivedFields(inv);
    if (balance_due <= 0) return; // skip paid

    const workloadCategory = getInvoiceWorkloadCategory(inv);
    if (!workloadCategory) return;

    // Determine owner
    let owner = null;
    if (inv.billing_issue_status === 'open' && inv.billing_issue_owner) {
      owner = inv.billing_issue_owner;
    }

    const targetBucket = owner ? byOwner : unassigned;

    // Initialize owner bucket if needed
    if (owner && !byOwner.has(owner)) {
      byOwner.set(owner, {
        owner,
        urgent_count: 0,
        urgent_amount: 0,
        action_today_count: 0,
        action_today_amount: 0,
        billing_issue_count: 0,
        billing_issue_amount: 0,
        total_balance: 0,
      });
    }

    // Route by workload category
    if (workloadCategory === 'urgent') {
      targetBucket.urgent_count += 1;
      targetBucket.urgent_amount += balance_due;
    } else if (workloadCategory === 'action_today') {
      targetBucket.action_today_count += 1;
      targetBucket.action_today_amount += balance_due;
    } else if (workloadCategory === 'billing_issue') {
      targetBucket.billing_issue_count += 1;
      targetBucket.billing_issue_amount += balance_due;
    }

    targetBucket.total_balance += balance_due;

    // Update totals
    total.urgent_count += workloadCategory === 'urgent' ? 1 : 0;
    total.urgent_amount += workloadCategory === 'urgent' ? balance_due : 0;
    total.action_today_count += workloadCategory === 'action_today' ? 1 : 0;
    total.action_today_amount += workloadCategory === 'action_today' ? balance_due : 0;
    total.billing_issue_count += workloadCategory === 'billing_issue' ? 1 : 0;
    total.billing_issue_amount += workloadCategory === 'billing_issue' ? balance_due : 0;
    total.total_balance += balance_due;
  });

  total.owner_count = byOwner.size;

  return {
    byOwner,
    unassigned,
    total,
  };
}

/**
 * Get sorted array of owners by workload (descending)
 */
export function getSortedOwners(capacityData) {
  const owners = Array.from(capacityData.byOwner.values());
  return owners.sort((a, b) => {
    // Sort by urgent count first, then balance
    if (a.urgent_count !== b.urgent_count) {
      return b.urgent_count - a.urgent_count;
    }
    return b.total_balance - a.total_balance;
  });
}

/**
 * Get unassigned workload summary
 */
export function getUnassignedWorkloadSummary(capacityData) {
  const { unassigned } = capacityData;
  return {
    urgent_count: unassigned.urgent_count,
    urgent_amount: unassigned.urgent_amount,
    action_today_count: unassigned.action_today_count,
    action_today_amount: unassigned.action_today_amount,
    billing_issue_count: unassigned.billing_issue_count,
    billing_issue_amount: unassigned.billing_issue_amount,
    total_items: unassigned.urgent_count + unassigned.action_today_count + unassigned.billing_issue_count,
    total_balance: unassigned.total_balance,
  };
}

/**
 * Get team capacity summary with load distribution
 */
export function getTeamCapacitySummary(capacityData) {
  const sorted = getSortedOwners(capacityData);
  const unassignedSummary = getUnassignedWorkloadSummary(capacityData);

  return {
    total_owners: capacityData.total.owner_count,
    total_urgent: capacityData.total.urgent_count,
    total_action_today: capacityData.total.action_today_count,
    total_billing_issues: capacityData.total.billing_issue_count,
    total_balance: capacityData.total.total_balance,
    owners: sorted,
    unassigned: unassignedSummary,
    has_unassigned_urgent: unassignedSummary.urgent_count > 0,
    has_unassigned_critical: unassignedSummary.urgent_count > 0 || unassignedSummary.billing_issue_count > 0,
  };
}