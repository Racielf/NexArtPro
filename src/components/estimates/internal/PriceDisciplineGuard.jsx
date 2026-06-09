/**
 * PriceDisciplineGuard — INTERNAL USE ONLY
 *
 * Shows pricing variance warnings in edit mode.
 * NEVER rendered in PDF, preview, send, or any client-facing view.
 */
import React from 'react';
import { AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';
import { calculatePriceDiscipline, flattenItems } from '@/utils/priceDiscipline';

const fmt = (n) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const pct = (n) => `${(Math.abs(n) * 100).toFixed(1)}%`;

/**
 * Props:
 *   groups              — estimate.groups array
 *   minVarianceThreshold — e.g. -0.20 means -20% is the critical threshold (default -0.20)
 */
export default function PriceDisciplineGuard({ groups = [], minVarianceThreshold = -0.20 }) {
  const items = flattenItems(groups);
  const { bookTotal, actualTotal, varianceAmount, variancePercent, hasBookData } =
    calculatePriceDiscipline(items);

  // No book data at all — nothing to compare
  if (!hasBookData || bookTotal === 0) return null;

  // No discount — all good, don't show anything
  if (varianceAmount >= 0) return null;

  const isCritical = variancePercent < minVarianceThreshold;

  return (
    <div className={`rounded-lg border px-4 py-3 mb-4 ${
      isCritical
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isCritical
          ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        }
        <span className={`text-xs font-bold uppercase tracking-wide ${
          isCritical ? 'text-red-700' : 'text-amber-700'
        }`}>
          {isCritical ? 'Critical Pricing Alert' : 'Pricing Warning'} — Internal Only
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded px-3 py-2 border border-slate-100">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Price Book Total</div>
          <div className="text-sm font-bold text-slate-700">{fmt(bookTotal)}</div>
        </div>
        <div className="bg-white rounded px-3 py-2 border border-slate-100">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Your Price</div>
          <div className="text-sm font-bold text-slate-700">{fmt(actualTotal)}</div>
        </div>
        <div className={`rounded px-3 py-2 border ${
          isCritical ? 'bg-red-100 border-red-200' : 'bg-amber-100 border-amber-200'
        }`}>
          <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
            isCritical ? 'text-red-500' : 'text-amber-600'
          }`}>Difference</div>
          <div className={`text-sm font-bold ${isCritical ? 'text-red-600' : 'text-amber-700'}`}>
            -{fmt(varianceAmount)} <span className="text-xs font-normal opacity-70">(-{pct(variancePercent)})</span>
          </div>
        </div>
      </div>

      {/* Message */}
      <p className={`text-xs leading-relaxed ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
        {isCritical
          ? `Critical pricing alert: discount exceeds acceptable threshold (${pct(minVarianceThreshold)} max). Review before sending.`
          : 'You are offering a discount from your standard pricing.'
        }
      </p>
    </div>
  );
}