import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import WorkerSelector from '@/components/workorders/WorkerSelector';
import {
  Search, User, MapPin, Calendar, ChevronRight,
  ClipboardList, Filter, UserCheck, RefreshCw, CheckCircle2,
  Navigation2, Wrench, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['all', 'draft', 'assigned', 'scheduled', 'on_the_way', 'in_progress', 'completed', 'cancelled'];

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  assigned: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  on_the_way: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  invoiced: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS = {
  draft: 'Draft', assigned: 'Assigned', scheduled: 'Scheduled',
  on_the_way: 'On the Way', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', invoiced: 'Invoiced',
};

export default function Assignments() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [assigningWo, setAssigningWo] = useState(null); // WO being assigned

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [wos, ws] = await Promise.all([
      nexartClient.entities.WorkOrder.list('-created_date'),
      nexartClient.entities.Worker.filter({ active: true }),
    ]);
    setWorkOrders(wos);
    setWorkers(ws);
    setLoading(false);
  };

  const handleAssign = async (worker) => {
    const wo = assigningWo;
    setAssigningWo(null);
    const user = await nexartClient.auth.me();
    const isReassign = !!wo.assigned_worker_id;
    const now = new Date().toISOString();

    await nexartClient.entities.WorkOrder.update(wo.id, {
      status: wo.status === 'draft' ? 'assigned' : wo.status,
      assigned_worker_id: worker.id,
      assigned_worker_name: worker.full_name,
      assigned_worker_phone: worker.phone || '',
      assigned_by: user?.full_name || user?.email || 'Admin',
      assigned_at: isReassign ? wo.assigned_at : now,
      previous_worker_id: isReassign ? wo.assigned_worker_id : null,
      previous_worker_name: isReassign ? wo.assigned_worker_name : null,
      reassigned_at: isReassign ? now : null,
      reassigned_by: isReassign ? (user?.full_name || user?.email || 'Admin') : null,
    });

    // Log assignment history
    await nexartClient.entities.JobAssignment.create({
      work_order_id: wo.id,
      work_order_number: wo.work_order_number,
      worker_id: worker.id,
      worker_name: worker.full_name,
      worker_phone: worker.phone || '',
      client_name: wo.client_name,
      title: wo.title,
      scheduled_date: wo.scheduled_date || '',
      action: isReassign ? 'reassigned' : 'assigned',
      assigned_by: user?.full_name || user?.email || 'Admin',
      previous_worker_name: isReassign ? wo.assigned_worker_name : null,
    });

    toast.success(`${isReassign ? 'Reassigned' : 'Assigned'} to ${worker.full_name}`);
    loadData();
  };

  const handleStatusChange = async (wo, newStatus) => {
    const now = new Date().toISOString();
    const extra = {};
    if (newStatus === 'in_progress') extra.started_at = now;
    if (newStatus === 'completed') extra.completed_at = now;
    await nexartClient.entities.WorkOrder.update(wo.id, { status: newStatus, ...extra });
    toast.success(`Status → ${STATUS_LABELS[newStatus]}`);
    loadData();
  };

  const filtered = workOrders.filter(wo => {
    const matchSearch = wo.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      wo.title?.toLowerCase().includes(search.toLowerCase()) ||
      wo.assigned_worker_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(wo.work_order_number).includes(search);
    const matchStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchWorker = workerFilter === 'all' || wo.assigned_worker_id === workerFilter;
    return matchSearch && matchStatus && matchWorker;
  });

  const stats = {
    total: workOrders.length,
    unassigned: workOrders.filter(w => !w.assigned_worker_id && w.status !== 'completed' && w.status !== 'cancelled').length,
    inProgress: workOrders.filter(w => w.status === 'in_progress').length,
    completed: workOrders.filter(w => w.status === 'completed').length,
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Assignments" subtitle={`${workOrders.length} work orders`} />

      {/* Stats */}
      <div className="px-6 pt-4 pb-2 grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Unassigned', value: stats.unassigned, icon: User, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', value: stats.inProgress, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl px-4 py-3 flex items-center gap-3 ${s.bg}`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search work orders..." className="pl-9 h-9 text-sm" />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 focus:outline-none focus:border-primary"
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : STATUS_LABELS[s]}</option>)}
        </select>

        {/* Worker filter */}
        <select
          value={workerFilter}
          onChange={e => setWorkerFilter(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 focus:outline-none focus:border-primary"
        >
          <option value="all">All Workers</option>
          <option value="">Unassigned</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
        </select>

        <Button size="sm" variant="outline" onClick={loadData} className="h-9 gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mr-3" />Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No work orders found</p>
            <p className="text-slate-400 text-sm mt-1">Convert an approved estimate to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(wo => (
              <div key={wo.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 px-4 py-3.5">

                  {/* WO Number */}
                  <div className="w-14 flex-shrink-0 text-center">
                    <span className="text-xs font-bold text-purple-600">WO</span>
                    <p className="text-base font-bold text-slate-900">#{wo.work_order_number}</p>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">{wo.client_name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[wo.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[wo.status] || wo.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{wo.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {wo.client_address && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3" />{wo.client_address}
                        </span>
                      )}
                      {wo.scheduled_date && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3" />{wo.scheduled_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Worker */}
                  <div className="w-40 flex-shrink-0">
                    {wo.assigned_worker_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {wo.assigned_worker_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{wo.assigned_worker_name}</p>
                          {wo.reassigned_at && <p className="text-[10px] text-amber-600">Reassigned</p>}
                        </div>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                        <User className="w-3.5 h-3.5" />Unassigned
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Assign / Reassign */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssigningWo(wo)}
                      className="text-xs h-8 gap-1 border-slate-200"
                    >
                      <UserCheck className="w-3 h-3" />
                      {wo.assigned_worker_id ? 'Reassign' : 'Assign'}
                    </Button>

                    {/* Quick status advance */}
                    {wo.status === 'assigned' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(wo, 'scheduled')}
                        className="text-xs h-8 gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                        <Calendar className="w-3 h-3" />Schedule
                      </Button>
                    )}
                    {wo.status === 'scheduled' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(wo, 'in_progress')}
                        className="text-xs h-8 gap-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                        <Wrench className="w-3 h-3" />Start
                      </Button>
                    )}
                    {wo.status === 'in_progress' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(wo, 'completed')}
                        className="text-xs h-8 gap-1 border-green-300 text-green-600 hover:bg-green-50">
                        <CheckCircle2 className="w-3 h-3" />Complete
                      </Button>
                    )}

                    {/* View detail */}
                    <button
                      onClick={() => navigate(`/work-order-detail?id=${wo.id}`)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Assignment info bar */}
                {(wo.assigned_by || wo.reassigned_by) && (
                  <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    {wo.reassigned_by
                      ? `Reassigned by ${wo.reassigned_by} · ${wo.reassigned_at ? format(new Date(wo.reassigned_at), 'MMM d, h:mm a') : ''}`
                      : `Assigned by ${wo.assigned_by} · ${wo.assigned_at ? format(new Date(wo.assigned_at), 'MMM d, h:mm a') : ''}`
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Worker Selector modal */}
      {assigningWo && (
        <WorkerSelector
          currentWorkerId={assigningWo.assigned_worker_id}
          onSelect={handleAssign}
          onCancel={() => setAssigningWo(null)}
        />
      )}
    </div>
  );
}