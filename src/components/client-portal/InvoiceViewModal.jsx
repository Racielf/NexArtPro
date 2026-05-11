import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CreditCard, CheckCircle, Clock, AlertCircle, Printer } from "lucide-react";
import { format } from "date-fns";
import { redirectToStripeCheckout } from "@/lib/stripeCheckout";
import { computeInvoiceDerivedFields } from "@/lib/invoiceHelpers";
import { formatCurrency } from "@/utils/invoiceCalc";
import { toast } from "sonner";
import useCompanyConfig from "@/hooks/useCompanyConfig";
import InvoiceTemplateRenderer from "@/components/invoices/InvoiceTemplateRenderer";

/**
 * InvoiceViewModal — client-facing invoice view using InvoiceTemplateRenderer.
 *
 * Company branding: uses invoice.company_snapshot (priority)
 * with useCompanyConfig() as fallback for old invoices.
 *
 * Props:
 *   invoice  — invoice object (required)
 *   onClose  — close handler (optional, for modal usage)
 *
 * Also exported as default for standalone /document/:token route.
 */
export function InvoiceViewModal({ invoice: invoiceProp, onClose: _onClose }) {
  const liveCompany = useCompanyConfig();
  const [stripeLoading, setStripeLoading] = useState(false);

  if (!invoiceProp) return null;

  // Resolve company: snapshot embedded in invoice takes priority, live config is fallback
  const snap = invoiceProp?.company_snapshot;
  const invoiceCompany = (snap && typeof snap === 'object' && snap.name)
    ? { ...liveCompany, ...snap }
    : liveCompany;

  const derived   = computeInvoiceDerivedFields(invoiceProp);
  const isPaid    = derived.payment_status === "paid";
  const isOverdue = invoiceProp.due_date && new Date(invoiceProp.due_date) < new Date() && derived.balance_due > 0;
  const brandColor = "#2563EB";

  const handlePayNow = async () => {
    if (derived.balance_due <= 0) return;
    if (!invoiceProp?.id) {
      toast.error("This invoice is missing required payment information.");
      return;
    }
    setStripeLoading(true);
    try {
      await redirectToStripeCheckout(invoiceProp);
    } catch (err) {
      console.error("[InvoiceViewModal] Stripe checkout failed:", err);
      toast.error(err?.message || "Unable to start online payment.");
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl max-w-2xl mx-auto">
      {/* @media print: hide buttons, show only document */}
      <style>{`
        @media print {
          .no-print-public { display: none !important; }
          body { background: white !important; }
          .public-invoice-print-document {
            box-shadow: none !important; border: none !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* Status bar — visible in browser, hidden in print via no-print-public parent */}
      <div className={`px-8 py-3 flex items-center justify-between text-sm border-b no-print-public ${isPaid ? "bg-emerald-50 border-emerald-100" : isOverdue ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
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

      {/* Document — rendered via selected template (same renderer as Invoice Detail and Print) */}
      <div className="public-invoice-print-document w-full">
        <InvoiceTemplateRenderer
          invoice={invoiceProp}
          company={invoiceCompany}
          derived={derived}
          template={invoiceProp.template || "clean"}
        />
      </div>

      {/* Actions — hidden in print */}
      <div className="flex flex-col sm:flex-row gap-3 px-8 pt-4 pb-6 no-print-public">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Printer className="w-4 h-4" />Print / Save PDF
        </button>
        {!isPaid && derived.balance_due > 0 ? (
          <button
            onClick={handlePayNow}
            disabled={stripeLoading || derived.balance_due <= 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
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

      <div className="text-center text-xs text-slate-400 pb-4 no-print-public">
        Powered by NexArtPro &middot; Secure document portal
      </div>
    </div>
  );
}

/**
 * Standalone public route component: /document/:token
 * Uses useParams() — registered in App.jsx as /document/:token
 */
export default function PublicInvoiceDocument() {
  const { token: invoiceId } = useParams(); // token param = invoice UUID
  const [invoice,  setInvoice]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!invoiceId) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const rows = await base44.entities.Invoice.filter({ id: invoiceId }).catch(() => []);
      const inv  = rows?.[0];
      if (inv) {
        setInvoice(inv);
        // Mark as viewed if first time seeing
        if (inv.status === "sent") {
          await base44.entities.Invoice.update(inv.id, { status: "viewed" }).catch(() => {});
        }
        setLoading(false);
        return;
      }
      setNotFound(true);
      setLoading(false);
    })();
  }, [invoiceId]);

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
