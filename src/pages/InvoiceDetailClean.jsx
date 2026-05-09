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
  Building2,
  Phone,
  Mail,
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
import { APP_CONFIG } from '@/lib/appConfig';

const co = APP_CONFIG.company;

// ─── Payment status label helper ─────────────────────────────────────────────
function paymentStatusLabel(status) {
  if (status === 'paid') return 'Paid';
  if (status === 'partial') return 'Partially Paid';
  return 'Balance Due';
}

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

  useEffect(() => { loadInvoice(); }, [invoiceId]);

  const loadInvoice = async () => {
    if (!invoiceId) { setLoading(false); return; }
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
          const bal = (clientInvoices || [])
            .filter(o => o.id !== inv.id)
            .reduce((sum, o) => {
              const d = computeInvoiceDerivedFields(o);
              return d.payment_status === 'paid' ? sum : sum + d.balance_due;
            }, 0);
          setPreviousBalance(bal);
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
    const groupItems = invoice.groups?.flatMap(g => g.items || []) || [];
    const raw = groupItems.length > 0 ? groupItems : (invoice.line_items || []);
    return raw.map(normalizeLineItem);
  }, [invoice]);

  const receipt = invoice ? buildReceipt(invoice, {
    payment_method: invoice.payment_method || 'cash',
    previous_balance: invoice.total,
    amount_paid: derived.amount_paid,
  }) : null;

  const saveInvoicePatch = async (patch, msg) => {
    setSaving(true);
    await base44.entities.Invoice.update(invoiceId, patch);
    setInvoice(prev => ({ ...prev, ...patch }));
    setSaving(false);
    if (msg) toast.success(msg);
  };

  const handleViewSettingChange = async (key, value) => {
    const updated = { ...viewSettings, [key]: value };
    await saveInvoicePatch({ view_settings: updated });
  };

  const handleSaveNotes = async () => {
    await saveInvoicePatch({ notes, due_date: dueDate }, 'Invoice updated');
  };

  const handleSend = async () => {
    if (!invoice.client_email) { toast.error('Client email required'); return; }
    if (workOrder && evidenceEval && !evidenceEval.isComplete) {
      if (!confirm('Incomplete execution evidence. Send anyway?')) return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.Invoice.update(invoiceId, { status: 'sent', sent_at: now, last_contacted_at: now });
      await base44.integrations.Core.SendEmail({
        to: invoice.client_email,
        subject: `Invoice #${invoice.invoice_number} - Payment Due`,
        body: `Hi ${invoice.client_name},\n\nPlease find your invoice #${invoice.invoice_number}.\n\nTotal Due: $${(invoice.total || 0).toFixed(2)}${dueDate ? `\nDue Date: ${dueDate}` : ''}\n\nThank you for your business!\n\n${co.name}`,
      });
      setInvoice(prev => ({ ...prev, status: 'sent', sent_at: now, last_contacted_at: now }));
      toast.success('Invoice sent to client');
    } catch (err) {
      toast.error(err?.message || 'Failed to send invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    try {
      const { updates } = await markInvoicePaid(invoice, actor, 'Marked as paid');
      setInvoice(prev => ({ ...prev, ...updates }));
      toast.success('Invoice marked as paid');
    } catch (err) {
      toast.error(err?.message || 'Unable to mark invoice as paid');
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

  // ─── Professional print ──────────────────────────────────────────────────
  const handlePrint = () => {
    const invoiceDate = invoice.created_date
      ? new Date(invoice.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const lineRows = allItems.map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top">
          <strong style="color:#0f172a">${item.service_name || item.name || ''}</strong>
          ${item.description ? `<br><span style="color:#64748b;font-size:12px">${item.description}</span>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569">${item.quantity || ''}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569">$${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">$${(item.line_total || item.total_price || 0).toFixed(2)}</td>
      </tr>`).join('');

    const sourceRef = (() => {
      if (invoice.source_proposal_number) return `<p style="margin:2px 0;color:#64748b;font-size:12px">Created from Proposal #${invoice.source_proposal_number}${invoice.source_selected_pricing_option_title ? ` — ${invoice.source_selected_pricing_option_title}` : ''}</p>`;
      if (invoice.estimate_id) return `<p style="margin:2px 0;color:#64748b;font-size:12px">Created from Estimate</p>`;
      if (invoice.work_order_id) return `<p style="margin:2px 0;color:#64748b;font-size:12px">Linked Work Order</p>`;
      return '';
    })();

    const payTerms = invoice.payment_terms || 'Payment is due upon receipt unless otherwise agreed.';
    const customerNotes = invoice.notes || '';

    const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice #${invoice.invoice_number}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;background:white;padding:48px;font-size:14px;line-height:1.5}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:2px solid #0f172a}
      .company-name{font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.02em}
      .company-meta{font-size:12px;color:#64748b;margin-top:4px}
      .doc-title{font-size:36px;font-weight:900;color:#0f172a;text-align:right;letter-spacing:-0.03em}
      .doc-number{font-size:13px;color:#64748b;text-align:right;margin-top:2px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:28px 0}
      .block{padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}
      .block-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px}
      .block p{margin:2px 0;color:#0f172a;font-size:13px}
      .block .name{font-weight:700;font-size:14px}
      .block .meta{color:#64748b;font-size:12px}
      table{width:100%;border-collapse:collapse;margin:24px 0}
      thead tr{background:#0f172a}
      thead th{padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em}
      thead th:last-child,thead th:nth-child(3){text-align:right}
      thead th:nth-child(2){text-align:center}
      .totals{margin-left:auto;width:280px;margin-top:8px}
      .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #f1f5f9}
      .totals-row.total{border-top:2px solid #0f172a;border-bottom:none;padding-top:12px;margin-top:4px;font-weight:900;font-size:18px}
      .totals-row.balance{color:#dc2626;font-weight:900;font-size:16px;border-bottom:none;padding-top:6px}
      .totals-row.paid{color:#16a34a;font-weight:700}
      .box{padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;margin-top:20px}
      .box-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px}
      .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
      .status-badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;background:${isPaid ? '#dcfce7' : isPartial ? '#fef9c3' : '#fee2e2'};color:${isPaid ? '#166534' : isPartial ? '#854d0e' : '#991b1b'};margin-top:6px}
      @media print{body{padding:24px}.no-print{display:none}}
    </style></head><body>

    <div class="header">
      <div>
        <div class="company-name">${co.name}</div>
        <div class="company-meta">${co.city || ''}${co.email ? ` · ${co.email}` : ''}${co.phone ? ` · ${co.phone}` : ''}</div>
      </div>
      <div>
        <div class="doc-title">INVOICE</div>
        <div class="doc-number">#${invoice.invoice_number}</div>
        <div class="status-badge">${paymentStatusLabel(derived.payment_status)}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="block">
        <div class="block-label">Bill To</div>
        <p class="name">${invoice.client_name || ''}</p>
        ${invoice.client_address ? `<p class="meta">${invoice.client_address}</p>` : ''}
        ${invoice.client_phone ? `<p class="meta">${invoice.client_phone}</p>` : ''}
        ${invoice.client_email ? `<p class="meta">${invoice.client_email}</p>` : ''}
      </div>
      <div class="block">
        <div class="block-label">Invoice Details</div>
        <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <p><strong>Due:</strong> ${invoice.due_date || 'Upon receipt'}</p>
        ${sourceRef}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Service / Description</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>$${(invoice.subtotal || 0).toFixed(2)}</span></div>
      ${invoice.discount_amount > 0 ? `<div class="totals-row"><span>Discount</span><span>-$${(invoice.discount_amount || 0).toFixed(2)}</span></div>` : ''}
      ${invoice.tax_rate > 0 ? `<div class="totals-row"><span>Tax (${invoice.tax_rate}%)</span><span>$${(invoice.tax_amount || 0).toFixed(2)}</span></div>` : ''}
      <div class="totals-row total"><span>Total</span><span>$${(invoice.total || 0).toFixed(2)}</span></div>
      ${derived.amount_paid > 0 ? `<div class="totals-row paid"><span>Amount Paid</span><span>-$${derived.amount_paid.toFixed(2)}</span></div>` : ''}
      <div class="totals-row balance"><span>Balance Due</span><span>$${derived.balance_due.toFixed(2)}</span></div>
    </div>

    <div class="box">
      <div class="box-title">Payment Terms</div>
      <p style="font-size:13px;color:#475569">${payTerms}</p>
    </div>

    <div class="box">
      <div class="box-title">Payment Instructions</div>
      <p style="font-size:13px;color:#475569">Please contact us if you need a payment link or have billing questions.${co.email ? ` · ${co.email}` : ''}${co.phone ? ` · ${co.phone}` : ''}</p>
    </div>

    ${customerNotes ? `<div class="box"><div class="box-title">Notes</div><p style="font-size:13px;color:#475569;white-space:pre-wrap">${customerNotes}</p></div>` : ''}

    <div class="footer">
      Generated by ${APP_CONFIG.document.generator} · ${co.name}
    </div>

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

  const invoiceDate = invoice.created_date
    ? format(new Date(invoice.created_date), 'MMM d, yyyy')
    : format(new Date(), 'MMM d, yyyy');

  // Source reference for customer-facing display
  const sourceReference = (() => {
    if (invoice.source_proposal_number) return `Proposal #${invoice.source_proposal_number}${invoice.source_selected_pricing_option_title ? ` — ${invoice.source_selected_pricing_option_title}` : ''}`;
    if (invoice.estimate_id) return 'Estimate';
    if (invoice.work_order_id) return 'Work Order';
    return null;
  })();

  return (
    <>
      {receiptModal && receipt && <PaymentReceiptPreviewModal receipt={receipt} onClose={() => setReceiptModal(false)} />}
      <PaymentInputModal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} invoice={invoice} onPaymentAdded={(updates) => setInvoice(prev => ({ ...prev, ...updates }))} />

      <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 overflow-hidden">

        {/* ── Top bar ── */}
        <div className="bg-white border-b border-slate-200 flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
            <div>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" />Invoice #{invoice.invoice_number}</p>
              <p className="text-xs text-slate-400">{invoice.client_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={isPaid ? 'paid' : isPartial ? 'partial' : invoice.status} />
            <Button size="sm" variant="outline" onClick={() => setShowCustomize(p => !p)}><Settings2 className="w-3.5 h-3.5 mr-1" />Customize</Button>
            <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-3.5 h-3.5 mr-1" />Print</Button>
            {derived.payment_status !== 'unpaid' && <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 gap-1.5" onClick={() => setReceiptModal(true)}><FileCheck className="w-3.5 h-3.5" />Receipt</Button>}
            {invoice.status === 'draft' && <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50" onClick={handleSend} disabled={saving}><Send className="w-3.5 h-3.5 mr-1" />Send</Button>}
            {invoice.status === 'sent' && !isPaid && <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid} disabled={saving}><CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Paid</Button>}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Left sidebar: Internal admin/payment tools ── */}
          <aside className="w-[300px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">

            {/* Payment summary */}
            <section className={`px-5 py-5 border-b border-slate-100 ${isPaid ? 'bg-emerald-50' : overdue ? 'bg-red-50' : 'bg-slate-50'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Total</p>
              <p className="text-3xl font-bold text-slate-900">${currentInvoiceTotal.toFixed(2)}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white rounded-lg px-3 py-2 border border-slate-200"><p className="text-[10px] text-slate-400">Paid</p><p className="text-sm font-bold text-emerald-600">${derived.amount_paid.toFixed(2)}</p></div>
                <div className="bg-white rounded-lg px-3 py-2 border border-slate-200"><p className="text-[10px] text-slate-400">Balance Due</p><p className="text-sm font-bold text-slate-900">${derived.balance_due.toFixed(2)}</p></div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Summary</p>
                <SummaryMini label="Previous Balance" value={previousBalance} />
                <SummaryMini label="This Invoice" value={currentInvoiceTotal} />
                <SummaryMini label="Payments Applied" value={-derived.amount_paid} />
                <div className="h-px bg-slate-200 my-1.5" />
                <SummaryMini label="Total Owed" value={totalOwed} strong />
              </div>
              {invoice.due_date && <p className={`text-xs font-medium flex items-center gap-1.5 mt-3 ${overdue ? 'text-red-600' : 'text-slate-500'}`}><Clock className="w-3.5 h-3.5" />Due {invoice.due_date}</p>}
              {!isPaid && <button onClick={() => setPaymentModalOpen(true)} className="w-full mt-3 bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"><DollarSign className="w-4 h-4" />Add Payment</button>}
            </section>

            {/* Collections */}
            {nextAction && !isPaid && (
              <section className="px-4 py-3.5 border-b border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collection Activity</p>
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${nextAction.bg}`}><nextAction.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${nextAction.color}`} /><div><p className={`font-semibold ${nextAction.color}`}>{nextAction.label}</p>{nextAction.sub && <p className={`text-[11px] mt-0.5 ${nextAction.color}`}>{nextAction.sub}</p>}</div></div>
                {invoice.status === 'sent' && !isPaid && <button className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600" onClick={handleMarkContacted}>Mark as Contacted</button>}
              </section>
            )}

            <QuickContactActions invoice={invoice} isOverdue={overdue} />

            {/* Dates editable */}
            <section className="px-4 py-3.5 border-b border-slate-100 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Tools</p>
              <div><label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Due Date</label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-sm mt-1 border-slate-200" /></div>
              {invoice.sent_at && <p className="text-xs text-slate-500">Sent {format(new Date(invoice.sent_at), 'MMM d, yyyy')}</p>}
              {invoice.last_contacted_at && <p className="text-xs text-slate-500">Last contact {getLastContactedDisplay(invoice.last_contacted_at)}</p>}
              {invoice.paid_at && <p className="text-xs text-emerald-600 font-semibold">Paid {format(new Date(invoice.paid_at), 'MMM d, yyyy')}</p>}
              {(dueDate !== (invoice.due_date || '') || notes !== (invoice.notes || '')) && <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSaveNotes} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>}
            </section>

            {/* Linked records */}
            {viewSettings.show_linked_records && (invoice.estimate_id || invoice.work_order_id || evidenceEval) && (
              <section className="px-4 py-3.5 border-b border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Records</p>
                {invoice.estimate_id && <button onClick={() => navigate(`/estimate-editor?id=${invoice.estimate_id}`)} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" />View Estimate</button>}
                {invoice.work_order_id && <button onClick={() => navigate(`/work-orders/${invoice.work_order_id}`)} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" />View Work Order</button>}
                {evidenceEval && <div className={`mt-1 px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 ${evidenceEval.isComplete ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>{evidenceEval.isComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}<span className={evidenceEval.isComplete ? 'text-emerald-700' : 'text-amber-700'}>{evidenceEval.isComplete ? 'Execution evidence complete' : `Missing: ${evidenceEval.missingItems.join(', ')}`}</span></div>}
              </section>
            )}
          </aside>

          {/* ── Main content: Customer-facing invoice document ── */}
          <main className="flex-1 overflow-y-auto p-6 space-y-5">

            {showCustomize && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <InvoiceVisibilityPanel invoice={invoice} saving={saving} onChange={handleViewSettingChange} />
              </div>
            )}

            {/* ── CUSTOMER-FACING INVOICE DOCUMENT ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Company header */}
              <div className="bg-slate-900 text-white px-7 py-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-black tracking-tight leading-none">{co.name}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {co.city && <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{co.city}</span>}
                    {co.email && <span className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{co.email}</span>}
                    {co.phone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{co.phone}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-3xl font-black tracking-tighter text-white">INVOICE</p>
                  <p className="text-sm font-bold text-slate-400 mt-1">#{invoice.invoice_number}</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${isPaid ? 'bg-emerald-500 text-white' : isPartial ? 'bg-amber-400 text-slate-900' : overdue ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {paymentStatusLabel(derived.payment_status)}
                  </span>
                </div>
              </div>

              {/* Invoice identity + Bill To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-slate-100">
                <div className="px-7 py-5 border-b md:border-b-0 md:border-r border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Bill To</p>
                  <p className="font-bold text-slate-900 text-base">{invoice.client_name}</p>
                  {invoice.client_address && <p className="text-sm text-slate-500 mt-1">{invoice.client_address}</p>}
                  {invoice.client_phone && <p className="text-sm text-slate-500 mt-0.5">{invoice.client_phone}</p>}
                  {invoice.client_email && <p className="text-sm text-slate-500 mt-0.5">{invoice.client_email}</p>}
                </div>
                <div className="px-7 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Invoice Details</p>
                  <div className="space-y-1">
                    <InvoiceDetailRow label="Invoice #" value={`#${invoice.invoice_number}`} />
                    <InvoiceDetailRow label="Invoice Date" value={invoiceDate} />
                    <InvoiceDetailRow label="Due Date" value={invoice.due_date || 'Due upon receipt'} />
                    {sourceReference && <InvoiceDetailRow label="Reference" value={sourceReference} />}
                    {invoice.title && invoice.title !== `Invoice #${invoice.invoice_number}` && <InvoiceDetailRow label="Description" value={invoice.title} />}
                  </div>
                </div>
              </div>

              {/* Itemized services */}
              <div>
                <div className="px-7 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-[1fr_100px_110px_110px] gap-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service / Description</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Qty</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Unit Price</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Total</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {allItems.length === 0 && <p className="px-7 py-6 text-sm text-slate-400 italic">No billable items.</p>}
                  {allItems.map((item, idx) => (
                    <div key={item.id || idx} className="px-7 py-4 grid grid-cols-[1fr_100px_110px_110px] gap-4 items-start">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{item.service_name || item.name || 'Service'}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                      </div>
                      <p className="text-sm text-slate-500 text-center">{item.quantity || 0}</p>
                      <p className="text-sm text-slate-500 text-right">${(item.unit_price || 0).toFixed(2)}</p>
                      <p className="font-bold text-slate-900 text-sm text-right">${(item.line_total || item.total_price || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Totals block */}
                <div className="border-t border-slate-100 px-7 py-5 flex justify-end">
                  <div className="w-64 space-y-2">
                    <TotalRow label="Subtotal" value={invoice.subtotal || 0} />
                    {invoice.discount_amount > 0 && <TotalRow label="Discount" value={-invoice.discount_amount} />}
                    {invoice.tax_rate > 0 && <TotalRow label={`Tax (${invoice.tax_rate}%)`} value={invoice.tax_amount || 0} />}
                    <div className="h-px bg-slate-200 my-1" />
                    <TotalRow label="Total" value={invoice.total || 0} strong />
                    {derived.amount_paid > 0 && <TotalRow label="Amount Paid" value={-derived.amount_paid} className="text-emerald-600" />}
                    <div className="h-px bg-slate-200 my-1" />
                    <TotalRow label="Balance Due" value={derived.balance_due} strong accent={!isPaid} />
                  </div>
                </div>
              </div>

              {/* Payment terms + instructions */}
              <div className="border-t border-slate-100 px-7 py-5 space-y-4 bg-slate-50/50">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Payment Terms</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{invoice.payment_terms || 'Payment is due upon receipt unless otherwise agreed.'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Payment Instructions</p>
                  <p className="text-sm text-slate-600">Please contact us if you need a payment link or have billing questions.{co.email ? ` · ${co.email}` : ''}{co.phone ? ` · ${co.phone}` : ''}</p>
                </div>
                {invoice.notes && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Notes</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
            {/* ── END CUSTOMER INVOICE DOCUMENT ── */}

            {/* ── Internal payment tools (clearly separated) ── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Internal Payment Tools</span>
                <span className="text-[9px] text-slate-300 italic">— not visible on printed invoice</span>
              </div>
              <div className="p-5">
                <PaymentHistory invoice={invoice} onPaymentRemoved={(updates) => setInvoice(prev => ({ ...prev, ...updates }))} />
              </div>
            </div>

            {/* Notes editable (internal edit) */}
            {viewSettings.show_notes && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Customer Notes (editable)</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary resize-y" placeholder="Customer-facing notes..." />
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function InvoiceDetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}

function TotalRow({ label, value, strong, accent, className = '' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={strong ? 'font-bold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'text-lg font-black text-slate-900' : 'font-semibold text-slate-700'} ${accent ? 'text-red-600 font-black' : ''} ${className}`}>
        {value < 0 ? '-' : ''}${Math.abs(value || 0).toFixed(2)}
      </span>
    </div>
  );
}

function SummaryRow({ label, value, strong }) {
  return <div className="flex items-center justify-between text-sm"><span className={strong ? 'font-bold text-slate-900' : 'text-slate-500'}>{label}</span><span className={strong ? 'text-lg font-black text-slate-900' : 'font-semibold text-slate-700'}>{value < 0 ? '-' : ''}${Math.abs(value || 0).toFixed(2)}</span></div>;
}

function SummaryMini({ label, value, strong }) {
  return <div className="flex items-center justify-between text-xs"><span className={strong ? 'font-bold text-slate-800' : 'text-slate-500'}>{label}</span><span className={strong ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}>{value < 0 ? '-' : ''}${Math.abs(value || 0).toFixed(2)}</span></div>;
}