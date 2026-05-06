import React from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fmt = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

function Metric({ label, value, accent = 'slate' }) {
  const cls = {
    slate: 'text-slate-800 bg-slate-50 border-slate-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  }[accent] || 'text-slate-800 bg-slate-50 border-slate-200';

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function TargetMarkupSection({
  targetMarkupPct,
  onTargetMarkupChange,
  costBase,
  revenue,
  profit,
  suggestedRevenue,
  actualMarkupPct,
  actualMarginPct,
  onApplySuggestedPrice,
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden mb-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-700" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 leading-none mb-0.5">Internal pricing guide</p>
            <h4 className="text-sm font-bold text-blue-900">Target Markup %</h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Target</label>
          <Input
            type="number"
            min={0}
            step="0.1"
            value={targetMarkupPct}
            onChange={e => onTargetMarkupChange(parseFloat(e.target.value) || 0)}
            className="h-8 w-24 text-right text-sm font-bold border-blue-200 bg-white"
          />
          <span className="text-sm font-bold text-blue-700">%</span>
          <Button type="button" size="sm" onClick={onApplySuggestedPrice} className="h-8 gap-1.5 bg-blue-700 hover:bg-blue-800">
            <TrendingUp className="w-3.5 h-3.5" />
            Apply Suggested Price
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-5 py-4">
        <Metric label="Cost Base" value={fmt(costBase)} />
        <Metric label="Revenue" value={fmt(revenue)} />
        <Metric label="Profit" value={fmt(profit)} accent="emerald" />
        <Metric label="Target Markup %" value={pct(targetMarkupPct)} accent="blue" />
        <Metric label="Suggested Revenue" value={fmt(suggestedRevenue)} accent="blue" />
        <Metric label="Actual Markup %" value={pct(actualMarkupPct)} accent="blue" />
        <Metric label="Actual Margin %" value={pct(actualMarginPct)} accent="emerald" />
      </div>
    </div>
  );
}