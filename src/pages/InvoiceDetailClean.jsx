import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, DollarSign, Printer, ExternalLink, FileCheck, Copy, Ban, CreditCard, Receipt, Pencil, MailCheck, CheckCheck, Info } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { computeInvoiceDerivedFields, isInvoiceOverdue } from "@/lib/invoiceHelpers";
import { redirectToStripeCheckout } from "@/lib/stripeCheckout";
import { formatCurrency } from "@/utils/invoiceCalc";
import { toast } from "sonner";
import useCompanyConfig from "@/hooks/useCompanyConfig";

const PAYMENT_METHODS = ["cash","check","card_manual","bank_transfer","zelle","venmo","other"];

function getPaymentMethodMeta(method) {
  switch (method) {
    case "cash":         return { label: "Cash",          notesLabel: "Cash notes",               notesPlaceholder: "Drawer, received by, or optional note…",  notesRequired: false };
    case "check":        return { label: "Check",         notesLabel: "Check number / reference",  notesPlaceholder: "Check #1234",                            notesRequired: true  };
    case "card_manual":  return { label: "Card Manual",   notesLabel: "Card authorization / last 4",notesPlaceholder: "Auth code or last 4 digits",             notesRequired: true  };
    case "bank_transfer":return { label: "Bank Transfer", notesLabel: "Transfer reference",        notesPlaceholder: "ACH / wire / reference number",          notesRequired: true  };
    case "zelle":        return { label: "Zelle",         notesLabel: "Zelle confirmation",        notesPlaceholder: "Confirmation ID or sender name",         notesRequired: true  };
    case "venmo":        return { label: "Venmo",         notesLabel: "Venmo reference",           notesPlaceholder: "Venmo username or transaction note",     notesRequired: true  };
    default:             return { label: "Other",         notesLabel: "Payment note",              notesPlaceholder: "Describe payment source",                notesRequired: true  };
  }
}

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

  const company = useCompanyConfig();

  const [invoice,  setInvoice]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [payOpen,  setPayOpen]  = useState(false);
  const [payForm,  setPayForm]  = useState({ amount: "", method: "cash", reference: "", notes: "", paid_at: format(new Date(), "yyyy-MM-dd") });
  const [stripeLoading, setStripeLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [markSentOpen, setMarkSentOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [manualSentForm, setManualSentForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), method: "email", note: "" });
  const [estimateNum, setEstimateNum] = useState(null);

  const load = async () => {
    if (!invoiceId) { setLoading(false); return; }
    const rows = await base44.entities.Invoice.filter({ id: invoiceId }).catch(() => []);
    setInvoice(rows[0] || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [invoiceId]);

  // Best-effort: load estimate number if invoice came from an estimate
  useEffect(() => {
    if (!invoice?.estimate_id) return;
    base44.entities.Estimate.filter({ id: invoice.estimate_id })
      .then(rows => { if (rows?.[0]?.estimate_number) setEstimateNum(rows[0].estimate_number); })
      .catch(() => {});
  }, [invoice?.estimate_id]);

  const derived = useMemo(() => invoice ? computeInvoiceDerivedFields(invoice) : { amount_paid: 0, balance_due: 0, payment_status: "unpaid" }, [invoice]);
  const isOverdue = invoice ? isInvoiceOverdue({ ...invoice, ...derived }) : false;
  const isPaid    = derived.payment_status === "paid";
  const isVoid    = invoice?.status === "void";
  const canPay    = !isPaid && !isVoid;
  const canEdit     = !isVoid;
  const canMarkSent = !isVoid && invoice?.status === "draft"; // only draft, disappears after sent
  const canSendEmail = !isVoid; // visible always unless void; disabled if no email

  // Helper: critical update (status/sent_at/sent_source) + optional best-effort metadata
  const markInvoiceSentCritical = async ({ source, sentAt, optionalPatch = {} }) => {
    const criticalPatch = { status: "sent", sent_at: sentAt, sent_source: source };
    await base44.entities.Invoice.update(invoiceId, criticalPatch); // throws on failure
    let optionalApplied = {};
    if (Object.keys(optionalPatch).length > 0) {
      await base44.entities.Invoice.update(invoiceId, optionalPatch)
        .then(() => { optionalApplied = optionalPatch; })
        .catch(err => console.warn("[InvoiceDetailClean] optional sent metadata failed:", err?.message || err));
    }
    setInvoice(prev => ({ ...prev, ...criticalPatch, ...optionalApplied }));
  };

  // Manual Mark Sent — no email
  const handleMarkSentManual = async () => {
    setSaving(true);
    try {
      const sentAt = manualSentForm.date ? new Date(manualSentForm.date).toISOString() : new Date().toISOString();
      await markInvoiceSentCritical({
        source: "manual",
        sentAt,
        optionalPatch: {
          sent_manually: true,
          sent_method: manualSentForm.method || null,
          manual_sent_note: manualSentForm.note.trim() || null,
          last_contacted_at: sentAt,
        },
      });
      setMarkSentOpen(false);
      setManualSentForm({ date: format(new Date(), "yyyy-MM-dd"), method: "email", note: "" });
      toast.success("Invoice marked as sent");
    } catch (err) {
      toast.error(err?.message || "Failed to mark as sent");
    } finally {
      setSaving(false);
    }
  };

  // Send Email (Automatic via Resend) — email FIRST, status only on success
  const handleResend = async () => {
    if (!invoice?.client_email) { toast.error("Client email required to send"); return; }
    setSaving(true);
    try {
      const clientLink = `${window.location.origin}/document/${invoiceId}`;
      const isResend = ['sent','viewed','partial'].includes(invoice?.status);
      const subject = isResend
        ? `Resend: Invoice ${invoice.invoice_number} — Payment Due`
        : `Invoice ${invoice.invoice_number} — Payment Due`;
      const emailResult = await base44.integrations.Core.SendEmail({
        to: invoice.client_email,
        subject,
        body: `Hi ${invoice.client_name},\n\nPlease find your invoice ${invoice.invoice_number}.\n\nTotal Due: ${formatCurrency(derived.balance_due)}${invoice.due_date ? `\nDue: ${format(new Date(invoice.due_date), "MMM d, yyyy")}` : ""}\n\nView Invoice: ${clientLink}\n\nThank you,\n${company.name}`,
      });
      // Email succeeded — now mark sent
      const now = new Date().toISOString();
      await markInvoiceSentCritical({
        source: "resend",
        sentAt: now,
        optionalPatch: {
          resend_message_id: emailResult?.id || emailResult?.data?.id || null,
          resend_status: emailResult?.status || emailResult?.data?.status || "sent",
          last_contacted_at: now,
        },
      });
      setResendOpen(false);
      toast.success(isResend ? "Invoice resent successfully" : "Invoice sent successfully");
    } catch (err) {
      // Email or critical update failed — status NOT changed
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
    const meta = getPaymentMethodMeta(payForm.method);
    if (meta.notesRequired && !payForm.notes.trim()) {
      toast.error(`${meta.notesLabel} is required`);
      return;
    }
    setSaving(true);
    try {
      const entry = {
        id: crypto.randomUUID(),
        amount,
        method: payForm.method,
        method_label: meta.label,
        notes: payForm.notes,
        reference: payForm.notes,
        paid_at: payForm.paid_at,
        created_at: new Date().toISOString(),
      };
      const payments = [...(invoice.payments || []), entry];
      await base44.entities.Invoice.update(invoiceId, { payments });
      setInvoice(prev => ({ ...prev, payments }));
      setPayOpen(false);
      setPayForm({ amount: "", method: "cash", notes: "", paid_at: format(new Date(), "yyyy-MM-dd") });
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

  // Print full invoice — window.print() uses browser CSS @media print
  const handlePrint = () => window.print();

  // Navigate to edit mode — warns if payments exist
  const handleEdit = () => {
    if ((invoice.payments || []).length > 0) {
      const ok = confirm("This invoice already has payments. Editing totals can affect the balance. Continue?");
      if (!ok) return;
    }
    navigate(`/invoice-create?id=${invoiceId}&mode=edit`);
  };

  // Receipt — opens in-app Dialog (not a popup)
  const handleOpenReceipt = () => {
    if (!(invoice?.payments?.length)) return;
    setReceiptOpen(true);
  };

  // Legacy popup kept only as fallback for Print Receipt button inside the dialog
  const handlePrintReceiptPopup = () => {
    const paidList = (invoice.payments || []);
    if (!paidList.length) return;
    const companyName  = company.name;
    const companyEmail = company.email || "";
    const companyPhone = company.phone || "";
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
      {/* @media print: show only invoice-print-document, hide everything else */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-print-document, .invoice-print-document * { visibility: visible !important; }
          .invoice-print-document {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: none !important;
            box-shadow: none !important; border: none !important;
            margin: 0 !important; padding: 24px !important;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 sticky top-0 z-10 flex-wrap no-print">
        <button onClick={() => navigate("/invoices")} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm truncate">{invoice.invoice_number}</span>
            <StatusBadge status={isOverdue ? "overdue" : invoice.status} />
          </div>
          {invoice.created_date && (
            <div className="text-[11px] text-slate-400">Issued {format(new Date(invoice.created_date), "MMM d, yyyy")}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {canEdit && (
            <Button size="sm" variant="outline" onClick={handleEdit} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />Edit
            </Button>
          )}
          {canSendEmail && (
            <Button
              size="sm" variant="outline"
              onClick={() => {
                if (!invoice?.client_email) { toast.error("Client email required"); return; }
                setResendOpen(true);
              }}
              disabled={saving || !invoice?.client_email}
              className="gap-1.5 border-cyan-300 text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {['sent','viewed','partial'].includes(invoice?.status) ? "Resend Email" : "Send Email"}
            </Button>
          )}
          {canMarkSent && (
            <Button size="sm" variant="outline" onClick={() => setMarkSentOpen(true)} className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50">
              <MailCheck className="w-3.5 h-3.5" />Mark Sent
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

          {/* Document card — invoice-print-document: only this is printed */}
          <div className="invoice-print-document bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-100">
              <div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">INVOICE</div>
                <div className="text-slate-400 text-sm mt-1">{invoice.invoice_number}</div>
              </div>
              <div className="text-right">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="h-10 object-contain ml-auto mb-1" />
                ) : null}
                <div className="font-bold text-slate-900">{company.name}</div>
                {company.email && <div className="text-xs text-slate-500">{company.email}</div>}
                {company.phone && <div className="text-xs text-slate-500">{company.phone}</div>}
                {company.address && <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{company.address}</div>}
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
        <div className="space-y-4 no-print">
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
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{estimateNum ? `Created from Estimate #${estimateNum}` : "Created from Estimate"}</span>
              </div>
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
          {/* Send Invoice via Email */}
          {!isVoid && (
            <button
              onClick={() => {
                if (!invoice?.client_email) { toast.error("Client email required to send"); return; }
                setResendOpen(true);
              }}
              disabled={saving}
              className={`w-full border rounded-2xl p-4 flex items-center gap-3 transition-colors ${
                invoice?.client_email
                  ? "bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-200"
                  : "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="text-left min-w-0">
                <div className="text-sm text-slate-700 font-medium">Send Invoice via Email</div>
                {!invoice?.client_email && (
                  <div className="text-[11px] text-amber-500 mt-0.5">Client email not set</div>
                )}
              </div>
            </button>
          )}
          {/* Action row: Add Payment / Receipt / Client View */}
          <div className="flex flex-wrap gap-2">
            {canPay && (
              <Button onClick={() => setPayOpen(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm">
                <DollarSign className="w-3.5 h-3.5" />Add Payment
              </Button>
            )}
            {!isVoid && payments.length > 0 && (
              <Button variant="outline" onClick={handleOpenReceipt} className="flex-1 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" size="sm">
                <Receipt className="w-3.5 h-3.5" />Payment Receipt
              </Button>
            )}
            <Button variant="outline" onClick={handleClientView} className="flex-1 gap-1.5" size="sm">
              <ExternalLink className="w-3.5 h-3.5" />Client View
            </Button>
          </div>
        </div>
      </div>

      {/* Record Payment Dialog */}
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
          {(() => {
            const meta = getPaymentMethodMeta(payForm.method);
            return (
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

                {/* Method pill grid */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_METHODS.map(m => {
                      const icons = { cash:"💵", check:"📝", card_manual:"💳", bank_transfer:"🏦", zelle:"⚡", venmo:"📱", other:"🔖" };
                      return (
                        <button key={m} type="button"
                          onClick={() => setPayForm(f => ({ ...f, method: m, notes: "" }))}
                          className={`py-2 px-1 rounded-xl border text-[11px] font-medium transition-all text-center leading-tight ${
                            payForm.method === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <span className="block text-base mb-0.5">{icons[m]}</span>
                          {m.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* card_manual warning */}
                {payForm.method === "card_manual" && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    Manual card records an external card payment. It does not charge the card through Stripe.
                  </p>
                )}

                {/* Dynamic notes/reference field */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {meta.notesLabel}{meta.notesRequired ? " *" : " (optional)"}
                  </label>
                  <input
                    value={payForm.notes}
                    onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={meta.notesPlaceholder}
                    required={meta.notesRequired}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
                  <input type="date"
                    value={payForm.paid_at}
                    onChange={e => setPayForm(f => ({ ...f, paid_at: e.target.value }))}
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
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Invoice</div>
                <div className="font-semibold">{invoice?.invoice_number}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Client</div>
                <div className="font-semibold truncate">{invoice?.client_name || "—"}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Invoice Total</div>
                <div className="font-semibold">{formatCurrency(invoice?.total || 0)}</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-0.5">Amount Paid</div>
                <div className="font-bold text-emerald-700">{formatCurrency(derived.amount_paid)}</div>
              </div>
            </div>

            {/* Balance badge */}
            <div className={`rounded-xl px-4 py-3 flex justify-between items-center ${
              derived.balance_due <= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
            }`}>
              <span className={`text-sm font-semibold ${derived.balance_due <= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                {derived.balance_due <= 0 ? "Paid in Full" : "Balance Due"}
              </span>
              <span className={`font-black text-lg ${derived.balance_due <= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                {formatCurrency(Math.max(0, derived.balance_due))}
              </span>
            </div>

            {/* Payment rows */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment History</div>
              <div className="divide-y divide-slate-50">
                {payments.map((pay, i) => (
                  <div key={pay.id || i} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 capitalize">
                        {(pay.method_label || pay.method || "cash").replace(/_/g," ")}
                      </div>
                      {pay.notes && <div className="text-xs text-slate-400 truncate">{pay.notes}</div>}
                      {pay.paid_at && (
                        <div className="text-xs text-slate-400">{format(new Date(pay.paid_at), "MMM d, yyyy")}</div>
                      )}
                    </div>
                    <span className="font-bold text-emerald-700 flex-shrink-0">{formatCurrency(pay.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setReceiptOpen(false)}>Close</Button>
              <Button onClick={handlePrintReceiptPopup} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <Printer className="w-4 h-4" />Print Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Sent Manual Dialog — only path, no selector */}
      <Dialog open={markSentOpen} onOpenChange={setMarkSentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-blue-600" />
              Mark as Sent Manually
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Use this only if the invoice was sent outside NexArtPro. No email will be sent.
            </p>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sent Date</label>
              <input type="date" value={manualSentForm.date} onChange={e => setManualSentForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Method / Channel</label>
              <div className="grid grid-cols-3 gap-1.5">
                {["email","text","printed","hand delivered","other"].map(m => (
                  <button key={m} type="button" onClick={() => setManualSentForm(f => ({ ...f, method: m }))}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-medium text-center capitalize transition-all ${manualSentForm.method === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  >{m}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (optional)</label>
              <input value={manualSentForm.note} onChange={e => setManualSentForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Handed to client at job site" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={() => setMarkSentOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkSentManual} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" />{saving ? "Saving…" : "Mark as Sent"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Email / Resend Email Dialog */}
      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-600" />
              {['sent','viewed','partial'].includes(invoice?.status) ? "Resend Invoice Email" : "Send Invoice Email"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">To</span><span className="font-medium text-slate-700">{invoice?.client_email || "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Invoice</span><span className="font-medium text-slate-700">{invoice?.invoice_number}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Amount</span><span className="font-bold text-slate-800">{formatCurrency(derived.balance_due)}</span></div>
              <div className="flex justify-between items-start gap-2"><span className="text-slate-400 flex-shrink-0">Link</span><span className="font-medium text-slate-500 text-xs truncate">{window.location.origin}/document/{invoiceId}</span></div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-700">The invoice will be marked as <strong>sent</strong> only if the email is delivered successfully.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={() => setResendOpen(false)}>Cancel</Button>
            <Button onClick={handleResend} disabled={saving} className="bg-cyan-600 text-white hover:bg-cyan-700 gap-1.5">
              <Send className="w-3.5 h-3.5" />{saving ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}