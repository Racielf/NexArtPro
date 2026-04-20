/**
 * invoiceSLAOwnerMetrics.js
 *
 * Accountability metrics per owner.
 * Reutiliza helpers existentes.
 */

import { detectSLABreaches, getPrimaryBreach } from '@/lib/invoiceSLA';
import { getActiveSLABreaches } from '@/lib/invoiceSLAResolution';
import { isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { getInvoiceWorkloadCategory } from '@/lib/invoiceCollectionWorkload';
import { getOverdueDays } from '@/lib/invoiceMessageTemplates';

/**
 * Compute accountability metrics for a single owner
 */
function computeOwnerMetrics(invoices = [], owner) {
  const ownerInvoices = invoices.filter(inv => {
    const billOwner = inv.billing_issue_owner || 'unassigned';
    return billOwner === owner;
  });

  const metrics = {
    owner,
    total: ownerInvoices.length,
    activeBreaches: 0,
    criticalBreaches: 0,
    highBreaches: 0,
    unresolvedIssues: 0,
    brokenPromises: 0,
    avgAgingDays: 0,
    urgentWorkload: 0,
    actionTodayWorkload: 0,
  };

  if (ownerInvoices.length === 0) return metrics;

  let totalAgingDays = 0;
  let overdueCount = 0;

  ownerInvoices.forEach(inv => {
    // Active breaches
    const activeBreaches = getActiveSLABreaches(inv);
    metrics.activeBreaches += activeBreaches.length;

    // Breach severity breakdown
    activeBreaches.forEach(breach => {
      if (breach.severity === 'critical') metrics.criticalBreaches++;
      else if (breach.severity === 'high') metrics.highBreaches++;
    });

    // Unresolved billing issues
    if (inv.billing_issue_status === 'open') {
      metrics.unresolvedIssues++;
    }

    // Broken promises
    if (inv.promised_payment_date && inv.status !== 'paid') {
      if (inv.promised_payment_date < new Date().toISOString().split('T')[0]) {
        metrics.brokenPromises++;
      }
    }

    // Aging
    if (isInvoiceOverdue(inv)) {
      const days = getOverdueDays(inv);
      totalAgingDays += days;
      overdueCount++;
    }

    // Workload category
    const workloadCat = getInvoiceWorkloadCategory(inv);
    if (workloadCat === 'urgent') metrics.urgentWorkload++;
    else if (workloadCat === 'action_today') metrics.actionTodayWorkload++;
  });

  // Average aging (only for overdue)
  if (overdueCount > 0) {
    metrics.avgAgingDays = Math.round(totalAgingDays / overdueCount);
  }

  return metrics;
}

/**
 * Get accountability metrics for all owners
 */
export function getOwnerAccountabilityMetrics(invoices = []) {
  const owners = new Set();

  invoices.forEach(inv => {
    const owner = inv.billing_issue_owner || 'unassigned';
    owners.add(owner);
  });

  const byOwner = {};
  owners.forEach(owner => {
    byOwner[owner] = computeOwnerMetrics(invoices, owner);
  });

  return byOwner;
}

/**
 * Get owners sorted by active breach load (descending)
 */
export function getOwnersByActiveBreachLoad(invoices = []) {
  const metrics = getOwnerAccountabilityMetrics(invoices);
  const sorted = Object.values(metrics)
    .sort((a, b) => {
      // Primary: critical breaches
      if (a.criticalBreaches !== b.criticalBreaches) {
        return b.criticalBreaches - a.criticalBreaches;
      }
      // Secondary: total active breaches
      if (a.activeBreaches !== b.activeBreaches) {
        return b.activeBreaches - a.activeBreaches;
      }
      // Tertiary: urgent workload
      return b.urgentWorkload - a.urgentWorkload;
    });

  return sorted;
}

/**
 * Get owners with unresolved billing issues
 */
export function getOwnersByUnresolvedIssues(invoices = []) {
  const metrics = getOwnerAccountabilityMetrics(invoices);
  return Object.values(metrics)
    .filter(m => m.unresolvedIssues > 0)
    .sort((a, b) => b.unresolvedIssues - a.unresolvedIssues);
}