import { createPaymentReceiptPdfFile } from '@/lib/paymentReceiptPdf';

export function buildPaymentReceiptEmail({ invoice, payment, balanceDue, receiptUrl }) {
  const amount = Number(payment?.amount || 0).toFixed(2);
  const total = Number(invoice?.total || 0).toFixed(2);
  const paid = Number(invoice?.amount_paid || 0).toFixed(2);
  const balance = Number(balanceDue ?? invoice?.balance_due ?? 0).toFixed(2);
  const method = payment?.method || 'payment';
  const date = payment?.payment_date
    ? new Date(payment.payment_date).toLocaleString()
    : new Date().toLocaleString();

  return {
    subject: `Payment Receipt - Invoice #${invoice?.invoice_number || ''}`,
    body: `Hi ${invoice?.client_name || 'Customer'},

Thank you. We received your payment.

PAYMENT RECEIPT
Invoice #: ${invoice?.invoice_number || '—'}
Payment Amount: $${amount}
Payment Method: ${method}
Payment Date: ${date}
${payment?.reference ? `Reference: ${payment.reference}\n` : ''}${payment?.note ? `Note: ${payment.note}\n` : ''}
Invoice Total: $${total}
Total Paid: $${paid}
Balance Due: $${balance}

Download your receipt PDF here:
${receiptUrl || 'Receipt available on request'}

Thank you for your business.

RC Art Construction LLC`.trim(),
  };
}

export async function sendPaymentReceipt({ base44, invoice, payment, balanceDue }) {
  if (!invoice?.client_email) {
    return { sent: false, reason: 'missing_client_email' };
  }

  let receiptUrl = null;

  try {
    const file = createPaymentReceiptPdfFile({ invoice, payment, balanceDue });
    const upload = await base44.integrations.Core.UploadFile({ file });
    receiptUrl = upload?.file_url;
  } catch (e) {
    console.error('PDF upload failed', e);
  }

  const email = buildPaymentReceiptEmail({ invoice, payment, balanceDue, receiptUrl });

  await base44.integrations.Core.SendEmail({
    to: invoice.client_email,
    subject: email.subject,
    body: email.body,
  });

  return { sent: true, receiptUrl };
}
