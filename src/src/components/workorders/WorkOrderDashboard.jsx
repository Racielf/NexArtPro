import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, MapPin, User, ChevronLeft, ChevronRight, Wifi } from 'lucide-react';

const STATUS_GROUPS = {
  pending:     ['draft', 'assigned'],
  in_progress: ['scheduled', 'on_the_way', 'in_progress'],
  completed:   ['completed', 'invoiced'],
};

function countByGroup(workOrders) {
  return {
    pending:     workOrders.filter(w => STATUS_GROUPS.pending.includes(w.status)).length,
    in_progress: workOrders.filter(w => STATUS_GROUPS.in_progress.includes(w.status)).length,
    completed:   workOrders.filter(w => STATUS_GROUPS.completed.includes(w.status)).length,
  };
}

function CalendarView({ workOrders }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a map of date → work orders
  const byDate = {};
  workOrders.forEach(wo => {
    if (!wo.scheduled_date) return;
    const key = wo.scheduled_date; // 'YYYY-MM-DD'
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(wo);
  });

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Scheduled Work Orders</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <span className="text-xs font-semibold text-slate-700 min-w-[110px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayWOs = byDate[key] || [];
            const isToday = key === todayStr;
            const isPast = key < todayStr;
            return (
              <div key={key} className={`min-h-[52px] rounded-lg p-1 ${isToday ? 'bg-primary/10 ring-1 ring-primary/30' : isPast ? 'bg-slate-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                <p className={`text-[11px] font-bold text-center mb-1 ${isToday ? 'text-primary' : isPast ? 'text-slate-300' : 'text-slate-600'}`}>{day}</p>
                <div className="space-y-0.5">
                  {dayWOs.slice(0, 2).map(wo => (
                    <div key={wo.id} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate leading-tight ${
                      STATUS_GROUPS.completed.includes(wo.status) ? 'bg-emerald-100 text-emerald-700' :
                      STATUS_GROUPS.in_progress.includes(wo.status) ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`} title={wo.client_name}>
                      {wo.client_name?.split(' ')[0] || `WO#${wo.work_order_number}`}
                    </div>
                  ))}
                  {dayWOs.length > 2 && (
                    <div className="text-[9px] text-slate-400 font-semibold text-center">+{dayWOs.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CheckedInCard({ wo }) {
  const navigate = useNavigate();
  const checkedInTime = wo.checked_in_at ? new Date(wo.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <button
      onClick={() => navigate(`/work-orders/${wo.id}`)}
      className="w-full text-left bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 hover:bg-emerald-100 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 mt-1" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{wo.client_name}</p>
            <p className="text-xs text-slate-500 truncate">{wo.title}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">Live</span>
          {checkedInTime && <p className="text-[10px] text-slate-400 mt-0.5">since {checkedInTime}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {wo.assigned_worker_name && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <User className="w-3 h-3" />{wo.assigned_worker_name}
          </span>
        )}
        {wo.client_address && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />{wo.client_address}
          </span>
        )}
      </div>
    </button>
  );
}

export default function WorkOrderDashboard({ workOrders }) {
  const counts = countByGroup(workOrders);
  const checkedIn = workOrders.filter(w => w.checked_in_at && !STATUS_GROUPS.completed.includes(w.status));

  const stats = [
    {
      label: 'Pending',
      count: counts.pending,
      icon: Clock,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      countColor: 'text-amber-700',
    },
    {
      label: 'In Progress',
      count: counts.in_progress,
      icon: AlertCircle,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      countColor: 'text-blue-700',
    },
    {
      label: 'Completed',
      count: counts.completed,
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      countColor: 'text-emerald-700',
    },
    {
      label: 'Total',
      count: workOrders.length,
      icon: ClipboardList,
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      countColor: 'text-slate-700',
    },
  ];

  return (
    <div className="space-y-5 mb-6">
      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3.5 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.countColor} leading-none`}>{s.count}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Calendar */}
        <CalendarView workOrders={workOrders} />

        {/* Checked-in field staff */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900">Checked In — Field Staff</h3>
            {checkedIn.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{checkedIn.length} active</span>
            )}
          </div>
          <div className="px-5 py-4 space-y-2.5">
            {checkedIn.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <Wifi className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400 font-medium">No field staff checked in</p>
                <p className="text-xs text-slate-300 mt-0.5">Active check-ins will appear here</p>
              </div>
            ) : (
              checkedIn.map(wo => <CheckedInCard key={wo.id} wo={wo} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}