import React, { useState } from 'react';
import { User, UserCheck, Edit2, History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WorkerSelector from '@/components/workorders/WorkerSelector';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

function WorkerCard({ label, name, phone, note, className = '' }) {
  return (
    <div className={`rounded-lg border p-4 flex-1 min-w-[200px] ${className}`}>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      {name ? (
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{name}</p>
            {phone && <p className="text-xs text-slate-400">{phone}</p>}
            {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-400 italic text-sm">
          <User className="w-4 h-4" />
          Not assigned
        </div>
      )}
    </div>
  );
}

export default function WOAssignmentSection({ workOrder, woId, onRefresh }) {
  const [showSelector, setShowSelector] = useState(false);
  const [selectorMode, setSelectorMode] = useState('assigned'); // 'assigned' | 'performed'

  const openSelector = (mode) => { setSelectorMode(mode); setShowSelector(true); };

  const handleSelect = async (worker) => {
    setShowSelector(false);
    const user = await base44.auth.me();
    const changedBy = user?.full_name || user?.email || 'Admin';
    const now = new Date().toISOString();

    if (selectorMode === 'assigned') {
      const oldVal = workOrder.assigned_worker_name || '';
      await base44.entities.WorkOrder.update(woId, {
        assigned_worker_id: worker.id,
        assigned_worker_name: worker.full_name,
        assigned_worker_phone: worker.phone || '',
      });
      await base44.entities.WorkOrderHistory.create({
        work_order_id: woId,
        work_order_number: workOrder.work_order_number,
        field_changed: 'assigned_worker',
        old_value: oldVal,
        new_value: worker.full_name,
        changed_by: changedBy,
        change_note: 'Worker assignment changed',
      });
      await base44.entities.JobAssignment.create({
        work_order_id: woId,
        work_order_number: workOrder.work_order_number,
        worker_id: worker.id,
        worker_name: worker.full_name,
        worker_phone: worker.phone || '',
        client_name: workOrder.client_name,
        title: workOrder.title,
        action: workOrder.assigned_worker_id ? 'reassigned' : 'assigned',
        assigned_by: changedBy,
        previous_worker_name: workOrder.assigned_worker_name || null,
      });
    } else {
      const oldVal = workOrder.performed_by_worker_name || '';
      await base44.entities.WorkOrder.update(woId, {
        performed_by_worker_id: worker.id,
        performed_by_worker_name: worker.full_name,
        performed_by_corrected_at: now,
        performed_by_corrected_by: changedBy,
      });
      await base44.entities.WorkOrderHistory.create({
        work_order_id: woId,
        work_order_number: workOrder.work_order_number,
        field_changed: 'performed_by_worker',
        old_value: oldVal,
        new_value: worker.full_name,
        changed_by: changedBy,
        change_note: 'Worker who performed work was corrected',
      });
    }

    toast.success(`Updated: ${worker.full_name}`);
    onRefresh();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          Assignment
        </h3>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[190px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Assigned To</span>
            <button onClick={() => openSelector('assigned')} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              <Edit2 className="w-3 h-3" />{workOrder.assigned_worker_id ? 'Change' : 'Assign'}
            </button>
          </div>
          <WorkerCard
            label=""
            name={workOrder.assigned_worker_name}
            phone={workOrder.assigned_worker_phone}
            note={workOrder.assigned_by ? `Assigned by ${workOrder.assigned_by}` : null}
            className="border-blue-100 bg-blue-50/40"
          />
        </div>

        <div className="flex-1 min-w-[190px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Performed By</span>
            <button onClick={() => openSelector('performed')} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              <Edit2 className="w-3 h-3" />{workOrder.performed_by_worker_id ? 'Correct' : 'Set'}
            </button>
          </div>
          <WorkerCard
            label=""
            name={workOrder.performed_by_worker_name || workOrder.assigned_worker_name}
            phone={null}
            note={workOrder.performed_by_corrected_by ? `Corrected by ${workOrder.performed_by_corrected_by}` : 'Defaults to assigned worker'}
            className="border-green-100 bg-green-50/40"
          />
        </div>

        <div className="flex-1 min-w-[190px]">
          <div className="mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Completed By</span>
          </div>
          <WorkerCard
            label=""
            name={workOrder.completed_by_user || null}
            phone={null}
            note={workOrder.completed_at ? `Closed ${format(new Date(workOrder.completed_at), 'MMM d, h:mm a')}` : null}
            className="border-purple-100 bg-purple-50/40"
          />
        </div>
      </div>

      {showSelector && (
        <WorkerSelector
          currentWorkerId={selectorMode === 'assigned' ? workOrder.assigned_worker_id : workOrder.performed_by_worker_id}
          onSelect={handleSelect}
          onCancel={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}