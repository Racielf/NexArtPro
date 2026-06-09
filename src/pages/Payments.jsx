import React, { useEffect, useMemo, useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreditCard, DollarSign, ExternalLink, Link as LinkIcon, Loader2, Plus, Search, Smartphone } from 'lucide-react';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';
import { recordInvoicePayment } from '@/lib/invoicePaymentRecorder';
import { redirectToStripeCheckout } from '@/lib/stripeCheckout';
import { sendPaymentReceipt } from '@/lib/paymentReceiptAutomation';
import { downloadPaymentReceiptPdf } from '@/lib/paymentReceiptPdf';
import { useNavigate } from 'react-router-dom';

const METHODS = ['cash', 'check', 'card', 'transfer', 'other'];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getPaymentRows(invoices = []) {
  return invoices.flatMap(invoice => (invoice.payments || []).map(payment => ({
    id: `${invoice.id}-${payment.id}`,
    invoice,
    payment,
    date: payment.payment_date || payment.recorded_at,
  }))).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

export default function Payments({ fieldMode = false }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [form, setForm] = useState({ amount: '', method: 'cash', note: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const invs = await nexartClient.entities.Invoice.list('-created_date', 200).catch(() => []);
    setInvoices(invs || []);
    setLoading(false);
  };

  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);
  const selectedDerived = selectedInvoice ? computeInvoiceDerivedFields(selectedInvoice) : null;
  const paymentRows = useMemo(() => getPaymentRows(invoices), [invoices]);

  const openInvoices = invoices.filter(inv => computeInvoiceDerivedFields(inv).balance_due > 0);
  const totalCollected = paymentRows.reduce((sum, row) => sum + Number(row.payment.amount || 0), 0);
  const totalOpen = invoices.reduce((sum, inv) => sum + computeInvoiceDerivedFields(inv).balance_due, 0);

  const filteredRows = paymentRows.filter(row => {
    const q = search.toLowerCase();
    return row.invoice.client_name?.toLowerCase().includes(q)
      || String(row.invoice.invoice_number || '').includes(q)
      || row.payment.method?.toLowerCase().includes(q);
  });

  const handleSelectInvoice = (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId);
    setSelectedInvoiceId(invoiceId);
    if (inv) {
      const derived = computeInvoiceDerivedFields(inv);
      setForm(f => ({ ...f, amount: derived.balance_due ? derived.balance_due.toFixed(2) : '' }));
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) {
      toast.error('Select an invoice first');
      return;
    }

    setSubmitting(true);
    try {
      const { invoice: updatedInvoice, payment } = await recordInvoicePayment(selectedInvoice, {
        amount: form.amount,
        method: form.method,
        note: form.note || 'Recorded from Payments Center',
      }, fieldMode ? 'Field Agent' : 'Admin');

      const state = computeInvoiceDerivedFields(updatedInvoice);
      await sendPaymentReceipt({ nexartClient, invoice: updatedInvoice, payment, balanceDue: state.balance_due });
      downloadPaymentReceiptPdf({ invoice: updatedInvoice, payment, balanceDue: state.balance_due });

      setInvoices(list => list.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
      setSelectedInvoiceId('');
      setForm({ amount: '', method: 'cash', note: '' });
      toast.success('Payment recorded, receipt sent, PDF downloaded');
    } catch (err) {
      toast.error(err?.message || 'Unable to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPayLink = async () => {
    if (!selectedInvoice) {
      toast.error('Select an invoice first');
      return;
    }
    try {
      await redirectToStripeCheckout(selectedInvoice);
    } catch (err) {
      toast.error(err?.message || 'Unable to start online payment');
    }
  };

  const handleTapToPay = () => {
    toast.info('Tap to Pay requires the native field mobile app with Stripe Terminal SDK. This invoice is ready for Terminal collection.');
  };

  return (
    <div className={`${fieldMode ? 'min-h-screen bg-slate-50 p-4' : 'min-h-screen bg-[#f0f2f5] p-6'}`}>
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Payments Center</p>
            <h1 className="text-xl font-bold text-slate-900">Payments</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manual payments, online checkout, receipts and future Tap to Pay.</p>
          </div>
          {!fieldMode && (
            <Button variant="outline" onClick={() => navigate('/invoices')}>
              <ExternalLink className="w-4 h-4 mr-2" /> Invoices
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Collected" value={money(totalCollected)} tone="green" />
          <SummaryCard label="Open Balance" value={money(totalOpen)} tone="amber" />
          <SummaryCard label="Open Invoices" value={openInvoices.length} tone="blue" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Collect / Record Payment</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 font-medium block mb-1">Invoice</label>
              <select value={selectedInvoiceId} onChange={e => handleSelectInvoice(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Select open invoice...</option>
                {openInvoices.map(inv => {
                  const d = computeInvoiceDerivedFields(inv);
                  return <option key={inv.id} value={inv.id}>INV#{inv.invoice_number} - {inv.client_name} - Balance {money(d.balance_due)}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Amount</label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Method</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-xs text-slate-500 font-medium block mb-1">Note / Reference</label>
              <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional note, check #, Zelle ref, etc." />
            </div>
          </div>

          {selectedInvoice && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Selected Invoice</p>
                <p className="font-black text-slate-900">INV#{selectedInvoice.invoice_number} - {selectedInvoice.client_name}</p>
                <p className="text-sm text-slate-500">Balance due: {money(selectedDerived?.balance_due)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRecordPayment} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  <DollarSign className="w-4 h-4 mr-2" /> Record Payment
                </Button>
                <Button variant="outline" onClick={handleSendPayLink}>
                  <LinkIcon className="w-4 h-4 mr-2" /> Online Checkout
                </Button>
                <Button variant="outline" onClick={handleTapToPay}>
                  <Smartphone className="w-4 h-4 mr-2" /> Tap to Pay
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search payments by customer, invoice, method..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Customer', 'Invoice', 'Amount', 'Date', 'Method', 'Note'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400"><CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />No payments recorded yet</td></tr>
              ) : filteredRows.map(({ id, invoice, payment }) => (
                <tr key={id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{invoice.client_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">INV#{invoice.invoice_number}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{money(payment.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{payment.method || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[220px]">{payment.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  const colors = {
    green: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
  };
  return <div className={`rounded-xl border p-4 ${colors[tone] || colors.blue}`}><p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p><p className="text-2xl font-black mt-1">{value}</p></div>;
}