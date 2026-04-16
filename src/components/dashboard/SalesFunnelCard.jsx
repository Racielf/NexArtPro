import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ChevronRight } from 'lucide-react';

const STAGES = [
  { key: 'leads',     label: 'Leads',     color: 'bg-slate-400',   text: 'text-slate-600',   link: '/leads' },
  { key: 'estimates', label: 'Estimates', color: 'bg-blue-400',    text: 'text-blue-700',    link: '/estimates' },
  { key: 'approved',  label: 'Approved',  color: 'bg-violet-500',  text: 'text-violet-700',  link: '/estimates' },
  { key: 'jobs',      label: 'Jobs',      color: 'bg-amber-400',   text: 'text-amber-700',   link: '/work-orders' },
  { key: 'paid',      label: 'Paid',      color: 'bg-emerald-500', text: 'text-emerald-700', link: '/invoices' },
];

export default function SalesFunnelCard({ counts = {}, loading }) {
  const max = Math.max(1, ...STAGES.map(s => counts[s.key] || 0));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-800">Sales Funnel</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pipeline</span>
      </div>

      <div className="px-5 py-5 space-y-3">
        {STAGES.map((stage, idx) => {
          const count = counts[stage.key] || 0;
          const pct = max > 0 ? Math.max(6, Math.round((count / max) * 100)) : 6;
          return (
            <Link key={stage.key} to={stage.link} className="block group">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-slate-500 w-20 flex-shrink-0">{stage.label}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg ${stage.color} opacity-80 group-hover:opacity-100 transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center pl-3 text-[11px] font-bold text-white mix-blend-overlay pointer-events-none">
                    {loading ? '—' : count}
                  </span>
                </div>
                <span className={`text-sm font-bold w-8 text-right tabular-nums ${stage.text}`}>
                  {loading ? '—' : count}
                </span>
                {idx < STAGES.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}