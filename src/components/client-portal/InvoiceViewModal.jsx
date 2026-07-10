import React, { useState, useEffect } from 'react';
import { X, Loader2, CreditCard, MapPin, Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ExecutionSummaryBlock from '@/components/invoices/ExecutionSummaryBlock';
import ClientPaymentSummary from '@/components/client-portal/ClientPaymentSummary';
import PaymentInstructions from '@/components/client-portal/PaymentInstructions';
import ClientResponseActions from '@/components/client-portal/ClientResponseActions';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';
import { redirectToStripeCheckout } from '@/lib/stripeCheckout';
import { normalizeLineItem } from '@/lib/lineItemNormalizer';

export default function InvoiceViewModal({ invoice, onClose }) {
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (invoice?.work_order_id) {
      setLoading(true);
      base44.entities.WorkOrder.filter({ id: invoice.work_order_id })
        .then(results => {
          if (results.length > 0) setWorkOrder(results[0]);
        })
        .catch(err => console.warn('[InvoiceViewModal] WO load failed:', err?.message))
        .finally(() => setLoading(false));
    }
  }, [invoice?.work_order_id]);

  if (!invoice) return null;

  const derived = computeInvoiceDerivedFields(invoice);
  const items = (invoice.groups?.flatMap(g => g.items || []) || invoice.line_items || []).map(normalizeLineItem);
  const isPaid = derived.payment_status === 'paid';
  const isPartial = derived.payment_status === 'partial';

  const handlePayNow = async () => {
    try {
      setPaying(true);
      await redirectToStripeCheckout(invoice);
    } catch (err) {
      alert(err.message);
      setPaying(false);
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(buildPrintHTML(invoice, items, derived));
    w.document.close();
    w.print();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 flex flex-col" style={{ maxHeight: 'calc(100vh - 64px)' }}>

        {/* ── DOCUMENT HEADER ── */}
        <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">INVOICE</p>
            <h2 className="text-2xl font-bold text-slate-900">#{invoice.invoice_number}</h2>
            {invoice.title && <p className="text-sm text-slate-500 mt-0.5">{invoice.title}</p>}
          </div>
          <div className="flex items-center gap-2">
            {/* Payment status pill */}
            <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full ${
              isPaid
                ? 'bg-emerald-100 text-emerald-700'
                : isPartial
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {isPaid ? '✓ Paid' : isPartial ? 'Partial' : invoice.status?.toUpperCase() || 'UNPAID'}
            </span>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors ml-2">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {/* Bill To + Dates row */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</p>
              <p className="font-semibold text-slate-800">{invoice.client_name}</p>
              {invoice.client_address && (
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />{invoice.client_address}
                </p>
              )}
              {invoice.client_phone && <p className="text-xs text-slate-500 mt-0.5">📞 {invoice.client_phone}</p>}
              {invoice.client_email && <p className="text-xs text-slate-500 mt-0.5">✉ {invoice.client_email}</p>}
            </div>
            <div className="text-right space-y-1">
              {invoice.due_date && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</p>
                  <p className="text-sm font-semibold text-slate-700">{invoice.due_date}</p>
                </div>
              )}
              {invoice.payment_terms && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Terms</p>
                  <p className="text-xs text-slate-500">{invoice.payment_terms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pay Now CTA — prominent, only when balance due */}
          {derived.balance_due > 0 && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3.5 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm transition-colors shadow-sm"
            >
              {paying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {paying ? 'Redirecting to payment…' : `Pay Now — $${derived.balance_due.toFixed(2)}`}
            </button>
          )}

          {/* Payment summary (paid amount, balance) */}
          <ClientPaymentSummary invoice={invoice} />

          {/* Line items */}
          {items.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Services</p>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{item.service_name || item.name || '—'}</p>
                          {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">${(item.line_total || item.total_price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span><span>${(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Discount</span><span>−${invoice.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.tax_rate > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Tax ({invoice.tax_rate}%)</span><span>${(invoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Total</span><span>${(invoice.total || 0).toFixed(2)}</span>
                  </div>
                  {derived.amount_paid > 0 && (
                    <div className="flex justify-between text-sm font-semibold text-emerald-600">
                      <span>Paid</span><span>−${derived.amount_paid.toFixed(2)}</span>
                    </div>
                  )}
                  {(isPartial || derived.balance_due > 0) && (
                    <div className="flex justify-between text-sm font-bold text-amber-700 pt-0.5">
                      <span>Balance Due</span><span>${derived.balance_due.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Work order execution summary */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="animate-spin w-3 h-3" />Loading work details…
            </div>
          ) : workOrder ? (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Work Execution</p>
              <ExecutionSummaryBlock workOrder={workOrder} compact={true} />
            </div>
          ) : null}

          {/* Payment instructions */}
          <PaymentInstructions invoice={invoice} />

          {/* Client response */}
          <ClientResponseActions invoice={invoice} onResponseSubmitted={(updates) => Object.assign(invoice, updates)} />
        </div>

        {/* ── FOOTER ── */}
        <div className="border-t border-slate-100 px-8 py-4 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Print HTML builder ────────────────────────────────────────────────────────
function buildPrintHTML(inv, items, derived) {
  return `<html><head><title>Invoice #${inv.invoice_number}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:800px;margin:0 auto}
    h1{color:#1a56db;margin:0}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .inv-num{color:#666;font-size:18px;margin:4px 0 0}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
    .block{background:#f9fafb;padding:16px;border-radius:8px}
    .label{color:#888;font-size:10px;text-transform:uppercase;font-weight:bold;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;margin:24px 0}
    th{background:#1f2937;color:white;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase}
    td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
    .totals{text-align:right;margin-top:16px}
    .totals p{margin:4px 0;font-size:13px}
    .total-row{font-size:16px;font-weight:bold;color:#1a56db}
    .balance{font-size:16px;font-weight:bold;color:#b45309}
    .paid-stamp{color:#059669;font-weight:bold}
  </style></head><body>
  <div class="header">
    <div><h1>INVOICE</h1><p class="inv-num">#${inv.invoice_number}</p></div>
    <div style="text-align:right"><strong style="color:#1a56db;font-size:18px">${inv.company_name || 'R.C Art Construction'}</strong></div>
  </div>
  <div class="grid">
    <div class="block">
      <div class="label">Bill To</div>
      <p><strong>${inv.client_name}</strong></p>
      ${inv.client_address ? `<p>${inv.client_address}</p>` : ''}
      ${inv.client_phone ? `<p>${inv.client_phone}</p>` : ''}
      ${inv.client_email ? `<p>${inv.client_email}</p>` : ''}
    </div>
    <div class="block">
      <div class="label">Invoice Details</div>
      <p>Invoice #: <strong>${inv.invoice_number}</strong></p>
      <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
      ${inv.due_date ? `<p>Due: <strong>${inv.due_date}</strong></p>` : ''}
      ${inv.payment_terms ? `<p>Terms: ${inv.payment_terms}</p>` : ''}
      <p>Status: <strong>${inv.status?.toUpperCase()}</strong></p>
    </div>
  </div>
  <table><thead><tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
  ${items.map(item => `<tr>
    <td><strong>${item.service_name || item.name || ''}</strong>${item.description ? `<br><small style="color:#666">${item.description}</small>` : ''}</td>
    <td>${item.quantity || ''}</td>
    <td>$${(item.unit_price || 0).toFixed(2)}</td>
    <td>$${(item.line_total || item.total_price || 0).toFixed(2)}</td>
  </tr>`).join('')}
  </tbody></table>
  <div class="totals">
    <p>Subtotal: $${(inv.subtotal || 0).toFixed(2)}</p>
    ${inv.discount_amount > 0 ? `<p>Discount: −$${inv.discount_amount.toFixed(2)}</p>` : ''}
    ${inv.tax_rate > 0 ? `<p>Tax (${inv.tax_rate}%): $${(inv.tax_amount || 0).toFixed(2)}</p>` : ''}
    <p class="total-row">TOTAL: $${(inv.total || 0).toFixed(2)}</p>
    ${derived.amount_paid > 0 ? `<p class="paid-stamp">Paid: $${derived.amount_paid.toFixed(2)}</p>` : ''}
    ${derived.balance_due > 0 ? `<p class="balance">Balance Due: $${derived.balance_due.toFixed(2)}</p>` : ''}
  </div>
  ${inv.notes ? `<div style="margin-top:30px;border-top:1px solid #eee;padding-top:20px"><div class="label">Notes</div><p>${inv.notes}</p></div>` : ''}
  </body></html>`;
}
