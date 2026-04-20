import React, { useEffect, useState } from 'react';
import { CheckCircle, DollarSign, Clock, AlertTriangle, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getInvoiceDashboardMetrics } from '@/lib/invoiceDashboardMetrics';
import { filterActiveRecords } from '@/lib/softDelete';

export default function CashflowSummary() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Invoice.list('-created_date').then(data => {
      setInvoices(filterActiveRecords(data));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-24 animate-pulse bg-slate-100 rounded-xl" />;

  const metrics = getInvoiceDashboardMetrics(invoices);
  const fmt = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  const kpis = [
    {
      label: 'Total Facturado',
      value: fmt(metrics.total_invoiced),
      icon: DollarSign,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Cobrado',
      value: fmt(metrics.total_collected),
      icon: CheckCircle,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
    },
    {
      label: 'Pendiente',
      value: fmt(metrics.total_outstanding),
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
    },
    {
      label: 'Vencido',
      value: fmt(metrics.total_overdue),
      icon: metrics.total_overdue > 0 ? AlertTriangle : Zap,
      iconBg: metrics.total_overdue > 0 ? 'bg-red-50' : 'bg-slate-100',
      iconColor: metrics.total_overdue > 0 ? 'text-red-600' : 'text-slate-400',
      valueColor: metrics.total_overdue > 0 ? 'text-red-600' : 'text-slate-400',
      badge: metrics.overdue_invoice_count > 0 ? metrics.overdue_invoice_count : null,
      highlight: metrics.total_overdue > 0,
    },
  ];

  const arRows = [
    { label: 'Cobrable',    value: metrics.total_collectable, dot: 'bg-blue-500',    color: 'text-blue-700' },
    { label: 'Prometido',   value: metrics.total_promised,    dot: 'bg-emerald-500', color: 'text-emerald-700' },
    { label: 'En revisión', value: metrics.total_in_review,   dot: 'bg-amber-400',   color: 'text-amber-700' },
    { label: 'En riesgo',   value: metrics.total_at_risk,     dot: 'bg-red-500',     color: 'text-red-700' },
  ];

  const forecastRows = [
    { label: 'Próximos 3 días',  value: metrics.expected_immediate,  dot: 'bg-emerald-400', color: 'text-emerald-700' },
    { label: 'Próximos 10 días', value: metrics.expected_short_term, dot: 'bg-blue-400',    color: 'text-blue-700' },
    { label: 'Sin fecha est.',   value: metrics.expected_uncertain,  dot: 'bg-slate-300',   color: 'text-slate-500' },
  ];

  return (
    <div className="space-y-3">
      {/* KPI Cards — primary visual weight */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, iconBg, iconColor, valueColor, badge, highlight }) => (
          <div
            key={label}
            className={`bg-white border rounded-xl px-4 py-3.5 flex items-center gap-3 ${
              highlight ? 'border-red-200 bg-red-50/40' : 'border-slate-200'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-medium leading-tight">{label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className={`text-[18px] font-bold leading-tight truncate ${valueColor}`}>{value}</p>
                {badge && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full leading-none">
                    {badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compact insight strip — forecast + A/R */}
      {metrics.total_outstanding > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex flex-wrap gap-x-8 gap-y-2 items-start">
          {/* Forecast */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Flujo esperado</p>
            {forecastRows.map(({ label, value, dot, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                <span className="text-[11px] text-slate-500 w-28">{label}</span>
                <span className={`text-[11px] font-semibold ${value > 0 ? color : 'text-slate-300'}`}>{fmt(value)}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-slate-100 self-stretch" />

          {/* A/R Classification */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Clasificación A/R</p>
            {arRows.map(({ label, value, dot, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                <span className="text-[11px] text-slate-500 w-28">{label}</span>
                <span className={`text-[11px] font-semibold ${value > 0 ? color : 'text-slate-300'}`}>{fmt(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}