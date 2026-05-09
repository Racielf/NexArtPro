import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileCheck,
  MapPin,
  Printer,
  Receipt,
  Send,
  Settings2,
} from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/shared/StatusBadge';
import PaymentInputModal from '@/components/invoices/PaymentInputModal';
import PaymentHistory from '@/components/invoices/PaymentHistory';
import QuickContactActions from '@/components/invoices/QuickContactActions';
import PaymentReceiptPreviewModal from '@/components/payments/PaymentReceiptPreviewModal';
import { buildReceipt } from '@/components/payments/paymentReceiptUtils';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { normalizeLineItem } from '@/lib/lineItemNormalizer';
import { evaluateWorkOrderEvidence } from '@/lib/workOrderEvidence';
import { getInvoiceNextAction } from '@/lib/nextActionLogic';
import { buildTimelineEvent, appendCollectionTimelineEvent } from '@/lib/invoiceCollectionTimeline';
import { markInvoiceContacted, getLastContactedDisplay } from '@/lib/invoiceActionHelpers';
import { markInvoicePaid } from '@/lib/invoicePaymentRecorder';
import InvoiceVisibilityPanel, { getInvoiceViewSettings } from '@/components/invoices/InvoiceVisibilityPanel';
import { useAuth } from '@/lib/AuthContext';

