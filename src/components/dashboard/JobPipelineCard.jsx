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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-amber-600">
        <div className="flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-amber-100" />
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">Job Pipeline</span>
        </div>
        <Link to="/work-orders" className="text-[10px] text-amber-200 hover:text-white font-semibold">Ver →</Link>
      </div>

      <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-100">
        {STAGES.map(stage => {
          const Icon = stage.icon;
          const count = counts[stage.key] || 0;
          return (
            <Link key={stage.key} to="/work-orders" className="block group">
              <div className="px-3 py-3 flex items-center gap-2.5 hover:bg-slate-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg ${stage.bg} border ${stage.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${stage.text}`} />
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 tabular-nums leading-none">
                    {loading ? '—' : count}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 leading-tight">{stage.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}