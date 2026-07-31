import React from 'react';
import { Link } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import { formatMoney } from './dashboardFormat';
import { Card } from './DashboardPrimitives';

export default function MoneyControl({ monthRevenue = 0, outstanding = 0, invoices = [], loading, activeJobsCount = 0 }) {
  const overdueAmt = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const metrics = [
    { label: 'Este mes', sub: 'ingresos cobrados', value: monthRevenue, cls: 'text-emerald-700' },
    { label: 'Por cobrar', sub: 'pendiente de cobro', value: outstanding, cls: 'text-blue-700' },
    { label: 'Vencido', sub: overdueCount > 0 ? `${overdueCount} factura${overdueCount > 1 ? 's' : ''}` : 'al día', value: overdueAmt, cls: overdueAmt > 0 ? 'text-red-600' : 'text-slate-400' },
    { label: 'Jobs Activos', sub: 'en progreso', value: activeJobsCount, cls: 'text-slate-700', isCount: true },
  ];

  const title = (
    <span className="flex items-center gap-2">
      Money Control
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground normal-case tracking-normal">
        {invoices.length} facturas
      </span>
    </span>
  );

  return (
    <Card title={title} icon={DollarSign} className="h-full">
      <div className="p-5 flex flex-col gap-4 h-full">
        <div className="flex-1 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-dashed divide-border/60">
          {metrics.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1 px-0 sm:px-5 py-3 sm:py-0 first:pl-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{m.label}</span>
              <span className={`font-display text-2xl sm:text-3xl font-black tabular-nums leading-none ${loading ? 'opacity-30' : m.cls}`}>
                {loading ? '—' : m.isCount ? m.value : formatMoney(m.value)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">{m.sub}</span>
            </div>
          ))}
        </div>
        <Link to="/invoices" className="flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white overflow-hidden">
          <span className="flex items-center gap-2 flex-1 justify-center py-3 text-[13px] font-bold">
            <DollarSign className="w-4 h-4" />Cobrar ahora
          </span>
          <span className="border-l border-emerald-500/60 px-4 py-3 text-[11px] text-emerald-200 hover:text-white whitespace-nowrap font-medium">Ver facturas →</span>
        </Link>
      </div>
    </Card>
  );
}
