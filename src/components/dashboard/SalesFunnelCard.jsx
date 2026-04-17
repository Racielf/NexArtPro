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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-violet-700">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-violet-200" />
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">Sales Funnel</span>
        </div>
        <span className="text-[9px] font-bold text-violet-300 uppercase tracking-widest">Pipeline</span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {STAGES.map((stage, idx) => {
          const count = counts[stage.key] || 0;
          const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
          return (
            <Link key={stage.key} to={stage.link} className="block group">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 w-16 flex-shrink-0">{stage.label}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden relative">
                  <div
                    className={`h-full rounded ${stage.color} opacity-75 group-hover:opacity-100 transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-bold text-white mix-blend-overlay pointer-events-none">
                    {loading ? '—' : count}
                  </span>
                </div>
                <span className={`text-[11px] font-black w-6 text-right tabular-nums ${stage.text}`}>
                  {loading ? '—' : count}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}