/**
 * OwnerAccountabilityPanel — Compact owner breach load metrics
 *
 * Props:
 *   invoices: Invoice[]
 *   onOwnerSelect: (owner) => void — drill-down handler
 */
import React from 'react';
import { getOwnersByActiveBreachLoad } from '@/lib/invoiceSLAOwnerMetrics';

export default function OwnerAccountabilityPanel({ invoices = [], onOwnerSelect }) {
  const ownerMetrics = getOwnersByActiveBreachLoad(invoices);

  if (ownerMetrics.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Owner Accountability</p>
        <p className="text-xs text-slate-500 mt-1">No active breaches assigned</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Owner Accountability</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {ownerMetrics.map(owner => (
          <button
            key={owner.owner}
            onClick={() => onOwnerSelect?.(owner.owner)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors text-xs group"
          >
            <div className="min-w-0 flex-1 text-left">
              <p className="font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                {owner.owner}
              </p>
              <p className="text-[10px] text-slate-500">
                {owner.total} inv
                {owner.urgentWorkload > 0 ? ` · ${owner.urgentWorkload}🔴` : ''}
                {owner.actionTodayWorkload > 0 ? ` · ${owner.actionTodayWorkload}🟠` : ''}
              </p>
            </div>

            {/* Breach badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {owner.criticalBreaches > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold text-[10px]">
                  {owner.criticalBreaches}
                </span>
              )}
              {owner.highBreaches > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold text-[10px]">
                  {owner.highBreaches}
                </span>
              )}
              {owner.unresolvedIssues > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold text-[10px]">
                  {owner.unresolvedIssues}
                </span>
              )}
              {owner.avgAgingDays > 0 && (
                <span className="text-[10px] text-slate-500 font-medium">
                  {owner.avgAgingDays}d
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}