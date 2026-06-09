import React from 'react';
import { Download, Receipt } from 'lucide-react';
import { downloadPaymentReceiptPdf } from '@/lib/paymentReceiptPdf';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPaymentRows(invoices = []) {
  return invoices.flatMap(invoice => {
    const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
    return payments.map(payment => ({
      id: `${invoice.id}-${payment.id}`,
      invoice,
      payment,
      date: payment.payment_date || payment.recorded_at,
    }));
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

export default function PaymentHistoryPanel({ invoices = [] }) {
  const rows = getPaymentRows(invoices);
  const totalPaid = rows.reduce((sum, row) => sum + Number(row.payment?.amount || 0), 0);
  const openBalance = invoices.reduce((sum, invoice) => sum + computeInvoiceDerivedFields(invoice).balance_due, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Paid</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatMoney(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open Balance</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatMoney(openBalance)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No payments recorded yet</p>
          <p className="text-xs text-slate-400 mt-1">Payment receipts will appear here after a payment is recorded.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-black text-slate-900">Payment History</p>
            <p className="text-xs text-slate-400">Download receipt PDFs for any payment.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map(({ id, invoice, payment }) => {
              const derived = computeInvoiceDerivedFields(invoice);
              return (
                <div key={id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{formatMoney(payment.amount)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Invoice #{invoice.invoice_number} · {formatDate(payment.payment_date || payment.recorded_at)} · {payment.method || 'payment'}
                    </p>
                    {payment.note && <p className="text-xs text-slate-400 mt-1 truncate">{payment.note}</p>}
                  </div>
                  <button
                    onClick={() => downloadPaymentReceiptPdf({ invoice, payment, balanceDue: derived.balance_due })}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
