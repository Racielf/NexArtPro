import React, { useState, useEffect, useCallback } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { evaluateWorkOrderEvidence } from '@/lib/workOrderEvidence';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Pencil, Check, X, MapPin, Calendar, AlertCircle,
  FileText, Camera, MessageSquare, GitBranch, ListChecks, Activity,
  Printer, Mail, Plus, CheckCircle2, Save,
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import WOLineItemsTab   from '@/components/workorders/WOLineItemsTab';
import WOPhotosTab      from '@/components/workorders/WOPhotosTab';
import WOCommsTab       from '@/components/workorders/WOCommsTab';
import WOChangeOrdersTab from '@/components/workorders/WOChangeOrdersTab';
import WODocumentTab    from '@/components/workorders/WODocumentTab';
import WOActivityLogTab from '@/components/workorders/WOActivityLogTab';

const PRIORITY_STYLE = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-slate-100 text-slate-600 border-slate-200',
  normal: 'bg-slate-100 text-slate-600 border-slate-200',
};

function fmt(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function woNumber(wo) {
  const n = wo?.work_order_number || wo?.wo_number;
  if (!n) return null;
  const yr = wo.created_date ? new Date(wo.created_date).getFullYear() : new Date().getFullYear();
  return `WO-${yr}-${String(n).padStart(4, '0')}`;
}

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [workOrder, setWorkOrder]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('items');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]    = useState('');
  const [savedAt, setSavedAt]          = useState(null);
  const [advancing, setAdvancing]      = useState(false);

  // tab counts
  const [itemCount, setItemCount]   = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [commCount,  setCommCount]  = useState(0);
  const [coCount,    setCoCount]    = useState(0);

  const loadWorkOrder = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    try {
      const list = await nexartClient.entities.WorkOrder.filter({ id });
      if (list.length) {
        setWorkOrder(list[0]);
        setTitleDraft(list[0].title || '');
      }
    } catch (e) {
      toast.error('Could not load work order');
    }
    setLoading(false);
  }, [id]);

  const loadCounts = useCallback(async () => {
    if (!id) return;
    try {
      const [items, photos, comms, cos] = await Promise.all([
        nexartClient.entities.WorkOrderLineItem.filter({ work_order_id: id }),
        nexartClient.entities.WorkOrderPhoto.filter({ work_order_id: id }),
        nexartClient.entities.WorkOrderComm.filter({ work_order_id: id }),
        nexartClient.entities.ChangeOrder.filter({ work_order_id: id }),
      ]);
      setItemCount(items?.length || 0);
      setPhotoCount(photos?.length || 0);
      setCommCount(comms?.length || 0);
      setCoCount(cos?.length || 0);
    } catch (_) {}
  }, [id]);

  useEffect(() => {
    loadWorkOrder();
    loadCounts();
  }, [loadWorkOrder, loadCounts]);

  const saveTitle = async () => {
    if (!titleDraft.trim()) return;
    await nexartClient.entities.WorkOrder.update(id, { title: titleDraft.trim() });
    setWorkOrder(prev => ({ ...prev, title: titleDraft.trim() }));
    setEditingTitle(false);
    setSavedAt(new Date());
    toast.success('Title saved');
  };

  const advanceStatus = async () => {
    const STATUS_NEXT = {
      draft:       'assigned',
      assigned:    'scheduled',
      scheduled:   'on_the_way',
      on_the_way:  'in_progress',
      in_progress: 'completed',
    };
    const next = STATUS_NEXT[workOrder.status];
    if (!next) return;
    if (next === 'completed') {
      const ev = evaluateWorkOrderEvidence(workOrder, { photoCount });
      if (!ev.isComplete) {
        toast.error(`Missing: ${ev.missingItems.join(', ')}`);
        return;
      }
    }
    setAdvancing(true);
    const patch = { status: next };
    if (next === 'completed') patch.completed_at = new Date().toISOString();
    await nexartClient.entities.WorkOrder.update(id, patch);
    setWorkOrder(prev => ({ ...prev, ...patch }));
    setSavedAt(new Date());
    setAdvancing(false);
    toast.success(`Status → ${next.replace(/_/g, ' ')}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!workOrder) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Work Order not found</p>
        <Button onClick={() => navigate('/work-orders')}>← Back to Work Orders</Button>
      </div>
    </div>
  );

  const wo = workOrder;
  const woNum = woNumber(wo);
  const completedItems = itemCount > 0 ? itemCount : 0;
  const totalValue = wo.total || wo.subtotal || 0;
  const pct = itemCount > 0 ? Math.round((completedItems / itemCount) * 100) : 0;
  const priority = (wo.priority || 'normal').toLowerCase();

  const STATUS_NEXT_LABEL = {
    draft:       'Mark Assigned',
    assigned:    'Mark Scheduled',
    scheduled:   'On My Way',
    on_the_way:  'Mark In Progress',
    in_progress: 'Mark Completed',
  };
  const nextLabel = STATUS_NEXT_LABEL[wo.status];

  const TABS = [
    { id: 'items',   label: 'Line Items',     icon: ListChecks,    count: itemCount },
    { id: 'doc',     label: 'Document',       icon: FileText,      count: null },
    { id: 'photos',  label: 'Photos',         icon: Camera,        count: photoCount },
    { id: 'comms',   label: 'Communications', icon: MessageSquare, count: commCount },
    { id: 'changes', label: 'Change Orders',  icon: GitBranch,     count: coCount },
    { id: 'log',     label: 'Activity Log',   icon: Activity,      count: null },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f0]">

      {/* ── Top nav bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <button
          onClick={() => navigate('/work-orders')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Work Orders
        </button>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Saved
            </span>
          )}
          <Button
            size="sm"
            className="gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white"
            onClick={() => navigate('/work-orders')}
          >
            <Plus className="w-3.5 h-3.5" /> New Work Order
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">

        {/* ── Page title + action buttons ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Work Order Detail</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-slate-600">
              <Printer className="w-3.5 h-3.5" /> Generate PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-slate-600">
              <Mail className="w-3.5 h-3.5" /> Send Email
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white"
              onClick={() => setActiveTab('items')}
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </Button>
          </div>
        </div>

        {/* ── WO Header card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between gap-6">

              {/* Left: WO number + status + title + info chips */}
              <div className="flex-1 min-w-0 space-y-3">

                {/* WO number + status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {woNum && (
                    <span className="text-sm font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {woNum}
                    </span>
                  )}
                  <StatusBadge status={wo.status} />
                  {priority && priority !== 'normal' && priority !== 'low' && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLE[priority] || PRIORITY_STYLE.normal}`}>
                      ● {priority}
                    </span>
                  )}
                </div>

                {/* Editable title */}
                <div className="flex items-center gap-2">
                  {editingTitle ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        type="text"
                        value={titleDraft}
                        onChange={e => setTitleDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                        className="flex-1 text-lg font-bold text-slate-900 border-b-2 border-primary outline-none bg-transparent"
                      />
                      <button onClick={saveTitle} className="p-1 rounded text-emerald-600 hover:bg-emerald-50">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTitle(false)} className="p-1 rounded text-slate-400 hover:bg-slate-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-slate-900">
                        {wo.title || wo.description || 'Untitled Work Order'}
                      </h2>
                      <button
                        onClick={() => setEditingTitle(true)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Info chips */}
                <div className="flex items-center gap-3 flex-wrap text-sm text-slate-600">
                  {wo.assigned_worker_name && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {wo.assigned_worker_name.charAt(0).toUpperCase()}
                      </span>
                      {wo.assigned_worker_name}
                    </span>
                  )}
                  {wo.client_address && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {wo.client_address}
                    </span>
                  )}
                  {wo.service_type && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {wo.service_type}
                    </span>
                  )}
                  {wo.created_date && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar className="w-3 h-3" />
                      Created: {fmt(wo.created_date)}
                    </span>
                  )}
                  {wo.scheduled_date && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar className="w-3 h-3" />
                      Target: {fmt(wo.scheduled_date)}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Total Estimate + progress */}
              <div className="flex-shrink-0 text-right min-w-[140px]">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Estimate</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {totalValue > 0 ? `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '—'}
                </p>
                {itemCount > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">{itemCount}/{itemCount} items complete</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status advance bar */}
            {nextLabel && wo.status !== 'completed' && wo.status !== 'invoiced' && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Status: <span className="font-semibold text-slate-700 capitalize">{wo.status.replace(/_/g, ' ')}</span>
                </p>
                <Button
                  size="sm"
                  onClick={advanceStatus}
                  disabled={advancing}
                  className={wo.status === 'in_progress' ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5' : 'gap-1.5'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {advancing ? 'Saving…' : nextLabel}
                </Button>
              </div>
            )}

            {wo.status === 'completed' && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <p className="text-sm font-semibold">Completed</p>
                {wo.completed_at && (
                  <p className="text-xs text-emerald-500">{fmt(wo.completed_at)}</p>
                )}
              </div>
            )}
          </div>

          {/* ── Tab bar ── */}
          <div className="border-t border-slate-100 px-2 flex overflow-x-auto scrollbar-hide">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    active
                      ? 'border-[#d97706] text-[#d97706]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count != null && tab.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      active ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {activeTab === 'items'   && <WOLineItemsTab workOrderId={id} />}
          {activeTab === 'doc'     && <WODocumentTab workOrderId={id} workOrder={wo} />}
          {activeTab === 'photos'  && <WOPhotosTab workOrderId={id} />}
          {activeTab === 'comms'   && <WOCommsTab workOrderId={id} />}
          {activeTab === 'changes' && <WOChangeOrdersTab workOrderId={id} workOrderTotal={wo.total} />}
          {activeTab === 'log'     && <WOActivityLogTab workOrder={wo} />}
        </div>

      </div>
    </div>
  );
}
