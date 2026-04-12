import React from 'react';
import SalesEstimateCard from './SalesEstimateCard';

export default function SalesPipelineColumn({ stage, estimates }) {
  const total = estimates.reduce((s, e) => s + (e.total || 0), 0);

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] flex-shrink-0">
      {/* Column header */}
      <div
        className="rounded-t-lg px-3 py-2.5 border border-b-0"
        style={{ backgroundColor: stage.bg, borderColor: stage.border }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{stage.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: stage.color }}>
              {stage.label}
            </span>
          </div>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: stage.color + '20', color: stage.color }}
          >
            {estimates.length}
          </span>
        </div>
        {total > 0 && (
          <p className="text-[10px] font-semibold mt-1" style={{ color: stage.color }}>
            ${total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* Cards */}
      <div
        className="flex-1 space-y-2 p-2 rounded-b-lg border border-t-0 overflow-y-auto"
        style={{ borderColor: stage.border, backgroundColor: stage.bg + '40', minHeight: 120, maxHeight: 'calc(100vh - 280px)' }}
      >
        {estimates.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-6">No estimates</p>
        ) : (
          estimates.map(est => (
            <SalesEstimateCard key={est.id} estimate={est} />
          ))
        )}
      </div>
    </div>
  );
}