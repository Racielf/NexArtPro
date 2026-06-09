import { base44 } from '@/api/base44Client';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';

export async function createStripeCheckoutForInvoice(invoice) {
  const derived = computeInvoiceDerivedFields(invoice);
  const amount = derived.balance_due;

  if (!invoice?.id) throw new Error('Invoice is required.');
  if (!amount || amount <= 0) throw new Error('This invoice has no balance due.');
  if (!invoice.client_email) throw new Error('Client email is required for online payment.');

  let response;
  try {
    response = await base44.functions.invoke('createStripeCheckoutSession', {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      client_email: invoice.client_email,
      client_name: invoice.client_name,
      amount,
      currency: 'usd',
    });
  } catch (err) {
    console.error('[stripeCheckout] Function invocation failed:', err);
    throw new Error(err?.message || 'Unable to connect to payment service.');
  }

  const data = response?.data || response;
  if (!data?.ok || !data?.url) {
    const errMsg = data?.error || response?.error?.message || 'Unable to start online payment. Please contact us.';
    console.error('[stripeCheckout] Invalid session response:', data);
    throw new Error(errMsg);
  }

  return data;
}

export async function redirectToStripeCheckout(invoice) {
  const session = await createStripeCheckoutForInvoice(invoice);
  window.location.href = session.url;
  return session;
}
