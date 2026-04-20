import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { normalizeLineItem } from '@/lib/lineItemNormalizer';
import { evaluateWorkOrderEvidence } from '@/lib/workOrderEvidence';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Pencil, Eye, Printer, Send, CheckCircle2,
  User, Phone, Mail, MapPin, Calendar, Briefcase, Clock,
  ClipboardList, Play, Square, Trash2
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import WOTimeTracking from '@/components/workorders/WOTimeTracking';
import WOExpenses from '@/components/workorders/WOExpenses';
import WOReceipts from '@/components/workorders/WOReceipts';
import WOFieldExecution from '@/components/workorders/WOFieldExecution';
import WOCompletionEvidence from '@/components/workorders/WOCompletionEvidence';
import WorkOrderPreviewModal from '@/components/workorders/WorkOrderPreviewModal';
import JobProfitSummary from '@/components/workorders/JobProfitSummary';

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState({});
  const [execution, setExecution] = useState({ work_summary: '', notes: '', issues_found: '' });
  const [savingExecution, setSavingExecution] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState('');

  useEffect(() => { loadWorkOrder(); }, [id]);

  const loadWorkOrder = async () => {
    if (!id) { setLoading(false); return; }
    const list = await base44.entities.WorkOrder.filter({ id });
    if (list.length) {
      const wo = list[0];
      const photos = await base44.entities.ProjectPhoto.filter({ work_order_id: id });
      const enriched = { ...wo, photos_count: photos?.length || 0 };
      setWorkOrder(enriched);
      setTasks(enriched.tasks || []);
      setTaskStatuses(enriched.task_statuses || {});
      setExecution({
        work_summary: enriched.work_summary || '',
        notes: enriched.notes || '',
        issues_found: enriched.issues_found || '',
      });
    }
    setLoading(false);
  };

  const saveExecution = async () => {
    setSavingExecution(true);
    await base44.entities.WorkOrder.update(id, execution);
    setSavingExecution(false);
    setWorkOrder(prev => prev ? { ...prev, ...execution } : prev);
    toast.success('Execution notes saved');
  };

  const saveTaskAssignment = async (taskId, newAssignment) => {
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, assigned_to: newAssignment } : t
    );
    setTasks(updatedTasks);
    await base44.entities.WorkOrder.update(id, { tasks: updatedTasks });
    setEditingTaskId(null);
    toast.success('Task assignment saved');
  };

  const updateTask = async (taskId, updates) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, ...updates };
        if (updates.status === 'in_progress' && !t.started_at) {
          updated.started_at = new Date().toISOString();
        }
        if (updates.status === 'completed' && !t.completed_at) {
          updated.completed_at = new Date().toISOString();
        }
        if (updates.status === 'pending') {
          updated.started_at = null;
          updated.completed_at = null;
        }
        return updated;
      }
      return t;
    });
    setTasks(updatedTasks);
    await base44.entities.WorkOrder.update(id, { tasks: updatedTasks });
  };

  const toggleTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const nextStatus = task.status === 'completed' ? 'pending' : task.status === 'in_progress' ? 'completed' : 'in_progress';
    updateTask(taskId, { status: nextStatus });
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

  const groupItems = (workOrder.groups || []).flatMap(g => (g.items || []).map(normalizeLineItem));
  const flatItems = (workOrder.line_items || []).map(li => normalizeLineItem(li));
  const allItems = groupItems.length > 0 ? groupItems : flatItems;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/work-orders')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Work Orders
          </button>

          <div className="h-4 w-px bg-slate-200" />

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

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">
        <div className="w-64 flex-shrink-0 space-y-4">
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

          <JobProfitSummary workOrderId={id} />
        </div>

        <div className="flex-1 min-w-0 space-y-5">
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

              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {(() => {
                    const completedCount = tasks.filter(t => t.status === 'completed').length;
                    const pct = Math.round((completedCount / tasks.length) * 100);
                    return (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{completedCount}/{tasks.length} done</span>
                      </div>
                    );
                  })()}
                  {tasks.map(task => {
                    const isCompleted = task.status === 'completed';
                    const isInProgress = task.status === 'in_progress';
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                          isCompleted
                            ? 'bg-green-50 border-green-200'
                            : isInProgress ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isCompleted ? 'bg-green-500 border-green-500' : isInProgress ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                        }`}>
                          {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                          {isInProgress && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${isCompleted || isInProgress ? 'text-slate-700' : 'text-slate-800'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className={`text-xs mt-0.5 ${isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>{task.description}</p>
                          )}
                          <div className="mt-1.5 flex items-center gap-2">
                            {editingTaskId === task.id ? (
                              <>
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingAssignment}
                                  onChange={e => setEditingAssignment(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveTaskAssignment(task.id, editingAssignment);
                                    if (e.key === 'Escape') setEditingTaskId(null);
                                  }}
                                  placeholder="Worker name…"
                                  className="h-6 text-xs px-2 border border-slate-200 rounded bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary flex-1"
                                />
                                <button
                                  onClick={() => saveTaskAssignment(task.id, editingAssignment)}
                                  className="text-xs px-1.5 py-0.5 rounded bg-primary text-white hover:bg-primary/90 transition-colors"
                                >
                                  Save
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingAssignment(task.assigned_to || '');
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-0.5 rounded transition-colors"
                              >
                                {task.assigned_to ? `👤 ${task.assigned_to}` : '👤 Unassigned'}
                              </button>
                            )}
                          </div>
                          {isInProgress && task.started_at && (
                            <p className="text-[10px] text-blue-600 mt-1">
                              Started {new Date(task.started_at).toLocaleString()}
                            </p>
                          )}
                          {isCompleted && task.completed_at && (
                            <p className="text-[10px] text-green-600 mt-1">
                              ✓ Completed {new Date(task.completed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isCompleted && (
                            <button
                              onClick={() => updateTask(task.id, { status: isInProgress ? 'pending' : 'in_progress' })}
                              className={`p-1 rounded transition-colors ${isInProgress ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'text-slate-400 hover:bg-slate-100'}`}
                              title={isInProgress ? 'Mark as Pending' : 'Mark as In Progress'}
                            >
                              {isInProgress ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {!isCompleted && (
                            <button
                              onClick={() => updateTask(task.id, { status: 'completed' })}
                              className="p-1 rounded text-slate-400 hover:bg-green-100 hover:text-green-600 transition-colors"
                              title="Mark as Complete"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isCompleted && (
                            <button
                              onClick={() => updateTask(task.id, { status: 'pending' })}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              title="Reset to Pending"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400">
                  <ClipboardList className="w-6 h-6 mb-2" />
                  <p className="text-sm">No tasks generated from estimate</p>
                </div>
              )}
            </div>
          </div>

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

          <WOTimeTracking
            workOrderId={id}
            workOrder={workOrder}
            initialArrival={workOrder.arrival_time}
            initialDeparture={workOrder.departure_time}
          />

          <WOExpenses workOrderId={id} workOrderNumber={workOrder.work_order_number} />

          <WOFieldExecution
            workOrder={workOrder}
            workOrderId={id}
          />

          <WOReceipts
            workOrderId={id}
            workOrderNumber={workOrder.work_order_number}
            clientName={workOrder.client_name}
          />

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
              <div className="space-y-4">
                <WOCompletionEvidence workOrder={workOrder} />
                <div className="rounded-xl border border-green-200 bg-green-50 shadow-sm px-6 py-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Work Order Completed</p>
                    {workOrder.completed_at && (
                      <p className="text-xs text-green-600 mt-0.5">{new Date(workOrder.completed_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            );

            if (isInvoiced || !step) return null;

            const advance = async () => {
              if (step.next === 'completed') {
                const evaluation = evaluateWorkOrderEvidence(workOrder, { photoCount: workOrder.photos_count || 0 });
                if (!evaluation.isComplete) {
                  toast.error(`Missing: ${evaluation.missingItems.join(', ')}`);
                  return;
                }
              }

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