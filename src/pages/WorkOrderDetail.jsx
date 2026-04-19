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

      // 🔹 Load real photo count
      const photos = await base44.entities.ProjectPhoto.filter({ work_order_id: id });
      const photos_count = photos?.length || 0;

      const enriched = { ...wo, photos_count };

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
    toast.success('Execution notes saved');
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

      {/* ── MAIN LAYOUT OMITTED FOR BREVITY (unchanged) ── */}

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">

        {/* RIGHT CONTENT */}
        <div className="flex-1 min-w-0 space-y-5">

          <WOFieldExecution workOrder={workOrder} workOrderId={id} />
          <WOReceipts workOrderId={id} workOrderNumber={workOrder.work_order_number} clientName={workOrder.client_name} />

          {(() => {
            const STATUS_NEXT = {
              in_progress: { next: 'completed', label: 'Mark Completed' },
            };

            const step = STATUS_NEXT[workOrder.status];
            const isCompleted = workOrder.status === 'completed';

            if (isCompleted) return (
              <div className="space-y-4">
                <WOCompletionEvidence workOrder={workOrder} />
              </div>
            );

            if (!step) return null;

            const advance = async () => {
              if (step.next === 'completed') {
                const evaluation = evaluateWorkOrderEvidence(workOrder);

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
              toast.success(`Status updated to ${step.next}`);
            };

            return (
              <Button onClick={advance} disabled={completing}>
                {step.label}
              </Button>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
