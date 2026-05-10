import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { Receipt, Search, MapPin, ChevronRight, Trash2, AlertTriangle, Clock, Plus } from 'lucide-react';

import CashflowSummary from '@/components/invoices/CashflowSummary';
import SLAMetricsPanel from '@/components/invoices/SLAMetricsPanel';
import OwnerAccountabilityPanel from '@/components/invoices/OwnerAccountabilityPanel';
import { evaluateWorkOrderEvidence } from '@/lib/workOrderEvidence';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';


import { getInvoiceNextAction, getInvoiceFollowUpTiming } from '@/lib/nextActionLogic';
import { filterInvoicesByAction, sortInvoicesByUrgency } from '@/lib/invoiceActionFilter';
import { executeOneClickFollowUp } from '@/lib/invoiceActionHelpers';
import { getEscalationBand, getOverdueDays } from '@/lib/invoiceMessageTemplates';
import { Zap } from 'lucide-react';
import { buildOperatorQueue } from '@/lib/invoiceOperatorQueue';
import { detectSLABreaches } from '@/lib/invoiceSLA';
import { filterInvoicesBySLAMetric } from '@/lib/invoiceSLAMetrics';
import { archiveManyWithSnapshot, filterActiveRecords } from '@/lib/softDelete';
import DeleteReasonModal from '@/components/shared/DeleteReasonModal';
import { useAuth } from '@/lib/AuthContext';
import CollectionCapacityPanel from '@/components/invoices/CollectionCapacityPanel';
import BillingIssueOwnerSelect from '@/components/invoices/BillingIssueOwnerSelect';
import { getInvoiceWorkloadCategory } from '@/lib/invoiceCollectionWorkload';
import { normalizeBillingOwner, getRecentOwners } from '@/lib/billingOwnerNormalization';

const ESCALATION_BADGE = {
  urgent:   { cls: 'bg-red-100 text-red-700 font-bold border border-red-200', label: (d) => `Final Notice · ${d}d overdue` },
  firm:     { cls: 'bg-red-50 text-red-600 font-semibold border border-red-200', label: (d) => `Urgent · ${d}d overdue` },
  standard: { cls: 'bg-orange-50 text-orange-600 border border-orange-200', label: (d) => `Overdue · ${d}d` },
};

// Status filter tabs — matches reference repo UX
const STATUS_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'draft',    label: 'Draft' },
  { key: 'sent',     label: 'Sent' },
  { key: 'partial',  label: 'Partial' },
  { key: 'paid',     label: 'Paid' },
  { key: 'overdue',  label: 'Overdue' },
  { key: 'void',     label: 'Void' },
];

