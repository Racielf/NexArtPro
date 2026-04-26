import { base44 } from '@/api/base44Client';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';
import { buildTimelineEvent, appendCollectionTimelineEvent } from '@/lib/invoiceCollectionTimeline';

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function getInvoicePaymentState(invoice) {
  const derived = computeInvoiceDerivedFields(invoice);
  return {
    ...derived,
    isPaid: derived.payment_status === 'paid',
    isPartial: derived.payment_status === 'partial',
    isUnpaid: derived.payment_status === 'unpaid',
  };
}

export function validateInvoicePayment(invoice, amount) {
  const paymentAmount = toMoney(amount);
  const { balance_due } = computeInvoiceDerivedFields(invoice);
  const maxPayment = toMoney(balance_due);
  const errors = [];

  if (!invoice?.id) errors.push('Invoice is required.');
  if (paymentAmount <= 0) errors.push('Payment amount must be greater than zero.');
  if (paymentAmount > maxPayment) errors.push(`Payment cannot exceed balance due ($${maxPayment.toFixed(2)}).`);

  return {
    valid: errors.length === 0,
    errors,
    amount: paymentAmount,
    maxPayment,
  };
}

export async function recordInvoicePayment(invoice, paymentInput = {}, actor = 'Admin') {
  const validation = validateInvoicePayment(invoice, paymentInput.amount);
  if (!validation.valid) {
    const err = new Error(validation.errors.join(' '));
    err.validation = validation;
    throw err;
  }

  const now = new Date().toISOString();
  const payment = {
    id: paymentInput.id || `pay-${Date.now()}`,
    amount: validation.amount,
    method: paymentInput.method || 'cash',
    payment_date: paymentInput.payment_date || now,
    note: paymentInput.note || '',
    reference: paymentInput.reference || '',
    recorded_by: actor || 'Admin',
    recorded_at: now,
  };

  const updatedPayments = [...(invoice?.payments || []), payment];
  const tempInvoice = { ...invoice, payments: updatedPayments };
  const derived = computeInvoiceDerivedFields(tempInvoice);

  const timelineEvent = buildTimelineEvent(
    'payment_recorded',
    actor || 'Admin',
    payment.note || undefined,
    { amount: payment.amount, method: payment.method, reference: payment.reference || undefined }
  );
  const timeline = appendCollectionTimelineEvent(invoice, timelineEvent);

  const updates = {
    payments: updatedPayments,
    amount_paid: derived.amount_paid,
    balance_due: derived.balance_due,
    payment_status: derived.payment_status,
    status: derived.payment_status === 'paid' ? 'paid' : invoice.status,
    paid_at: derived.payment_status === 'paid' ? now : invoice?.paid_at || null,
    collection_timeline: timeline,
  };

  await base44.entities.Invoice.update(invoice.id, updates);

  return {
    payment,
    updates,
    invoice: { ...invoice, ...updates },
  };
}

export async function markInvoicePaid(invoice, actor = 'Admin', note = 'Full payment recorded') {
  const { balance_due } = computeInvoiceDerivedFields(invoice);
  return recordInvoicePayment(invoice, {
    amount: balance_due,
    method: 'manual',
    note,
  }, actor);
}
