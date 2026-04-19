/**
 * Invoice helpers — compute balance, status, and payment summaries
 */

/**
 * Compute amount_paid from payments array (single source of truth)
 */
export function computeAmountPaid(payments = []) {
  return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
}

/**
 * Compute balance_due from total and amount_paid
 */
export function computeBalanceDue(total = 0, amountPaid = 0) {
  return Math.max(0, total - amountPaid);
}

/**
 * Derive payment_status from balance_due and amount_paid
 */
export function derivePaymentStatus(total = 0, amountPaid = 0) {
  const balanceDue = computeBalanceDue(total, amountPaid);
  
  if (balanceDue <= 0) return 'paid';
  if (amountPaid > 0 && balanceDue > 0) return 'partial';
  return 'unpaid';
}

/**
 * Compute ALL derived fields from payments array
 * Single source of truth: payments[]
 */
export function computeInvoiceDerivedFields(invoice) {
  const payments = invoice?.payments || [];
  const total = invoice?.total || 0;
  
  const amount_paid = computeAmountPaid(payments);
  const balance_due = computeBalanceDue(total, amount_paid);
  const payment_status = derivePaymentStatus(total, amount_paid);
  
  return {
    amount_paid,
    balance_due,
    payment_status,
  };
}

/**
 * Legacy helper — kept for compat but now uses computeInvoiceDerivedFields
 */
export function calculateInvoiceBalance(invoice) {
  return computeInvoiceDerivedFields(invoice).balance_due;
}

export function getPaymentStatusLabel(status) {
  const labels = {
    paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: '✓' },
    partial: { label: 'Partial', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
    unpaid: { label: 'Unpaid', color: 'bg-slate-100 text-slate-700', icon: '○' },
  };
  return labels[status] || labels.unpaid;
}

export function summarizePayments(payments = []) {
  return {
    count: payments.length,
    total: payments.reduce((s, p) => s + (p.amount || 0), 0),
    byMethod: payments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + (p.amount || 0);
      return acc;
    }, {}),
  };
}