import React from 'react';
import { Calendar, CheckCircle, Clock, AlertTriangle, Navigation, XCircle } from 'lucide-react';

export default function ApptSummaryCards({ appointments }) {
  const today = new Date().toISOString().split('T')[0];

  const stats = {
    total: appointments.length,
    today: appointments.filter(a => a.appointment_date === today).length,
    upcoming: appointments.filter(a => a.appointment_date > today && !['cancelled', 'no_show'].includes(a.status)).length,
    completed: appointments.filter(a => a.status === 'visit_completed').length,
    onTheWay: appointments.filter(a => a.status === 'on_the_way').length,
    followUp: appointments.filter(a => a.status === 'follow_up_needed').length,
  };

  const cards = [
    { label: 'Today',       value: stats.today,     icon: Calendar,    color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Upcoming',    value: stats.upcoming,  icon: Clock,       color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'On The Way',  value: stats.onTheWay,  icon: Navigation,  color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed',   value: stats.completed, icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Follow-up',   value: stats.followUp,  icon: AlertTriangle,color:'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Total',       value: stats.total,     icon: Calendar,    color: 'text-slate-600',  bg: 'bg-slate-100' },
  ];

  return (
    <div className="grid grid-cols-3 xl:grid-cols-6 gap-2">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}