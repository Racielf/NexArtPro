import React, { useState, useEffect } from 'react';
import { X, Loader2, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ExecutionSummaryBlock from '@/components/invoices/ExecutionSummaryBlock';
import ClientPaymentSummary from '@/components/client-portal/ClientPaymentSummary';
import PaymentInstructions from '@/components/client-portal/PaymentInstructions';
import ClientResponseActions from '@/components/client-portal/ClientResponseActions';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';
import { redirectToStripeCheckout } from '@/lib/stripeCheckout';

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

  useEffect(() => {
    if (invoice?.status === "sent") {
      const now = new Date().toISOString();
      base44.entities.Invoice.update(invoice.id, {
        status: "viewed",
        viewed_at: now,
        last_viewed_at: now
      }).catch(err => console.warn("[InvoiceViewModal] view track fail:", err?.message));
    }
  }, [invoice?.id, invoice?.status]);

  if (!invoice) return null;

  const derived = computeInvoiceDerivedFields(invoice);
  const items = (invoice.groups?.flatMap(g => g.items || []) || invoice.line_items || []);

  const handlePayNow = async () => {
    try {
      setPaying(true);
      await redirectToStripeCheckout(invoice);
    } catch (err) {
      alert(err.message);
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invoice #{invoice.invoice_number}</h2>
            <p className="text-xs text-slate-500 mt-1">{invoice.client_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <ClientPaymentSummary invoice={invoice} />

          {derived.balance_due > 0 && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold"
            >
              {paying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Pay Now
            </button>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Services</p>
              <table className="w-full text-sm">
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.service_name || item.name}</td>
                      <td className="text-right">${(item.line_total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loading ? (
            <Loader2 className="animate-spin" />
          ) : workOrder ? (
            <ExecutionSummaryBlock workOrder={workOrder} compact={false} />
          ) : null}

          <PaymentInstructions invoice={invoice} />

          <ClientResponseActions invoice={invoice} onResponseSubmitted={(updates) => Object.assign(invoice, updates)} />
        </div>

        <div className="border-t px-6 py-4 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
