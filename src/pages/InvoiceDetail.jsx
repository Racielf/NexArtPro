import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { normalizeLineItem } from '@/lib/lineItemNormalizer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X, Send, CheckCircle, Printer, DollarSign, MapPin, Receipt, Clock, FileCheck } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import PaymentReceiptPreviewModal from '@/components/payments/PaymentReceiptPreviewModal';
import { buildReceipt } from '@/components/payments/paymentReceiptUtils';
import PaymentInputModal from '@/components/invoices/PaymentInputModal';
import PaymentHistory from '@/components/invoices/PaymentHistory';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { evaluateWorkOrderEvidence } from '@/lib/workOrderEvidence';
import { getInvoiceNextAction } from '@/lib/nextActionLogic';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

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
      
      // Load WorkOrder if linked
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
    
    // Soft warning if evidence incomplete
    if (workOrder && evidenceEval && !evidenceEval.isComplete) {
      if (!confirm(`⚠ This invoice is based on a work order with incomplete execution documentation. Send anyway?`)) {
        return;
      }
    }
    
    setSaving(true);
    const now = new Date().toISOString();
    await base44.entities.Invoice.update(invoiceId, { status: 'sent', sent_at: now });
    await base44.integrations.Core.SendEmail({
      to: invoice.client_email,
      subject: `Invoice #${invoice.invoice_number} - Payment Due`,
      body: `Hi ${invoice.client_name},\n\nPlease find your invoice #${invoice.invoice_number}.\n\nTotal Due: $${(invoice.total || 0).toFixed(2)}${dueDate ? `\nDue Date: ${dueDate}` : ''}\n\nThank you for your business!`,
    });
    setInvoice(i => ({ ...i, status: 'sent', sent_at: now }));
    setSaving(false);
    toast.success('Invoice sent to client!');
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    // Mark as paid by creating a full payment record
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
    setInvoice(i => ({
      ...i,
      payments: updatedPayments,
      amount_paid: derived.amount_paid,
      balance_due: derived.balance_due,
      payment_status: derived.payment_status,
      paid_at: now,
    }));
    setSaving(false);
    toast.success('Invoice marked as paid!');
  };

  const handlePrint = () => {
    const inv = invoice;
    // Resolve line items from groups or flat — normalize for legacy alias handling
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

  const derived = invoice ? computeInvoiceDerivedFields(invoice) : { amount_paid: 0, balance_due: 0, payment_status: 'unpaid' };
  const receipt = invoice ? buildReceipt(invoice, {
    payment_method: invoice.payment_method || 'cash',
    previous_balance: invoice.total,
    amount_paid: derived.amount_paid,
  }) : null;

  if (!invoice) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Invoice not found</p>
        <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
      </div>
    </div>
  );

  const allItems = (invoice.groups?.flatMap(g => g.items || []) || invoice.line_items || []).map(normalizeLineItem);

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
      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 flex items-center justify-between px-5 py-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-1.5 hover:bg-slate-100 rounded transition-colors">
            <X className="w-4 h-4 text-slate-500" />
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
          <StatusBadge status={invoice.status} />
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" />Print
          </Button>
          {(derived.payment_status !== 'unpaid') && (
            <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 gap-1.5" onClick={() => setReceiptModal(true)}>
              <FileCheck className="w-3.5 h-3.5" />View Receipt
            </Button>
          )}
          {invoice.status === 'draft' && (
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50" onClick={handleSend} disabled={saving}>
              <Send className="w-3.5 h-3.5 mr-1" />Send
            </Button>
          )}
          {invoice.status === 'sent' && derived.payment_status !== 'paid' && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid} disabled={saving}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Paid
            </Button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="w-[260px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
          {/* Client */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Bill To</p>
            <p className="font-bold text-slate-900">{invoice.client_name}</p>
            {invoice.client_address && (
              <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{invoice.client_address}
              </div>
            )}
            {invoice.client_phone && <p className="text-xs text-slate-500 mt-1">📞 {invoice.client_phone}</p>}
            {invoice.client_email && <p className="text-xs text-slate-500 mt-1">✉ {invoice.client_email}</p>}
          </div>

          {/* Collections Context */}
          {invoice && (
            <div className="px-4 py-4 border-b border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Collections</p>
              {getInvoiceNextAction(invoice) && (() => {
                const action = getInvoiceNextAction(invoice);
                return (
                  <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${action.bg}`}>
                    <action.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${action.color}`} />
                    <div>
                      <p className={`font-semibold ${action.color}`}>{action.label}</p>
                      <p className={`text-[11px] mt-0.5 ${action.color}`}>{action.sub}</p>
                    </div>
                  </div>
                );
              })()}
              {isInvoiceOverdue(invoice) && (
                <div className="p-2.5 rounded-lg text-xs flex items-start gap-2 bg-red-50 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700">Overdue Payment</p>
                    <p className="text-[11px] text-red-600 mt-0.5">This invoice is past due. Contact customer for payment.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Links + Evidence */}
          {(invoice.estimate_id || invoice.work_order_id || evidenceEval) && (
            <div className="px-4 py-4 border-b border-slate-100 space-y-1.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Linked Records</p>
              {invoice.estimate_id && (
                <button onClick={() => navigate(`/estimate-editor?id=${invoice.estimate_id}`)}
                  className="text-xs text-primary hover:underline block">
                  → View Estimate
                </button>
              )}
              {invoice.work_order_id && (
                <button onClick={() => navigate(`/work-order-detail?id=${invoice.work_order_id}`)}
                  className="text-xs text-primary hover:underline block">
                  → View Work Order
                </button>
              )}
              {evidenceEval && (
                <div className={`mt-3 p-2 rounded-lg text-xs flex items-start gap-2 ${
                  evidenceEval.isComplete ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  {evidenceEval.isComplete ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-green-700 font-medium">Execution Evidence Complete</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="text-amber-700 font-medium">Incomplete Evidence</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="px-4 py-4 border-b border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dates</p>
            <div>
              <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="h-8 text-sm mt-1 border-slate-200" />
            </div>
            {invoice.sent_at && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />Sent {format(new Date(invoice.sent_at), 'MMM d, yyyy')}
              </p>
            )}
            {invoice.paid_at && (
              <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />Paid {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>

          {/* Payment Status */}
          <div className="px-4 py-4 bg-slate-50 border-b border-slate-100 space-y-3">
           <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total</p>
             <p className="text-2xl font-bold text-slate-900">${(invoice.total || 0).toFixed(2)}</p>
           </div>
           {derived.amount_paid > 0 && (
             <div>
               <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Amount Paid</p>
               <p className="text-lg font-semibold text-green-600">${derived.amount_paid.toFixed(2)}</p>
             </div>
           )}
           {derived.payment_status === 'partial' && (
             <div>
               <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Balance Due</p>
               <p className="text-lg font-semibold text-amber-600">${derived.balance_due.toFixed(2)}</p>
               <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Partial</span>
             </div>
           )}
           {derived.payment_status === 'paid' && (
             <p className="text-xs text-green-600 font-bold">✓ PAID IN FULL</p>
           )}
           {derived.payment_status !== 'paid' && (
             <button onClick={() => setPaymentModalOpen(true)}
               className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors mt-2">
               + Add Payment
             </button>
           )}
          </div>

          {/* Payments History */}
          {(invoice.payments?.length > 0) && (
            <div className="px-4 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Payment History</p>
              <PaymentHistory invoice={invoice} onPaymentRemoved={(updates) => setInvoice(i => ({ ...i, ...updates }))} />
            </div>
          )}
          </div>
          </div>
          </div>
          </>

  );
}