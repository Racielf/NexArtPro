import React from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Bell, TrendingUp } from 'lucide-react';

export default function ApptSummaryCards({ appointments }) {
  const today = new Date().toISOString().split('T')[0];

  const total = appointments.length;
  const todayCount = appointments.filter(a => a.scheduled_date === today).length;
  const upcoming = appointments.filter(a => a.scheduled_date > today && !['cancelled', 'completed', 'no_show'].includes(a.status)).length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => ['cancelled', 'no_show'].includes(a.status)).length;
  const followUp = appointments.filter(a => a.status === 'follow_up_needed').length;

  const cards = [
    { label: 'Total', value: total,     icon: TrendingUp,   color: 'text-slate-600', bg: 'bg-slate-50',   border: 'border-slate-200' },
    { label: "Today", value: todayCount, icon: Clock,        color: 'text-blue-600',  bg: 'bg-blue-50',    border: 'border-blue-200' },
    { label: 'Upcoming', value: upcoming, icon: Calendar,    color: 'text-indigo-600',bg: 'bg-indigo-50',  border: 'border-indigo-200' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { label: 'Cancelled / No-show', value: cancelled, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Follow-up Needed', value: followUp, icon: Bell, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(({ label, value, icon: Icon, color, bg, border }) => (
        <div key={label} className={`rounded-xl border ${border} ${bg} px-4 py-3 flex flex-col gap-1`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium leading-tight">{label}</span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <span className={`text-2xl font-bold ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}