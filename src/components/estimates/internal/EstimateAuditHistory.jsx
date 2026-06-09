/**
 * EstimateAuditHistory — INTERNAL USE ONLY
 * 
 * Collapsible audit log viewer showing all user actions on this estimate.
 * Displays price changes, approvals, sends with visual indicators.
 * Latest entries first. Non-blocking data fetch.
 */
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, CheckCircle, Send, AlertCircle, Lock } from 'lucide-react';
import { fetchAuditLog } from '@/lib/estimateAuditLog';

function fmtTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ActionIcon({ action }) {
  const icons = {
    price_change:     { icon: TrendingUp, color: 'text-blue-500' },
    cost_change:      { icon: TrendingDown, color: 'text-amber-500' },
    approval:         { icon: CheckCircle, color: 'text-emerald-500' },
    manual_approval:  { icon: Lock, color: 'text-red-500' },
    send:             { icon: Send, color: 'text-indigo-500' },
    audit_log:        { icon: AlertCircle, color: 'text-slate-400' },
  };
  const config = icons[action] || icons.audit_log;
  const Icon = config.icon;
  return <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.color}`} />;
}

function AuditEntry({ entry }) {
  // Parse changes_note (format: [ACTION] field: X old: Y new: Z user: A (role) ts: T | note: ...)
  const note = entry.changes_note || '';
  const snapshot = entry.snapshot || {};
  
  const action = snapshot.action || 'unknown';
  const field = snapshot.field || '—';
  const oldVal = snapshot.old_value || '—';
  const newVal = snapshot.new_value || '—';
  const userRole = snapshot.user_role || 'user';

  const isIncrease = 
    typeof snapshot.old_value === 'number' && typeof snapshot.new_value === 'number'
      ? snapshot.new_value > snapshot.old_value
      : null;

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <ActionIcon action={action} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {action === 'manual_approval' ? '🔐 Admin Override' : action === 'send' ? '📤 Sent' : `📝 ${action}`}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {field}
          </span>
          <span className="text-[10px] text-slate-400">{userRole}</span>
        </div>

        {/* Values */}
        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
          <span className="text-slate-500 tabular-nums">{oldVal}</span>
          <span className="text-slate-300">→</span>
          <span className={`font-semibold tabular-nums ${
            isIncrease === true ? 'text-emerald-600' :
            isIncrease === false ? 'text-red-600' :
            'text-slate-700'
          }`}>
            {newVal}
          </span>
          {isIncrease !== null && (
            <span className={`text-[9px] font-bold ${isIncrease ? 'text-emerald-600' : 'text-red-600'}`}>
              {isIncrease ? '↑' : '↓'}
            </span>
          )}
        </div>

        {/* Metadata note */}
        {snapshot.metadata?.note && (
          <p className="text-[10px] text-slate-500 mt-1 leading-snug">{snapshot.metadata.note}</p>
        )}
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] text-slate-400 tabular-nums">{fmtTime(entry.created_date)}</p>
        <p className="text-[9px] text-slate-300">{fmtDate(entry.created_date)}</p>
      </div>
    </div>
  );
}

export default function EstimateAuditHistory({ estimateId }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && entries.length === 0) {
      loadAuditLog();
    }
  }, [open]);

  const loadAuditLog = async () => {
    setLoading(true);
    const logs = await fetchAuditLog(estimateId);
    setEntries(logs);
    setLoading(false);
  };

  if (entries.length === 0 && !open) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mt-4">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">📜 Audit History</span>
          {entries.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {entries.length}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">internal only</span>
      </button>

      {/* Timeline */}
      {open && (
        <div className="bg-slate-50 border-t border-slate-100 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">No changes logged yet</div>
          ) : (
            <div>
              {entries.map(entry => (
                <AuditEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}