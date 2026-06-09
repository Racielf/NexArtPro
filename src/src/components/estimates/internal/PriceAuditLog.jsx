/**
 * PriceAuditLog — INTERNAL USE ONLY
 *
 * Collapsible timeline of unit_price / unit_cost changes made during this editing session.
 * Never rendered in PDF, preview, send, work orders, or any client-facing document.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return '—'; }
}

function fmtMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `$${parseFloat(n).toFixed(2)}`;
}

function fmtMargin(m) {
  if (m === null || m === undefined) return '—';
  return `${parseFloat(m).toFixed(1)}%`;
}

function StatusDot({ status }) {
  const colors = {
    healthy:  'bg-emerald-500',
    warning:  'bg-amber-400',
    critical: 'bg-red-500',
    none:     'bg-slate-300',
  };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-slate-300'}`} />;
}

function LogEntry({ entry }) {
  const isIncrease = entry.delta > 0;
  const fieldLabel = entry.field === 'unit_price' ? 'Price' : 'Cost';
  const dirIcon    = isIncrease ? '🟢' : '🔴';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0 group">
      {/* Direction indicator */}
      <span className="text-sm flex-shrink-0 mt-0.5">{dirIcon}</span>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Item name + field */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{entry.item_name}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            entry.field === 'unit_price'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-amber-50 text-amber-700'
          }`}>{fieldLabel}</span>
        </div>

        {/* Value change */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[11px] text-slate-500 tabular-nums">
            {fmtMoney(entry.old_value)}
          </span>
          <span className="text-[10px] text-slate-300">→</span>
          <span className={`text-[11px] font-bold tabular-nums ${isIncrease ? 'text-emerald-600' : 'text-red-600'}`}>
            {fmtMoney(entry.new_value)}
          </span>
          <span className={`text-[10px] font-semibold tabular-nums ${isIncrease ? 'text-emerald-500' : 'text-red-500'}`}>
            ({isIncrease ? '+' : ''}{fmtMoney(entry.delta)})
          </span>
        </div>

        {/* Margin before → after */}
        {entry.status_before !== 'none' && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">Margin</span>
            <StatusDot status={entry.status_before} />
            <span className="text-[10px] text-slate-500 tabular-nums">{fmtMargin(entry.margin_before)}</span>
            <span className="text-[9px] text-slate-300">→</span>
            <StatusDot status={entry.status_after} />
            <span className={`text-[10px] font-semibold tabular-nums ${
              entry.status_after === 'healthy' ? 'text-emerald-600' :
              entry.status_after === 'warning' ? 'text-amber-600' : 'text-red-600'
            }`}>{fmtMargin(entry.margin_after)}</span>
          </div>
        )}
      </div>

      {/* Time + user */}
      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] text-slate-400 tabular-nums">{fmtTime(entry.timestamp)}</p>
        <p className="text-[9px] text-slate-300">{entry.user}</p>
      </div>
    </div>
  );
}

export default function PriceAuditLog({ entries = [], onClear }) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 mb-4 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-xs font-bold text-slate-600">📜 Internal Price History</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {entries.length}
          </span>
          <span className="text-[9px] text-slate-300 font-medium uppercase tracking-wide ml-1">session only · not saved</span>
        </div>
        {open && onClear && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium"
          >
            Clear
          </button>
        )}
      </button>

      {/* Timeline */}
      {open && (
        <div className="px-4 pb-2 max-h-72 overflow-y-auto">
          {entries.map(entry => (
            <LogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}