/**
 * CustomerRevenueHistory
 * Displays a combined chronological history of all estimates and invoices
 * for a customer, plus a revenue summary breakdown.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Receipt, ChevronRight, TrendingUp, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/shared/StatusBadge';

function fmt(n) {
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CustomerRevenueHistory({ estimates = [], invoices = [] }) {
  const navigate = useNavigate();

  // ── Revenue metrics ────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const pending   = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
    const overdue   = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0);
    const pipeline  = estimates.filter(e => ['sent', 'viewed'].includes(e.status)).reduce((s, e) => s + (e.total || 0), 0);
    const won       = estimates.filter(e => e.status === 'approved').reduce((s, e) => s + (e.total || 0), 0);
    return { collected, pending, overdue, pipeline, won };
  }, [estimates, invoices]);

  // ── Merged timeline ────────────────────────────────────────────────────
  const timeline = useMemo(() => {
    const rows = [
      ...estimates.map(e => ({ ...e, _type: 'estimate', _date: e.created_date })),
      ...invoices.map(i => ({ ...i, _type: 'invoice',  _date: i.created_date })),
    ];
    return rows.sort((a, b) => new Date(b._date) - new Date(a._date));
  }, [estimates, invoices]);

  return (
    <div className="space-y-5">

      {/* ── Revenue summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Collected',    value: metrics.collected, icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
          { label: 'Pending',      value: metrics.pending,   icon: Clock,        color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: 'Overdue',      value: metrics.overdue,   icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
          { label: 'In Pipeline',  value: metrics.pipeline,  icon: TrendingUp,   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border ${card.border} ${card.bg} px-4 py-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wide ${card.color}`}>{card.label}</span>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{fmt(card.value)}</p>
            </div>
          );
        })}
      </div>

      {/* ── Total revenue bar ──────────────────────────────────────────── */}
      {(metrics.collected + metrics.pending) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Revenue (collected + pending)</p>
            </div>
            <p className="text-lg font-bold text-slate-900">{fmt(metrics.collected + metrics.pending)}</p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
            {metrics.collected > 0 && (
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(metrics.collected / (metrics.collected + metrics.pending)) * 100}%` }}
              />
            )}
            {metrics.pending > 0 && (
              <div
                className="bg-orange-400 h-full transition-all"
                style={{ width: `${(metrics.pending / (metrics.collected + metrics.pending)) * 100}%` }}
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Collected</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Pending</span>
          </div>
        </div>
      )}

      {/* ── Merged history timeline ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Full History</p>
          <p className="text-[11px] text-slate-400">{timeline.length} records</p>
        </div>

        {timeline.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No estimates or invoices yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {timeline.map(row => {
              const isInvoice = row._type === 'invoice';
              const Icon = isInvoice ? Receipt : FileText;
              const label = isInvoice ? `INV#${row.invoice_number}` : `EST#${row.estimate_number}`;
              const href = isInvoice
                ? `/invoice-detail?id=${row.id}`
                : `/estimate-editor?id=${row.id}`;
              const amount = row.total || 0;
              const isPaid = row.status === 'paid';

              return (
                <button
                  key={row.id}
                  onClick={() => navigate(href)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors group"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isInvoice ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Label + type */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-slate-800">{label}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        isInvoice ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isInvoice ? 'Invoice' : 'Estimate'}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {row._date ? format(new Date(row._date), 'MMM d, yyyy') : '—'}
                      {row.title ? ` · ${row.title}` : ''}
                    </p>
                  </div>

                  {/* Amount */}
                  <p className={`text-sm font-bold flex-shrink-0 ${isPaid ? 'text-green-600' : 'text-slate-700'}`}>
                    {fmt(amount)}
                  </p>

                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-slate-500 transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}