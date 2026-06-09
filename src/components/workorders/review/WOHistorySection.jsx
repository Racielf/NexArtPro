import React, { useState, useEffect } from 'react';
import { History, User, Calendar, DollarSign, FileText, ArrowRight } from 'lucide-react';
import { nexartClient } from '@/api/nexartClient';
import { format } from 'date-fns';

const FIELD_META = {
  assigned_worker: { icon: User, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Assigned Worker' },
  performed_by_worker: { icon: User, color: 'text-green-600', bg: 'bg-green-50', label: 'Performed By' },
  completed_by_user: { icon: User, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Completed By' },
  status: { icon: ArrowRight, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Status' },
  scheduled_date: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Scheduled Date' },
  expense: { icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50', label: 'Expense' },
  receipt: { icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Receipt' },
};

export default function WOHistorySection({ woId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [woId]);

  const load = async () => {
    const data = await nexartClient.entities.WorkOrderHistory.filter({ work_order_id: woId }, '-created_date');
    setHistory(data);
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-primary" />
        Change History
        {history.length > 0 && (
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{history.length}</span>
        )}
      </h3>

      {history.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No changes recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((h) => {
            const meta = FIELD_META[h.field_changed] || { icon: ArrowRight, color: 'text-slate-500', bg: 'bg-slate-50', label: h.field_changed };
            const Icon = meta.icon;
            return (
              <div key={h.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    {h.old_value && h.new_value && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="line-through text-slate-400">{h.old_value}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="font-medium text-slate-700">{h.new_value}</span>
                      </span>
                    )}
                  </div>
                  {h.change_note && <p className="text-xs text-slate-500 mt-0.5 italic">{h.change_note}</p>}
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {h.changed_by && <span className="font-medium text-slate-500">{h.changed_by}</span>}
                    {h.created_date && (
                      <span> · {format(new Date(h.created_date), 'MMM d, yyyy · h:mm a')}</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}