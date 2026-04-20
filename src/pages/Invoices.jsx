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
import { softDeleteMany, filterActiveRecords } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import ArchiveReasonModal from '@/components/shared/ArchiveReasonModal';
import { useAuth } from '@/lib/AuthContext';

const ESCALATION_BADGE = {
  urgent:   { cls: 'bg-red-100 text-red-700 font-bold border border-red-200', label: (d) => `Final Notice · ${d}d overdue` },
  firm:     { cls: 'bg-red-50 text-red-600 font-semibold border border-red-200', label: (d) => `Urgent · ${d}d overdue` },
  standard: { cls: 'bg-orange-50 text-orange-600 border border-orange-200', label: (d) => `Overdue · ${d}d` },
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
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const [archiveBulkModal, setArchiveBulkModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Invoice.list('-created_date');
    setInvoices(filterActiveRecords(data));
    
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

  const handleDeleteSelected = () => {
    setArchiveBulkModal(true);
  };

  const handleConfirmBulkArchive = async (reason) => {
    setArchiveBulkModal(false);
    const idsArray = Array.from(selectedIds);
    await softDeleteMany(base44.entities.Invoice, idsArray, actor, reason);
    await Promise.all(idsArray.map(id => logAuditEvent('archive', 'Invoice', id, actor, { reason })));
    setSelectedIds(new Set());
    setInvoices(invoices.filter(i => !selectedIds.has(i.id)));
    toast.success(`${idsArray.length} invoice(s) archived`);
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
      <ArchiveReasonModal
        open={archiveBulkModal}
        onCancel={() => setArchiveBulkModal(false)}
        onConfirm={handleConfirmBulkArchive}
        count={selectedIds.size}
        entityLabel="Invoice"
      />
      <PageHeader title="Invoices" subtitle={`${invoices.length} total`} />

      <PageShell>
        {/* Financial Overview */}
        <CashflowSummary />

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'today', label: 'Hoy' },
              { key: 'overdue', label: 'Vencidos' },
              { key: 'high', label: 'Urgentes' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActionFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  actionFilter === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Todos</span>
            </label>
          )}

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar facturas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </div>

        {/* Invoice list */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse bg-slate-100 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sin facturas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-primary">{selectedIds.size} seleccionadas</span>
                <Button size="sm" variant="destructive" className="gap-1.5 h-7 text-xs" onClick={handleDeleteSelected}>
                  <Trash2 className="w-3 h-3" /> Archivar
                </Button>
              </div>
            )}

            {filtered.map(inv => {
              const evidence = evidenceCache[inv.id];
              const isOverdue = isInvoiceOverdue(inv);
              const nextAction = getInvoiceNextAction(inv);
              const followUpTiming = getInvoiceFollowUpTiming(inv);
              const balanceDue = (inv.total || 0) - (inv.amount_paid || 0);

              return (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}
                  className={`group bg-white border rounded-xl px-4 py-3.5 cursor-pointer hover:shadow-sm transition-all ${
                    isOverdue ? 'border-red-200 bg-red-50/20' : 'border-border hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <label className="flex-shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: ID + client + status badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-primary tabular-nums">INV#{inv.invoice_number}</span>
                        <span className="font-semibold text-sm text-slate-800 truncate">{inv.client_name}</span>
                        {inv.amount_paid > 0 && inv.amount_paid < inv.total ? (
                          <StatusBadge status="partial" />
                        ) : (
                          <StatusBadge status={inv.status} />
                        )}
                        {isOverdue && (() => {
                          const band = getEscalationBand(inv);
                          const cfg = ESCALATION_BADGE[band] || ESCALATION_BADGE.standard;
                          const days = getOverdueDays(inv);
                          return (
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 ${cfg.cls}`}>
                              <AlertTriangle className="w-2.5 h-2.5" />{cfg.label(days)}
                            </span>
                          );
                        })()}
                        {followUpTiming && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 border ${
                            followUpTiming.urgency === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                            followUpTiming.urgency === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>
                            <Clock className="w-2.5 h-2.5" />{followUpTiming.label}
                          </span>
                        )}
                        {evidence && !evidence.isComplete && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />Evidencia incompleta
                          </span>
                        )}
                      </div>

                      {/* Row 2: financial + date info */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">${(inv.total || 0).toFixed(2)}</span>
                        {inv.amount_paid > 0 && (
                          <span className="text-xs text-green-600 font-medium">Pagado: ${(inv.amount_paid || 0).toFixed(2)}</span>
                        )}
                        {inv.amount_paid > 0 && inv.amount_paid < inv.total && (
                          <span className="text-xs text-amber-600 font-medium">Saldo: ${balanceDue.toFixed(2)}</span>
                        )}
                        {inv.due_date && (
                          <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                            Vence: {inv.due_date}
                          </span>
                        )}
                        {inv.client_address && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 hidden sm:flex">
                            <MapPin className="w-3 h-3" />{inv.client_address}
                          </span>
                        )}
                      </div>

                      {/* Row 3: next action + 1-click follow-up */}
                      {(nextAction || (followUpTiming && (followUpTiming.urgency === 'high' || followUpTiming.next_follow_up_in_days === 0 || isOverdue) && inv.status !== 'paid')) && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {nextAction && (
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] flex items-center gap-1 border ${nextAction.bg}`}>
                              <nextAction.icon className={`w-3 h-3 ${nextAction.color}`} />
                              <span className={nextAction.color}>{nextAction.label}</span>
                            </span>
                          )}
                          {followUpTiming && (followUpTiming.urgency === 'high' || followUpTiming.next_follow_up_in_days === 0 || isOverdue) && inv.status !== 'paid' && (
                            <button
                              onClick={(e) => handleOneClickFollowUp(e, inv)}
                              disabled={followingUp === inv.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors disabled:opacity-60"
                            >
                              <Zap className="w-2.5 h-2.5" />
                              {followingUp === inv.id ? 'Copiando...' : '1-Click Follow-Up'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
                      }