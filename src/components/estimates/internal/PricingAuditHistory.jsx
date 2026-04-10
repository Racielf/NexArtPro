/**
 * PricingAuditHistory — INTERNAL USE ONLY
 *
 * Displays persisted pricing audit events for a document.
 * Shows field changes, overrides, and override reasons.
 * Never rendered in PDF, preview, send, or any client-facing document.
 */
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Shield, Edit3, AlertTriangle, Send, CheckCircle } from 'lucide-react';
import { fetchAuditHistory } from '@/lib/pricingAuditService';

const EVENT_CONFIG = {
  field_change:                 { icon: Edit3,          label: 'Field Change',             color: 'text-blue-600',    bg: 'bg-blue-50' },
  override_loss_send:           { icon: Shield,         label: 'Loss Override (Send)',      color: 'text-red-600',     bg: 'bg-red-50' },
  override_loss_approve:        { icon: Shield,         label: 'Loss Override (Approve)',   color: 'text-red-600',     bg: 'bg-red-50' },
  zero_profit_confirmation:     { icon: AlertTriangle,  label: 'Zero-Profit Confirmed',    color: 'text-amber-600',   bg: 'bg-amber-50' },
  send_after_override:          { icon: Send,           label: 'Sent After Override',      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  approve_after_override:       { icon: CheckCircle,    label: 'Approved After Override',  color: 'text-emerald-600', bg: 'bg-emerald-50' },
  manual_approval:              { icon: CheckCircle,    label: 'Manual Approval',          color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return '—'; }
}

function AuditEventRow({ event }) {
  const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.field_change;
  const Icon = config.icon;
  const isFieldChange = event.event_type === 'field_change';
  const isLossOverride = event.event_type === 'override_loss_send' || event.event_type === 'override_loss_approve';

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}>
        <Icon className={`w-3 h-3 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {config.label}
          </span>
          {event.user_role && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
              {event.user_role}
            </span>
          )}
        </div>

        {isFieldChange && (
          <div className="mt-1">
            <span className="text-[10px] text-slate-500">
              {event.line_item_name && <span className="font-medium text-slate-700">{event.line_item_name}</span>}
              {event.line_item_name && ' · '}
              <span className="font-semibold">{event.field_name}</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-400 tabular-nums">{event.old_value}</span>
              <span className="text-[10px] text-slate-300">→</span>
              <span className="text-[11px] font-bold text-slate-700 tabular-nums">{event.new_value}</span>
            </div>
          </div>
        )}

        {isLossOverride && event.reason && (
          <div className="mt-1 px-2 py-1.5 rounded bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Reason:</p>
            <p className="text-[11px] text-slate-600 leading-snug">{event.reason}</p>
          </div>
        )}

        {event.metadata?.lossItems?.length > 0 && (
          <div className="mt-1 text-[10px] text-red-500">
            {event.metadata.lossItems.length} loss item{event.metadata.lossItems.length > 1 ? 's' : ''} at time of override
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] text-slate-400 tabular-nums">{fmtDateTime(event.created_date)}</p>
        <p className="text-[9px] text-slate-300 truncate max-w-[100px]">{event.user_email}</p>
        {event.margin_at_event != null && (
          <p className={`text-[9px] font-semibold tabular-nums mt-0.5 ${
            event.margin_at_event >= 25 ? 'text-emerald-500' :
            event.margin_at_event >= 0  ? 'text-amber-500' : 'text-red-500'
          }`}>
            {event.margin_at_event.toFixed(1)}% margin
          </p>
        )}
      </div>
    </div>
  );
}

export default function PricingAuditHistory({ documentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!documentId || !open) return;
    setLoading(true);
    fetchAuditHistory(documentId, 100).then(evts => {
      setEvents(evts);
      setLoading(false);
    });
  }, [documentId, open]);

  const lossOverrideCount = events.filter(e => e.event_type === 'override_loss_send' || e.event_type === 'override_loss_approve').length;
  const confirmCount = events.filter(e => e.event_type === 'zero_profit_confirmation').length;
  const fieldChangeCount = events.filter(e => e.event_type === 'field_change').length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-xs font-bold text-slate-600">🔒 Pricing Audit Trail</span>
          {events.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {events.length}
            </span>
          )}
          {lossOverrideCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
              {lossOverrideCount} override{lossOverrideCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[9px] text-slate-300 font-medium uppercase tracking-wide ml-1">persisted</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3">
          {loading ? (
            <div className="py-4 text-center">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No pricing audit events yet</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {events.map(event => (
                <AuditEventRow key={event.id} event={event} />
              ))}
            </div>
          )}

          {events.length > 0 && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
              <span>{fieldChangeCount} field change{fieldChangeCount !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{lossOverrideCount} override{lossOverrideCount !== 1 ? 's' : ''}</span>
              {confirmCount > 0 && <><span>·</span><span>{confirmCount} confirmation{confirmCount !== 1 ? 's' : ''}</span></>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}