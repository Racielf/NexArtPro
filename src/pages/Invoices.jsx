import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { Receipt, Search, Send, CheckCircle, DollarSign, MapPin, Printer, ChevronRight, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import CashflowSummary from '@/components/invoices/CashflowSummary';
import { evaluateWorkOrderEvidence } from '@/lib/workOrderEvidence';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { getInvoiceNextAction, getInvoiceFollowUpTiming } from '@/lib/nextActionLogic';
import { filterInvoicesByAction, sortInvoicesByUrgency } from '@/lib/invoiceActionFilter';
import { executeOneClickFollowUp } from '@/lib/invoiceActionHelpers';
import { getEscalationBand, getOverdueDays } from '@/lib/invoiceMessageTemplates';
import { Zap } from 'lucide-react';

const ESCALATION_BADGE = {
  urgent:   { cls: 'bg-red-200 text-red-800 font-bold', label: (d) => `Final Notice · ${d}d overdue` },
  firm:     { cls: 'bg-red-100 text-red-700 font-semibold', label: (d) => `Urgent · ${d}d overdue` },
  standard: { cls: 'bg-orange-100 text-orange-700', label: (d) => `Overdue · ${d}d` },
};

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'today' | 'overdue' | 'high'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [evidenceCache, setEvidenceCache] = useState({});
  const [followingUp, setFollowingUp] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Invoice.list('-created_date');
    setInvoices(data);
    
    // Pre-load evidence evaluations for invoices with work orders
    const cache = {};
    await Promise.all(data.map(async (inv) => {
      if (inv.work_order_id) {
        try {
          const woList = await base44.entities.WorkOrder.filter({ id: inv.work_order_id });
          if (woList.length) {
            cache[inv.id] = evaluateWorkOrderEvidence(woList[0]);
          }
        } catch (err) {
          console.warn(`[loadData] WorkOrder eval failed for invoice ${inv.id}:`, err?.message);
        }
      }
    }));
    setEvidenceCache(cache);
    setLoading(false);
  };

  const handleSend = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { status: 'sent', sent_at: new Date().toISOString() });
    toast.success('Invoice marked as sent!');
    loadData();
  };

  const handleMarkPaid = async (inv) => {
    const now = new Date().toISOString();
    const fullPayment = {
      id: `pay-${Date.now()}`,
      amount: inv.total,
      method: 'manual',
      payment_date: now,
      note: 'Marked as paid',
      recorded_by: 'Admin',
      recorded_at: now,
    };
    const updatedPayments = [...(inv?.payments || []), fullPayment];
    const derived = computeInvoiceDerivedFields({ ...inv, payments: updatedPayments });

    await base44.entities.Invoice.update(inv.id, {
      payments: updatedPayments,
      amount_paid: derived.amount_paid,
      balance_due: derived.balance_due,
      payment_status: derived.payment_status,
      paid_at: now,
    });
    toast.success('Invoice marked as paid!');
    loadData();
  };

  const handlePrint = (inv) => {
    // Use company branding from appConfig
    const companyName = appConfig.company.name;
    const content = `
      <html><head><title>Invoice #${inv.invoice_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#111}
        h1{color:#1a56db}table{width:100%;border-collapse:collapse;margin:20px 0}
        th{background:#1f2937;color:white;padding:10px;text-align:left}
        td{padding:10px;border-bottom:1px solid #eee}
        .total{font-size:18px;font-weight:bold;color:#1a56db}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div><h1>INVOICE</h1><p style="color:#666;font-size:20px">#${inv.invoice_number}</p></div>
        <div style="text-align:right"><strong style="color:#1a56db;font-size:20px">\${companyName}</strong></div>
      </div>
      <div class="grid">
        <div style="background:#f9fafb;padding:16px;border-radius:8px">
          <p style="color:#888;font-size:11px;text-transform:uppercase;font-weight:bold">Bill To</p>
          <p><strong>${inv.client_name}</strong></p>
          ${inv.client_address ? `<p>${inv.client_address}</p>` : ''}
          ${inv.client_phone ? `<p>${inv.client_phone}</p>` : ''}
          ${inv.client_email ? `<p>${inv.client_email}</p>` : ''}
        </div>
        <div style="background:#f9fafb;padding:16px;border-radius:8px">
          <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
          ${inv.due_date ? `<p>Due: <strong>${inv.due_date}</strong></p>` : ''}
          <p>Status: <strong>${inv.status?.toUpperCase()}</strong></p>
        </div>
      </div>
      <table>
        <thead><tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>
          ${(inv.line_items || []).map(item => `
            <tr>
              <td><strong>${item.service_name || item.name}</strong>${item.description ? `<br><small style="color:#666">${item.description}</small>` : ''}</td>
              <td>${item.quantity}</td>
              <td>$${(item.unit_price || 0).toFixed(2)}</td>
              <td>$${(item.line_total || item.total_price || 0).toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:20px">
        <p>Subtotal: $${(inv.subtotal || 0).toFixed(2)}</p>
        ${inv.tax_rate > 0 ? `<p>Tax (${inv.tax_rate}%): $${(inv.tax_amount || 0).toFixed(2)}</p>` : ''}
        <p class="total">TOTAL: $${(inv.total || 0).toFixed(2)}</p>
        ${inv.status === 'paid' ? `<p style="color:green;font-weight:bold">✓ PAID</p>` : ''}
      </div>
      ${inv.notes ? `<div style="margin-top:30px;border-top:1px solid #eee;padding-top:20px"><p style="color:#888;font-size:11px;font-weight:bold">NOTES</p><p>${inv.notes}</p></div>` : ''}
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #eee;text-align:center"><p style="color:#999;font-size:10px">Generated with ${appConfig.appName}</p></div>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(content);
    w.document.close();
    w.print();
  };

  const searchFiltered = invoices.filter(i =>
    i.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(i.invoice_number).includes(search)
  );
  const actionFiltered = filterInvoicesByAction(searchFiltered, actionFilter);
  const sorted = sortInvoicesByUrgency(actionFiltered);
  const filtered = sorted;

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const idsArray = Array.from(selectedIds);
    await Promise.all(idsArray.map(id => base44.entities.Invoice.delete(id)));
    setSelectedIds(new Set());
    setInvoices(invoices.filter(i => !selectedIds.has(i.id)));
    toast.success(`${idsArray.length} invoice(s) deleted`);
  };

  const handleOneClickFollowUp = async (e, inv) => {
    e.stopPropagation();
    setFollowingUp(inv.id);
    await executeOneClickFollowUp(inv, base44);
    toast.success('Message copied and contact logged');
    setFollowingUp(null);
    loadData();
  };

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Invoices" subtitle={`${invoices.length} total`} />

      <PageShell>
        {/* Cashflow Summary */}
        <CashflowSummary />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 border border-border rounded-lg p-1">
            {['all', 'today', 'overdue', 'high'].map(filter => (
              <button
                key={filter}
                onClick={() => setActionFilter(filter)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  actionFilter === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter === 'all' && 'All'}
                {filter === 'today' && 'Today'}
                {filter === 'overdue' && 'Overdue'}
                {filter === 'high' && 'Urgent'}
              </button>
            ))}
          </div>
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-muted-foreground">Select all</span>
            </label>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
                <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} invoice(s)?`)) handleDeleteSelected();
                }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </Button>
              </div>
            )}
            {filtered.map(inv => {
               const evidence = evidenceCache[inv.id];
               const isOverdue = isInvoiceOverdue(inv);
               const nextAction = getInvoiceNextAction(inv);
               const followUpTiming = getInvoiceFollowUpTiming(inv);
               return (
               <Card key={inv.id} className={`${isOverdue ? 'border-red-200 bg-red-50/30' : 'bg-white'} hover:shadow-sm hover:border-border/70 transition-all border-border cursor-pointer`} onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}>
                 <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </label>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="font-bold text-primary">INV#{inv.invoice_number}</span>
                           <h3 className="font-semibold text-foreground">{inv.client_name}</h3>
                           {inv.amount_paid > 0 && inv.amount_paid < inv.total ? (
                             <StatusBadge status="partial" />
                           ) : (
                             <StatusBadge status={inv.status} />
                           )}
                           {followUpTiming && (
                             <div className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                               followUpTiming.urgency === 'high' ? 'bg-red-100 text-red-700' :
                               followUpTiming.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
                               'bg-blue-100 text-blue-700'
                             }`}>
                               {followUpTiming.urgency === 'high' && <AlertTriangle className="w-3 h-3" />}
                               {followUpTiming.urgency === 'medium' && <Clock className="w-3 h-3" />}
                               {followUpTiming.urgency === 'low' && <Clock className="w-3 h-3 opacity-60" />}
                               {followUpTiming.label}
                             </div>
                           )}
                          {isOverdue && (() => {
                            const band = getEscalationBand(inv);
                            const cfg = ESCALATION_BADGE[band] || ESCALATION_BADGE.standard;
                            const days = getOverdueDays(inv);
                            return (
                              <div className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${cfg.cls}`}>
                                <AlertTriangle className="w-3 h-3" /> {cfg.label(days)}
                              </div>
                            );
                          })()}
                          {evidence && (
                            <div className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                              evidence.isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {evidence.isComplete ? (
                                <><CheckCircle2 className="w-3 h-3" /> Evidence</>
                              ) : (
                                <><AlertTriangle className="w-3 h-3" /> Incomplete</>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 flex-wrap text-sm">
                          {inv.client_address && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />{inv.client_address}
                            </span>
                          )}
                          <span className="font-semibold text-foreground">${(inv.total || 0).toFixed(2)}</span>
                          {inv.amount_paid > 0 && (
                            <span className="text-xs text-green-600 font-medium">Paid: ${(inv.amount_paid || 0).toFixed(2)}</span>
                          )}
                          {inv.amount_paid > 0 && inv.amount_paid < inv.total && (
                            <span className="text-xs text-amber-600 font-medium">Due: ${(inv.total - inv.amount_paid).toFixed(2)}</span>
                          )}
                          {inv.due_date && <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>Due: {inv.due_date}</span>}
                        </div>
                        {nextAction && (
                          <div className={`mt-2 px-2 py-1 rounded text-xs flex items-center gap-1 ${nextAction.bg}`}>
                            <nextAction.icon className={`w-3.5 h-3.5 ${nextAction.color}`} />
                            <span className={nextAction.color}>{nextAction.label}</span>
                          </div>
                        )}
                        {followUpTiming && (followUpTiming.urgency === 'high' || followUpTiming.next_follow_up_in_days === 0 || isOverdue) && inv.status !== 'paid' && (
                          <button
                            onClick={(e) => handleOneClickFollowUp(e, inv)}
                            disabled={followingUp === inv.id}
                            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-slate-900 hover:bg-black text-white transition-colors disabled:opacity-60"
                          >
                            <Zap className="w-3 h-3" />
                            {followingUp === inv.id ? 'Copying...' : '1-Click Follow-Up'}
                          </button>
                        )}
                       </div>
                       </div>
                       </CardContent>
                       </Card>
                       );
                       })}
                      </div>
                      )}
                      </PageShell>
                      </div>
                      );
                      }