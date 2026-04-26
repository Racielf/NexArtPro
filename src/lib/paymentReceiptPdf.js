import { jsPDF } from 'jspdf';

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function safe(value, fallback = '-') {
  return value == null || value === '' ? fallback : String(value);
}

export function buildReceiptPdfFileName(invoice, payment) {
  const invoiceNo = invoice?.invoice_number || 'invoice';
  const paymentId = String(payment?.id || Date.now()).replace(/[^a-zA-Z0-9-_]/g, '');
  return `receipt-invoice-${invoiceNo}-${paymentId}.pdf`;
}

export function generatePaymentReceiptPdf({ invoice, payment, balanceDue }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const now = new Date();
  const paymentDate = payment?.payment_date ? new Date(payment.payment_date) : now;
  const amountPaid = Number(invoice?.amount_paid || 0);
  const balance = Number(balanceDue ?? invoice?.balance_due ?? 0);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 112, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('PAYMENT RECEIPT', margin, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Invoice #${safe(invoice?.invoice_number)}`, margin, 78);
  doc.text(paymentDate.toLocaleString(), margin, 96);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RC Art Construction LLC', pageWidth - margin, 54, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Payment confirmation', pageWidth - margin, 74, { align: 'right' });

  let y = 150;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Received From', margin, y);

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(safe(invoice?.client_name, 'Customer'), margin, y);
  y += 16;
  if (invoice?.client_email) {
    doc.text(invoice.client_email, margin, y);
    y += 16;
  }
  if (invoice?.client_phone) {
    doc.text(invoice.client_phone, margin, y);
    y += 16;
  }
  if (invoice?.client_address) {
    const lines = doc.splitTextToSize(invoice.client_address, contentWidth / 2);
    doc.text(lines, margin, y);
    y += lines.length * 14;
  }

  const boxY = 150;
  const boxX = margin + contentWidth / 2 + 20;
  const boxW = contentWidth / 2 - 20;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, boxY, boxW, 140, 10, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Amount', boxX + 18, boxY + 30);
  doc.setFontSize(26);
  doc.setTextColor(22, 163, 74);
  doc.text(money(payment?.amount), boxX + 18, boxY + 64);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Method: ${safe(payment?.method)}`, boxX + 18, boxY + 92);
  if (payment?.reference) doc.text(`Reference: ${payment.reference}`, boxX + 18, boxY + 110);
  doc.text(`Recorded by: ${safe(payment?.recorded_by, 'Field Agent')}`, boxX + 18, boxY + 128);

  y = Math.max(y + 36, 330);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Invoice Summary', margin, y);
  y += 18;

  const row = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin, y);
    doc.setTextColor(15, 23, 42);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 22;
  };

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;
  row('Invoice Total', money(invoice?.total));
  row('Total Paid', money(amountPaid));
  row('Balance Due', money(balance), true);
  doc.line(margin, y, pageWidth - margin, y);

  if (payment?.note) {
    y += 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Note', margin, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(payment.note, contentWidth);
    doc.text(noteLines, margin, y);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your business.', margin, 720);
  doc.text(`Generated ${now.toLocaleString()}`, pageWidth - margin, 720, { align: 'right' });

  return doc;
}

export function downloadPaymentReceiptPdf({ invoice, payment, balanceDue }) {
  const doc = generatePaymentReceiptPdf({ invoice, payment, balanceDue });
  const filename = buildReceiptPdfFileName(invoice, payment);
  doc.save(filename);
  return filename;
}
