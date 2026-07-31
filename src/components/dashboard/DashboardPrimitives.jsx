import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { STAT_COLORS } from './dashboardFormat';

export function Card({ title, icon: Icon, link, linkLabel = 'Ver todas', children, className = '', bodyClass = '' }) {
  return (
    <div className={`dashboard-card flex flex-col rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{title}</span>
        </div>
        {link && (
          <Link to={link} className="text-[10px] text-slate-400 hover:text-slate-700 font-semibold flex items-center gap-0.5 transition-colors">
            {linkLabel} <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        )}
      </div>
      <div className={`flex-1 overflow-y-auto scroll-smooth ${bodyClass}`}>
        {children}
      </div>
    </div>
  );
}

export function Row({ children }) {
  return (
    <div className="px-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/40 transition-colors duration-150 cursor-pointer">
      {children}
    </div>
  );
}

export function Empty({ text, sub, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 py-10 select-none">
      {Icon && <Icon className="w-5 h-5 text-slate-300 mb-0.5" />}
      <span className="text-[12px] font-semibold text-slate-400">{text}</span>
      {sub && <span className="text-[10px] text-slate-300">{sub}</span>}
    </div>
  );
}

export function KpiChip({ label, value, color = 'accent', loading, tooltip }) {
  const c = STAT_COLORS[color] ?? STAT_COLORS.accent;
  return (
    <div title={tooltip} className="flex items-center gap-1.5 px-2.5 py-[5px] bg-amber-50/70 border border-border rounded-lg flex-shrink-0 shadow-sm hover:shadow hover:-translate-y-[1px] transition-all duration-150 cursor-default select-none">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.icon }} />
      <div className="leading-none">
        <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`text-[13px] font-bold tabular-nums leading-tight ${loading ? 'text-muted-foreground/40' : 'text-foreground'}`}>
          {loading ? '···' : value}
        </div>
      </div>
    </div>
  );
}
