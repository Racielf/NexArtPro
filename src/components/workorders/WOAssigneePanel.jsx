import React, { useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  UserCheck, Users, Phone, Wrench,
  Plus, X, ChevronDown, ChevronRight, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const TRADES = [
  'general', 'carpenter', 'electrician', 'plumber', 'painter',
  'tile', 'flooring', 'roofing', 'concrete', 'framing', 'drywall', 'hvac',
];

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
}

const AV_COLORS = ['#b07f1d', '#1f4862', '#2c7a26', '#6c52b7', '#df6b2a', '#0891b2'];
function avColor(name = '') { return AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length]; }

function WorkerAvatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-9 h-9 text-[11px]';
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: avColor(name) }}
    >
      {initials(name)}
    </div>
  );
}

/* ─── Quick-create worker inline form ───────────────────────────────── */
function QuickCreateWorker({ onCreated, onCancel }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: '', phone: '', trade: 'general', worker_type: 'employee' });

  const createMutation = useMutation({
    mutationFn: (data) => nexartClient.entities.Worker.create({ ...data, active: true }),
    onSuccess: (worker) => {
      qc.invalidateQueries(['workers-active']);
      toast.success(`${worker.full_name} added to Workers`);
      onCreated(worker);
    },
    onError: () => toast.error('Could not create worker'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    createMutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-amber-800">New Worker</p>
        <button type="button" onClick={onCancel} className="text-amber-500 hover:text-amber-700">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        type="text"
        placeholder="Full name *"
        value={form.full_name}
        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
        autoFocus
        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="tel"
          placeholder="Phone"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <select
          value={form.trade}
          onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          {TRADES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
          {createMutation.isPending ? 'Creating…' : 'Add Worker'}
        </Button>
      </div>
    </form>
  );
}

/* ─── Main Panel ────────────────────────────────────────────────────── */
export default function WOAssigneePanel({ workOrder, workOrderId, onAssigned }) {
  const qc = useQueryClient();
  const [leadId, setLeadId]        = useState(workOrder?.assigned_worker_id || '');
  const [crewIds, setCrewIds]      = useState(() => {
    const ids = new Set();
    if (workOrder?.assigned_worker_id) ids.add(String(workOrder.assigned_worker_id));
    if (Array.isArray(workOrder?.assigned_crew_ids)) {
      workOrder.assigned_crew_ids.forEach(id => id && ids.add(String(id)));
    }
    return Array.from(ids);
  });
  const [saving, setSaving]        = useState(false);
  const [showCreate, setShowCreate]= useState(false);
  const [search, setSearch]        = useState('');
  const [expandCrew, setExpandCrew]= useState(false);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers-active'],
    queryFn: () => nexartClient.entities.Worker.filter({ active: true }, 'full_name'),
    staleTime: 60_000,
  });

  const filtered = search.length >= 1
    ? workers.filter(w =>
        w.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (w.trade || '').toLowerCase().includes(search.toLowerCase())
      )
    : workers;

  const lead = workers.find(w => String(w.id) === String(leadId));
  const currentCrew = Array.isArray(workOrder?.assigned_crew) ? workOrder.assigned_crew : [];

  const handleLeadSelect = (workerId) => {
    const id = String(workerId);
    setLeadId(id);
    setCrewIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setSearch('');
  };

  const toggleCrew = (workerId) => {
    const id = String(workerId);
    if (id === String(leadId)) return;
    setCrewIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const clearAll = async () => {
    setSaving(true);
    try {
      await nexartClient.entities.WorkOrder.update(workOrderId, {
        assigned_worker_id:    null,
        assigned_worker_name:  '',
        assigned_worker_phone: '',
        assigned_to:           '',
        assigned_to_id:        null,
        assigned_crew:         [],
        assigned_crew_ids:     [],
        assigned_crew_names:   [],
        crew_size:             0,
        assigned_at:           null,
      });
      setLeadId('');
      setCrewIds([]);
      toast.success('Assignment cleared');
      qc.invalidateQueries(['work-order', workOrderId]);
      onAssigned?.();
    } catch (err) {
      toast.error(err?.message || 'Could not clear assignment');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async () => {
    if (!workOrderId || !leadId) return;
    setSaving(true);
    try {
      const crewWorkers = workers.filter(w => crewIds.includes(String(w.id)));
      const crew = crewWorkers.map(w => ({
        worker_id: w.id,
        id:        w.id,
        name:      w.full_name,
        trade:     w.trade || 'general',
        phone:     w.phone || '',
        is_lead:   String(w.id) === String(leadId),
      }));

      await nexartClient.entities.WorkOrder.update(workOrderId, {
        assigned_worker_id:    lead?.id    || null,
        assigned_worker_name:  lead?.full_name || '',
        assigned_worker_phone: lead?.phone || '',
        assigned_to:           lead?.full_name || '',
        assigned_to_id:        lead?.id    || null,
        assigned_crew:         crew,
        assigned_crew_ids:     crew.map(m => m.worker_id),
        assigned_crew_names:   crew.map(m => m.name),
        crew_size:             crew.length,
        assigned_at:           new Date().toISOString(),
        status: (workOrder?.status === 'draft') ? 'assigned' : workOrder?.status,
      });

      toast.success(crew.length <= 1 ? 'Worker assigned' : `Crew of ${crew.length} assigned`);
      qc.invalidateQueries(['work-order', workOrderId]);
      onAssigned?.();
    } catch (err) {
      toast.error(err?.message || 'Could not save assignment');
    } finally {
      setSaving(false);
    }
  };

  const hasAssignment = !!(workOrder?.assigned_worker_name || workOrder?.assigned_to);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Field Assignment</h3>
            <p className="text-xs text-slate-400 mt-0.5">Assign workers from your roster</p>
          </div>
        </div>
        {hasAssignment && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {(workOrder?.crew_size || 1) > 1 ? `${workOrder.crew_size} workers` : 'Assigned'}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Current assignment summary */}
        {hasAssignment && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current</p>
            <div className="flex items-center gap-2.5">
              <WorkerAvatar name={workOrder.assigned_worker_name || workOrder.assigned_to} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {workOrder.assigned_worker_name || workOrder.assigned_to}
                </p>
                {workOrder.assigned_worker_phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-2.5 h-2.5" />
                    {workOrder.assigned_worker_phone}
                  </p>
                )}
              </div>
            </div>

            {currentCrew.length > 1 && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <button
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                  onClick={() => setExpandCrew(v => !v)}
                >
                  {expandCrew ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <Users className="w-3 h-3 ml-0.5" />
                  {currentCrew.length - 1} more crew member{currentCrew.length > 2 ? 's' : ''}
                </button>
                {expandCrew && (
                  <div className="mt-1.5 space-y-1">
                    {currentCrew.filter(m => !m.is_lead).map((m, i) => (
                      <div key={m.worker_id || m.id || i} className="flex items-center gap-2 text-xs text-slate-600">
                        <WorkerAvatar name={m.name} size="sm" />
                        <span className="truncate">{m.name}</span>
                        {m.trade && <span className="text-slate-400 capitalize text-[10px]">{m.trade}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Picker header */}
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Select Worker
          </label>
          <button
            type="button"
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80"
          >
            <Plus className="w-3 h-3" /> New Worker
          </button>
        </div>

        {/* Quick create */}
        {showCreate && (
          <QuickCreateWorker
            onCreated={(worker) => { setShowCreate(false); handleLeadSelect(worker.id); }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {!showCreate && (
          <>
            {/* Search */}
            <div className="relative -mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or trade…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-6 text-sm text-slate-400">Loading workers…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                {workers.length === 0
                  ? 'No workers registered — click "New Worker" to add one'
                  : 'No workers match your search'}
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white -mt-1">
                {filtered.map(worker => {
                  const isLead = String(worker.id) === String(leadId);
                  const inCrew = crewIds.includes(String(worker.id));
                  return (
                    <div
                      key={worker.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        isLead ? 'bg-primary/5' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleLeadSelect(worker.id)}
                    >
                      <WorkerAvatar name={worker.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isLead ? 'text-primary' : 'text-slate-800'}`}>
                          {worker.full_name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {worker.trade && (
                            <span className="flex items-center gap-0.5 capitalize">
                              <Wrench className="w-2.5 h-2.5" />{worker.trade}
                            </span>
                          )}
                          {worker.phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />{worker.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isLead && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            Lead
                          </span>
                        )}
                        <input
                          type="checkbox"
                          checked={inCrew}
                          disabled={isLead}
                          onClick={e => { e.stopPropagation(); toggleCrew(worker.id); }}
                          onChange={() => {}}
                          className="rounded accent-primary"
                          title={isLead ? 'Lead is always in crew' : 'Add to crew'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {crewIds.length > 0 && !isLoading && (
              <p className="text-[10px] text-slate-400 text-right -mt-1">
                {crewIds.length} selected · Lead: {lead?.full_name || '—'}
              </p>
            )}
          </>
        )}

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={saveAssignment}
            disabled={saving || isLoading || !leadId}
            className="flex-1 h-10"
          >
            {saving ? 'Saving…' : 'Save Assignment'}
          </Button>
          {hasAssignment && (
            <Button size="sm" variant="outline" onClick={clearAll} disabled={saving} className="h-10">
              Clear
            </Button>
          )}
        </div>

        {!leadId && !isLoading && workers.length > 0 && !showCreate && (
          <p className="text-[10px] text-amber-600 text-center -mt-2">
            Click a worker to set them as lead
          </p>
        )}

      </div>
    </div>
  );
}
