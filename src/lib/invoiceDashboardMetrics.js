/**
 * invoiceDashboardMetrics.js — Derive financial metrics from invoices
 * All calculations are pure — no storage, no side effects
 */

import { computeInvoiceDerivedFields, isInvoiceOverdue } from './invoiceHelpers';
import { getInvoiceFollowUpTiming } from './invoiceFollowUpTiming';

/**
 * Get dashboard metrics for invoice collection
 * Returns all KPIs needed for owner visibility
 */
export function getInvoiceDashboardMetrics(invoices = []) {
  const metrics = {
    total_invoiced: 0,
    total_collected: 0,
    total_outstanding: 0,
    total_overdue: 0,
    overdue_invoice_count: 0,
    follow_up_today_count: 0,
  };

  invoices.forEach(inv => {
    const derived = computeInvoiceDerivedFields(inv);
    const isOverdue = isInvoiceOverdue(inv);
    const timing = getInvoiceFollowUpTiming(inv);

    // Totals
    metrics.total_invoiced += inv.total || 0;
    metrics.total_collected += derived.amount_paid;
    metrics.total_outstanding += derived.balance_due;

    // Overdue tracking
    if (isOverdue) {
      metrics.total_overdue += derived.balance_due;
      metrics.overdue_invoice_count += 1;
    }

    // Follow-up today
    if (timing && timing.next_follow_up_in_days === 0) {
      metrics.follow_up_today_count += 1;
    }
  });

  return metrics;
}

/**
 * Format metric for display with color coding
 */
export function formatMetricDisplay(value, type = 'currency') {
  if (type === 'currency') {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
  if (type === 'count') {
    return String(value);
  }
  return value;
}

/**
 * Get urgency color for metric
 */
export function getMetricColor(metricKey, value) {
  if (metricKey === 'total_overdue' && value > 0) return 'text-red-600';
  if (metricKey === 'follow_up_today_count' && value > 0) return 'text-amber-600';
  if (metricKey === 'total_collected') return 'text-green-600';
  if (metricKey === 'total_outstanding') return 'text-amber-600';
  return 'text-slate-600';
}

/**
 * Get background color for metric card
 */
export function getMetricBg(metricKey, value) {
  if (metricKey === 'total_overdue' && value > 0) return 'bg-red-50 border-red-200';
  if (metricKey === 'follow_up_today_count' && value > 0) return 'bg-amber-50 border-amber-200';
  if (metricKey === 'total_collected') return 'bg-green-50 border-green-200';
  if (metricKey === 'total_outstanding') return 'bg-amber-50 border-amber-200';
  return 'bg-blue-50 border-blue-200';
}