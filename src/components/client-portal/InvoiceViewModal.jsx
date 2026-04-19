import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ExecutionSummaryBlock from '@/components/invoices/ExecutionSummaryBlock';
import ClientPaymentSummary from '@/components/client-portal/ClientPaymentSummary';
import PaymentInstructions from '@/components/client-portal/PaymentInstructions';
import ClientResponseActions from '@/components/client-portal/ClientResponseActions';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';

/**
 * InvoiceViewModal — Displays invoice with execution evidence to client.
 * Shown in-place in ClientPortal when client clicks on invoice.
 */
export default function InvoiceViewModal({ invoice, onClose }) {
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(false);

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
  const items = (invoice.groups?.flatMap(g => g.items || []) || invoice.line_items || []);

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invoice #{invoice.invoice_number}</h2>
            <p className="text-xs text-slate-500 mt-1">{invoice.client_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Client Payment Summary (prominent, clear) */}
          <ClientPaymentSummary invoice={invoice} />

          {/* Line Items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Services</p>
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Service</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{item.service_name || item.name}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        )}
                      </td>
                      <td className="text-right px-3 py-2 text-slate-600">{item.quantity || 1}</td>
                      <td className="text-right px-3 py-2 text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                      <td className="text-right px-3 py-2 font-semibold text-slate-900">
                        ${(item.line_total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Execution Evidence */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : workOrder ? (
            <ExecutionSummaryBlock workOrder={workOrder} compact={false} />
          ) : null}

          {/* Payment Instructions */}
          <PaymentInstructions invoice={invoice} />

          {/* Client Response Actions */}
          <ClientResponseActions
            invoice={invoice}
            onResponseSubmitted={(updates) => {
              // Update local invoice state with response
              // This allows display of response summary immediately
              Object.assign(invoice, updates);
            }}
          />

          {/* Notes */}
          {invoice.notes && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Notes</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Due Date */}
          {invoice.due_date && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Payment Due</p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}