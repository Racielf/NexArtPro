import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { getNextDocumentNumber } from '@/lib/documentNumbering';
import { toast } from 'sonner';
import { ArrowLeft, FilePlus2, Plus, Receipt, Trash2 } from 'lucide-react';

function money(value) {
  return Number(value || 0);
}

function newItem() {
  return {
    id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
  };
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    title: '',
    due_date: '',
    tax_rate: 0,
    notes: '',
    payment_terms: 'Payment is due upon receipt unless otherwise agreed. Credit card payments may include processing fees when applicable.',
  });
  const [items, setItems] = useState([newItem()]);

  const totals = useMemo(() => {
    const normalizedItems = items.map(item => {
      const quantity = money(item.quantity);
      const unit_price = money(item.unit_price);
      const line_total = quantity * unit_price;
      return {
        ...item,
        service_name: item.name,
        quantity,
        unit_price,
        line_total,
        total_price: line_total,
      };
    });
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);
    const tax_rate = money(form.tax_rate);
    const tax_amount = subtotal * (tax_rate / 100);
    const total = subtotal + tax_amount;
    return { normalizedItems, subtotal, tax_rate, tax_amount, total };
  }, [items, form.tax_rate]);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updateItem = (id, key, value) => setItems(prev => prev.map(item => item.id === id ? { ...item, [key]: value } : item));
  const removeItem = (id) => setItems(prev => prev.length === 1 ? prev : prev.filter(item => item.id !== id));

  const handleCreate = async () => {
    if (!form.client_name.trim()) {
      toast.error('Client name is required');
      return;
    }

    const validItems = totals.normalizedItems.filter(item => item.service_name?.trim() && item.line_total > 0);
    if (!validItems.length) {
      toast.error('Add at least one billable item');
      return;
    }

    setSaving(true);
    try {
      const invoice_number = await getNextDocumentNumber('invoice');
      const invoice = await base44.entities.Invoice.create({
        invoice_number,
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim(),
        client_phone: form.client_phone.trim(),
        client_address: form.client_address.trim(),
        title: form.title.trim() || `Invoice #${invoice_number}`,
        status: 'draft',
        due_date: form.due_date || '',
        line_items: validItems,
        groups: [{
          id: `group-${Date.now()}`,
          name: 'Services',
          items: validItems,
        }],
        subtotal: totals.subtotal,
        tax_rate: totals.tax_rate,
        tax_amount: totals.tax_amount,
        discount_type: 'fixed',
        discount_value: 0,
        discount_amount: 0,
        total: totals.total,
        amount_paid: 0,
        balance_due: totals.total,
        payment_status: 'unpaid',
        payments: [],
        notes: form.notes,
        payment_terms: form.payment_terms,
        company_id: 'rc-art',
      });

      toast.success(`Invoice #${invoice_number} created`);
      navigate(`/invoice-detail?id=${invoice.id}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      <PageHeader
        title="Create Invoice"
        subtitle="Create a clean invoice manually and send or collect payment after review."
      />
      <PageShell>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h2 className="font-black text-slate-900">Client & Invoice Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Client Name *"><Input value={form.client_name} onChange={e => updateForm('client_name', e.target.value)} placeholder="Customer / company name" /></Field>
                <Field label="Invoice Title"><Input value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder="e.g. Final painting invoice" /></Field>
                <Field label="Email"><Input value={form.client_email} onChange={e => updateForm('client_email', e.target.value)} placeholder="client@email.com" /></Field>
                <Field label="Phone"><Input value={form.client_phone} onChange={e => updateForm('client_phone', e.target.value)} placeholder="(503) 000-0000" /></Field>
                <Field label="Address"><Input value={form.client_address} onChange={e => updateForm('client_address', e.target.value)} placeholder="Project / billing address" /></Field>
                <Field label="Due Date"><Input type="date" value={form.due_date} onChange={e => updateForm('due_date', e.target.value)} /></Field>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-black text-slate-900">Billable Items</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Simple invoice lines. Use estimates/work orders for detailed scope.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, newItem()])}>
                  <Plus className="w-4 h-4 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-[1fr_90px_120px_38px] gap-3 items-end">
                    <Field label={`Service ${idx + 1}`}>
                      <Input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Service name" />
                    </Field>
                    <Field label="Qty"><Input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} /></Field>
                    <Field label="Unit Price"><Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)} /></Field>
                    <button onClick={() => removeItem(item.id)} className="h-10 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="md:col-span-4">
                      <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Optional description" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tax Rate %"><Input type="number" min="0" step="0.01" value={form.tax_rate} onChange={e => updateForm('tax_rate', e.target.value)} /></Field>
              <Field label="Payment Terms"><Input value={form.payment_terms} onChange={e => updateForm('payment_terms', e.target.value)} /></Field>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Optional customer-facing notes" className="w-full min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-6 h-fit bg-slate-950 text-white rounded-3xl shadow-2xl p-6 space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Invoice Preview</p>
              <h3 className="text-2xl font-black mt-1">{form.client_name || 'Client Name'}</h3>
              <p className="text-sm text-slate-400 mt-1">{form.title || 'Manual invoice'}</p>
            </div>

            <div className="space-y-3 rounded-2xl bg-white/5 border border-white/10 p-4">
              <Row label="Subtotal" value={money(totals.subtotal).toFixed(2)} />
              <Row label={`Tax (${money(totals.tax_rate).toFixed(2)}%)`} value={money(totals.tax_amount).toFixed(2)} />
              <div className="h-px bg-white/10" />
              <Row label="Total" value={money(totals.total).toFixed(2)} strong />
            </div>

            <div className="space-y-2">
              <Button onClick={handleCreate} disabled={saving} className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black">
                <FilePlus2 className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Invoice'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/invoices')} className="w-full h-11 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
              </Button>
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">{label}</label>{children}</div>;
}

function Row({ label, value, strong }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><span className={strong ? 'text-2xl font-black' : 'font-bold'}>${value}</span></div>;
}
