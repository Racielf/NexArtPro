import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { normalizeLineItem } from '@/lib/lineItemNormalizer';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, CheckCircle, Printer, DollarSign, MapPin, Receipt,
  Clock, FileCheck, AlertTriangle, CheckCircle2, AlertCircle,
  Phone, ExternalLink, ChevronRight
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import PaymentReceiptPreviewModal from '@/components/payments/PaymentReceiptPreviewModal';
import { buildReceipt } from '@/components/payments/paymentReceiptUtils';
import PaymentInputModal from '@/components/invoices/PaymentInputModal';
import PaymentHistory from '@/components/invoices/PaymentHistory';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { evaluateWorkOrderEvidence } from '@/lib/workOrderEvidence';
import { getInvoiceNextAction, getInvoiceFollowUpTiming } from '@/lib/nextActionLogic';
import { markInvoiceContacted, getLastContactedDisplay } from '@/lib/invoiceActionHelpers';
import ExecutionSummaryBlock from '@/components/invoices/ExecutionSummaryBlock';
import ClientResponseSummary from '@/components/invoices/ClientResponseSummary';
import QuickContactActions from '@/components/invoices/QuickContactActions';

export default function InvoiceDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [receiptModal, setReceiptModal] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [workOrder, setWorkOrder] = useState(null);
  const [evidenceEval, setEvidenceEval] = useState(null);

  useEffect(() => { loadInvoice(); }, []);

  const loadInvoice = async () => {
    if (!invoiceId) { setLoading(false); return; }
    const list = await base44.entities.Invoice.filter({ id: invoiceId });
    if (list.length) {
      const inv = list[0];
      setInvoice(inv);
      setNotes(inv.notes || '');
      setDueDate(inv.due_date || '');
      if (inv.work_order_id) {
        try {
          const woList = await base44.entities.WorkOrder.filter({ id: inv.work_order_id });
          if (woList.length) {
            const wo = woList[0];
            setWorkOrder(wo);
            setEvidenceEval(evaluateWorkOrderEvidence(wo));
          }
        } catch (err) {
          console.warn('[loadInvoice] WorkOrder load failed:', err?.message);
        }
      }
    }
    setLoading(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await base44.entities.Invoice.update(invoiceId, { notes, due_date: dueDate });
    setInvoice(i => ({ ...i, notes, due_date: dueDate }));
    setSaving(false);
    toast.success('Invoice updated');
  };

  const handleSend = async () => {
    if (!invoice.client_email) { toast.error('Client email required'); return; }
    if (workOrder && evidenceEval && !evidenceEval.isComplete) {
      if (!confirm(`⚠ This invoice is based on a work order with incomplete execution documentation. Send anyway?`)) return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    await base44.entities.Invoice.update(invoiceId, { status: 'sent', sent_at: now, last_contacted_at: now });
    await base44.integrations.Core.SendEmail({
      to: invoice.client_email,
      subject: `Invoice #${invoice.invoice_number} - Payment Due`,
      body: `Hi ${invoice.client_name},\n\nPlease find your invoice #${invoice.invoice_number}.\n\nTotal Due: $${(invoice.total || 0).toFixed(2)}${dueDate ? `\nDue Date: ${dueDate}` : ''}\n\nThank you for your business!`,
    });
    setInvoice(i => ({ ...i, status: 'sent', sent_at: now, last_contacted_at: now }));
    setSaving(false);
    toast.success('Invoice sent to client!');
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const fullPayment = {
      id: `pay-${Date.now()}`,
      amount: invoice.total,
      method: 'manual',
      payment_date: now,
      note: 'Marked as paid',
      recorded_by: 'Admin',
      recorded_at: now,
    };
    const updatedPayments = [...(invoice?.payments || []), fullPayment];
    const derived = computeInvoiceDerivedFields({ ...invoice, payments: updatedPayments });
    await base44.entities.Invoice.update(invoiceId, {
      payments: updatedPayments,
      amount_paid: derived.amount_paid,
      balance_due: derived.balance_due,
      payment_status: derived.payment_status,
      paid_at: now,
    });
    setInvoice(i => ({ ...i, payments: updatedPayments, amount_paid: derived.amount_paid, balance_due: derived.balance_due, payment_status: derived.payment_status, paid_at: now }));
    setSaving(false);
    toast.success('Invoice marked as paid!');
  };

  const handlePrint = () => {
    const inv = invoice;
    const rawItems = inv.groups?.flatMap(g => g.items || []) || inv.line_items || [];
    const allItems = rawItems.map(normalizeLineItem);
    const content = `<html><head><title>Invoice #${inv.invoice_number}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#111}h1{color:#1a56db}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#1f2937;color:white;padding:10px;text-align:left}td{padding:10px;border-bottom:1px solid #eee}.total{font-size:18px;font-weight:bold;color:#1a56db}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:start">
      <div><h1>INVOICE</h1><p style="color:#666;font-size:20px">#${inv.invoice_number}</p></div>
      <div style="text-align:right"><strong style="color:#1a56db;font-size:20px">FSM Pro</strong></div>
    </div>
    <div class="grid">
      <div style="background:#f9fafb;padding:16px;border-radius:8px">
        <p style="color:#888;font-size:11px;text-transform:uppercase;font-weight:bold">Bill To</p>
        <p><strong>${inv.client_name}</strong></p>
        ${inv.client_address ? `<p>${inv.client_address}</p>` : ''}${inv.client_phone ? `<p>${inv.client_phone}</p>` : ''}${inv.client_email ? `<p>${inv.client_email}</p>` : ''}
      </div>
      <div style="background:#f9fafb;padding:16px;border-radius:8px">
        <p>Invoice #: <strong>${inv.invoice_number}</strong></p>
        <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
        ${inv.due_date ? `<p>Due: <strong>${inv.due_date}</strong></p>` : ''}
        <p>Status: <strong>${inv.status?.toUpperCase()}</strong></p>
      </div>
    </div>
    <table><thead><tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
    ${allItems.map(item => `<tr><td><strong>${item.service_name || item.name || ''}</strong>${item.description ? `<br><small style="color:#666">${item.description}</small>` : ''}</td><td>${item.quantity || ''}</td><td>$${(item.unit_price || 0).toFixed(2)}</td><td>$${(item.line_total || item.total_price || 0).toFixed(2)}</td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:right;margin-top:20px">
      <p>Subtotal: $${(inv.subtotal || 0).toFixed(2)}</p>
      ${inv.discount_amount > 0 ? `<p>Discount: -$${(inv.discount_amount || 0).toFixed(2)}</p>` : ''}
      ${inv.tax_rate > 0 ? `<p>Tax (${inv.tax_rate}%): $${(inv.tax_amount || 0).toFixed(2)}</p>` : ''}
      <p class="total">TOTAL: $${(inv.total || 0).toFixed(2)}</p>
      ${inv.status === 'paid' ? `<p style="color:green;font-weight:bold">✓ PAID</p>` : ''}
    </div>
    ${inv.notes ? `<div style="margin-top:30px;border-top:1px solid #eee;padding-top:20px"><p style="color:#888;font-size:11px;font-weight:bold">NOTES</p><p>${inv.notes}</p></div>` : ''}
    ${inv.payment_terms ? `<div style="margin-top:20px"><p style="color:#888;font-size:11px;font-weight:bold">PAYMENT TERMS</p><p>${inv.payment_terms}</p></div>` : ''}
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(content);
    w.document.close();
    w.print();
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!invoice) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Invoice not found</p>
        <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
      </div>
    </div>
  );

  const derived = computeInvoiceDerivedFields(invoice);
  const receipt = buildReceipt(invoice, {
    payment_method: invoice.payment_method || 'cash',
    previous_balance: invoice.total,
    amount_paid: derived.amount_paid,
  });
  const allItems = (invoice.groups?.flatMap(g => g.items || []) || invoice.line_items || []).map(normalizeLineItem);
  const isOverdue = isInvoiceOverdue(invoice);
  const nextAction = getInvoiceNextAction(invoice);
  const followUpTiming = getInvoiceFollowUpTiming(invoice);
  const isPaid = derived.payment_status === 'paid';
  const isPartial = derived.payment_status === 'partial';

  return (
    <>
      {receiptModal && receipt && (
        <PaymentReceiptPreviewModal receipt={receipt} onClose={() => setReceiptModal(false)} />
      )}
      <PaymentInputModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={invoice}
        onPaymentAdded={(updates) => setInvoice(i => ({ ...i, ...updates }))}
      />

      <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 overflow-hidden">

        {/* ── TOP BAR ── */}
        <div className="bg-white border-b border-slate-200 flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Invoice #{invoice.invoice_number}
              </p>
              <p className="text-xs text-slate-400">{invoice.client_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={isPaid ? 'paid' : isPartial ? 'partial' : invoice.status} />
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1" />Print
            </Button>
            {derived.payment_status !== 'unpaid' && (
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 gap-1.5" onClick={() => setReceiptModal(true)}>
                <FileCheck className="w-3.5 h-3.5" />Receipt
              </Button>
            )}
            {invoice.status === 'draft' && (
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50" onClick={handleSend} disabled={saving}>
                <Send className="w-3.5 h-3.5 mr-1" />Send
              </Button>
            )}
            {invoice.status === 'sent' && !isPaid && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid} disabled={saving}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Paid
              </Button>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT SIDEBAR ── */}
          <div className="w-[300px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white flex flex-col">

            {/* 1. FINANCIAL SUMMARY — primary weight */}
            <div className={`px-5 py-5 border-b border-slate-100 ${isPaid ? 'bg-emerald-50' : isOverdue ? 'bg-red-50' : 'bg-slate-50'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Invoice</p>
                  <p className="text-3xl font-bold text-slate-900">${(invoice.total || 0).toFixed(2)}</p>
                </div>
                {isPaid && (
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />PAID
                  </span>
                )}
                {isOverdue && !isPaid && (
                  <span className="flex items-center gap-1 text-red-700 bg-red-100 border border-red-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />OVERDUE
                  </span>
                )}
              </div>

              {/* Payment breakdown */}
              {(derived.amount_paid > 0 || isPartial) && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5">Paid</p>
                    <p className="text-sm font-bold text-emerald-600">${derived.amount_paid.toFixed(2)}</p>
                  </div>
                  {isPartial && (
                    <div className="bg-white rounded-lg px-3 py-2 border border-amber-200">
                      <p className="text-[10px] text-amber-600 font-medium mb-0.5">Balance Due</p>
                      <p className="text-sm font-bold text-amber-700">${derived.balance_due.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Due date */}
              {invoice.due_date && (
                <p className={`text-xs font-medium flex items-center gap-1.5 ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  Due {invoice.due_date}
                </p>
              )}

              {/* Add Payment CTA */}
              {!isPaid && (
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full mt-3 bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />Add Payment
                </button>
              )}

              {/* Mark as Contacted (sent + unpaid only) */}
              {invoice.status === 'sent' && !isPaid && (
                <button
                  className="w-full mt-2 text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                  onClick={async () => {
                    await markInvoiceContacted(invoiceId, base44);
                    setInvoice(i => ({ ...i, last_contacted_at: new Date().toISOString() }));
                    toast.success('Marked as contacted');
                  }}
                >
                  ✓ Mark as Contacted
                </button>
              )}
            </div>

            {/* 2. COLLECTIONS / NEXT ACTION */}
            {(nextAction || isOverdue || followUpTiming) && !isPaid && (
              <div className="px-4 py-3.5 border-b border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collections</p>

                {nextAction && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${nextAction.bg}`}>
                    <nextAction.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${nextAction.color}`} />
                    <div>
                      <p className={`font-semibold ${nextAction.color}`}>{nextAction.label}</p>
                      {nextAction.sub && <p className={`text-[11px] mt-0.5 ${nextAction.color}`}>{nextAction.sub}</p>}
                    </div>
                  </div>
                )}

                {isOverdue && (
                  <div className="p-3 rounded-xl text-xs flex items-start gap-2 bg-red-50 border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-700">Overdue Payment</p>
                      <p className="text-[11px] text-red-600 mt-0.5">Past due. Contact customer for payment.</p>
                    </div>
                  </div>
                )}

                {followUpTiming && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                    followUpTiming.urgency === 'high' ? 'bg-red-50 border-red-200' :
                    followUpTiming.urgency === 'medium' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <Clock className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                      followUpTiming.urgency === 'high' ? 'text-red-600' :
                      followUpTiming.urgency === 'medium' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                    <div>
                      <p className={`font-semibold ${
                        followUpTiming.urgency === 'high' ? 'text-red-700' :
                        followUpTiming.urgency === 'medium' ? 'text-amber-700' : 'text-blue-700'
                      }`}>Follow-up</p>
                      <p className={`text-[11px] mt-0.5 ${
                        followUpTiming.urgency === 'high' ? 'text-red-600' :
                        followUpTiming.urgency === 'medium' ? 'text-amber-600' : 'text-blue-600'
                      }`}>{followUpTiming.label}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. CLIENT RESPONSE / PROMISE / BILLING ISSUE */}
            {invoice.client_response_at && invoice.client_response_status !== 'no_response' && (
              <div className="px-4 py-3.5 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Client Response</p>
                <ClientResponseSummary
                  invoice={invoice}
                  onIssueResolved={(updates) => setInvoice(i => ({ ...i, ...updates }))}
                />
              </div>
            )}

            {/* 4. CONTACT ACTIONS */}
            <QuickContactActions invoice={invoice} isOverdue={isOverdue} />

            {/* 5. CLIENT INFO */}
            <div className="px-4 py-3.5 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</p>
              <p className="font-semibold text-slate-800 text-sm">{invoice.client_name}</p>
              {invoice.client_address && (
                <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{invoice.client_address}
                </div>
              )}
              {invoice.client_phone && <p className="text-xs text-slate-500 mt-1">📞 {invoice.client_phone}</p>}
              {invoice.client_email && <p className="text-xs text-slate-500 mt-1">✉ {invoice.client_email}</p>}
            </div>

            {/* 6. DATES + TIMELINE */}
            <div className="px-4 py-3.5 border-b border-slate-100 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timeline</p>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Due Date</label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-sm mt-1 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                {invoice.sent_at && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    Sent {format(new Date(invoice.sent_at), 'MMM d, yyyy')}
                  </p>
                )}
                {invoice.last_contacted_at && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                    Last contact {getLastContactedDisplay(invoice.last_contacted_at)}
                  </p>
                )}
                {invoice.paid_at && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    Paid {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              {(dueDate !== (invoice.due_date || '') || notes !== (invoice.notes || '')) && (
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSaveNotes} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              )}
            </div>

            {/* 7. LINKED RECORDS + EVIDENCE */}
            {(invoice.estimate_id || invoice.work_order_id || evidenceEval) && (
              <div className="px-4 py-3.5 border-b border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Records</p>
                {invoice.estimate_id && (
                  <button onClick={() => navigate(`/estimate-editor?id=${invoice.estimate_id}`)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />View Estimate
                  </button>
                )}
                {invoice.work_order_id && (
                  <button onClick={() => navigate(`/work-orders/${invoice.work_order_id}`)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />View Work Order
                  </button>
                )}
                {evidenceEval && (
                  <div className={`mt-1 px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 ${
                    evidenceEval.isComplete ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    {evidenceEval.isComplete
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                    <span className={evidenceEval.isComplete ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                      {evidenceEval.isComplete ? 'Evidence complete' : 'Incomplete evidence'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 8. EXECUTION EVIDENCE BLOCK */}
            {workOrder && (
              <div className="px-4 py-3.5 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Execution</p>
                <ExecutionSummaryBlock workOrder={workOrder} compact={true} />
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Payment history (if any) */}
            {invoice.payments?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment History</p>
                <PaymentHistory invoice={invoice} onPaymentRemoved={(updates) => setInvoice(i => ({ ...i, ...updates }))} />
              </div>
            )}

            {/* Line items */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Services</p>
                <span className="text-xs text-slate-400">{allItems.length} item{allItems.length !== 1 ? 's' : ''}</span>
              </div>

              {allItems.length > 0 ? (
                <>
                  <div className="divide-y divide-slate-50">
                    {allItems.map((item, idx) => (
                      <div key={idx} className="px-5 py-3 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.service_name || item.name || '—'}</p>
                          {item.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>}
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0 text-right">
                          <div className="text-xs text-slate-500">
                            <p className="font-medium">{item.quantity} × ${(item.unit_price || 0).toFixed(2)}</p>
                          </div>
                          <p className="text-sm font-bold text-slate-800 w-20">${(item.line_total || item.total_price || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>${(invoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {invoice.discount_amount > 0 && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Discount</span>
                        <span>−${invoice.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    {invoice.tax_rate > 0 && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Tax ({invoice.tax_rate}%)</span>
                        <span>${(invoice.tax_amount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                      <span>Total</span>
                      <span>${(invoice.total || 0).toFixed(2)}</span>
                    </div>
                    {derived.amount_paid > 0 && (
                      <div className="flex justify-between text-sm font-bold text-emerald-600 pt-0.5">
                        <span>Paid</span>
                        <span>−${derived.amount_paid.toFixed(2)}</span>
                      </div>
                    )}
                    {isPartial && (
                      <div className="flex justify-between text-sm font-bold text-amber-700 pt-0.5">
                        <span>Balance Due</span>
                        <span>${derived.balance_due.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No line items</div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add internal notes…"
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              {notes !== (invoice.notes || '') && (
                <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Notes'}
                </Button>
              )}
            </div>

            {/* Payment terms */}
            {invoice.payment_terms && (
              <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Terms</p>
                <p className="text-sm text-slate-600">{invoice.payment_terms}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}