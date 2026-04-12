import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { normalizeLineItem } from '@/lib/lineItemNormalizer';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Pencil, Eye, Printer, Send, CheckCircle2,
  User, Phone, Mail, MapPin, Calendar, Briefcase, Clock,
  ClipboardList
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import WOTimeTracking from '@/components/workorders/WOTimeTracking';
import WOExpenses from '@/components/workorders/WOExpenses';
import WOReceipts from '@/components/workorders/WOReceipts';
import WorkOrderPreviewModal from '@/components/workorders/WorkOrderPreviewModal';

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taskStatuses, setTaskStatuses] = useState({});
  const [execution, setExecution] = useState({ work_summary: '', notes: '', issues_found: '' });
  const [savingExecution, setSavingExecution] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { loadWorkOrder(); }, [id]);

  const loadWorkOrder = async () => {
    if (!id) { setLoading(false); return; }
    const list = await base44.entities.WorkOrder.filter({ id });
    if (list.length) {
      const wo = list[0];
      setWorkOrder(wo);
      setTaskStatuses(wo.task_statuses || {});
      setExecution({
        work_summary: wo.work_summary || '',
        notes: wo.notes || '',
        issues_found: wo.issues_found || '',
      });
    }
    setLoading(false);
  };

  const saveExecution = async () => {
    setSavingExecution(true);
    await base44.entities.WorkOrder.update(id, execution);
    setSavingExecution(false);
  };

  const markCompleted = async () => {
    setCompleting(true);
    await base44.entities.WorkOrder.update(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    setWorkOrder(prev => ({ ...prev, status: 'completed', completed_at: new Date().toISOString() }));
    setCompleting(false);
    toast.success('Work order marked as completed!');
  };

  const toggleTask = async (itemId) => {
    const isDone = taskStatuses[itemId]?.status === 'done';
    const updated = {
      ...taskStatuses,
      [itemId]: isDone
        ? { status: 'pending' }
        : { status: 'done', completed_at: new Date().toISOString() }
    };
    setTaskStatuses(updated);
    await base44.entities.WorkOrder.update(id, { task_statuses: updated });
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

  // Build items list: from groups first, then fall back to flat line_items
  // Normalize all items to canonical shape (handles legacy aliases like name→service_name)
  const groupItems = (workOrder.groups || []).flatMap(g => (g.items || []).map(normalizeLineItem));
  const flatItems = (workOrder.line_items || []).map(li => normalizeLineItem(li));
  const allItems = groupItems.length > 0 ? groupItems : flatItems;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">

          {/* Back */}
          <button
            onClick={() => navigate('/work-orders')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Work Orders
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 whitespace-nowrap">
                Work Order #{workOrder.work_order_number}
              </h1>
              <StatusBadge status={workOrder.status} />
            </div>
            <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />{workOrder.client_name}
              </span>
              {workOrder.client_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{workOrder.client_address}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowPreview(true)}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowPreview(true)}>
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowPreview(true)}>
              <Send className="w-3.5 h-3.5" /> Send
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Customer</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                  {workOrder.client_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">{workOrder.client_name}</p>
              </div>
              {workOrder.client_phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {workOrder.client_phone}
                </div>
              )}
              {workOrder.client_email && (
                <div className="flex items-center gap-2 text-sm text-slate-600 break-all">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {workOrder.client_email}
                </div>
              )}
              {workOrder.client_address && (
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  {workOrder.client_address}
                </div>
              )}
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Job Details</p>
            <div className="space-y-3.5">

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Status</p>
                <StatusBadge status={workOrder.status} />
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Assigned Worker</p>
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.assigned_worker_name
                    ? <span>{workOrder.assigned_worker_name}</span>
                    : <span className="text-slate-400 italic">Unassigned</span>}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Scheduled Date</p>
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.scheduled_date
                    ? <span>{workOrder.scheduled_date}</span>
                    : <span className="text-slate-400 italic">Not set</span>}
                </div>
              </div>

              {workOrder.scheduled_time && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Time</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {workOrder.scheduled_time}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          {(workOrder.subtotal != null || workOrder.total != null) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Summary</p>
              <div className="space-y-1.5 text-sm">
                {workOrder.subtotal != null && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>${workOrder.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {workOrder.total != null && (
                  <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-100 pt-1.5 mt-1">
                    <span>Total</span>
                    <span>${workOrder.total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* 1. Scope of Work */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Scope of Work</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{workOrder.title || '—'}</p>
                {workOrder.description && (
                  <p className="text-sm text-slate-500 mt-1">{workOrder.description}</p>
                )}
              </div>

              {allItems.length > 0 ? (
                <div className="space-y-2">
                  {/* Progress bar */}
                  {(() => {
                    const doneCount = allItems.filter(item => taskStatuses[item.id || item.service_name]?.status === 'done').length;
                    const pct = Math.round((doneCount / allItems.length) * 100);
                    return (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{doneCount}/{allItems.length} done</span>
                      </div>
                    );
                  })()}
                  {allItems.map((item, i) => {
                    const key = item.id || item.service_name || String(i);
                    const isDone = taskStatuses[key]?.status === 'done';
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTask(key)}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                          isDone
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isDone ? 'bg-green-500 border-green-500' : 'border-slate-300'
                        }`}>
                          {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {item.service_name}
                          </p>
                          {item.description && (
                            <p className={`text-xs mt-0.5 ${isDone ? 'text-slate-300' : 'text-slate-400'}`}>{item.description}</p>
                          )}
                          {isDone && taskStatuses[key]?.completed_at && (
                            <p className="text-[10px] text-green-600 mt-1">
                              Completed {new Date(taskStatuses[key].completed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          isDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isDone ? 'Done' : 'Pending'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400">
                  <ClipboardList className="w-6 h-6 mb-2" />
                  <p className="text-sm">No services listed</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Work Execution */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-slate-900">Work Execution</h2>
              </div>
              <Button size="sm" onClick={saveExecution} disabled={savingExecution} className="gap-1.5">
                {savingExecution ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">What was done</label>
                <textarea
                  className="w-full h-28 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Describe the work performed…"
                  value={execution.work_summary}
                  onChange={e => setExecution(prev => ({ ...prev, work_summary: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Observations / Notes</label>
                <textarea
                  className="w-full h-20 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Any observations or additional notes…"
                  value={execution.notes}
                  onChange={e => setExecution(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Issues Found</label>
                <textarea
                  className="w-full h-20 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Problems encountered, items needing follow-up…"
                  value={execution.issues_found}
                  onChange={e => setExecution(prev => ({ ...prev, issues_found: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* 3. Time Tracking */}
          <WOTimeTracking
            workOrderId={id}
            initialArrival={workOrder.arrival_time}
            initialDeparture={workOrder.departure_time}
          />

          {/* 4. Materials & Expenses */}
          <WOExpenses workOrderId={id} workOrderNumber={workOrder.work_order_number} />

          {/* 5. Receipts & Photos */}
          <WOReceipts
            workOrderId={id}
            workOrderNumber={workOrder.work_order_number}
            clientName={workOrder.client_name}
          />

          {/* ── FOOTER ── */}
          {(() => {
            const STATUS_NEXT = {
              draft:       { next: 'assigned',    label: 'Mark Assigned' },
              assigned:    { next: 'scheduled',   label: 'Mark Scheduled' },
              scheduled:   { next: 'on_the_way',  label: 'On My Way' },
              on_the_way:  { next: 'in_progress', label: 'Mark In Progress' },
              in_progress: { next: 'completed',   label: 'Mark Completed' },
            };
            const step = STATUS_NEXT[workOrder.status];
            const isCompleted = workOrder.status === 'completed';
            const isInvoiced  = workOrder.status === 'invoiced';

            if (isCompleted) return (
              <div className="rounded-xl border border-green-200 bg-green-50 shadow-sm px-6 py-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Work Order Completed</p>
                  {workOrder.completed_at && (
                    <p className="text-xs text-green-600 mt-0.5">{new Date(workOrder.completed_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            );

            if (isInvoiced || !step) return null;

            const advance = async () => {
              const patch = { status: step.next };
              if (step.next === 'completed') patch.completed_at = new Date().toISOString();
              setCompleting(true);
              await base44.entities.WorkOrder.update(id, patch);
              setWorkOrder(prev => ({ ...prev, ...patch }));
              setCompleting(false);
              toast.success(`Status updated to ${step.next.replace('_', ' ')}`);
            };

            return (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Current: <span className="font-semibold text-slate-700">{workOrder.status.replace(/_/g, ' ')}</span>
                </p>
                <Button
                  className={`gap-2 ${step.next === 'completed' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  onClick={advance}
                  disabled={completing}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {completing ? 'Saving…' : step.label}
                </Button>
              </div>
            );
          })()}

        </div>
      </div>
      {showPreview && (
        <WorkOrderPreviewModal
          workOrder={workOrder}
          taskStatuses={taskStatuses}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}