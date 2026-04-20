/**
 * invoiceSLAMetrics.js
 *
 * Pure aggregation layer for SLA + collections metrics.
 * Reutiliza helpers existentes sin duplicar lógica.
 */

import { detectSLABreaches, getPrimaryBreach } from '@/lib/invoiceSLA';
import { isInvoiceOverdue, computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';
import { getInvoiceWorkloadCategory } from '@/lib/invoiceCollectionWorkload';
import { getOverdueDays } from '@/lib/invoiceMessageTemplates';

export function computeSLAMetrics(invoices = []) {
  const metrics = {
    totalWithBreaches: 0,
    criticalCount: 0,
    highCount: 0,
    breachesByType: {
      missed_followup: 0,
      broken_promise: 0,
      unassigned_issue: 0,
      stale_issue: 0,
      no_recent_contact: 0,
    },
    overdueCount: 0,
    brokenPromiseCount: 0,
    unassignedIssueCount: 0,
    invoicesByOwner: {},
    agingBuckets: {
      '0-3d': 0,
      '4-7d': 0,
      '8+d': 0,
    },
    details: {
      criticalInvoices: [],
      highInvoices: [],
      brokenPromises: [],
      unassignedIssues: [],
      overdue: [],
    },
  };

  invoices.forEach((inv) => {
    // SLA breaches
    const breaches = detectSLABreaches(inv);
    if (breaches.length > 0) {
      metrics.totalWithBreaches++;
      const primaryBreach = getPrimaryBreach(breaches);
      if (primaryBreach.severity === 'critical') {
        metrics.criticalCount++;
        metrics.details.criticalInvoices.push(inv);
      } else if (primaryBreach.severity === 'high') {
        metrics.highCount++;
        metrics.details.highInvoices.push(inv);
      }

      // Count breaches by type
      breaches.forEach((b) => {
        if (metrics.breachesByType.hasOwnProperty(b.type)) {
          metrics.breachesByType[b.type]++;
        }
      });
    }

    // Overdue
    if (isInvoiceOverdue(inv)) {
      metrics.overdueCount++;
      metrics.details.overdue.push(inv);

      // Aging buckets
      const days = getOverdueDays(inv);
      if (days <= 3) metrics.agingBuckets['0-3d']++;
      else if (days <= 7) metrics.agingBuckets['4-7d']++;
      else metrics.agingBuckets['8+d']++;
    }

    // Broken promises
    if (inv.promised_payment_date && inv.promised_payment_date < new Date().toISOString().split('T')[0]) {
      if (inv.status !== 'paid') {
        metrics.brokenPromiseCount++;
        metrics.details.brokenPromises.push(inv);
      }
    }

    // Unassigned billing issues
    if (inv.billing_issue_status === 'open' && !inv.billing_issue_owner) {
      metrics.unassignedIssueCount++;
      metrics.details.unassignedIssues.push(inv);
    }

    // By owner
    const workloadCategory = getInvoiceWorkloadCategory(inv);
    const owner = inv.billing_issue_owner || 'unassigned';
    if (!metrics.invoicesByOwner[owner]) {
      metrics.invoicesByOwner[owner] = { total: 0, urgent: 0, action_today: 0, billing_issue: 0 };
    }
    metrics.invoicesByOwner[owner].total++;
    if (workloadCategory === 'urgent') metrics.invoicesByOwner[owner].urgent++;
    else if (workloadCategory === 'action_today') metrics.invoicesByOwner[owner].action_today++;
    if (inv.billing_issue_status === 'open') metrics.invoicesByOwner[owner].billing_issue++;
  });

  return metrics;
}

/**
 * Filter invoices by SLA metric dimension
 */
export function filterInvoicesBySLAMetric(invoices = [], dimension, value) {
  switch (dimension) {
    case 'critical':
      return invoices.filter(inv => {
        const breaches = detectSLABreaches(inv);
        return breaches.some(b => b.severity === 'critical');
      });

    case 'high':
      return invoices.filter(inv => {
        const breaches = detectSLABreaches(inv);
        return breaches.some(b => b.severity === 'high');
      });

    case 'breach_type':
      return invoices.filter(inv => {
        const breaches = detectSLABreaches(inv);
        return breaches.some(b => b.type === value);
      });

    case 'broken_promise':
      return invoices.filter(inv => {
        if (!inv.promised_payment_date || inv.status === 'paid') return false;
        return inv.promised_payment_date < new Date().toISOString().split('T')[0];
      });

    case 'unassigned_issue':
      return invoices.filter(inv => inv.billing_issue_status === 'open' && !inv.billing_issue_owner);

    case 'overdue':
      return invoices.filter(isInvoiceOverdue);

    case 'aging':
      return invoices.filter(inv => {
        if (!isInvoiceOverdue(inv)) return false;
        const days = getOverdueDays(inv);
        if (value === '0-3d') return days <= 3;
        if (value === '4-7d') return days > 3 && days <= 7;
        if (value === '8+d') return days > 7;
        return false;
      });

    case 'owner':
      return invoices.filter(inv => {
        const owner = inv.billing_issue_owner || 'unassigned';
        return owner === value;
      });

    default:
      return invoices;
  }
}