import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';
import { validateEstimatePricing } from '@/lib/pricingValidation';
import { mapItemsToGroups } from '@/components/proposals/ProposalEstimateGroupsAdapter';

/**
 * ProposalMarginReview — Decision layer shown inside ProposalSendModal.
 *
 * Reads proposal financials directly (total_amount, total_cost, gross_margin_pct).
 * Uses validateEstimatePricing for item-level risk detection.
 * NEVER blocks sending. NEVER modifies pricing data.
 */

const LOW_MARGIN_THRESHOLD = 15; // %
const RISK_MARGIN_THRESHOLD = 5;  // %

function getSignal(marginPct, lossItems, zeroProfitItems) {
  if (lossItems.length > 0) {
    return { level: 'risk', label: 'At Risk — Consider adjusting pricing', Icon: TrendingDown, colors: 'bg-red-50 border-red-200 text-red-700' };
  }
  if (marginPct < RISK_MARGIN_THRESHOLD || zeroProfitItems.length > 0) {
    return { level: 'risk', label: 'At Risk — Consider adjusting pricing', Icon: TrendingDown, colors: 'bg-red-50 border-red-200 text-red-700' };
  }
  if (marginPct < LOW_MARGIN_THRESHOLD) {
    return { level: 'low', label: 'Low Margin — Review Recommended', Icon: AlertTriangle, colors: 'bg-amber-50 border-amber-200 text-amber-700' };
  }
  return { level: 'healthy', label: 'Healthy Margin', Icon: CheckCircle, colors: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
}

function Stat({ label, value, sub, highlight }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${highlight || 'text-slate-800'}`}>{value}</span>
      {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
    </div>
  );
}

export default function ProposalMarginReview({ proposal }) {
  if (!proposal) return null;

  const revenue   = parseFloat(proposal.total_amount)    || 0;
  const cost      = parseFloat(proposal.total_cost)      || 0;
  const profit    = parseFloat(proposal.gross_margin)    || (revenue - cost);
  const marginPct = parseFloat(proposal.gross_margin_pct) || (revenue > 0 ? (profit / revenue) * 100 : 0);

  // Item-level risk detection via existing validator
  const groups = mapItemsToGroups(proposal.items || []);
  const { lossItems, zeroProfitItems } = validateEstimatePricing({ groups });

  const hasCostData = cost > 0;
  const signal = hasCostData
    ? getSignal(marginPct, lossItems, zeroProfitItems)
    : null;

  const fmt = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Margin Review</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Revenue" value={fmt(revenue)} />
          <Stat
            label="Cost"
            value={hasCostData ? fmt(cost) : '—'}
            sub={hasCostData ? undefined : 'no cost data'}
          />
          <Stat
            label="Profit"
            value={hasCostData ? fmt(profit) : '—'}
            highlight={hasCostData ? (profit >= 0 ? 'text-emerald-700' : 'text-red-600') : undefined}
          />
          <Stat
            label="Margin"
            value={hasCostData ? `${marginPct.toFixed(1)}%` : '—'}
            highlight={
              !hasCostData ? undefined
              : marginPct >= LOW_MARGIN_THRESHOLD ? 'text-emerald-700'
              : marginPct >= RISK_MARGIN_THRESHOLD ? 'text-amber-600'
              : 'text-red-600'
            }
          />
        </div>

        {/* Decision signal */}
        {signal && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${signal.colors}`}>
            <signal.Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {signal.label}
          </div>
        )}

        {!hasCostData && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
            <MinusCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            No cost data — add unit costs to line items to enable margin analysis.
          </div>
        )}

        {/* Item-level risk flags */}
        {lossItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Loss Items</p>
            {lossItems.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-red-700 bg-red-50 rounded px-2.5 py-1.5">
                <span className="truncate max-w-[60%]">{it.name}</span>
                <span className="font-semibold tabular-nums">
                  ${it.unit_price.toFixed(2)} &lt; ${it.unit_cost.toFixed(2)} cost
                </span>
              </div>
            ))}
          </div>
        )}

        {zeroProfitItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Zero-Profit Items</p>
            {zeroProfitItems.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded px-2.5 py-1.5">
                <span className="truncate max-w-[60%]">{it.name}</span>
                <span className="font-semibold">Price = Cost</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}