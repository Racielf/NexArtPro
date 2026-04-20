import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Clock, Plus, User } from 'lucide-react';
import { toast } from 'sonner';

function calcHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function calcDecimalHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm);
  return total > 0 ? Math.round((total / 60) * 100) / 100 : null;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function WOTimeTracking({ workOrderId, workOrder, initialArrival, initialDeparture }) {
  // Legacy fields state (backward compat)
  const [arrival, setArrival] = useState(initialArrival || '');
  const [departure, setDeparture] = useState(initialDeparture || '');
  const [saving, setSaving] = useState(false);

  // Session state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [addingSession, setAddingSession] = useState(false);

  // Multi-worker support
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // Close-session end time per open session (keyed by session.id)
  const [closeEndTimes, setCloseEndTimes] = useState({});

  const totalHours = calcHours(arrival, departure);

  useEffect(() => {
    loadSessions();
    loadWorkers();
  }, [workOrderId]);

  const loadSessions = async () => {
    if (!workOrderId) return;
    setLoadingSessions(true);
    const entries = await base44.entities.WorkOrderTimeEntry.filter({ work_order_id: workOrderId });
    setSessions(entries || []);
    setLoadingSessions(false);
  };

  const loadWorkers = async () => {
    const all = await base44.entities.Worker.filter({ active: true });
    setWorkers(all || []);
  };

  // Resolve effective worker from selector or fallback to assigned
  const getEffectiveWorker = () => {
    if (selectedWorkerId) {
      const w = workers.find(w => w.id === selectedWorkerId);
      return w ? { id: w.id, name: w.full_name } : null;
    }
    if (workOrder?.assigned_worker_id) {
      return { id: workOrder.assigned_worker_id, name: workOrder.assigned_worker_name || '' };
    }
    return null;
  };

  // Legacy save — keeps WorkOrder.arrival_time / departure_time working
  const handleSave = async () => {
    setSaving(true);
    await base44.entities.WorkOrder.update(workOrderId, {
      arrival_time: arrival,
      departure_time: departure,
    });
    setSaving(false);
    toast.success('Time saved');
  };

  // Add a new WorkOrderTimeEntry session
  const handleAddSession = async () => {
    const worker = getEffectiveWorker();

    // GUARDRAIL A: worker required for detailed sessions
    if (!worker) {
      toast.error('Assign a worker before tracking detailed time');
      return;
    }

    // GUARDRAIL B: start time required
    if (!newStart) {
      toast.error('Start time is required');
      return;
    }

    // GUARDRAIL B: end_time must be after start_time if provided
    if (newEnd) {
      const dur = calcDecimalHours(newStart, newEnd);
      if (dur === null || dur <= 0) {
        toast.error('Overnight sessions are not yet supported. End time must be after start time.');
        return;
      }
    }

    // GUARDRAIL C: only one open session per work_order + worker at a time
    const openEntry = sessions.find(s => !s.end_time && s.worker_id === worker.id);
    if (openEntry) {
      toast.error(`${worker.name || 'This worker'} already has an open session. Close it before adding a new one.`);
      return;
    }

    setAddingSession(true);

    const today = todayISO();
    const duration = newEnd ? calcDecimalHours(newStart, newEnd) : null;

    const entry = {
      work_order_id: workOrderId,
      worker_id: worker.id,
      worker_name: worker.name,
      work_date: today,
      start_time: newStart,
      end_time: newEnd || null,
      duration_hours: duration,
      company_id: workOrder?.company_id || 'rc-art',
    };

    await base44.entities.WorkOrderTimeEntry.create(entry);

    // Also update legacy WorkOrder fields on first session of the day (main assigned worker only)
    const todaySessions = sessions.filter(s => s.work_date === today);
    if (todaySessions.length === 0 && worker.id === workOrder?.assigned_worker_id) {
      const legacyPatch = { arrival_time: newStart };
      if (newEnd) legacyPatch.departure_time = newEnd;
      await base44.entities.WorkOrder.update(workOrderId, legacyPatch);
      setArrival(newStart);
      if (newEnd) setDeparture(newEnd);
    }

    toast.success('Session added');
    setNewStart('');
    setNewEnd('');
    await loadSessions();
    setAddingSession(false);
  };

  // Close an open session — targets specific session by id
  const handleCloseSession = async (session) => {
    const endTime = closeEndTimes[session.id] || '';
    if (!endTime) {
      toast.error('Set an end time first');
      return;
    }
    // GUARDRAIL B: prevent invalid or overnight close
    const duration = calcDecimalHours(session.start_time, endTime);
    if (duration === null || duration <= 0) {
      toast.error('Overnight sessions are not yet supported. End time must be after start time.');
      return;
    }
    await base44.entities.WorkOrderTimeEntry.update(session.id, {
      end_time: endTime,
      duration_hours: duration,
    });
    // Update legacy departure_time only for main assigned worker
    if (session.worker_id === workOrder?.assigned_worker_id) {
      await base44.entities.WorkOrder.update(workOrderId, { departure_time: endTime });
      setDeparture(endTime);
    }
    toast.success('Session closed');
    setCloseEndTimes(prev => { const n = { ...prev }; delete n[session.id]; return n; });
    await loadSessions();
  };

  const openSessions = sessions.filter(s => !s.end_time);
  const closedSessions = sessions.filter(s => s.end_time);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-slate-900">Time Tracking</h2>
          {sessions.length > 0 && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {sessions.length} session{sessions.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Legacy fields — always visible, always functional */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Legacy Time (Single Session)</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Arrival Time</p>
              <input
                type="time"
                value={arrival}
                onChange={e => setArrival(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Departure Time</p>
              <input
                type="time"
                value={departure}
                onChange={e => setDeparture(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4 text-center flex flex-col items-center justify-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Total Hours</p>
              {totalHours
                ? <p className="text-xl font-bold text-primary">{totalHours}</p>
                : <p className="text-xl font-semibold text-slate-200">—</p>}
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Legacy Time'}
            </Button>
          </div>
        </div>

        {/* Session entries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Detailed Sessions</p>
            <span className="text-[10px] text-slate-400 italic">Sessions are recorded for today only</span>
          </div>

          {!workOrder?.assigned_worker_id && workers.length === 0 && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">Assign a worker to this work order to enable detailed time tracking.</p>
            </div>
          )}

          {/* Open sessions — one per worker, each with its own close control */}
          {openSessions.length > 0 && (
            <div className="space-y-2 mb-3">
              {openSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      <p className="text-xs font-semibold text-amber-700 truncate">
                        {session.worker_name || 'Unknown worker'} — started at {session.start_time}
                      </p>
                    </div>
                    <p className="text-[10px] text-amber-600">Set end time and close</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="time"
                      value={closeEndTimes[session.id] || ''}
                      onChange={e => setCloseEndTimes(prev => ({ ...prev, [session.id]: e.target.value }))}
                      className="bg-white border border-amber-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => handleCloseSession(session)}>
                      Close
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past sessions */}
          {!loadingSessions && closedSessions.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {closedSessions.map(s => (
                <div key={s.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <User className="w-3 h-3 text-slate-300 flex-shrink-0" />
                    <span className="font-medium text-slate-700 truncate">{s.worker_name || '—'}</span>
                  </div>
                  <span className="text-slate-400 flex-shrink-0">{s.work_date}</span>
                  <span className="flex-shrink-0">{s.start_time} → {s.end_time}</span>
                  <span className="font-semibold text-primary flex-shrink-0">
                    {s.duration_hours ? `${s.duration_hours}h` : calcHours(s.start_time, s.end_time) || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Add new session */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 space-y-3">
            {/* Worker selector */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Worker</p>
              <select
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">
                  {workOrder?.assigned_worker_name
                    ? `${workOrder.assigned_worker_name} (assigned)`
                    : 'Select worker…'}
                </option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.full_name}</option>
                ))}
              </select>
            </div>

            {/* Time inputs */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Start</p>
                <input
                  type="time"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">End (optional)</p>
                <input
                  type="time"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={handleAddSession} disabled={addingSession || !newStart}>
                <Plus className="w-3.5 h-3.5" />
                {addingSession ? 'Adding…' : 'Add Session'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}