import React from 'react';
import { Info } from 'lucide-react';

/**
 * Discrete financial subline shown under each service row in EstimateGroups.
 * Internal reference only — uses catalog Unit Cost as a pricing guide.
 *
 * IMPORTANT: These per-line metrics do NOT affect the estimate's Net Profit.
 * Net Profit is calculated only from Internal Job Cost (Other Costs section)
 * vs the Estimate Total. The values shown here help the operator price the
 * line against catalog reference, but they are not expense numbers.
 *
 * Health thresholds (line markup vs catalog cost):
 *   < 25%  → Critical (red)
 *   25-40% → Warning  (amber)
 *   > 40%  → Healthy  (emerald)
 */
export default function LineItemFinancialSubline({ quantity, unitPrice, unitCost, markupPct, markupOverride = false, onMarkupChange }) {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const cost = parseFloat(unitCost) || 0;

  if (price <= 0 || cost <= 0 || qty <= 0) return null;

  const lineRevenue = qty * price;
  const lineCost = qty * cost;
  const profit = lineRevenue - lineCost;
  const marginPct = (profit / lineRevenue) * 100;
  const displayMarkup = Number(markupPct ?? (lineCost > 0 ? (profit / lineCost) * 100 : 0)) || 0;

  const fmt = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let badge;
  if (marginPct < 25) {
    badge = { label: 'Critical', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
  } else if (marginPct <= 40) {
    badge = { label: 'Warning', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  } else {
    badge = { label: 'Healthy', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium flex-wrap py-1" title="Reference only — does not affect Net Profit">
      <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mr-0.5">Reference</span>
      <span className="text-slate-500" title="Catalog Unit Cost × Qty (reference only)">Ref Cost</span>
      <span className="font-semibold text-slate-700 tabular-nums" title={`Unit Cost ${fmt(parseFloat(unitCost) || 0)} × Qty ${qty}`}>{fmt(lineCost)}</span>
      <span className="text-slate-300">•</span>
      <span className="text-slate-500" title="Indicative line profit vs catalog reference cost. Does NOT affect Net Profit.">Ref Profit</span>
      <span className="font-semibold text-emerald-700 tabular-nums">{fmt(profit)}</span>
      <span className="text-slate-300">•</span>
      <span className="text-slate-500" title="Pricing guidance only — used to suggest unit price from catalog cost">Markup</span>
      {onMarkupChange ? (
        <span className="relative inline-flex items-center">
          <input
            type="number"
            min={0}
            step="0.1"
            value={displayMarkup.toFixed(1)}
            onChange={e => onMarkupChange(e.target.value)}
            className="h-6 w-24 rounded-md border border-blue-200 bg-blue-50/70 pr-6 pl-2 text-right text-[12px] font-bold text-blue-800 tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <span className="absolute right-2 text-[10px] font-bold text-blue-700 pointer-events-none">%</span>
        </span>
      ) : (
        <span className="font-semibold text-slate-700 tabular-nums">{displayMarkup.toFixed(1)}%</span>
      )}
      {markupOverride && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex-shrink-0">Override</span>}
      <span className="text-slate-300">•</span>
      <span className="text-slate-500" title="Indicative line margin vs catalog reference. Net Margin is calculated from Internal Job Cost only.">Ref Margin</span>
      <span className="font-semibold text-slate-700 tabular-nums">{marginPct.toFixed(1)}%</span>
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${badge.cls}`}>
        <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
        {badge.label}
      </span>
    </div>
  );
}