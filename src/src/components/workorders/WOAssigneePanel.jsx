import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, UserCheck, Users } from 'lucide-react';
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

function getExistingCrew(workOrder) {
  return Array.isArray(workOrder?.assigned_crew) ? workOrder.assigned_crew : [];
}

function getExistingCrewIds(workOrder) {
  const ids = new Set();
  getExistingCrew(workOrder).forEach(member => {
    const id = member?.user_id || member?.id;
    if (id) ids.add(String(id));
  });
  if (Array.isArray(workOrder?.assigned_crew_ids)) {
    workOrder.assigned_crew_ids.forEach(id => id && ids.add(String(id)));
  }
  const leadId = workOrder?.assigned_user_id || workOrder?.assigned_worker_id || workOrder?.assigned_to_id;
  if (leadId) ids.add(String(leadId));
  return Array.from(ids);
}

function buildCrewMember(user, isLead) {
  return {
    user_id: user.id,
    id: user.id,
    name: getDisplayName(user),
    display_name: getDisplayName(user),
    email: getUserEmail(user),
    username: user.username || getUserEmail(user),
    role: 'field_agent',
    is_lead: !!isLead,
    assigned_at: new Date().toISOString(),
  };
}

export default function WOAssigneePanel({ workOrder, workOrderId, onAssigned }) {
  const [users, setUsers] = useState([]);
  const [leadId, setLeadId] = useState(workOrder?.assigned_user_id || workOrder?.assigned_worker_id || '');
  const [crewIds, setCrewIds] = useState(() => getExistingCrewIds(workOrder));
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const fieldAgents = useMemo(() => users.filter(isActiveFieldAgent), [users]);
  const currentCrew = getExistingCrew(workOrder);
  const currentLeadName = workOrder?.assigned_worker_name || workOrder?.assigned_user_name || workOrder?.assigned_to || '';
  const currentLeadEmail = workOrder?.assigned_worker_email || workOrder?.assigned_user_email || workOrder?.assigned_email || '';

  useEffect(() => {
    let mounted = true;
    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const data = await getUsers();
        if (mounted) setUsers(data || []);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    }
    loadUsers();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setLeadId(workOrder?.assigned_user_id || workOrder?.assigned_worker_id || '');
    setCrewIds(getExistingCrewIds(workOrder));
  }, [workOrder?.id, workOrder?.assigned_user_id, workOrder?.assigned_worker_id, workOrder?.assigned_crew]);

  const handleLeadChange = (nextLeadId) => {
    setLeadId(nextLeadId);
    if (nextLeadId) {
      setCrewIds(prev => prev.includes(String(nextLeadId)) ? prev : [...prev, String(nextLeadId)]);
    }
  };

  const toggleCrew = (userId) => {
    const id = String(userId);
    setCrewIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const clearAssignment = async () => {
    setLeadId('');
    setCrewIds([]);
    setSaving(true);
    try {
      await base44.entities.WorkOrder.update(workOrderId, {
        assigned_user_id: null,
        assigned_worker_id: null,
        assigned_to_id: null,
        assigned_user_name: '',
        assigned_worker_name: '',
        assigned_to: '',
        assigned_user_email: '',
        assigned_worker_email: '',
        assigned_email: '',
        assigned_crew: [],
        assigned_crew_ids: [],
        assigned_crew_names: [],
        crew_size: 0,
        assigned_at: null,
      });
      toast.success('Assignment cleared');
      onAssigned?.();
    } catch (err) {
      toast.error(err?.message || 'Could not clear assignment');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async () => {
    if (!workOrderId) return;

    const lead = fieldAgents.find(user => String(user.id) === String(leadId));
    const finalCrewIds = new Set(crewIds.map(String));
    if (lead) finalCrewIds.add(String(lead.id));

    const crewUsers = fieldAgents.filter(user => finalCrewIds.has(String(user.id)));
    const crew = crewUsers.map(user => buildCrewMember(user, lead && String(user.id) === String(lead.id)));

    setSaving(true);
    try {
      const patch = {
        assigned_user_id: lead?.id || null,
        assigned_worker_id: lead?.id || null,
        assigned_to_id: lead?.id || null,
        assigned_user_name: lead ? getDisplayName(lead) : '',
        assigned_worker_name: lead ? getDisplayName(lead) : '',
        assigned_to: lead ? getDisplayName(lead) : '',
        assigned_user_email: lead ? getUserEmail(lead) : '',
        assigned_worker_email: lead ? getUserEmail(lead) : '',
        assigned_email: lead ? getUserEmail(lead) : '',
        assigned_crew: crew,
        assigned_crew_ids: crew.map(member => member.user_id),
        assigned_crew_names: crew.map(member => member.name),
        crew_size: crew.length,
        assigned_at: crew.length ? new Date().toISOString() : null,
        status: workOrder?.status === 'draft' && crew.length ? 'assigned' : workOrder?.status,
      };

      await base44.entities.WorkOrder.update(workOrderId, patch);
      toast.success(crew.length === 1 ? 'Field Agent assigned' : `Crew assigned (${crew.length})`);
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
            <p className="text-xs text-slate-500 mt-0.5">Assign a lead Field Agent and optional crew</p>
          </div>
        </div>
        {(currentLeadName || currentCrew.length > 0) && (
          <span className="text-[10px] font-semibold rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5">
            {currentCrew.length > 1 ? `${currentCrew.length} Crew` : 'Assigned'}
          </span>
        )}
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Current Lead</p>
          {currentLeadName ? (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">{currentLeadName}</span>
              {currentLeadEmail && <span className="text-xs text-slate-400 truncate">{currentLeadEmail}</span>}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No lead assigned</p>
          )}

          {currentCrew.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current Crew</p>
              <div className="space-y-1.5">
                {currentCrew.map(member => (
                  <div key={member.user_id || member.id || member.email || member.name} className="flex items-center gap-2 text-xs text-slate-600">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{member.name || member.display_name || member.email || 'Crew member'}</span>
                    {member.is_lead && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">Lead</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lead Field Agent</label>
          <select
            value={leadId}
            onChange={e => handleLeadChange(e.target.value)}
            disabled={loadingUsers || saving}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">No lead</option>
            {fieldAgents.map(user => (
              <option key={user.id} value={user.id}>{getDisplayName(user)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Crew Members</p>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
            {fieldAgents.map(user => {
              const checked = crewIds.includes(String(user.id));
              const isLead = String(leadId) === String(user.id);
              return (
                <label key={user.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="font-medium text-slate-700 block truncate">{getDisplayName(user)}</span>
                    {getUserEmail(user) && <span className="text-xs text-slate-400 block truncate">{getUserEmail(user)}</span>}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {isLead && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">Lead</span>}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCrew(user.id)}
                      disabled={saving}
                      className="rounded accent-primary"
                    />
                  </span>
                </label>
              );
            })}
            {!loadingUsers && fieldAgents.length === 0 && (
              <div className="px-3 py-3 text-xs text-amber-700 bg-amber-50">
                No active Field Agents found. Create one in Settings → Team & Access first.
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={saveAssignment} disabled={loadingUsers || saving} className="flex-1 h-10">
            {saving ? 'Saving…' : 'Save Crew Assignment'}
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={clearAssignment} disabled={saving} className="h-10">
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
