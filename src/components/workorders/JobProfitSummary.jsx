/**
 * JobProfitSummary — Non-invasive profit panel for WorkOrderDetail
 * Reads live data via getJobFinancials. Pure display, no mutations.
 */
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getJobFinancials } from '@/lib/jobFinancials';
import { TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';

export default function JobProfitSummary({ workOrderId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workOrderId) return;
    getJobFinancials(workOrderId, base44)
      .then(result => { setData(result); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workOrderId]);

  if (loading) return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <p className="text-xs text-slate-400">Loading financials…</p>
    </div>
  );

  if (!data) return null;

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

  const profitColor = data.is_losing_money
    ? 'text-red-600'
    : data.profit > 0 ? 'text-green-600' : 'text-slate-500';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        {data.is_losing_money
          ? <TrendingDown className="w-4 h-4 text-red-500" />
          : <TrendingUp className="w-4 h-4 text-green-500" />
        }
        <h2 className="text-sm font-bold text-slate-900">Job Financials</h2>
        {data.linked_invoice_number && (
          <span className="ml-auto text-[10px] text-slate-400">INV #{data.linked_invoice_number}</span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Loss warning */}
        {data.is_losing_money && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-red-700">Job is losing money</p>
          </div>
        )}

        {data.no_revenue_linked && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">No linked invoice found — revenue shown as $0</p>
          </div>
        )}

        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Revenue</p>
            <p className="text-base font-bold text-slate-900">{fmt(data.revenue)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Actual Cost</p>
            <p className="text-base font-bold text-slate-700">{fmt(data.actual_cost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Profit</p>
            <p className={`text-base font-bold ${profitColor}`}>{fmt(data.profit)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Margin</p>
            <p className={`text-base font-bold ${profitColor}`}>{fmtPct(data.margin)}</p>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Materials / Expenses</span>
            <span className="font-medium">{fmt(data.breakdown.material)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              Labor
              <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-semibold border border-amber-100">
                rate missing
              </span>
            </span>
            <span>{fmt(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}