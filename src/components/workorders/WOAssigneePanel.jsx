import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { getUsers } from '@/lib/userStore';
import { normalizeLocalRole } from '@/lib/roleUtils';

function getDisplayName(user) {
  return user?.display_name || user?.full_name || user?.name || user?.username || user?.email || 'Unnamed user';
}

function getUserEmail(user) {
  return user?.email || user?.username || '';
}

function isActiveFieldAgent(user) {
  return user?.active !== false && normalizeLocalRole(user?.role) === 'field_agent';
}

export default function WOAssigneePanel({ workOrder, workOrderId, onAssigned }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(workOrder?.assigned_user_id || workOrder?.assigned_worker_id || '');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const fieldAgents = useMemo(() => users.filter(isActiveFieldAgent), [users]);
  const currentAssigneeName = workOrder?.assigned_worker_name || workOrder?.assigned_user_name || workOrder?.assigned_to || '';
  const currentAssigneeEmail = workOrder?.assigned_worker_email || workOrder?.assigned_user_email || workOrder?.assigned_email || '';

  useEffect(() => {
    let active = true;
    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const data = await getUsers();
        if (active) setUsers(data || []);
      } finally {
        if (active) setLoadingUsers(false);
      }
    }
    loadUsers();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setSelectedUserId(workOrder?.assigned_user_id || workOrder?.assigned_worker_id || '');
  }, [workOrder?.assigned_user_id, workOrder?.assigned_worker_id]);

  const handleAssign = async () => {
    if (!workOrderId) return;
    const assignee = fieldAgents.find(user => String(user.id) === String(selectedUserId));

    setSaving(true);
    try {
      const patch = assignee
        ? {
            assigned_user_id: assignee.id,
            assigned_worker_id: assignee.id,
            assigned_to_id: assignee.id,
            assigned_user_name: getDisplayName(assignee),
            assigned_worker_name: getDisplayName(assignee),
            assigned_to: getDisplayName(assignee),
            assigned_user_email: getUserEmail(assignee),
            assigned_worker_email: getUserEmail(assignee),
            assigned_email: getUserEmail(assignee),
            assigned_at: new Date().toISOString(),
            status: workOrder?.status === 'draft' ? 'assigned' : workOrder?.status,
          }
        : {
            assigned_user_id: null,
            assigned_worker_id: null,
            assigned_to_id: null,
            assigned_user_name: '',
            assigned_worker_name: '',
            assigned_to: '',
            assigned_user_email: '',
            assigned_worker_email: '',
            assigned_email: '',
          };

      await base44.entities.WorkOrder.update(workOrderId, patch);
      toast.success(assignee ? `Assigned to ${getDisplayName(assignee)}` : 'Assignment cleared');
      onAssigned?.();
    } catch (err) {
      toast.error(err?.message || 'Could not update assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Field Assignment</h3>
            <p className="text-xs text-slate-500 mt-0.5">Assign this work order to a Field Agent</p>
          </div>
        </div>
        {currentAssigneeName && (
          <span className="text-[10px] font-semibold rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5">
            Assigned
          </span>
        )}
      </div>

      <div className="px-6 py-5 space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Current Field Agent</p>
          {currentAssigneeName ? (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">{currentAssigneeName}</span>
              {currentAssigneeEmail && <span className="text-xs text-slate-400">{currentAssigneeEmail}</span>}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Unassigned</p>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            disabled={loadingUsers || saving}
            className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Unassigned</option>
            {fieldAgents.map(user => (
              <option key={user.id} value={user.id}>{getDisplayName(user)}</option>
            ))}
          </select>
          <Button size="sm" onClick={handleAssign} disabled={loadingUsers || saving} className="h-10">
            {saving ? 'Saving…' : 'Assign'}
          </Button>
        </div>

        {!loadingUsers && fieldAgents.length === 0 && (
          <p className="text-xs text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            No active Field Agents found. Create one in Settings → Team & Access first.
          </p>
        )}
      </div>
    </div>
  );
}
