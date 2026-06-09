import React from 'react';
import { FileText, Hammer, Receipt, ChevronRight } from 'lucide-react';

const TYPE_CONFIG = {
  estimate: {
    icon: FileText,
    label: 'Estimate',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    iconColor: 'text-blue-500',
  },
  work_order: {
    icon: Hammer,
    label: 'Work Order',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    iconColor: 'text-purple-500',
  },
  invoice: {
    icon: Receipt,
    label: 'Invoice',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    iconColor: 'text-emerald-500',
  },
};

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-500',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-violet-100 text-violet-700',
  approved: 'bg-emerald-100 text-emerald-700',
  signed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  changes_requested: 'bg-amber-100 text-amber-700',
  converted: 'bg-teal-100 text-teal-700',
  scheduled: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const fmtCurrency = (n) => `$${(parseFloat(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function DocumentCard({ doc, type, onClick }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.estimate;
  const Icon = config.icon;
  const statusCls = STATUS_COLORS[doc.status] || 'bg-slate-100 text-slate-500';
  const statusLabel = (doc.status || 'draft').replace(/_/g, ' ');

  const number = type === 'estimate' ? doc.estimate_number
    : type === 'work_order' ? doc.work_order_number
    : doc.invoice_number;

  const total = type === 'invoice' ? doc.total : (doc.total || doc.total_amount || 0);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all p-4 group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{config.label}</span>
            {number && <span className="text-xs text-slate-500">#{number}</span>}
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">{doc.title || doc.client_name || 'Untitled'}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusCls}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-slate-400">{fmtDate(doc.created_date)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-bold text-slate-900">{fmtCurrency(total)}</span>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </div>
    </button>
  );
}