export default function InvoiceDetailClean() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const invoiceId = new URLSearchParams(window.location.search).get('id');

  const [invoice, setInvoice] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [evidenceEval, setEvidenceEval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);
  const [previousBalance, setPreviousBalance] = useState(0);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPreviousBalance(0);
    const list = await base44.entities.Invoice.filter({ id: invoiceId });
    const inv = list?.[0];

    if (inv) {
      setInvoice(inv);
      setNotes(inv.notes || '');
      setDueDate(inv.due_date || '');

      if (inv.client_id) {
        try {
          const clientInvoices = await base44.entities.Invoice.filter({ client_id: inv.client_id });
          const clientPreviousBalance = (clientInvoices || [])
            .filter(otherInvoice => otherInvoice.id !== inv.id)
            .reduce((sum, otherInvoice) => {
              const otherDerived = computeInvoiceDerivedFields(otherInvoice);
              if (otherDerived.payment_status === 'paid') return sum;
              return sum + otherDerived.balance_due;
            }, 0);
          setPreviousBalance(clientPreviousBalance);
        } catch (err) {
          console.warn('[InvoiceDetailClean] Client balance load failed:', err?.message);
        }
      }

      if (inv.work_order_id) {
        try {
          const woList = await base44.entities.WorkOrder.filter({ id: inv.work_order_id });
          const wo = woList?.[0];
          if (wo) {
            const photos = await base44.entities.ProjectPhoto.filter({ work_order_id: inv.work_order_id });
            const enriched = { ...wo, photos_count: photos?.length || 0 };
            setWorkOrder(enriched);
            setEvidenceEval(evaluateWorkOrderEvidence(enriched));
          }
        } catch (err) {
          console.warn('[InvoiceDetailClean] WorkOrder load failed:', err?.message);
        }
      }
    }

    setLoading(false);
  };

  const derived = useMemo(() => computeInvoiceDerivedFields(invoice), [invoice]);
  const viewSettings = useMemo(() => getInvoiceViewSettings(invoice), [invoice]);
  const isPaid = derived.payment_status === 'paid';
  const isPartial = derived.payment_status === 'partial';
  const overdue = isInvoiceOverdue(invoice);
  const nextAction = getInvoiceNextAction(invoice);
  const currentInvoiceTotal = invoice?.total || 0;
  const totalOwed = previousBalance + derived.balance_due;

  const allItems = useMemo(() => {
    if (!invoice) return [];
    const raw = invoice.groups?.flatMap(group => group.items || []) || invoice.line_items || [];
    return raw.map(normalizeLineItem);
  }, [invoice]);

  const receipt = invoice ? buildReceipt(invoice, {
    payment_method: invoice.payment_method || 'cash',
    previous_balance: invoice.total,
    amount_paid: derived.amount_paid,
  }) : null;

  const saveInvoicePatch = async (patch, successMessage) => {
    setSaving(true);
    await base44.entities.Invoice.update(invoiceId, patch);
    setInvoice(prev => ({ ...prev, ...patch }));
    setSaving(false);
    if (successMessage) toast.success(successMessage);
  };

  const handleViewSettingChange = async (key, value) => {
    const updated = { ...viewSettings, [key]: value };
    await saveInvoicePatch({ view_settings: updated });
  };

  const handleSaveNotes = async () => {
    await saveInvoicePatch({ notes, due_date: dueDate }, 'Invoice updated');
  };

  const handleSend = async () => {
    if (!invoice.client_email) {
      toast.error('Client email required');
      return;
    }

    if (workOrder && evidenceEval && !evidenceEval.isComplete) {
      if (!confirm('This invoice is linked to a work order with incomplete execution evidence. Send anyway?')) return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    await base44.entities.Invoice.update(invoiceId, { status: 'sent', sent_at: now, last_contacted_at: now });
    await base44.integrations.Core.SendEmail({
      to: invoice.client_email,
      subject: `Invoice #${invoice.invoice_number} - Payment Due`,
      body: `Hi ${invoice.client_name},\n\nPlease find your invoice #${invoice.invoice_number}.\n\nTotal Due: $${(invoice.total || 0).toFixed(2)}${dueDate ? `\nDue Date: ${dueDate}` : ''}\n\nThank you for your business!`,
    });
    setInvoice(prev => ({ ...prev, status: 'sent', sent_at: now, last_contacted_at: now }));
    setSaving(false);
    toast.success('Invoice sent to client');
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    try {
      const { updates } = await markInvoicePaid(invoice, actor, 'Marked as paid');
      setInvoice(prev => ({ ...prev, ...updates }));
      toast.success('Invoice marked as paid');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkContacted = async () => {
    await markInvoiceContacted(invoiceId, base44);
    const timelineEvent = buildTimelineEvent('client_contacted', actor);
    const timeline = appendCollectionTimelineEvent(invoice, timelineEvent);
    setInvoice(prev => ({ ...prev, last_contacted_at: new Date().toISOString(), collection_timeline: timeline }));
    toast.success('Marked as contacted');
  };

  const handlePrint = () => {
    const lineRows = allItems.map(item => `
      <tr>
        <td><strong>${item.service_name || item.name || ''}</strong>${item.description ? `<br><small>${item.description}</small>` : ''}</td>
        <td>${item.quantity || ''}</td>
        <td>$${(item.unit_price || 0).toFixed(2)}</td>
        <td>$${(item.line_total || item.total_price || 0).toFixed(2)}</td>
      </tr>`).join('');

    const content = `<html><head><title>Invoice #${invoice.invoice_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#111}.muted{color:#64748b}h1{margin-bottom:0}table{width:100%;border-collapse:collapse;margin:24px 0}th{background:#0f172a;color:white;padding:10px;text-align:left}td{padding:10px;border-bottom:1px solid #eee}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0}.box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}.total{font-size:20px;font-weight:bold}
      </style></head><body>
      <div style="display:flex;justify-content:space-between"><div><h1>INVOICE</h1><p class="muted">#${invoice.invoice_number}</p></div><strong>R.C Art Construction</strong></div>
      <div class="grid"><div class="box"><p class="muted"><strong>BILL TO</strong></p><p><strong>${invoice.client_name}</strong></p>${viewSettings.show_client_address && invoice.client_address ? `<p>${invoice.client_address}</p>` : ''}${viewSettings.show_client_phone && invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ''}${viewSettings.show_client_email && invoice.client_email ? `<p>${invoice.client_email}</p>` : ''}</div><div class="box"><p>Invoice #: <strong>${invoice.invoice_number}</strong></p><p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>${invoice.due_date ? `<p>Due: <strong>${invoice.due_date}</strong></p>` : ''}<p>Status: <strong>${derived.payment_status.toUpperCase()}</strong></p></div></div>
      <table><thead><tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${lineRows}</tbody></table>
      <div style="text-align:right"><p>Subtotal: $${(invoice.subtotal || 0).toFixed(2)}</p>${invoice.discount_amount > 0 ? `<p>Discount: -$${(invoice.discount_amount || 0).toFixed(2)}</p>` : ''}${viewSettings.show_tax && invoice.tax_rate > 0 ? `<p>Tax (${invoice.tax_rate}%): $${(invoice.tax_amount || 0).toFixed(2)}</p>` : ''}<p class="total">TOTAL: $${(invoice.total || 0).toFixed(2)}</p><p>Paid: $${derived.amount_paid.toFixed(2)}</p><p>Balance Due: $${derived.balance_due.toFixed(2)}</p></div>
      <div class="box"><strong>Account Summary</strong><p>Previous Balance: $${previousBalance.toFixed(2)}</p><p>This Invoice: $${currentInvoiceTotal.toFixed(2)}</p><p>Payments: -$${derived.amount_paid.toFixed(2)}</p><p><strong>Total Owed: $${totalOwed.toFixed(2)}</strong></p></div>
      ${viewSettings.show_notes && invoice.notes ? `<div class="box"><strong>Notes</strong><p>${invoice.notes}</p></div>` : ''}
      ${viewSettings.show_terms && invoice.payment_terms ? `<div class="box"><strong>Payment Terms</strong><p>${invoice.payment_terms}</p></div>` : ''}
      </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(content);
    win.document.close();
    win.print();
  };

  if (loading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-white z-50"><div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!invoice) {
    return <div className="fixed inset-0 flex items-center justify-center bg-white z-50"><div className="text-center"><p className="text-slate-500 mb-4">Invoice not found</p><Button onClick={() => navigate('/invoices')}>Back to Invoices</Button></div></div>;
  }

  return (
    <>
      {receiptModal && receipt && <PaymentReceiptPreviewModal receipt={receipt} onClose={() => setReceiptModal(false)} />}
      <PaymentInputModal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} invoice={invoice} onPaymentAdded={(updates) => setInvoice(prev => ({ ...prev, ...updates }))} />

      <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 overflow-hidden">
        <div className="bg-white border-b border-slate-200 flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
            <div>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" />Invoice #{invoice.invoice_number}</p>
              <p className="text-xs text-slate-400">{invoice.client_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={isPaid ? 'paid' : isPartial ? 'partial' : invoice.status} />
            <Button size="sm" variant="outline" onClick={() => setShowCustomize(prev => !prev)}><Settings2 className="w-3.5 h-3.5 mr-1" />Customize</Button>
            <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-3.5 h-3.5 mr-1" />Print</Button>
            {derived.payment_status !== 'unpaid' && <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 gap-1.5" onClick={() => setReceiptModal(true)}><FileCheck className="w-3.5 h-3.5" />Receipt</Button>}
            {invoice.status === 'draft' && <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50" onClick={handleSend} disabled={saving}><Send className="w-3.5 h-3.5 mr-1" />Send</Button>}
            {invoice.status === 'sent' && !isPaid && <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid} disabled={saving}><CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Paid</Button>}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-[320px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
            <section className={`px-5 py-5 border-b border-slate-100 ${isPaid ? 'bg-emerald-50' : overdue ? 'bg-red-50' : 'bg-slate-50'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Invoice</p>
              <p className="text-3xl font-bold text-slate-900">${currentInvoiceTotal.toFixed(2)}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white rounded-lg px-3 py-2 border border-slate-200"><p className="text-[10px] text-slate-400">Paid</p><p className="text-sm font-bold text-emerald-600">${derived.amount_paid.toFixed(2)}</p></div>
                <div className="bg-white rounded-lg px-3 py-2 border border-slate-200"><p className="text-[10px] text-slate-400">Balance</p><p className="text-sm font-bold text-slate-900">${derived.balance_due.toFixed(2)}</p></div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Summary</p>
                <SummaryMini label="Previous Balance" value={previousBalance} />
                <SummaryMini label="This Invoice" value={currentInvoiceTotal} />
                <SummaryMini label="Payments" value={-derived.amount_paid} />
                <div className="h-px bg-slate-200 my-1.5" />
                <SummaryMini label="Total Owed" value={totalOwed} strong />
              </div>
              {invoice.due_date && <p className={`text-xs font-medium flex items-center gap-1.5 mt-3 ${overdue ? 'text-red-600' : 'text-slate-500'}`}><Clock className="w-3.5 h-3.5" />Due {invoice.due_date}</p>}
              {!isPaid && <button onClick={() => setPaymentModalOpen(true)} className="w-full mt-3 bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"><DollarSign className="w-4 h-4" />Add Payment</button>}
            </section>

            {nextAction && !isPaid && (
              <section className="px-4 py-3.5 border-b border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collections</p>
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${nextAction.bg}`}><nextAction.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${nextAction.color}`} /><div><p className={`font-semibold ${nextAction.color}`}>{nextAction.label}</p>{nextAction.sub && <p className={`text-[11px] mt-0.5 ${nextAction.color}`}>{nextAction.sub}</p>}</div></div>
                {invoice.status === 'sent' && !isPaid && <button className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600" onClick={handleMarkContacted}>Mark as Contacted</button>}
              </section>
            )}

            <QuickContactActions invoice={invoice} isOverdue={overdue} />

            <section className="px-4 py-3.5 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</p>
              <p className="font-semibold text-slate-800 text-sm">{invoice.client_name}</p>
              {viewSettings.show_client_address && invoice.client_address && <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{invoice.client_address}</div>}
              {viewSettings.show_client_phone && invoice.client_phone && <p className="text-xs text-slate-500 mt-1">Phone: {invoice.client_phone}</p>}
              {viewSettings.show_client_email && invoice.client_email && <p className="text-xs text-slate-500 mt-1">Email: {invoice.client_email}</p>}
            </section>

            <section className="px-4 py-3.5 border-b border-slate-100 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dates</p>
              <div><label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Due Date</label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-sm mt-1 border-slate-200" /></div>
              {invoice.sent_at && <p className="text-xs text-slate-500">Sent {format(new Date(invoice.sent_at), 'MMM d, yyyy')}</p>}
              {invoice.last_contacted_at && <p className="text-xs text-slate-500">Last contact {getLastContactedDisplay(invoice.last_contacted_at)}</p>}
              {invoice.paid_at && <p className="text-xs text-emerald-600 font-semibold">Paid {format(new Date(invoice.paid_at), 'MMM d, yyyy')}</p>}
              {(dueDate !== (invoice.due_date || '') || notes !== (invoice.notes || '')) && <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSaveNotes} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>}
            </section>

            {viewSettings.show_linked_records && (invoice.estimate_id || invoice.work_order_id || evidenceEval) && (
              <section className="px-4 py-3.5 border-b border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Records</p>
                {invoice.estimate_id && <button onClick={() => navigate(`/estimate-editor?id=${invoice.estimate_id}`)} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" />View Estimate</button>}
                {invoice.work_order_id && <button onClick={() => navigate(`/work-orders/${invoice.work_order_id}`)} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" />View Work Order</button>}
                {evidenceEval && <div className={`mt-1 px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 ${evidenceEval.isComplete ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>{evidenceEval.isComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}<span className={evidenceEval.isComplete ? 'text-emerald-700' : 'text-amber-700'}>{evidenceEval.isComplete ? 'Execution evidence complete' : `Missing: ${evidenceEval.missingItems.join(', ')}`}</span></div>}
              </section>
            )}
          </aside>

          <main className="flex-1 overflow-y-auto p-6 space-y-5">
            {showCustomize && <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"><InvoiceVisibilityPanel invoice={invoice} saving={saving} onChange={handleViewSettingChange} /></div>}

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Services</p><span className="text-xs text-slate-400">{allItems.length} items</span></div>
              <div className="divide-y divide-slate-100">
                {allItems.map((item, idx) => <div key={item.id || idx} className="px-5 py-4 grid grid-cols-[1fr_150px_100px] gap-4 items-start"><div><p className="font-semibold text-slate-900">{item.service_name || item.name || 'Service'}</p>{item.description && <p className="text-sm text-slate-500 mt-1">{item.description}</p>}</div><p className="text-sm text-slate-500 text-right">{item.quantity || 0} x ${(item.unit_price || 0).toFixed(2)}</p><p className="font-bold text-slate-900 text-right">${(item.line_total || item.total_price || 0).toFixed(2)}</p></div>)}
              </div>
              <div className="bg-slate-50 px-5 py-4 space-y-2 border-t border-slate-100"><SummaryRow label="Subtotal" value={invoice.subtotal || 0} />{invoice.discount_amount > 0 && <SummaryRow label="Discount" value={-invoice.discount_amount} />}{viewSettings.show_tax && invoice.tax_rate > 0 && <SummaryRow label={`Tax (${invoice.tax_rate}%)`} value={invoice.tax_amount || 0} />}<div className="h-px bg-slate-200 my-2" /><SummaryRow label="Total" value={invoice.total || 0} strong /></div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Summary</p></div>
              <div className="p-5 space-y-2">
                <SummaryRow label="Previous Balance" value={previousBalance} />
                <SummaryRow label="This Invoice" value={currentInvoiceTotal} />
                <SummaryRow label="Payments" value={-derived.amount_paid} />
                <div className="h-px bg-slate-200 my-2" />
                <SummaryRow label="Total Owed" value={totalOwed} strong />
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Payments</p><PaymentHistory invoice={invoice} onPaymentRemoved={(updates) => setInvoice(prev => ({ ...prev, ...updates }))} /></div>
              {viewSettings.show_notes && <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notes</p><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary resize-y" placeholder="Customer-facing notes..." /></div>}
            </section>

            {viewSettings.show_terms && invoice.payment_terms && <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Terms</p><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{invoice.payment_terms}</p></section>}
          </main>
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value, strong }) {
  return <div className="flex items-center justify-between text-sm"><span className={strong ? 'font-bold text-slate-900' : 'text-slate-500'}>{label}</span><span className={strong ? 'text-lg font-black text-slate-900' : 'font-semibold text-slate-700'}>{value < 0 ? '-' : ''}${Math.abs(value || 0).toFixed(2)}</span></div>;
}

function SummaryMini({ label, value, strong }) {
  return <div className="flex items-center justify-between text-xs"><span className={strong ? 'font-bold text-slate-800' : 'text-slate-500'}>{label}</span><span className={strong ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}>{value < 0 ? '-' : ''}${Math.abs(value || 0).toFixed(2)}</span></div>;
}