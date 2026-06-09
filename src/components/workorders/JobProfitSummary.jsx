/**
 * JobProfitSummary — Non-invasive profit panel for WorkOrderDetail
 * Reads live data via getJobFinancials. Pure display for financials.
 * Also mounts WOAssigneePanel in the same WorkOrderDetail sidebar area.
 */
import React, { useEffect, useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { getJobFinancials } from '@/lib/jobFinancials';
import { TrendingDown, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import WOAssigneePanel from '@/components/workorders/WOAssigneePanel';

const RISK_CONFIG = {
  losing:  { bg: 'bg-red-50 border-red-200',    text: 'text-red-700',    icon: TrendingDown,  iconCls: 'text-red-500' },
  warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700',  icon: AlertTriangle, iconCls: 'text-amber-500' },
  healthy: { bg: 'bg-green-50 border-green-200', text: 'text-green-700',  icon: CheckCircle2,  iconCls: 'text-green-500' },
  unknown: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500',  icon: Info,          iconCls: 'text-slate-400' },
};

const LABOR_STATUS_BADGE = {
  resolved: { cls: 'bg-green-50 text-green-700 border-green-100',  label: 'rate resolved' },
  partial:  { cls: 'bg-amber-50 text-amber-600 border-amber-100',  label: 'rate partial' },
  missing:  { cls: 'bg-amber-50 text-amber-600 border-amber-100',  label: 'rate missing' },
};

function fmtHours(h) {
  if (!h) return null;
  const rounded = Math.round(h * 10) / 10;
  return `${rounded}h`;
}

export default function JobProfitSummary({ workOrderId }) {
  const [data, setData] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPanelData = async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const [financials, workOrderList] = await Promise.all([
        getJobFinancials(workOrderId, nexartClient),
        nexartClient.entities.WorkOrder.filter({ id: workOrderId }),
      ]);
      setData(financials);
      setWorkOrder(workOrderList?.[0] || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPanelData();
  }, [workOrderId]);

  if (loading) return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <p className="text-xs text-slate-400">Loading assignment…</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <p className="text-xs text-slate-400">Loading financials…</p>
      </div>
    </div>
  );

  const assignmentPanel = workOrder ? (
    <WOAssigneePanel
      workOrder={workOrder}
      workOrderId={workOrderId}
      onAssigned={loadPanelData}
    />
  ) : null;

  if (!data) return assignmentPanel;

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

  const profitColor = data.risk?.level === 'losing'
    ? 'text-red-600'
    : data.risk?.level === 'warning' ? 'text-amber-600'
    : data.profit > 0 ? 'text-green-600' : 'text-slate-500';

  const risk = data.risk || { level: 'unknown', label: 'Unknown', description: '' };
  const riskCfg = RISK_CONFIG[risk.level] || RISK_CONFIG.unknown;
  const RiskIcon = riskCfg.icon;
  const laborBadge = LABOR_STATUS_BADGE[data.labor_rate_status] || LABOR_STATUS_BADGE.missing;

  const laborMeta = data.labor_meta || {};
  const laborDetail = [
    laborMeta.total_hours > 0 ? fmtHours(laborMeta.total_hours) : null,
    laborMeta.worker_count > 0 ? `${laborMeta.worker_count} worker${laborMeta.worker_count > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-4">
      {assignmentPanel}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <RiskIcon className={`w-4 h-4 ${riskCfg.iconCls}`} />
          <h2 className="text-sm font-bold text-slate-900">Job Financials</h2>
          {data.invoice_count > 0 && (
            <span className="ml-auto text-[10px] text-slate-400">
              {data.invoice_count} invoice{data.invoice_count > 1 ? 's' : ''}
              {data.linked_invoice_number ? ` · INV #${data.linked_invoice_number}` : ''}
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          {risk.level !== 'unknown' && (
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border ${riskCfg.bg}`}>
              <RiskIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${riskCfg.iconCls}`} />
              <div>
                <p className={`text-xs font-semibold ${riskCfg.text}`}>{risk.label}</p>
                <p className={`text-[11px] mt-0.5 ${riskCfg.text} opacity-80`}>{risk.description}</p>
              </div>
            </div>
          )}

          {data.no_revenue_linked && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">No linked invoice found — revenue shown as $0</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Revenue</p>
              <p className="text-base font-bold text-slate-900">{fmt(data.revenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Collected</p>
              <p className="text-base font-bold text-green-600">{fmt(data.collected)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Actual Cost</p>
              <p className="text-base font-bold text-slate-700">{fmt(data.actual_cost)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Profit</p>
              <p className={`text-base font-bold ${profitColor}`}>{fmt(data.profit)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 col-span-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Margin</p>
              <p className={`text-base font-bold ${profitColor}`}>{fmtPct(data.margin)}</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Materials / Expenses</span>
              <span className="font-medium">{fmt(data.breakdown.material)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 flex-wrap">
                <span>Labor</span>
                {laborDetail && (
                  <span className="text-[10px] text-slate-400">({laborDetail})</span>
                )}
                <span className={`px-1 py-0.5 rounded text-[9px] font-semibold border ${laborBadge.cls}`}>
                  {laborBadge.label}
                </span>
                {data.using_legacy_time && (
                  <span className="px-1 py-0.5 rounded text-[9px] font-semibold border bg-slate-50 text-slate-500 border-slate-200">
                    legacy time
                  </span>
                )}
              </span>
              <span className="font-medium">{fmt(data.breakdown.labor)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
