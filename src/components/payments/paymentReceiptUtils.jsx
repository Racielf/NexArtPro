/**
 * Payment Receipt Utilities
 * Builds a receipt data object from an invoice + optional payment info.
 * No backend required — works from existing invoice state.
 */

let _receiptCounter = 1000;

export function generateReceiptNumber() {
  _receiptCounter += 1;
  return _receiptCounter;
}

/**
 * Derive status label from payment context.
 */
export function getStatusLabel(amountPaid, previousBalance, isDeposit = false) {
  const paid = parseFloat(amountPaid) || 0;
  const prev = parseFloat(previousBalance) || 0;

  if (isDeposit) return 'Deposit Received';
  if (paid <= 0) return 'Payment Received';
  if (prev > 0 && paid >= prev) return 'Paid in Full';
  if (prev > 0 && paid < prev) return 'Partial Payment';
  return 'Payment Received';
}

const STATUS_STYLES = {
  'Paid in Full':      { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  'Partial Payment':   { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'Deposit Received':  { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'Payment Received':  { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

export function getStatusStyle(label) {
  return STATUS_STYLES[label] || STATUS_STYLES['Payment Received'];
}

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  check: 'Check',
  card: 'Credit / Debit Card',
  zelle: 'Zelle',
  venmo: 'Venmo',
  ach: 'ACH Transfer',
  wire: 'Wire Transfer',
  other: 'Other',
};

export function formatPaymentMethod(method) {
  if (!method) return 'N/A';
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] || method;
}

/**
 * Build a receipt object from an invoice.
 * Pass optional overrides for payment-specific fields.
 */
export function buildReceipt(invoice, overrides = {}) {
  const total        = parseFloat(invoice?.total) || 0;
  const amountPaid   = parseFloat(overrides.amount_paid ?? invoice?.amount_paid) || 0;
  const prevBalance  = overrides.previous_balance ?? total;
  const remaining    = Math.max(0, parseFloat(prevBalance) - amountPaid);
  const isDeposit    = overrides.is_deposit ?? false;
  const statusLabel  = getStatusLabel(amountPaid, prevBalance, isDeposit);

  return {
    receipt_number:    overrides.receipt_number ?? generateReceiptNumber(),
    payment_date:      overrides.payment_date ?? (invoice?.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })),
    invoice_id:        invoice?.id ?? null,
    invoice_number:    invoice?.invoice_number ?? null,
    customer_name:     invoice?.client_name    ?? 'N/A',
    customer_address:  invoice?.client_address ?? '',
    customer_email:    invoice?.client_email   ?? '',
    customer_phone:    invoice?.client_phone   ?? '',
    payment_method:    formatPaymentMethod(overrides.payment_method ?? 'cash'),
    amount_paid:       amountPaid,
    previous_balance:  parseFloat(prevBalance),
    remaining_balance: remaining,
    notes:             overrides.notes ?? invoice?.notes ?? '',
    status_label:      statusLabel,
    _status_style:     getStatusStyle(statusLabel),
  };
}