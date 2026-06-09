import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Trash2, CheckCircle, Circle, User, FileText, DollarSign, MailCheck, Send, CheckCheck } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calcDocumentTotals, calcLineTotal, formatCurrency } from "@/utils/invoiceCalc";
import { computeInvoiceDerivedFields } from "@/lib/invoiceHelpers";
import useCompanyConfig from "@/hooks/useCompanyConfig";
import { buildInvoiceCompanySnapshot } from "@/lib/invoiceCompanySnapshot";

const PAYMENT_TERMS_OPTIONS = ["Due on receipt","Net 7","Net 15","Net 30","Net 45","Net 60"];
const ITEM_TYPES = ["service","material","labor","fee","custom"];
const today = format(new Date(), "yyyy-MM-dd");

// buildCompanySnapshot is provided by @/lib/invoiceCompanySnapshot (buildInvoiceCompanySnapshot)

function newLineItem() {
  return {
    id: crypto.randomUUID(),
    item_type: "service",
    name: "",
    description: "",
    quantity: 1,
    unit: "each",
    unit_price: 0,
    taxable: false,
    tax_rate: 0,
    discount: 0,
    line_total: 0,
    sort_order: 0,
  };
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editInvoiceId = searchParams.get("id");
  const isEditMode    = searchParams.get("mode") === "edit" && !!editInvoiceId;
  const company = useCompanyConfig();

  const [clients, setClients]       = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [lineItems, setLineItems]   = useState([newLineItem()]);
  const [taxRate, setTaxRate]       = useState(0);
  const [notes, setNotes]           = useState("");
  const [dueDate, setDueDate]       = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [saving, setSaving]         = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(Date.now().toString().slice(-6));
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [markSentManualOpen,   setMarkSentManualOpen]   = useState(false);
  const [markSentResendOpen,   setMarkSentResendOpen]   = useState(false);
  const [manualSentForm, setManualSentForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), method: "email", note: "" });
  const [existingPayments, setExistingPayments] = useState([]);
  const [existingStatus,   setExistingStatus]   = useState(null);

  // Load clients
  useEffect(() => {
    base44.entities.Client.list("-created_date", 200).catch(() => []).then(d => setClients(d || []));
  }, []);

  // Load existing invoice in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    setLoadingEdit(true);
    base44.entities.Invoice.filter({ id: editInvoiceId })
      .then(rows => {
        const inv = rows?.[0];
        if (!inv) { setLoadingEdit(false); return; }
        setInvoiceNumber(inv.invoice_number || invoiceNumber);
        setNotes(inv.notes || "");
        setDueDate(inv.due_date || format(addDays(new Date(), 30), "yyyy-MM-dd"));
        setPaymentTerms(inv.payment_terms || "Net 30");
        setTaxRate(parseFloat(inv.tax_rate) || 0);
        // Line items: support line_items[] or groups[].items
        const items = inv.line_items?.length
          ? inv.line_items
          : (inv.groups || []).flatMap(g => g.items || []);
        setLineItems(items.length ? items : [newLineItem()]);
        // Pre-fill client display (read-only hint)
        if (inv.client_name) {
          setClientSearch(inv.client_name);
          // Reconstruct a minimal client object so selectedClient is truthy
          setSelectedClient({
            id:       inv.client_id || "",
            full_name: inv.client_name,
            email:    inv.client_email || "",
            phone:    inv.client_phone || "",
            address:  inv.client_address || "",
          });
        }
        // Store existing payments so we can recalculate derived fields on save
        setExistingPayments(Array.isArray(inv.payments) ? inv.payments : []);
        // Track status so we can guard company_snapshot refresh on save
        setExistingStatus(inv.status || null);
      })
      .catch(() => {})
      .finally(() => setLoadingEdit(false));
  }, [editInvoiceId, isEditMode]);

  const totals = useMemo(() => calcDocumentTotals(lineItems, taxRate), [lineItems, taxRate]);
  // In edit mode: recalculate derived fields using existing payments[] (never mutate payments)
  const derivedFromPayments = useMemo(() => {
    if (!isEditMode || existingPayments.length === 0) return null;
    return computeInvoiceDerivedFields({ total: totals.total, payments: existingPayments });
  }, [isEditMode, existingPayments, totals.total]);
  const balanceDue = derivedFromPayments ? derivedFromPayments.balance_due : Math.max(0, totals.total);

  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    return (c.full_name || c.name || "").toLowerCase().includes(q) ||
           (c.email || "").toLowerCase().includes(q);
  });

  const selectClient = (c) => {
    setSelectedClient(c);
    setClientSearch(c.full_name || c.name || "");
    setShowClientDrop(false);
  };

  const updateItem = (id, key, value) => {
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, [key]: value };
      updated.line_total = calcLineTotal(updated);
      return updated;
    }));
  };

  const removeItem = (id) => setLineItems(prev => prev.filter(li => li.id !== id));
  const addItem    = ()  => setLineItems(prev => [...prev, newLineItem()]);

  // Readiness
  const ready = {
    client:   !!selectedClient,
    items:    lineItems.some(li => li.name.trim() && li.line_total > 0),
    total:    totals.total > 0,
  };
  const readinessScore = Object.values(ready).filter(Boolean).length;

  const handleSave = async () => {
    if (!ready.client || !ready.items || !ready.total) return;
    setSaving(true);
    try {
      const payload = {
        invoice_number:  invoiceNumber,
        client_id:       selectedClient.id,
        client_name:     selectedClient.full_name || selectedClient.name || "",
        client_email:    selectedClient.email || "",
        client_phone:    selectedClient.phone || "",
        client_address:  selectedClient.address || selectedClient.billing_address || "",
        line_items:      lineItems,
        subtotal:        totals.subtotal,
        tax_rate:        taxRate,
        tax_amount:      totals.tax_total,
        discount_amount: totals.discount_total,
        total:           totals.total,
        balance_due:     balanceDue,
        notes,
        due_date:        dueDate,
        payment_terms:   paymentTerms,
        // Refresh snapshot only for draft invoices — preserve for sent/paid/void
        ...( !isEditMode || ['draft', null, undefined, ''].includes(existingStatus)
          ? { company_snapshot: buildInvoiceCompanySnapshot(company) }
          : {} ),
      };
      if (isEditMode) {
        // UPDATE — preserve payments[], status, and other existing fields
        await base44.entities.Invoice.update(editInvoiceId, payload);
        navigate(`/invoice-detail?id=${editInvoiceId}`);
      } else {
        // CREATE
        const created = await base44.entities.Invoice.create({
          ...payload,
          status:         "draft",
          payment_status: "unpaid",
          amount_paid:    0,
          payments:       [],
          created_date:   today,
        });
        navigate(`/invoice-detail?id=${created.id}`);
      }
    } catch (err) {
      alert(err?.message || (isEditMode ? "Failed to update invoice" : "Failed to create invoice"));
    } finally {
      setSaving(false);
    }
  };

  // ---- helpers ----
  function buildInvoicePayload() {
    // Recalculate derived fields from existing payments (never modify payments[] itself)
    const derived = derivedFromPayments || { amount_paid: 0, balance_due: Math.max(0, totals.total), payment_status: "unpaid" };
    return {
      invoice_number:  invoiceNumber,
      client_id:       selectedClient.id,
      client_name:     selectedClient.full_name || selectedClient.name || "",
      client_email:    selectedClient.email || "",
      client_phone:    selectedClient.phone || "",
      client_address:  selectedClient.address || selectedClient.billing_address || "",
      line_items:      lineItems,
      subtotal:        totals.subtotal,
      tax_rate:        taxRate,
      tax_amount:      totals.tax_total,
      discount_amount: totals.discount_total,
      total:           totals.total,
      // Recalculated from payments[] — NOT from UI input
      amount_paid:     derived.amount_paid,
      balance_due:     derived.balance_due,
      payment_status:  derived.payment_status,
      notes,
      due_date:        dueDate,
      payment_terms:   paymentTerms,
      // buildInvoicePayload is only called from edit-mode send helpers (draft context)
      company_snapshot: buildInvoiceCompanySnapshot(company),
    };
  }

  async function saveInvoiceChangesOnly() {
    const payload = buildInvoicePayload();
    await base44.entities.Invoice.update(editInvoiceId, payload);
    return payload;
  }

  async function markSavedInvoiceSent({ source, sentAt, optionalPatch = {} }) {
    const criticalPatch = { status: "sent", sent_at: sentAt, sent_source: source };
    await base44.entities.Invoice.update(editInvoiceId, criticalPatch);
    if (Object.keys(optionalPatch).length > 0) {
      await base44.entities.Invoice.update(editInvoiceId, optionalPatch)
        .catch(err => console.warn("[InvoiceCreate] optional sent metadata failed:", err?.message || err));
    }
  }
  // ---- end helpers ----

  // Save & Mark Sent Manual (called from manual modal confirm)
  const handleSaveAndMarkSent = async () => {
    if (!isEditMode || !ready.client || !ready.items || !ready.total) return;
    setSaving(true);
    try {
      await saveInvoiceChangesOnly();
      const sentAt = manualSentForm.date ? new Date(manualSentForm.date).toISOString() : new Date().toISOString();
      await markSavedInvoiceSent({
        source: "manual",
        sentAt,
        optionalPatch: {
          sent_manually: true,
          sent_method: manualSentForm.method || null,
          manual_sent_note: manualSentForm.note.trim() || null,
          last_contacted_at: sentAt,
        },
      });
      navigate(`/invoice-detail?id=${editInvoiceId}`);
    } catch (err) {
      alert(err?.message || "Failed to save and mark sent");
    } finally {
      setSaving(false);
    }
  };

  // Save & Send via Resend (called from resend modal confirm)
  const handleSaveAndResend = async () => {
    if (!isEditMode || !ready.client || !ready.items || !ready.total) return;
    const email = selectedClient?.email;
    if (!email) { alert("Client email is required."); return; }
    setSaving(true);
    try {
      // 1. Save
      await saveInvoiceChangesOnly();
      // 2. Email first
      const emailResult = await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Invoice ${invoiceNumber} — Payment Due`,
        body: `Hi ${selectedClient.full_name || selectedClient.name || ""},\n\nPlease find your invoice ${invoiceNumber}.\n\nTotal Due: $${totals.total.toFixed(2)}${dueDate ? `\nDue: ${format(new Date(dueDate), "MMM d, yyyy")}` : ""}\n\nThank you!`,
      });
      // 3. Mark sent only after email success
      const now = new Date().toISOString();
      await markSavedInvoiceSent({
        source: "resend",
        sentAt: now,
        optionalPatch: {
          resend_message_id: emailResult?.id || emailResult?.data?.id || null,
          resend_status: emailResult?.status || emailResult?.data?.status || "sent",
          last_contacted_at: now,
        },
      });
      navigate(`/invoice-detail?id=${editInvoiceId}`);
    } catch (err) {
      alert(err?.message || "Failed to save and send");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {loadingEdit && (<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>)}
      {!loadingEdit && (<>

      {/* Top bar — 48px compact */}
      <div className="bg-white border-b border-slate-200 px-4 h-12 flex items-center gap-2.5 sticky top-0 z-10">
        <button onClick={() => isEditMode ? navigate(`/invoice-detail?id=${editInvoiceId}`) : navigate("/invoices")} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 flex-shrink-0"><ArrowLeft className="w-4 h-4" /></button>
        <h1 className="font-semibold text-slate-800 text-sm">{isEditMode ? "Edit Invoice" : "New Invoice"}</h1>
        {isEditMode && <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">{invoiceNumber}</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => isEditMode ? navigate(`/invoice-detail?id=${editInvoiceId}`) : navigate("/invoices")}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={handleSave} disabled={saving || !ready.client || !ready.items || !ready.total}>
            {saving ? (isEditMode ? "Saving…" : "Creating…") : (isEditMode ? "Save Changes" : "Create Invoice")}
          </Button>
        </div>
      </div>

      {/* Workspace */}
      <div className="max-w-6xl mx-auto px-4 py-5 grid gap-5" style={{ gridTemplateColumns: "1fr 260px" }}>

        {/* LEFT */}
        <div className="min-w-0 space-y-3">

          {/* Invoice meta */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-500" />Invoice Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="block text-[11px] font-medium text-slate-500 mb-1">Invoice #</label><input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="block text-[11px] font-medium text-slate-500 mb-1">Terms</label><select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">{PAYMENT_TERMS_OPTIONS.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="block text-[11px] font-medium text-slate-500 mb-1">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="block text-[11px] font-medium text-slate-500 mb-1">Tax (%)</label><input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-500" />Client</h2>
            <div className="relative">
              <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); setSelectedClient(null); }} onFocus={() => setShowClientDrop(true)} onBlur={() => setTimeout(() => setShowClientDrop(false), 150)} placeholder="Search by name or email…" autoComplete="off" autoCorrect="off" spellCheck="false" name="nexart-client-search" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              {showClientDrop && filteredClients.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.slice(0, 8).map(c => (<button key={c.id} type="button" onMouseDown={() => selectClient(c)} className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"><div className="text-sm font-medium text-slate-800">{c.full_name || c.name}</div>{c.email && <div className="text-xs text-slate-400">{c.email}</div>}</button>))}
                </div>
              )}
            </div>
            {selectedClient && (
              <div className="mt-2.5 flex items-center gap-2.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-7 h-7 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">{(selectedClient.full_name || selectedClient.name || "?")[0].toUpperCase()}</div>
                <div className="min-w-0"><div className="text-sm font-semibold text-slate-800 truncate">{selectedClient.full_name || selectedClient.name}</div><div className="text-xs text-slate-500 truncate">{selectedClient.email}{selectedClient.phone && ` \u00b7 ${selectedClient.phone}`}</div></div>
                <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="ml-auto text-slate-400 hover:text-red-500 text-xs flex-shrink-0">✕</button>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-blue-500" />Billable Items</h2>
              <Button type="button" size="sm" onClick={addItem} className="h-7 text-xs bg-blue-600 text-white gap-1 px-2.5"><Plus className="w-3 h-3" />Add Item</Button>
            </div>
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No items. Click Add Item to begin.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wide"><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Item / Description</th><th className="text-left px-3 py-2 w-16">Qty</th><th className="text-left px-3 py-2 w-24">Price</th><th className="text-right px-3 py-2 w-20">Total</th><th className="w-8" /></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {lineItems.map(li => (
                      <tr key={li.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2"><select value={li.item_type} onChange={e => updateItem(li.id, "item_type", e.target.value)} className="text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white focus:outline-none">{ITEM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></td>
                        <td className="px-3 py-2"><input value={li.name} onChange={e => updateItem(li.id, "name", e.target.value)} placeholder="Item name" className="w-full text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 mb-1" /><input value={li.description} onChange={e => updateItem(li.id, "description", e.target.value)} placeholder="Description (optional)" className="w-full text-xs border border-slate-100 rounded-md px-2 py-1 focus:outline-none text-slate-400 bg-slate-50" /></td>
                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={li.quantity} onChange={e => updateItem(li.id, "quantity", parseFloat(e.target.value) || 0)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none" /></td>
                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={li.unit_price} onChange={e => updateItem(li.id, "unit_price", parseFloat(e.target.value) || 0)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none" /></td>
                        <td className="px-3 py-2 text-sm font-semibold text-right text-slate-800">{formatCurrency(li.line_total)}</td>
                        <td className="px-2 py-2"><button type="button" onClick={() => removeItem(li.id)} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <div className="w-52 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500 text-xs"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                {totals.discount_total > 0 && <div className="flex justify-between text-emerald-600 text-xs"><span>Discount</span><span>-{formatCurrency(totals.discount_total)}</span></div>}
                {totals.tax_total > 0 && <div className="flex justify-between text-slate-500 text-xs"><span>Tax ({taxRate}%)</span><span>{formatCurrency(totals.tax_total)}</span></div>}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 text-sm"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes (client-facing)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Payment instructions, thank-you message, special terms…" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          </div>
        </div>

        {/* RIGHT: dark sidebar 260px */}
        <div className="rounded-2xl p-4 shadow-xl flex flex-col gap-3 lg:sticky lg:top-14 self-start" style={{ background: "linear-gradient(180deg, #0A0F1E 0%, #050A18 100%)" }}>
          <div className="pb-3 border-b border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-400 mb-0.5">{isEditMode ? "Edit Mode" : "New Invoice"}</div>
            <div className="text-base font-bold text-white leading-tight truncate">{selectedClient ? (selectedClient.full_name || selectedClient.name) : <span className="text-slate-500">No client</span>}</div>
            {invoiceNumber && <div className="text-xs font-mono text-slate-500 mt-0.5">#{invoiceNumber}</div>}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Items</div>
            {lineItems.filter(li => li.name && li.line_total > 0).length === 0 ? (
              <p className="text-slate-600 text-xs italic">No billable items yet.</p>
            ) : (
              <div className="space-y-1.5">
                {lineItems.filter(li => li.name && li.line_total > 0).slice(0, 4).map(li => (
                  <div key={li.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="text-slate-300 text-xs font-medium truncate">{li.name}</div>{li.quantity > 0 && li.unit_price > 0 && <div className="text-slate-600 text-[10px]">{li.quantity} × {formatCurrency(li.unit_price)}</div>}</div>
                    <span className="text-white text-xs font-semibold flex-shrink-0">{formatCurrency(li.line_total)}</span>
                  </div>
                ))}
                {lineItems.filter(li => li.name && li.line_total > 0).length > 4 && <div className="text-slate-600 text-[10px]">+{lineItems.filter(li => li.name && li.line_total > 0).length - 4} more</div>}
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Subtotal</span><span className="text-slate-300 text-xs font-medium">{formatCurrency(totals.subtotal)}</span></div>
            {taxRate > 0 && <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Tax ({taxRate}%)</span><span className="text-slate-300 text-xs font-medium">{formatCurrency(totals.tax_total)}</span></div>}
            <div className="flex justify-between items-center border-t border-white/10 pt-1.5"><span className="text-slate-400 text-sm font-medium">Total</span><span className="text-2xl font-black text-white leading-none">{formatCurrency(totals.total)}</span></div>
          </div>

          <div className="space-y-1.5">
            {[{ check: ready.client, label: "Client selected" }, { check: ready.items, label: "Billable item added" }, { check: ready.total, label: "Total > $0" }].map(({ check, label }) => (
              <div key={label} className="flex items-center gap-2">
                {check ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />}
                <span className={`text-xs ${check ? "text-emerald-400" : "text-amber-400"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1 border-t border-white/10">
            <button onClick={handleSave} disabled={saving || readinessScore < 3} className="w-full h-10 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {saving ? (isEditMode ? "Saving…" : "Creating…") : (isEditMode ? "Save Changes" : "Create Invoice")}
            </button>
            {isEditMode && (<>
              <button onClick={() => { if (saving || readinessScore < 3) return; setMarkSentResendOpen(true); }} disabled={saving || readinessScore < 3 || !selectedClient?.email} className="w-full h-9 flex items-center justify-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-300 font-medium text-xs rounded-xl transition-colors border border-cyan-500/20"><Send className="w-3.5 h-3.5" />Save &amp; Send Email</button>
              <button onClick={() => { if (saving || readinessScore < 3) return; setMarkSentManualOpen(true); }} disabled={saving || readinessScore < 3} className="w-full h-9 flex items-center justify-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-blue-300 font-medium text-xs rounded-xl transition-colors border border-blue-500/20"><MailCheck className="w-3.5 h-3.5" />Save &amp; Mark Sent</button>
            </>)}
            <button onClick={() => isEditMode ? navigate(`/invoice-detail?id=${editInvoiceId}`) : navigate("/invoices")} className="w-full h-8 flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-400 font-medium text-xs transition-colors"><ArrowLeft className="w-3.5 h-3.5" />{isEditMode ? "Cancel edit" : "Back to Invoices"}</button>
          </div>
        </div>
      </div>
      </>)}

      <Dialog open={markSentManualOpen} onOpenChange={setMarkSentManualOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm"><CheckCheck className="w-4 h-4 text-blue-600" />Mark as Sent Manually</DialogTitle><p className="text-xs text-slate-400">No email sent. Use when invoice was delivered outside NexArtPro.</p></DialogHeader>
          <div className="space-y-3 pt-1">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Sent Date</label><input type="date" value={manualSentForm.date} onChange={e => setManualSentForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Method</label><div className="grid grid-cols-3 gap-1.5">{["email","text","printed","hand delivered","other"].map(m => (<button key={m} type="button" onClick={() => setManualSentForm(f => ({ ...f, method: m }))} className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium text-center capitalize transition-all ${manualSentForm.method === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{m}</button>))}</div></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Note (optional)</label><input value={manualSentForm.note} onChange={e => setManualSentForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Handed to client at job site" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" /></div>
          </div>
          <div className="flex gap-2 justify-end pt-1"><Button variant="outline" size="sm" onClick={() => setMarkSentManualOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSaveAndMarkSent} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5"><CheckCheck className="w-3.5 h-3.5" />{saving ? "Saving…" : "Confirm Sent"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={markSentResendOpen} onOpenChange={setMarkSentResendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm"><Send className="w-4 h-4 text-cyan-600" />Send via Resend</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5"><div className="flex justify-between"><span className="text-slate-400 text-xs">To</span><span className="font-medium text-slate-700 text-xs">{selectedClient?.email || "—"}</span></div><div className="flex justify-between"><span className="text-slate-400 text-xs">Invoice</span><span className="font-medium text-slate-700 text-xs">{invoiceNumber}</span></div><div className="flex justify-between"><span className="text-slate-400 text-xs">Amount</span><span className="font-bold text-slate-800 text-xs">{formatCurrency(totals.total)}</span></div></div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2"><p className="text-xs text-amber-700">Changes saved first. Status marked <strong>sent</strong> only if email succeeds.</p></div>
          </div>
          <div className="flex gap-2 justify-end pt-1"><Button variant="outline" size="sm" onClick={() => setMarkSentResendOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSaveAndResend} disabled={saving} className="bg-cyan-600 text-white hover:bg-cyan-700 gap-1.5"><Send className="w-3.5 h-3.5" />{saving ? "Sending…" : "Send"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

