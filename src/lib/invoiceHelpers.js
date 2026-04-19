/**
 * Invoice helpers — compute balance, status, and payment summaries
 */

export function calculateInvoiceBalance(invoice) {
  const total = invoice?.total || 0;
  const amountPaid = invoice?.amount_paid || 0;
  return Math.max(0, total - amountPaid);
}

export function derivePaymentStatus(invoice) {
  const balanceDue = calculateInvoiceBalance(invoice);
  const amountPaid = invoice?.amount_paid || 0;

  if (balanceDue <= 0) return 'paid';
  if (amountPaid > 0 && balanceDue > 0) return 'partial';
  return 'unpaid';
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