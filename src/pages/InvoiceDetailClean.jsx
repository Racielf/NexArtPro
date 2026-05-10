import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, DollarSign, Printer, ExternalLink, FileCheck, Copy, Ban, CreditCard, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { computeInvoiceDerivedFields, isInvoiceOverdue } from "@/lib/invoiceHelpers";
import { redirectToStripeCheckout } from "@/lib/stripeCheckout";
import { formatCurrency } from "@/utils/invoiceCalc";
import { toast } from "sonner";
import { APP_CONFIG } from "@/lib/appConfig";

const co = APP_CONFIG?.company || {};
const PAYMENT_METHODS = ["cash","check","card_manual","bank_transfer","zelle","venmo","other"];

function StatusBadge({ status }) {
  const map = {
    draft:   "bg-slate-100 text-slate-600",
    sent:    "bg-blue-100 text-blue-700",
    viewed:  "bg-cyan-100 text-cyan-700",
    partial: "bg-amber-100 text-amber-700",
    paid:    "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    void:    "bg-slate-100 text-slate-400",
  };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft";
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.draft}`}>{label}</span>;
}

export default function InvoiceDetailClean() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("id");
  const navigate  = useNavigate();

  const [invoice,  setInvoice]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [payOpen,  setPayOpen]  = useState(false);
  const [payForm,  setPayForm]  = useState({ amount: "", method: "cash", reference: "", notes: "", paid_at: format(new Date(), "yyyy-MM-dd") });
  const [stripeLoading, setStripeLoading] = useState(false);

  const load = async () => {
    if (!invoiceId) { setLoading(false); return; }
    const rows = await base44.entities.Invoice.filter({ id: invoiceId }).catch(() => []);
    setInvoice(rows[0] || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [invoiceId]);

  const derived = useMemo(() => invoice ? computeInvoiceDerivedFields(invoice) : { amount_paid: 0, balance_due: 0, payment_status: "unpaid" }, [invoice]);
  const isOverdue = invoice ? isInvoiceOverdue({ ...invoice, ...derived }) : false;
  const isPaid    = derived.payment_status === "paid";
  const isVoid    = invoice?.status === "void";
  const canSend   = !isPaid && !isVoid && invoice?.status === "draft";
  const canPay    = !isPaid && !isVoid;

  const handleSend = async () => {
    if (!invoice?.client_email) { toast.error("Client email required to send"); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await base44.integrations.Core.SendEmail({
        to: invoice.client_email,
        subject: `Invoice ${invoice.invoice_number} — Payment Due`,
        body: `Hi ${invoice.client_name},\n\nPlease find your invoice ${invoice.invoice_number}.\n\nTotal Due: ${formatCurrency(derived.balance_due)}${invoice.due_date ? `\nDue: ${format(new Date(invoice.due_date), "MMM d, yyyy")}` : ""}\n\nThank you!\n${co.name || ""}`,
      });
      await base44.entities.Invoice.update(invoiceId, { status: "sent", sent_at: now });
      setInvoice(prev => ({ ...prev, status: "sent", sent_at: now }));
      toast.success("Invoice sent");
    } catch (err) {
      toast.error(err?.message || "Failed to send invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm("Void this invoice?")) return;
    await base44.entities.Invoice.update(invoiceId, { status: "void", voided_at: new Date().toISOString() });
    setInvoice(prev => ({ ...prev, status: "void" }));
    toast.success("Invoice voided");
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payForm.amount) || 0;
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const entry = {
        id: crypto.randomUUID(),
        amount,
        method: payForm.method,
        reference: payForm.reference || "",
        notes: payForm.notes,
        paid_at: payForm.paid_at,
        created_at: new Date().toISOString(),
      };
      const payments = [...(invoice.payments || []), entry];
      await base44.entities.Invoice.update(invoiceId, { payments });
      setInvoice(prev => ({ ...prev, payments }));
      setPayOpen(false);
      setPayForm({ amount: "", method: "cash", reference: "", notes: "", paid_at: format(new Date(), "yyyy-MM-dd") });
      toast.success("Payment recorded");
    } catch (err) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const handleStripe = async () => {
    setStripeLoading(true);
    try { await redirectToStripeCheckout(invoice); }
    catch (err) { toast.error(err?.message || "Stripe error"); }
    finally { setStripeLoading(false); }
  };

  // Print full invoice via CSS @media print
  const handlePrint = () => window.print();

  // Print payment receipt only — opens a separate popup window
  const handlePrintReceipt = () => {
    const paidList = (invoice.payments || []);
    if (!paidList.length) return;
    const companyName  = co.name  || "R.C Art Construction LLC";
    const companyEmail = co.email || "";
    const companyPhone = co.phone || "";
    const totalPaid    = paidList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const rows = paidList.map(p => `
      <tr>
        <td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
        <td style="text-transform:capitalize">${(p.method || "cash").replace(/_/g, " ")}</td>
        <td>${p.reference ? `<span style="color:#64748b;font-size:12px">#${p.reference}</span>` : ""}</td>
        <td>${p.notes || ""}</td>
        <td style="text-align:right;font-weight:700">$${parseFloat(p.amount || 0).toFixed(2)}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><title>Payment Receipt — ${invoice.invoice_number}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, sans-serif; color: #1e293b; padding: 40px; max-width: 680px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
      .company { font-size: 20px; font-weight: 800; color: #0f172a; }
      .company-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
      .badge { background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
      .title { font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
      .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 28px; }
      .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
      .meta-value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
      td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
      .total-row { background: #f0fdf4; }
      .total-row td { font-size: 15px; font-weight: 800; color: #15803d; border: none; padding: 14px 12px; }
      .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style></head><body>
    <div class="header">
      <div>
        <div class="company">${companyName}</div>
        <div class="company-sub">${[companyEmail, companyPhone].filter(Boolean).join(" · ")}</div>
      </div>
      <div class="badge">PAYMENT RECEIPT</div>
    </div>
    <div class="title">Receipt</div>
    <div class="subtitle">Invoice #${invoice.invoice_number} · ${invoice.client_name || ""}</div>
    <div class="meta">
      <div><div class="meta-label">Billed To</div><div class="meta-value">${invoice.client_name || "—"}</div></div>
      <div><div class="meta-label">Invoice Total</div><div class="meta-value">$${parseFloat(invoice.total || 0).toFixed(2)}</div></div>
      <div><div class="meta-label">Amount Paid</div><div class="meta-value" style="color:#15803d">$${totalPaid.toFixed(2)}</div></div>
      <div><div class="meta-label">Balance Due</div><div class="meta-value" style="color:${totalPaid >= (invoice.total || 0) ? "#15803d" : "#dc2626"}">$${Math.max(0, (invoice.total || 0) - totalPaid).toFixed(2)}</div></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Notes</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}
        <tr class="total-row"><td colspan="4">Total Paid</td><td style="text-align:right">$${totalPaid.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <div class="footer">This receipt was generated by NexArtPro · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
    </body></html>`;
    const win = window.open("", "_blank", "width=780,height=900");
    if (!win) { toast.error("Please allow popups to print the receipt"); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const handleClientView = () => {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    window.open(`${window.location.origin}${base}/document/${invoiceId}`, "_blank");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>;
  if (!invoice) return <div className="p-8 text-center text-slate-400">Invoice not found.</div>;

  // Normalize: support line_items[] and groups[].items (Estimate → Invoice)
  const lineItems = invoice.line_items?.length
    ? invoice.line_items
    : (invoice.groups || []).flatMap(g => g.items || []);
  const payments  = invoice.payments  || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 sticky top-0 z-10 flex-wrap">
        <button onClick={() => navigate("/invoices")} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-slate-900 text-sm truncate">{invoice.invoice_number}</span>
          <StatusBadge status={isOverdue ? "overdue" : invoice.status} />
        </div>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {canSend && (
            <Button size="sm" variant="outline" onClick={handleSend} disabled={saving} className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5">
              <Send className="w-3.5 h-3.5" />{saving ? "Sending…" : "Send"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleClientView} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />Client View
          </Button>
          {canPay && (
            <Button size="sm" onClick={() => setPayOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />Add Payment
            </Button>
          )}
          {!isVoid && payments.length > 0 && (
            <Button size="sm" variant="outline" onClick={handlePrintReceipt} className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Receipt className="w-3.5 h-3.5" />Receipt
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
          {!isVoid && !isPaid && (
            <Button size="sm" variant="outline" onClick={handleVoid} className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5">
              <Ban className="w-3.5 h-3.5" />Void
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* LEFT: Invoice Document */}
        <div className="lg:col-span-2">

          {/* Payment History above fold */}
          {payments.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-semibold text-emerald-800 mb-3">Payment History</h3>
              <div className="space-y-2">
                {payments.map((pay, i) => (
                  <div key={pay.id || i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-emerald-100">
                    <div>
                      <span className="text-sm font-medium text-slate-700 capitalize">{(pay.method || "cash").replace(/_/g," ")}</span>
                      {pay.paid_at && <span className="text-xs text-slate-400 ml-2">{format(new Date(pay.paid_at), "MMM d, yyyy")}</span>}
                      {pay.notes && <div className="text-xs text-slate-400">{pay.notes}</div>}
                    </div>
                    <span className="font-bold text-emerald-700">{formatCurrency(pay.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-100">
              <div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">INVOICE</div>
                <div className="text-slate-400 text-sm mt-1">{invoice.invoice_number}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">{co.name || "R.C Art Construction LLC"}</div>
                {co.email && <div className="text-xs text-slate-500">{co.email}</div>}
                {co.phone && <div className="text-xs text-slate-500">{co.phone}</div>}
              </div>
            </div>

            {/* Bill To + Dates */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</div>
                <div className="font-semibold text-slate-800">{invoice.client_name || "—"}</div>
                {invoice.client_email && <div className="text-sm text-slate-500">{invoice.client_email}</div>}
                {invoice.client_phone && <div className="text-sm text-slate-500">{invoice.client_phone}</div>}
                {invoice.client_address && <div className="text-sm text-slate-500 mt-1 whitespace-pre-line">{invoice.client_address}</div>}
              </div>
              <div className="space-y-1.5 text-sm">
                {invoice.created_date && <div className="flex justify-between"><span className="text-slate-400">Issue Date</span><span>{format(new Date(invoice.created_date), "MMM d, yyyy")}</span></div>}
                {invoice.due_date && <div className="flex justify-between"><span className="text-slate-400">Due Date</span><span className={isOverdue ? "text-red-600 font-medium" : ""}>{format(new Date(invoice.due_date), "MMM d, yyyy")}</span></div>}
                {invoice.payment_terms && <div className="flex justify-between"><span className="text-slate-400">Terms</span><span>{invoice.payment_terms}</span></div>}
              </div>
            </div>

            {/* Line items */}
            {lineItems.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-400 rounded-xl">
                    <th className="text-left px-4 py-2.5 font-medium rounded-l-xl">Description</th>
                    <th className="text-right px-4 py-2.5 font-medium">Qty</th>
                    <th className="text-right px-4 py-2.5 font-medium">Price</th>
                    <th className="text-right px-4 py-2.5 font-medium rounded-r-xl">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lineItems.map((li, idx) => (
                    <tr key={li.id || idx}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800">{li.name}</div>
                        {li.description && <div className="text-xs text-slate-400">{li.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500">{li.quantity} {li.unit}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500">{formatCurrency(li.unit_price)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">{formatCurrency(li.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-60 space-y-2 bg-slate-50 rounded-xl p-4 text-sm">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal || 0)}</span></div>
                {(invoice.discount_amount || 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(invoice.discount_amount)}</span></div>}
                {(invoice.tax_amount || 0) > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span></div>}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-base">
                  <span>Total</span><span>{formatCurrency(invoice.total || 0)}</span>
                </div>
                {derived.amount_paid > 0 && (
                  <div className="flex justify-between text-emerald-600 text-sm">
                    <span>Paid</span><span>-{formatCurrency(derived.amount_paid)}</span>
                  </div>
                )}
                {derived.balance_due > 0 && (
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-red-600 text-base">
                    <span>Balance Due</span><span>{formatCurrency(derived.balance_due)}</span>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <div className="font-medium text-slate-700 mb-1">Notes</div>
                <p className="text-slate-500 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Evidence / photos */}
            {Array.isArray(invoice.attachments) && invoice.attachments.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Attachments</div>
                <div className="flex flex-wrap gap-2">
                  {invoice.attachments.map((att, i) => (
                    <a key={i} href={att.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline border border-blue-100 rounded-lg px-2 py-1 bg-blue-50">
                      {att.file_name || `File ${i+1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Financial summary + actions */}
        <div className="space-y-4">
          {/* Financial card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Financial Summary</h3>
            <div className="bg-slate-50 rounded-xl p-3 text-center mb-3">
              <div className="text-xs text-slate-400 mb-1">Total</div>
              <div className="font-black text-2xl text-slate-900">{formatCurrency(invoice.total || 0)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-xs text-emerald-600 mb-1">Paid</div>
                <div className="font-bold text-emerald-700">{formatCurrency(derived.amount_paid)}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-xs text-red-500 mb-1">Balance</div>
                <div className="font-bold text-red-600">{formatCurrency(derived.balance_due)}</div>
              </div>
            </div>
            {canPay && (
              <Button onClick={() => setPayOpen(true)} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <DollarSign className="w-4 h-4" />Record Payment
              </Button>
            )}
            {isPaid && (
              <div className="mt-3 flex items-center justify-center gap-2 text-emerald-600 text-sm font-semibold">
                <FileCheck className="w-4 h-4" />Paid in Full
              </div>
            )}
          </div>

          {/* Pay Now / Stripe */}
          {canPay && derived.balance_due > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Online Payment</h3>
              <Button
                onClick={handleStripe}
                disabled={stripeLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {stripeLoading ? "Redirecting…" : "Pay Now via Stripe"}
              </Button>
              <p className="text-[11px] text-slate-400 text-center mt-2">Secure payment powered by Stripe</p>
            </div>
          )}

          {/* Estimate link */}
          {invoice.estimate_id && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-4 py-3 text-sm text-cyan-700 flex items-center justify-between">
              <span>Created from Estimate</span>
              <button
                onClick={() => navigate(`/estimate-detail?id=${invoice.estimate_id}`)}
                className="text-xs font-medium underline hover:no-underline"
              >
                View
              </button>
            </div>
          )}

          {/* Copy client link — always available, uses invoice ID */}
          <button
            onClick={async () => {
              const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
              const url = `${window.location.origin}${base}/document/${invoiceId}`;
              await navigator.clipboard.writeText(url);
              toast.success("Client link copied");
            }}
            className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">Copy Client Link</span>
          </button>
        </div>
      </div>

      {/* Record Payment Dialog — internal company payment (cash, check, Zelle, etc.) */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Record Payment Received
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Log a payment your company received. This is NOT a client online payment.
            </p>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-3.5 pt-1">

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount ($) *</label>
              <input
                required type="number" step="0.01" min="0.01"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                placeholder={`Balance due: ${formatCurrency(derived.balance_due)}`}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Method */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => {
                  const icons = { cash: "💵", check: "📝", card_manual: "💳", bank_transfer: "🏦", zelle: "⚡", venmo: "📱", other: "🔖" };
                  return (
                    <button
                      key={m} type="button"
                      onClick={() => setPayForm(f => ({ ...f, method: m, reference: "" }))}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all text-center ${payForm.method === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                    >
                      <span className="block text-base mb-0.5">{icons[m]}</span>
                      {m.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method-specific reference field */}
            {payForm.method !== "cash" && (() => {
              const cfg = {
                check:         { label: "Check Number",      placeholder: "e.g. 1042" },
                card_manual:   { label: "Last 4 Digits",     placeholder: "e.g. 4242" },
                bank_transfer: { label: "Transaction / ACH Ref", placeholder: "e.g. ACH-000123" },
                zelle:         { label: "Zelle Confirmation", placeholder: "e.g. Zelle ref or phone" },
                venmo:         { label: "Venmo Transaction",  placeholder: "e.g. @username or ID" },
                other:         { label: "Reference / Note",   placeholder: "Any identifier" },
              }[payForm.method];
              return cfg ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{cfg.label}</label>
                  <input
                    value={payForm.reference}
                    onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder={cfg.placeholder}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ) : null;
            })()}

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
              <input
                type="date"
                value={payForm.paid_at}
                onChange={e => setPayForm(f => ({ ...f, paid_at: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Internal Notes (optional)</label>
              <input
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional context for accounting…"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">
                {saving ? "Saving…" : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}