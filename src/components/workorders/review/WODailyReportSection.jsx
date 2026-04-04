import React, { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Save, X, CheckSquare, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EMPTY_REPORT = {
  work_date: new Date().toISOString().split('T')[0],
  arrival_time: '',
  departure_time: '',
  labor_hours: '',
  travel_hours: '',
  summary_of_work: '',
  tasks_completed: '',
  tasks_pending: '',
  issues_found: '',
  next_steps: '',
};

export default function WODailyReportSection({ workOrder, woId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // id or 'new'
  const [form, setForm] = useState(EMPTY_REPORT);

  useEffect(() => { load(); }, [woId]);

  const load = async () => {
    const data = await base44.entities.WorkOrderDailyReport.filter({ work_order_id: woId }, '-work_date');
    setReports(data);
    setLoading(false);
  };

  const handleNew = () => {
    setForm({
      ...EMPTY_REPORT,
      worker_id: workOrder.performed_by_worker_id || workOrder.assigned_worker_id || '',
      worker_name: workOrder.performed_by_worker_name || workOrder.assigned_worker_name || '',
    });
    setEditing('new');
  };

  const handleEdit = (report) => { setForm({ ...report }); setEditing(report.id); };

  const handleSave = async () => {
    const payload = {
      ...form,
      work_order_id: woId,
      work_order_number: workOrder.work_order_number,
      labor_hours: parseFloat(form.labor_hours) || 0,
      travel_hours: parseFloat(form.travel_hours) || 0,
    };
    if (editing === 'new') {
      await base44.entities.WorkOrderDailyReport.create(payload);
      toast.success('Daily report added');
    } else {
      await base44.entities.WorkOrderDailyReport.update(editing, payload);
      toast.success('Daily report updated');
    }
    setEditing(null);
    load();
  };

  const totalLabor = reports.reduce((s, r) => s + (r.labor_hours || 0), 0);
  const totalTravel = reports.reduce((s, r) => s + (r.travel_hours || 0), 0);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Daily Work Review
        </h3>
        <div className="flex items-center gap-3">
          {reports.length > 0 && (
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded">
                {totalLabor.toFixed(1)}h labor
              </span>
              <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-1 rounded">
                {totalTravel.toFixed(1)}h travel
              </span>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add Report
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading...</p>}

      {!loading && reports.length === 0 && editing !== 'new' && (
        <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No daily reports yet. Add the first one.
        </div>
      )}

      {/* FORM */}
      {editing && (
        <div className="border border-primary/30 rounded-lg p-4 mb-4 bg-primary/5">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">
            {editing === 'new' ? 'New Daily Report' : 'Edit Report'}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Work Date</label>
              <Input type="date" value={form.work_date || ''} onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Worker</label>
              <Input value={form.worker_name || ''} placeholder="Worker name" onChange={e => setForm(f => ({ ...f, worker_name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Arrival Time</label>
              <Input type="time" value={form.arrival_time || ''} onChange={e => setForm(f => ({ ...f, arrival_time: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Departure Time</label>
              <Input type="time" value={form.departure_time || ''} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Labor Hours</label>
              <Input type="number" step="0.5" value={form.labor_hours || ''} onChange={e => setForm(f => ({ ...f, labor_hours: e.target.value }))} className="h-8 text-sm" placeholder="0.0" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Travel Hours</label>
              <Input type="number" step="0.5" value={form.travel_hours || ''} onChange={e => setForm(f => ({ ...f, travel_hours: e.target.value }))} className="h-8 text-sm" placeholder="0.0" />
            </div>
          </div>
          <div className="space-y-2">
            {[
              { key: 'summary_of_work', label: 'Summary of Work' },
              { key: 'tasks_completed', label: 'Tasks Completed' },
              { key: 'tasks_pending', label: 'Tasks Pending' },
              { key: 'issues_found', label: 'Issues Found' },
              { key: 'next_steps', label: 'Next Steps' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <Textarea
                  value={form[key] || ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={2}
                  className="text-sm"
                  placeholder={label + '...'}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white gap-1">
              <Save className="w-3.5 h-3.5" />Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="gap-1">
              <X className="w-3.5 h-3.5" />Cancel
            </Button>
          </div>
        </div>
      )}

      {/* REPORTS LIST */}
      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="border border-slate-100 rounded-lg p-4 hover:border-slate-200 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-slate-800">
                  {r.work_date ? format(new Date(r.work_date + 'T12:00:00'), 'MMM d, yyyy') : 'No date'}
                </span>
                {r.worker_name && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{r.worker_name}</span>
                )}
                {(r.arrival_time || r.departure_time) && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {r.arrival_time || '--:--'} → {r.departure_time || '--:--'}
                  </span>
                )}
                <div className="flex gap-2">
                  {r.labor_hours > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{r.labor_hours}h labor</span>
                  )}
                  {r.travel_hours > 0 && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{r.travel_hours}h travel</span>
                  )}
                </div>
              </div>
              <button onClick={() => handleEdit(r)} className="text-xs text-slate-400 hover:text-primary transition-colors flex-shrink-0">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {r.summary_of_work && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 mb-0.5">Summary</p>
                  <p className="text-slate-700 whitespace-pre-wrap text-sm">{r.summary_of_work}</p>
                </div>
              )}
              {r.tasks_completed && (
                <div className="bg-green-50 rounded p-2.5">
                  <p className="text-xs font-semibold text-green-700 mb-0.5 flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />Completed
                  </p>
                  <p className="text-xs text-green-800 whitespace-pre-wrap">{r.tasks_completed}</p>
                </div>
              )}
              {r.tasks_pending && (
                <div className="bg-amber-50 rounded p-2.5">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />Pending
                  </p>
                  <p className="text-xs text-amber-800 whitespace-pre-wrap">{r.tasks_pending}</p>
                </div>
              )}
              {r.issues_found && (
                <div className="bg-red-50 rounded p-2.5">
                  <p className="text-xs font-semibold text-red-700 mb-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />Issues
                  </p>
                  <p className="text-xs text-red-800 whitespace-pre-wrap">{r.issues_found}</p>
                </div>
              )}
              {r.next_steps && (
                <div className="bg-blue-50 rounded p-2.5">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />Next Steps
                  </p>
                  <p className="text-xs text-blue-800 whitespace-pre-wrap">{r.next_steps}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}