import React from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

const fmt = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

function getHealth(grossMarginPct) {
  const m = Number(grossMarginPct) || 0;
  if (m < 25) {
    return {
      label: 'Critical',
      icon: AlertCircle,
      cls: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500',
    };
  }
  if (m <= 40) {
    return {
      label: 'Warning',
      icon: AlertTriangle,
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    };
  }
  return {
    label: 'Healthy',
    icon: ShieldCheck,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  };
}

function Metric({ label, value, accent }) {
  const accentCls = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }[accent] || 'text-slate-800';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${accentCls}`}>{value}</p>
    </div>
  );
}

export default function FinancialAnalysisPanel({
  servicesSubtotal,
  totalCost,
  grossMargin,
  grossMarginPct,
  netProfit,
  netProfitPct,
}) {
  const health = getHealth(grossMarginPct);
  const HealthIcon = health.icon;

  return (
    <div
      className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-5"
      style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.04)' }}
    >
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Financial Analysis · Internal
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${health.cls}`}
        >
          <HealthIcon className="w-3 h-3" />
          {health.label} · {pct(grossMarginPct)}
        </span>
      </div>

      <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-3 gap-2">
        <Metric label="Services Subtotal" value={fmt(servicesSubtotal)} accent="slate" />
        <Metric label="Total Cost" value={fmt(totalCost)} accent="slate" />
        <Metric label="Gross Margin" value={fmt(grossMargin)} accent="emerald" />
        <Metric label="Gross Margin %" value={pct(grossMarginPct)} accent="emerald" />
        <Metric label="Net Profit" value={fmt(netProfit)} accent="emerald" />
        <Metric label="Net Profit %" value={pct(netProfitPct)} accent="emerald" />
      </div>
    </div>
  );
}