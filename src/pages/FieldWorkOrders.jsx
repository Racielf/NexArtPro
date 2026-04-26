import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { filterActiveRecords } from '@/lib/softDelete';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';

const ACTIVE_STATUSES = ['draft', 'assigned', 'scheduled', 'on_the_way', 'in_progress'];

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDateLabel(value) {
  if (!value) return 'No date set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWorkerName(user) {
  return user?.full_name || user?.name || user?.email || '';
}

function isAssignedToCurrentUser(workOrder, user) {
  if (!user) return false;
  const userId = normalizeText(user.id);
  const userEmail = normalizeText(user.email);
  const userName = normalizeText(getWorkerName(user));

  const assignedId = normalizeText(workOrder.assigned_worker_id || workOrder.assigned_to_id);
  const assignedName = normalizeText(workOrder.assigned_worker_name || workOrder.assigned_to);
  const assignedEmail = normalizeText(workOrder.assigned_worker_email || workOrder.assigned_email);

  return [assignedId, assignedName, assignedEmail].some(value => value && [userId, userEmail, userName].includes(value));
}

function getVisibleOrders(workOrders, user) {
  const role = normalizeText(user?.role || user?.app_role || user?.user_type);
  const isFieldOnly = ['field_agent', 'worker', 'technician', 'tech'].includes(role);
  if (!isFieldOnly) return workOrders;
  return workOrders.filter(wo => isAssignedToCurrentUser(wo, user));
}

function getRouteUrl(orders) {
  const addresses = orders
    .map(order => order.client_address)
    .filter(Boolean)
    .map(address => encodeURIComponent(address));
  if (!addresses.length) return null;
  return `https://www.google.com/maps/dir/${addresses.join('/')}`;
}

function getProgress(workOrder) {
  const checklist = Array.isArray(workOrder.execution_checklist) ? workOrder.execution_checklist : [];
  if (!checklist.length) return 0;
  return Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100);
}

export default function FieldWorkOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const data = await base44.entities.WorkOrder.list('-scheduled_date');
      const active = filterActiveRecords(data || []).filter(wo => ACTIVE_STATUSES.includes(wo.status || 'draft'));
      setWorkOrders(active);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const visibleOrders = useMemo(() => getVisibleOrders(workOrders, user), [workOrders, user]);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return visibleOrders;
    return visibleOrders.filter(order => [
      order.work_order_number,
      order.client_name,
      order.client_address,
      order.title,
      order.status,
    ].some(value => normalizeText(value).includes(q)));
  }, [visibleOrders, search]);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = filtered.filter(order => order.scheduled_date === today);
  const activeOrder = filtered.find(order => ['on_the_way', 'in_progress'].includes(order.status));
  const routeUrl = getRouteUrl(filtered);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Loading field route</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Field Mode</p>
            <h1 className="text-xl font-black tracking-tight">Work Orders</h1>
          </div>
          <Button size="sm" variant="outline" className="rounded-2xl gap-2" onClick={loadData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <section className="bg-slate-950 text-white rounded-[2rem] p-6 shadow-2xl overflow-hidden relative">
          <Activity className="absolute -right-6 -top-6 w-32 h-32 text-white/5" />
          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Today</p>
                <h2 className="text-3xl font-black tracking-tight mt-1">{filtered.length} active</h2>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Scheduled</p>
                <p className="text-lg font-black text-blue-300">{todayOrders.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Next Stop</p>
                <p className="text-sm font-bold truncate">{filtered[0]?.client_name || 'No assigned job'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Active Job</p>
                <p className="text-sm font-bold truncate">{activeOrder ? `WO#${activeOrder.work_order_number}` : 'None'}</p>
              </div>
            </div>

            <Button
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.18em] gap-3"
              disabled={!routeUrl}
              onClick={() => routeUrl && window.open(routeUrl, '_blank', 'noreferrer')}
            >
              <Navigation className="w-5 h-5" /> Start Day Route
            </Button>
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, address, WO#..."
            className="w-full h-13 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 p-10 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-800">No field work orders</p>
            <p className="text-sm text-slate-500 mt-1">Assigned jobs will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order, index) => {
              const progress = getProgress(order);
              const status = order.status || 'draft';
              const isActive = ['on_the_way', 'in_progress'].includes(status);
              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/field/work-orders/${order.id}`)}
                  className="w-full text-left bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {isActive ? <Activity className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stop #{index + 1} · WO#{order.work_order_number || '—'}</p>
                        <h3 className="font-black text-lg tracking-tight truncate">{order.client_name || 'Unnamed client'}</h3>
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  <p className="text-sm font-semibold text-slate-800 line-clamp-2 mb-3">{order.title || 'Field service work order'}</p>

                  <div className="space-y-2 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateLabel(order.scheduled_date)}{order.scheduled_time ? ` · ${order.scheduled_time}` : ''}</span>
                    </div>
                    {order.client_address && (
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{order.client_address}</span>
                      </div>
                    )}
                    {(order.assigned_worker_name || order.assigned_to) && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.assigned_worker_name || order.assigned_to}</span>
                      </div>
                    )}
                  </div>

                  {progress > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        <span>Checklist</span><span>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {order.client_phone && (
                        <a
                          href={`tel:${order.client_phone}`}
                          onClick={e => e.stopPropagation()}
                          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {order.client_address && (
                        <span
                          onClick={e => {
                            e.stopPropagation();
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.client_address)}`, '_blank', 'noreferrer');
                          }}
                          className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"
                        >
                          <Navigation className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-blue-600 font-black text-xs uppercase tracking-widest">
                      Open <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Field Mode writes to the same WorkOrder records used by the office. No Firebase copy, no duplicated source of truth.
          </p>
        </div>
      </main>
    </div>
  );
}
