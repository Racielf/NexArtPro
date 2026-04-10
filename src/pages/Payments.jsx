import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const METHODS = ['cash', 'check', 'card', 'bank_transfer', 'zelle', 'venmo', 'other'];

export default function Payments() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [pmts, invs] = await Promise.all([
      base44.entities.Payment.list('-created_date'),
      base44.entities.Invoice.list('-created_date', 100),
    ]);
    setPayments(pmts);
    setInvoices(invs);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.invoice_id || !form.amount) { toast.error('Invoice and amount are required'); return; }
    setSubmitting(true);
    const inv = invoices.find(i => i.id === form.invoice_id);
    const amount = parseFloat(form.amount);

    await base44.entities.Payment.create({
      invoice_id: form.invoice_id,
      invoice_number: inv?.invoice_number,
      client_name: inv?.client_name || '',
      amount,
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      notes: form.notes,
    });

    const newAmountPaid = (inv?.amount_paid || 0) + amount;
    const newStatus = newAmountPaid >= (inv?.total || 0) ? 'paid' : inv?.status;
    await base44.entities.Invoice.update(form.invoice_id, {
      amount_paid: newAmountPaid,
      status: newStatus,
      ...(newStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
    });

    toast.success('Payment recorded');
    setForm({ invoice_id: '', amount: '', payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0], notes: '' });
    setShowForm(false);
    loadData();
    setSubmitting(false);
  };

  const filtered = payments.filter(p =>
    p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.invoice_number || '').includes(search)
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payments</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track payments received from clients</p>
          </div>
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New Payment
          </Button>
        </div>

        {/* New Payment Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Record Payment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Invoice *</label>
                <select
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.invoice_id}
                  onChange={e => setForm(f => ({ ...f, invoice_id: e.target.value }))}
                >
                  <option value="">Select invoice…</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      INV#{inv.invoice_number} — {inv.client_name} (${(inv.total || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Amount *</label>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Method</label>
                <select
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                >
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Date</label>
                <Input type="date" value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 font-medium block mb-1">Notes</label>
                <Input placeholder="Optional notes…" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving…' : 'Record Payment'}
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by customer or invoice…" className="pl-9"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Customer', 'Invoice', 'Amount', 'Date', 'Method', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No payments recorded yet</p>
                    <p className="text-slate-300 text-xs mt-1">Click "New Payment" to add one</p>
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.client_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.invoice_number ? `INV#${p.invoice_number}` : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">${(p.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.payment_date || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{p.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[150px]">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}