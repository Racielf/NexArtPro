import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { Card } from './DashboardPrimitives';

const STAGES = [
  { key: 'leads',     label: 'Leads',     hex: '#cc9a34', link: '/leads' },
  { key: 'estimates', label: 'Estimates', hex: '#d98536', link: '/estimates' },
  { key: 'approved',  label: 'Approved',  hex: '#df6b2a', link: '/estimates' },
  { key: 'jobs',      label: 'Jobs',      hex: '#c2410c', link: '/work-orders' },
  { key: 'paid',      label: 'Paid',      hex: '#16a34a', link: '/invoices' },
];

export default function SalesFunnelCard({ counts = {}, loading }) {
  const max = Math.max(1, ...STAGES.map(s => counts[s.key] || 0));

  return (
    <Card title="Sales Funnel" icon={TrendingUp} link="/leads" linkLabel="Pipeline" className="h-full">
      <div className="px-4 py-3 space-y-2">
        {STAGES.map(stage => {
          const count = counts[stage.key] || 0;
          const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
          return (
            <Link key={stage.key} to={stage.link} className="block group">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 w-16 flex-shrink-0">{stage.label}</span>
                <div className="flex-1 h-5 bg-muted/50 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded opacity-80 group-hover:opacity-100 transition-all duration-500"
                    style={{ width: `${pct}%`, background: stage.hex }}
                  />
                  <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-bold text-white mix-blend-overlay pointer-events-none">
                    {loading ? '—' : count}
                  </span>
                </div>
                <span className="font-display text-[13px] font-black w-6 text-right tabular-nums" style={{ color: stage.hex }}>
                  {loading ? '—' : count}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
