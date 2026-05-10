import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, CreditCard, CheckCircle, Clock, AlertCircle, Mail, Phone, Printer } from "lucide-react";
import { format } from "date-fns";
import { redirectToStripeCheckout } from "@/lib/stripeCheckout";
import { computeInvoiceDerivedFields } from "@/lib/invoiceHelpers";
import { formatCurrency } from "@/utils/invoiceCalc";
import { toast } from "sonner";
import { APP_CONFIG } from "@/lib/appConfig";

const co = APP_CONFIG?.company || {};

/**
 * InvoiceViewModal — clean client-facing invoice view.
 * Adapted from ZIP PublicDocument.jsx — uses NexArtPro schema:
 *   client_name (not customer_name), payments[] (not InvoicePayment entity),
 *   redirectToStripeCheckout() for Pay Now.
 *
 * Props:
 *   invoice  — invoice object (required)
 *   onClose  — close handler (optional, for modal usage)
 *
 * Also exported as default for standalone /document/:token route.
 */
export function InvoiceViewModal({ invoice: invoiceProp, onClose: _onClose }) {
  const [stripeLoading, setStripeLoading] = useState(false);

  if (!invoiceProp) return null;

  const derived  = computeInvoiceDerivedFields(invoiceProp);
  const isPaid   = derived.payment_status === "paid";
  const isOverdue = invoiceProp.due_date && new Date(invoiceProp.due_date) < new Date() && derived.balance_due > 0;
  const brandColor = "#2563EB";

  const handlePayNow = async () => {
    if (derived.balance_due <= 0) return;
    setStripeLoading(true);
    try {
      await redirectToStripeCheckout(invoiceProp);
    } catch (err) {
      toast.error(err?.message || "Payment error");
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl max-w-2xl mx-auto">
      {/* Gradient header */}
      <div className="px-8 py-6 text-white" style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #0F172A 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg">{co.name || "R.C Art Construction LLC"}</div>
              {co.address && <div className="text-white/60 text-xs">{co.address}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/60 text-xs uppercase tracking-wide">Invoice</div>
            <div className="font-bold text-xl">{invoiceProp.invoice_number}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {co.email && <div className="flex items-center gap-1.5 text-white/70"><Mail className="w-3.5 h-3.5" />{co.email}</div>}
          {co.phone && <div className="flex items-center gap-1.5 text-white/70"><Phone className="w-3.5 h-3.5" />{co.phone}</div>}
        </div>
      </div>

      {/* Status bar */}
      <div className={`px-8 py-3 flex items-center justify-between text-sm border-b ${isPaid ? "bg-emerald-50 border-emerald-100" : isOverdue ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
        <div className="flex items-center gap-2">
          {isPaid ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : isOverdue ? <AlertCircle className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
          <span className={`font-medium ${isPaid ? "text-emerald-700" : isOverdue ? "text-red-600" : "text-slate-700"}`}>
            {isPaid ? "Payment Received — Thank you!" : isOverdue ? "Payment Overdue" : invoiceProp.due_date ? `Payment Due ${format(new Date(invoiceProp.due_date), "MMM d, yyyy")}` : "Payment Pending"}
          </span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isPaid ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"}`}>
          {isPaid ? "PAID" : isOverdue ? "OVERDUE" : (invoiceProp.status || "SENT").toUpperCase()}
        </span>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Bill To + Dates */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</div>
            <div className="font-semibold text-slate-800">{invoiceProp.client_name || "—"}</div>
            {invoiceProp.client_email && <div className="text-sm text-slate-500">{invoiceProp.client_email}</div>}
            {invoiceProp.client_phone && <div className="text-sm text-slate-500">{invoiceProp.client_phone}</div>}
            {invoiceProp.client_address && <div className="text-sm text-slate-500 mt-1 whitespace-pre-line">{invoiceProp.client_address}</div>}
          </div>
          <div className="space-y-1.5 text-sm">
            {invoiceProp.created_date && <div className="flex justify-between"><span className="text-slate-400">Issue Date</span><span>{format(new Date(invoiceProp.created_date), "MMM d, yyyy")}</span></div>}
            {invoiceProp.due_date && <div className="flex justify-between"><span className="text-slate-400">Due Date</span><span className={isOverdue ? "text-red-600 font-medium" : ""}>{format(new Date(invoiceProp.due_date), "MMM d, yyyy")}</span></div>}
            {invoiceProp.payment_terms && <div className="flex justify-between"><span className="text-slate-400">Terms</span><span>{invoiceProp.payment_terms}</span></div>}
          </div>
        </div>

        {/* Line items */}
        {(invoiceProp.line_items || []).length > 0 && (
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(invoiceProp.line_items || []).map((li, idx) => (
                  <tr key={li.id || idx}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">{li.name}</div>
                      {li.description && <div className="text-xs text-slate-400">{li.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-500">{li.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-500">{formatCurrency(li.unit_price)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">{formatCurrency(li.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-60 space-y-2 bg-slate-50 rounded-xl p-4 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(invoiceProp.subtotal || 0)}</span></div>
            {(invoiceProp.discount_amount || 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(invoiceProp.discount_amount)}</span></div>}
            {(invoiceProp.tax_amount || 0) > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(invoiceProp.tax_amount)}</span></div>}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-base"><span>Total</span><span>{formatCurrency(invoiceProp.total || 0)}</span></div>
            {derived.amount_paid > 0 && <div className="flex justify-between text-emerald-600"><span>Paid</span><span>-{formatCurrency(derived.amount_paid)}</span></div>}
            {derived.balance_due > 0 && (
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-red-600 text-base">
                <span>Balance Due</span><span>{formatCurrency(derived.balance_due)}</span>
              </div>
            )}
          </div>
        </div>

        {invoiceProp.notes && (
          <div className="bg-slate-50 rounded-xl p-4 text-sm">
            <p className="font-medium text-slate-700 mb-1">Notes</p>
            <p className="text-slate-500 whitespace-pre-line">{invoiceProp.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            <Printer className="w-4 h-4" />Print / Save PDF
          </button>
          {!isPaid && derived.balance_due > 0 ? (
            <button
              onClick={handlePayNow}
              disabled={stripeLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: brandColor }}
            >
              <CreditCard className="w-4 h-4" />
              {stripeLoading ? "Redirecting…" : `Pay Now ${formatCurrency(derived.balance_due)}`}
            </button>
          ) : isPaid ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border-2 border-emerald-100">
              <CheckCircle className="w-4 h-4" />Paid in Full
            </div>
          ) : null}
        </div>

        <div className="text-center text-xs text-slate-400 pt-1">Powered by NexArtPro · Secure document portal</div>
      </div>
    </div>
  );
}

/**
 * Standalone public route component: /document/:token
 * Looks up invoice by public_token, marks as viewed, renders InvoiceViewModal.
 */
export default function PublicInvoiceDocument({ token: tokenProp }) {
  const [invoice,  setInvoice]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Support both prop-based and URL-based token
  const token = tokenProp || (typeof window !== "undefined" ? window.location.pathname.split("/document/")[1] : "");

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const invs = await base44.entities.Invoice.list("-created_date", 500).catch(() => []);
      const inv  = (invs || []).find(i => i.public_token === token);
      if (inv) {
        setInvoice(inv);
        if (inv.status === "sent") {
          await base44.entities.Invoice.update(inv.id, { status: "viewed", viewed_at: new Date().toISOString() }).catch(() => {});
        }
        setLoading(false);
        return;
      }
      setNotFound(true);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !invoice) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-700 mb-2">Document Not Found</h1>
        <p className="text-slate-400 text-sm">This link may have expired or is invalid.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <InvoiceViewModal invoice={invoice} />
    </div>
  );
}
