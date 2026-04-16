import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Navigation2, HardHat, CheckCircle2 } from 'lucide-react';

const STAGES = [
  { key: 'scheduled',   label: 'Scheduled',   icon: HardHat,      bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500',    text: 'text-blue-700' },
  { key: 'on_the_way',  label: 'On My Way',   icon: Navigation2,  bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500',   text: 'text-amber-700' },
  { key: 'in_progress', label: 'In Progress', icon: Wrench,       bg: 'bg-violet-50',  border: 'border-violet-200',  dot: 'bg-violet-500',  text: 'text-violet-700' },
  { key: 'completed',   label: 'Completed',   icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
];

export default function JobPipelineCard({ workOrders = [], loading }) {
  const counts = {
    scheduled:   workOrders.filter(w => w.status === 'scheduled').length,
    on_the_way:  workOrders.filter(w => w.status === 'on_the_way').length,
    in_progress: workOrders.filter(w => w.status === 'in_progress').length,
    completed:   workOrders.filter(w => w.status === 'completed').length,
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-slate-800">Job Pipeline</span>
        </div>
        <Link to="/work-orders" className="text-xs text-primary hover:underline font-medium">View all →</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y sm:divide-y-0 divide-slate-100">
        {STAGES.map(stage => {
          const Icon = stage.icon;
          const count = counts[stage.key] || 0;
          return (
            <Link key={stage.key} to="/work-orders" className="block group">
              <div className="px-5 py-5 flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${stage.bg} border ${stage.border} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stage.text}`} />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
                    {loading ? '—' : count}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">{stage.label}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${stage.bg} border ${stage.border} ${stage.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  Active
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}