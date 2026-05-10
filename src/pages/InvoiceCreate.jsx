import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Trash2, CheckCircle, Circle, User, FileText, DollarSign } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { calcDocumentTotals, calcLineTotal, formatCurrency } from "@/utils/invoiceCalc";

const PAYMENT_TERMS_OPTIONS = ["Due on receipt","Net 7","Net 15","Net 30","Net 45","Net 60"];
const ITEM_TYPES = ["service","material","labor","fee","custom"];
const today = format(new Date(), "yyyy-MM-dd");

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
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    base44.entities.Client.list("-created_date", 200).catch(() => []).then(d => setClients(d || []));
  }, []);

  const totals = useMemo(() => calcDocumentTotals(lineItems, taxRate), [lineItems, taxRate]);
  const balanceDue = Math.max(0, totals.total);

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

  const handleCreate = async () => {
    if (!ready.client || !ready.items || !ready.total) return;
    setSaving(true);
    try {
      const payload = {
        invoice_number:   invoiceNumber,
        status:           "draft",
        payment_status:   "unpaid",
        client_id:        selectedClient.id,
        client_name:      selectedClient.full_name || selectedClient.name || "",
        client_email:     selectedClient.email || "",
        client_phone:     selectedClient.phone || "",
        client_address:   selectedClient.address || selectedClient.billing_address || "",
        line_items:       lineItems,
        subtotal:         totals.subtotal,
        tax_rate:         taxRate,
        tax_amount:       totals.tax_total,
        discount_amount:  totals.discount_total,
        total:            totals.total,
        amount_paid:      0,
        balance_due:      balanceDue,
        payments:         [],
        notes,
        due_date:         dueDate,
        payment_terms:    paymentTerms,
        created_date:     today,
      };
      const created = await base44.entities.Invoice.create(payload);
      navigate(`/invoice-detail?id=${created.id}`);
    } catch (err) {
      alert(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate("/invoices")} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-bold text-slate-900 text-base">New Invoice</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/invoices")}>Cancel</Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            onClick={handleCreate}
            disabled={saving || !ready.client || !ready.items || !ready.total}
          >
            {saving ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-2 space-y-5">

          {/* Invoice meta */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />Invoice Details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Invoice Number</label>
                <input
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  {PAYMENT_TERMS_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Global Tax Rate (%)</label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Select Client */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />Select Client
            </h2>
            <div className="relative">
              <input
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); setSelectedClient(null); }}
                onFocus={() => setShowClientDrop(true)}
                onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                placeholder="Search client by name or email…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                name="nexart-client-search"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {showClientDrop && filteredClients.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredClients.slice(0, 8).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => selectClient(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-800">{c.full_name || c.name}</div>
                      {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedClient && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {(selectedClient.full_name || selectedClient.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{selectedClient.full_name || selectedClient.name}</div>
                  <div className="text-xs text-slate-500">{selectedClient.email} {selectedClient.phone && `· ${selectedClient.phone}`}</div>
                </div>
                <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="ml-auto text-slate-400 hover:text-red-500 text-xs">✕</button>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-500" />Billable Items
              </h2>
              <Button type="button" size="sm" onClick={addItem} className="bg-blue-600 text-white gap-1.5">
                <Plus className="w-3.5 h-3.5" />Add Item
              </Button>
            </div>
            {lineItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No items. Click Add Item to begin.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                      <th className="text-left px-4 py-2.5 font-medium">Type</th>
                      <th className="text-left px-4 py-2.5 font-medium">Item / Description</th>
                      <th className="text-left px-4 py-2.5 font-medium w-20">Qty</th>
                      <th className="text-left px-4 py-2.5 font-medium w-28">Unit Price</th>
                      <th className="text-right px-4 py-2.5 font-medium w-24">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lineItems.map(li => (
                      <tr key={li.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <select
                            value={li.item_type}
                            onChange={e => updateItem(li.id, "item_type", e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                          >
                            {ITEM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={li.name}
                            onChange={e => updateItem(li.id, "name", e.target.value)}
                            placeholder="Item name"
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 mb-1"
                          />
                          <input
                            value={li.description}
                            onChange={e => updateItem(li.id, "description", e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none text-slate-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number" min="0" step="0.01"
                            value={li.quantity}
                            onChange={e => updateItem(li.id, "quantity", parseFloat(e.target.value) || 0)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number" min="0" step="0.01"
                            value={li.unit_price}
                            onChange={e => updateItem(li.id, "unit_price", parseFloat(e.target.value) || 0)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-slate-800">
                          {formatCurrency(li.line_total)}
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => removeItem(li.id)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
              <div className="w-56 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                {totals.discount_total > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(totals.discount_total)}</span></div>}
                {totals.tax_total > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(totals.tax_total)}</span></div>}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-base">
                  <span>Total</span><span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (client-facing)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Payment instructions, thank-you message, special terms…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>
        </div>

        {/* RIGHT: Single dark invoice preview panel */}
        <div
          className="rounded-[28px] p-6 shadow-2xl flex flex-col gap-4 lg:sticky lg:top-20 self-start"
          style={{ background: "linear-gradient(180deg, #0A0F1E 0%, #050A18 100%)" }}
        >
          {/* Header */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400 mb-1">
              Invoice Preview
            </div>
            <div className="text-3xl font-black text-white leading-tight">
              {selectedClient
                ? (selectedClient.full_name || selectedClient.name)
                : "Select Client"}
            </div>
            <div className="text-slate-400 text-sm mt-0.5">Manual invoice</div>
          </div>

          {/* Billable Items */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">
              Billable Items
            </div>
            {lineItems.filter(li => li.name && li.line_total > 0).length === 0 ? (
              <p className="text-slate-500 text-sm italic">No billable items yet.</p>
            ) : (
              <div className="space-y-2">
                {lineItems.filter(li => li.name && li.line_total > 0).slice(0, 5).map(li => (
                  <div key={li.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-slate-200 text-sm font-medium truncate">{li.name}</div>
                      {li.quantity > 0 && li.unit_price > 0 && (
                        <div className="text-slate-500 text-xs">{li.quantity} × {formatCurrency(li.unit_price)}</div>
                      )}
                    </div>
                    <span className="text-white text-sm font-semibold flex-shrink-0">{formatCurrency(li.line_total)}</span>
                  </div>
                ))}
                {lineItems.filter(li => li.name && li.line_total > 0).length > 5 && (
                  <div className="text-slate-500 text-xs">+{lineItems.filter(li => li.name && li.line_total > 0).length - 5} more items</div>
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Subtotal</span>
              <span className="text-white font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Tax ({taxRate.toFixed(2)}%)</span>
              <span className="text-white font-semibold">{formatCurrency(totals.tax_total)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-2.5 mt-1">
              <span className="text-slate-300 text-base font-medium">Total</span>
              <span className="text-4xl font-black text-white leading-none">{formatCurrency(totals.total)}</span>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">
              Payment Terms
            </div>
            <div className="text-slate-300 text-sm font-medium mb-1">{paymentTerms || "Net 30"}</div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Payment is due upon receipt unless otherwise agreed. Credit card payments may include processing fees when applicable.
            </p>
          </div>

          {/* Invoice Readiness */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">
              Invoice Readiness
            </div>
            <div className="space-y-2.5">
              {[
                { check: ready.client, label: "Client selected" },
                { check: ready.items,  label: "At least one billable item" },
                { check: ready.total,  label: "Total greater than $0" },
              ].map(({ check, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  {check ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 00-1 1v3a1 1 0 002 0v-3a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={`text-sm ${check ? "text-slate-200" : "text-amber-400"}`}>{label}</span>
                </div>
              ))}
              {/* Due date — optional, never blocks */}
              <div className="flex items-center gap-2.5">
                <Circle className="w-4 h-4 flex-shrink-0 text-slate-600" />
                <span className="text-sm text-slate-500">Due date (optional)</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleCreate}
              disabled={saving || readinessScore < 3}
              className="w-full h-14 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {saving ? "Creating…" : "Create Invoice"}
            </button>
            <button
              onClick={() => navigate("/invoices")}
              className="w-full h-12 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-sm rounded-2xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Invoices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}