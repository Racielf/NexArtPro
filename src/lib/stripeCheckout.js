import { nexartClient } from '@/api/nexartClient';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';

export async function createStripeCheckoutForInvoice(invoice) {
  const derived = computeInvoiceDerivedFields(invoice);
  const amount = derived.balance_due;

  if (!invoice?.id) throw new Error('Invoice is required.');
  if (!amount || amount <= 0) throw new Error('This invoice has no balance due.');

  const response = await nexartClient.functions.invoke('createStripeCheckoutSession', {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    client_email: invoice.client_email,
    client_name: invoice.client_name,
    amount,
    currency: 'usd',
  });

  const data = response?.data || response;
  if (!data?.ok || !data?.url) {
    throw new Error(data?.error || 'Unable to start online payment.');
  }

  return data;
}

export async function redirectToStripeCheckout(invoice) {
  const session = await createStripeCheckoutForInvoice(invoice);
  window.location.href = session.url;
  return session;
}
