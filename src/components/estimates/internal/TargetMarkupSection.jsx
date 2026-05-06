import React from 'react';
import { Target, TrendingUp, AlertTriangle, AlertOctagon, Layers, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fmt = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

function Metric({ label, value, accent = 'slate' }) {
  const cls = {
    slate: 'text-slate-800 bg-slate-50 border-slate-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red: 'text-red-700 bg-red-50 border-red-200',
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
  differenceFromTarget,
  overriddenServicesCount,
  message,
  onApplySuggestedPrice,
  onForceApplyToAll,
  internalJobCost = 0,
  allocatedLinesCount = 0,
  allocationIsApplied = false,
  onApplyJobCostAllocation,
  onClearJobCostAllocation,
}) {
  const differenceAccent = Number(differenceFromTarget) >= 0 ? 'emerald' : 'amber';
  const overrides = Number(overriddenServicesCount) || 0;
  const profitNum = Number(profit) || 0;
  const isLosingMoney = profitNum < 0;
  const profitAccent = profitNum > 0 ? 'emerald' : profitNum < 0 ? 'red' : 'amber';

  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden mb-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-700" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 leading-none mb-0.5">Pricing guidance · suggests prices, does not affect Net Profit</p>
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
          <Button type="button" size="sm" variant="outline" onClick={onForceApplyToAll} className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
            Force Apply to All
          </Button>
        </div>
      </div>

      {onApplyJobCostAllocation && (
        <div className="px-5 py-3 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600 leading-none mb-0.5">Hidden overhead recovery</p>
              <p className="text-xs font-semibold text-amber-900 flex items-center gap-2 flex-wrap">
                Internal Job Cost: <span className="tabular-nums">{fmt(internalJobCost)}</span>
                {/* Allocation status badge */}
                {allocationIsApplied ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                    ✓ Allocated · {allocatedLinesCount} line{allocatedLinesCount !== 1 ? 's' : ''} · Revert Available
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    Not Allocated
                  </span>
                )}
              </p>
              <p className="text-[10px] text-amber-700 italic mt-0.5">Distributes hidden costs into Unit Price (proportional by service value). Reapplying never compounds.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {allocatedLinesCount > 0 && onClearJobCostAllocation && (
              <Button type="button" size="sm" variant="outline" onClick={onClearJobCostAllocation} className="h-8 gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50">
                <RotateCcw className="w-3.5 h-3.5" />
                Revert to Base Price
              </Button>
            )}
            <Button type="button" size="sm" onClick={onApplyJobCostAllocation} className="h-8 gap-1.5 bg-amber-700 hover:bg-amber-800">
              <Layers className="w-3.5 h-3.5" />
              Apply Internal Job Cost Allocation
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-5 py-4">
        <Metric label="Internal Job Cost" value={fmt(costBase)} accent="amber" />
        <Metric label="Estimate Total / Revenue" value={fmt(revenue)} accent="blue" />
        <Metric label="Net Profit" value={fmt(profit)} accent={profitAccent} />
        <Metric label="Net Margin %" value={pct(actualMarginPct)} accent="emerald" />
        <Metric label="Target Markup %" value={pct(targetMarkupPct)} accent="blue" />
        <Metric label="Suggested Price (guide)" value={fmt(suggestedRevenue)} accent="blue" />
        <Metric label="Actual Markup %" value={pct(actualMarkupPct)} accent="blue" />
        <Metric label="Difference from Target" value={`${Number(differenceFromTarget) >= 0 ? '+' : ''}${pct(differenceFromTarget)}`} accent={differenceAccent} />
        <Metric label="Manual Overrides" value={`${Number(overriddenServicesCount) || 0} services`} accent="amber" />
      </div>
      <div className="mx-5 mb-4 -mt-2 text-[10px] font-medium text-slate-500 italic">
        Net Profit = Estimate Total − Internal Job Cost. Service Unit Cost values are catalog reference only and do not affect this calculation.
      </div>
      {message && (
        <div className="mx-5 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {message}
        </div>
      )}

      {overrides > 0 && (
        <div className="mx-5 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>{overrides} service{overrides !== 1 ? 's are' : ' is'} overriding global pricing.</span>
        </div>
      )}

      {isLosingMoney && (
        <div className="mx-5 mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 flex items-center gap-2">
          <AlertOctagon className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
          <span>This estimate is losing money. Review pricing before sending.</span>
        </div>
      )}
    </div>
  );
}