function matchesStatusTab(inv, tab) {
  if (tab === 'all') return true;
  const derived = computeInvoiceDerivedFields(inv);
  if (tab === 'partial') return derived.payment_status === 'partial';
  if (tab === 'paid') return derived.payment_status === 'paid';
  if (tab === 'overdue') return isInvoiceOverdue(inv) && derived.payment_status !== 'paid';
  return inv.status === tab;
}

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'today' | 'overdue' | 'high'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [evidenceCache, setEvidenceCache] = useState({});
  const [followingUp, setFollowingUp] = useState(null);
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const [archiveBulkModal, setArchiveBulkModal] = useState(false);
  const [capacityFilterOwner, setCapacityFilterOwner] = useState(null);
  const [capacityFilterCategory, setCapacityFilterCategory] = useState(null);
  const [slaFilterDimension, setSLAFilterDimension] = useState(null);
  const [slaFilterValue, setSLAFilterValue] = useState(null);

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

  // List-level send/mark-paid/print are handled inside InvoiceDetail.
  // Kept as stubs for future list-level actions.

  const searchFiltered = invoices.filter(i =>
    i.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(i.invoice_number).includes(search)
  );

  // Apply status tab filter first (reference repo UX)
  const statusTabFiltered = searchFiltered.filter(i => matchesStatusTab(i, statusFilter));

  // Apply SLA drill-down filter if set
  let slaFiltered = statusTabFiltered;
  if (slaFilterDimension && slaFilterValue) {
    slaFiltered = filterInvoicesBySLAMetric(statusTabFiltered, slaFilterDimension, slaFilterValue);
  }
  
  // Apply capacity drill-down filters if set
  let capacityFiltered = slaFiltered;
  if (capacityFilterCategory === 'unassigned_urgent') {
    capacityFiltered = slaFiltered.filter(i => {
      const workloadCategory = getInvoiceWorkloadCategory(i);
      return workloadCategory === 'urgent' && !i.billing_issue_owner;
    });
  } else if (capacityFilterOwner) {
    capacityFiltered = slaFiltered.filter(i => i.billing_issue_owner === capacityFilterOwner);
    if (capacityFilterCategory === 'urgent') {
      capacityFiltered = capacityFiltered.filter(i => getInvoiceWorkloadCategory(i) === 'urgent');
    } else if (capacityFilterCategory === 'action_today') {
      capacityFiltered = capacityFiltered.filter(i => getInvoiceWorkloadCategory(i) === 'action_today');
    } else if (capacityFilterCategory === 'billing_issue') {
      capacityFiltered = capacityFiltered.filter(i => i.billing_issue_status === 'open');
    }
  }
  
  const actionFiltered = filterInvoicesByAction(capacityFiltered, actionFilter);
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
    await archiveManyWithSnapshot(base44.entities.Invoice, 'Invoice', idsArray, actor, reason);
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

  const handleSLADrillDown = (dimension, value) => {
    setSLAFilterDimension(dimension);
    setSLAFilterValue(value);
    setCapacityFilterOwner(null);
    setCapacityFilterCategory(null);
    setActionFilter('all');
    setSearch('');
  };

  const handleOwnerSelect = (owner) => {
    setCapacityFilterOwner(owner);
    setCapacityFilterCategory(null);
    setSLAFilterDimension(null);
    setSLAFilterValue(null);
    setActionFilter('all');
    setSearch('');
  };

  const totalOutstanding = invoices.filter(i => !['paid','void'].includes(i.status) && computeInvoiceDerivedFields(i).balance_due > 0).reduce((s, i) => s + (computeInvoiceDerivedFields(i).balance_due || 0), 0);
  const recentOwners = getRecentOwners(invoices, 5);

  return (
    <div className="flex flex-col h-full">
      <DeleteReasonModal
        open={archiveBulkModal}
        onCancel={() => setArchiveBulkModal(false)}
        onConfirm={handleConfirmBulkArchive}
        count={selectedIds.size}
        entityLabel="Invoice"
      />
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total${totalOutstanding > 0 ? ` · $${totalOutstanding.toFixed(2)} outstanding` : ''}`}
        actionLabel="Create Invoice"
        onAction={() => navigate('/invoice-create')}
      />

      <PageShell>
         {/* Financial Overview */}
         <CashflowSummary />

         {/* SLA Metrics Dashboard */}
         <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
           <h2 className="text-sm font-bold text-slate-900 mb-4">SLA Performance</h2>
           <SLAMetricsPanel invoices={invoices} onDrillDown={handleSLADrillDown} />
         </div>

         {/* Owner Accountability */}
         <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
           <h2 className="text-sm font-bold text-slate-900 mb-4">Owner Accountability</h2>
           <OwnerAccountabilityPanel invoices={invoices} onOwnerSelect={handleOwnerSelect} />
         </div>

         {/* Team Collection Capacity */}
         <CollectionCapacityPanel 
           invoices={invoices}
           onAssignmentChange={() => loadData()}
           onFilterChange={(filterConfig) => {
             setCapacityFilterOwner(filterConfig.owner || null);
             setCapacityFilterCategory(filterConfig.category || null);
             setActionFilter('all'); // reset action filter
             setSearch(''); // reset search
           }}
         />

         {/* Operator Queue — top actionable invoices */}
         {!loading && invoices.length > 0 && (() => {
           const queue = buildOperatorQueue(invoices);
           const hasQueue = queue.urgent_now.length > 0 || queue.follow_up_today.length > 0 || queue.billing_issues.length > 0;
           return hasQueue ? (
             <div className="space-y-2.5">
               {queue.urgent_now.length > 0 && (
                 <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
                   <div className="px-4 py-2.5 bg-red-50 flex items-center gap-2 border-b border-red-100">
                     <span className="text-lg">🔴</span>
                     <span className="text-xs font-bold uppercase tracking-widest text-red-700">Urgent Now</span>
                     <span className="ml-auto text-xs font-bold text-red-600">{queue.urgent_now.length}</span>
                   </div>
                   <div className="divide-y divide-slate-100">
                     {queue.urgent_now.slice(0, 3).map(inv => (
                       <div key={inv.id} onClick={() => navigate(`/invoice-detail?id=${inv.id}`)} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-red-50/30 cursor-pointer transition-colors">
                         <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-xs font-bold text-primary">INV#{inv.invoice_number}</span>
                             <span className="text-sm font-semibold text-slate-800 truncate">{inv.client_name}</span>
                           </div>
                           <p className="text-xs text-slate-500 mt-0.5">${(computeInvoiceDerivedFields(inv).balance_due).toFixed(2)} due</p>
                         </div>
                         <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                       </div>
                     ))}
                   </div>
                 </div>
               )}
               {queue.follow_up_today.length > 0 && (
                 <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
                   <div className="px-4 py-2.5 bg-amber-50 flex items-center gap-2 border-b border-amber-100">
                     <span className="text-lg">🟠</span>
                     <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Follow-up Today</span>
                     <span className="ml-auto text-xs font-bold text-amber-600">{queue.follow_up_today.length}</span>
                   </div>
                   <div className="divide-y divide-slate-100">
                     {queue.follow_up_today.slice(0, 3).map(inv => (
                       <div key={inv.id} onClick={() => navigate(`/invoice-detail?id=${inv.id}`)} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-50/30 cursor-pointer transition-colors">
                         <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-xs font-bold text-primary">INV#{inv.invoice_number}</span>
                             <span className="text-sm font-semibold text-slate-800 truncate">{inv.client_name}</span>
                           </div>
                           <p className="text-xs text-slate-500 mt-0.5">${(computeInvoiceDerivedFields(inv).balance_due).toFixed(2)} due</p>
                         </div>
                         <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                       </div>
                     ))}
                   </div>
                 </div>
               )}
               {queue.billing_issues.length > 0 && (
                 <div className="bg-white border border-blue-200 rounded-xl overflow-hidden">
                   <div className="px-4 py-2.5 bg-blue-50 flex items-center gap-2 border-b border-blue-100">
                     <span className="text-lg">🔵</span>
                     <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Billing Issues</span>
                     <span className="ml-auto text-xs font-bold text-blue-600">{queue.billing_issues.length}</span>
                   </div>
                   <div className="divide-y divide-slate-100">
                     {queue.billing_issues.slice(0, 3).map(inv => (
                       <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-blue-50/30 transition-colors group">
                         <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}>
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-xs font-bold text-primary">INV#{inv.invoice_number}</span>
                             <span className="text-sm font-semibold text-slate-800 truncate">{inv.client_name}</span>
                           </div>
                           <p className="text-xs text-slate-500 mt-0.5">${(computeInvoiceDerivedFields(inv).balance_due).toFixed(2)} due</p>
                         </div>
                         <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                           <BillingIssueOwnerSelect
                             currentOwner={inv.billing_issue_owner}
                             compact
                             recentOwners={recentOwners}
                             onAssign={async (owner) => {
                               const normalized = normalizeBillingOwner(owner);
                               if (normalized) {
                                 await base44.entities.Invoice.update(inv.id, { billing_issue_owner: normalized });
                                 loadData();
                               }
                             }}
                           />
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           ) : null;
         })()}

         {/* Active filter badges */}
         {(slaFilterDimension || capacityFilterOwner || capacityFilterCategory) && (
          <div className="flex items-center gap-2 flex-wrap">
            {slaFilterDimension && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-xs font-medium text-purple-700">
                  SLA: {slaFilterDimension} = {slaFilterValue}
                </span>
                <button
                  onClick={() => {
                    setSLAFilterDimension(null);
                    setSLAFilterValue(null);
                  }}
                  className="text-purple-600 hover:text-purple-700 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}
            {(capacityFilterOwner || capacityFilterCategory) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-xs font-medium text-blue-700">
                  Capacity: {capacityFilterOwner ? `${capacityFilterOwner} - ${capacityFilterCategory || 'all'}` : 'Unassigned urgent'}
                </span>
                <button
                  onClick={() => {
                    setCapacityFilterOwner(null);
                    setCapacityFilterCategory(null);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
         )}

         {/* ── STATUS FILTER TABS (reference repo style) ── */}
         <div className="flex gap-1.5 overflow-x-auto pb-0.5">
           {STATUS_TABS.map(tab => {
             const count = tab.key === 'all' ? invoices.length : invoices.filter(i => matchesStatusTab(i, tab.key)).length;
             return (
               <button
                 key={tab.key}
                 onClick={() => { setStatusFilter(tab.key); setActionFilter('all'); }}
                 className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                   statusFilter === tab.key
                     ? 'bg-primary text-white shadow-sm'
                     : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                 }`}
               >
                 {tab.label}
                 {count > 0 && (
                   <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${
                     statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                   }`}>{count}</span>
                 )}
               </button>
             );
           })}
         </div>

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
            <p className="text-sm text-muted-foreground mb-4">Sin facturas</p>
            <Button variant="outline" onClick={() => navigate('/invoice-create')} className="gap-1.5"><Plus className="w-4 h-4" />Create your first invoice</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-primary">{selectedIds.size} seleccionadas</span>
                <Button size="sm" variant="destructive" className="gap-1.5 h-7 text-xs" onClick={handleDeleteSelected}>
                   <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            )}

            {filtered.map(inv => {
              const evidence = evidenceCache[inv.id];
              const isOverdue = isInvoiceOverdue(inv);
              const nextAction = getInvoiceNextAction(inv);
              const followUpTiming = getInvoiceFollowUpTiming(inv);
              const balanceDue = (inv.total || 0) - (inv.amount_paid || 0);
              const breaches = detectSLABreaches(inv);

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
                        {(() => {
                           const criticalBreach = breaches.find(b => b.severity === 'critical');
                           const highBreach = breaches.find(b => b.severity === 'high');
                           if (criticalBreach) {
                             return (
                               <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border bg-red-100 text-red-700 border-red-300">
                                 🔴 SLA BREACH
                               </span>
                             );
                           }
                           if (highBreach) {
                             return (
                               <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border bg-amber-100 text-amber-700 border-amber-300">
                                 🟠 SLA ALERT
                               </span>
                             );
                           }
                           return followUpTiming && (
                             <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 border ${
                               followUpTiming.urgency === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                               followUpTiming.urgency === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                               'bg-blue-50 text-blue-600 border-blue-200'
                             }`}>
                               <Clock className="w-2.5 h-2.5" />{followUpTiming.label}
                             </span>
                           );
                         })()}
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