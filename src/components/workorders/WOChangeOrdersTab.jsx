import React, { useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, ChevronDown, ChevronRight, Trash2, CheckCircle2,
  XCircle, Clock, FileEdit, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG = {
  proposed: { label: 'Proposed', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
};

function fmtUSD(n) {
  const v = Number(n || 0);
  return (v >= 0 ? '+' : '') + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function NegotiationSummary({ coList, originalTotal }) {
  const approved = coList.filter(co => co.status === 'approved');
  if (!approved.length) return null;
  const impact = approved.reduce((s, co) => s + Number(co.amount || 0), 0);
  const negotiated = Number(originalTotal || 0) + impact;
  const pct = originalTotal ? ((impact / originalTotal) * 100).toFixed(1) : 0;

  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-4">
      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-3">Negotiation Summary</p>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-[10px] text-emerald-700 uppercase tracking-wide mb-1">Original</p>
          <p className="text-sm font-bold text-emerald-900">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(originalTotal || 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-700 uppercase tracking-wide mb-1">Negotiated Total</p>
          <p className="text-sm font-bold text-emerald-900">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(negotiated)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-700 uppercase tracking-wide mb-1">Net Impact</p>
          <p className={`text-sm font-bold ${impact >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {fmtUSD(impact)} ({pct >= 0 ? '+' : ''}{pct}%)
          </p>
        </div>
      </div>
    </div>
  );
}

const EMPTY_CO = { title: '', description: '', requested_by: '', status: 'proposed', items: [], amount: 0 };

export default function WOChangeOrdersTab({ workOrderId, workOrderTotal }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(EMPTY_CO);
  const [expanded, setExpanded] = useState(null);

  const { data: coList = [], isLoading } = useQuery({
    queryKey: ['wo-change-orders', workOrderId],
    queryFn: () => nexartClient.entities.ChangeOrder.filter({ work_order_id: workOrderId }, '-created_at'),
    enabled: !!workOrderId,
  });

  const addMutation = useMutation({
    mutationFn: (data) => nexartClient.entities.ChangeOrder.create({ ...data, work_order_id: workOrderId }),
    onSuccess: () => {
      qc.invalidateQueries(['wo-change-orders', workOrderId]);
      setShowForm(false);
      setDraft(EMPTY_CO);
      toast.success('Change order created');
    },
    onError: () => toast.error('Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => nexartClient.entities.ChangeOrder.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['wo-change-orders', workOrderId]);
      toast.success('Change order updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => nexartClient.entities.ChangeOrder.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['wo-change-orders', workOrderId]);
      toast.success('Removed');
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!draft.title) { toast.error('Add a title'); return; }
    const idx = coList.length + 1;
    const co_number = `CO-${String(idx).padStart(3, '0')}`;
    addMutation.mutate({ ...draft, co_number });
  };

  const updateStatus = (id, status) => {
    const patch = { status };
    if (status === 'approved') patch.approved_at = new Date().toISOString();
    updateMutation.mutate({ id, ...patch });
  };

  const sorted = [...coList].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <NegotiationSummary coList={coList} originalTotal={workOrderTotal} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{coList.length} change order{coList.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-3.5 h-3.5" />
          New Change Order
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">New Change Order</p>
          <input
            type="text"
            placeholder="Title *"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            placeholder="Description of scope change…"
            rows={2}
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Requested by"
              value={draft.requested_by}
              onChange={e => setDraft(d => ({ ...d, requested_by: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 flex-shrink-0">Net $</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={draft.amount || ''}
                onChange={e => setDraft(d => ({ ...d, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowForm(false); setDraft(EMPTY_CO); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Creating…' : 'Create CO'}
            </Button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <FileEdit className="w-8 h-8 mb-3 opacity-40" />
          <p className="text-sm">No change orders yet</p>
          <p className="text-xs mt-1 opacity-70">Track scope changes and client-approved additions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(co => {
            const cfg = STATUS_CONFIG[co.status] || STATUS_CONFIG.proposed;
            const isOpen = expanded === co.id;
            return (
              <div key={co.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : co.id)}
                >
                  <div className="flex-shrink-0 mt-0.5 text-slate-400">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500">{co.co_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                      {Number(co.amount) !== 0 && (
                        <span className={`text-xs font-bold ${Number(co.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {fmtUSD(co.amount)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{co.title}</p>
                    {co.requested_by && (
                      <p className="text-xs text-slate-500 mt-0.5">Requested by {co.requested_by}</p>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    {co.description && (
                      <p className="text-sm text-slate-600">{co.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">Status:</span>
                      {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                        <button
                          key={key}
                          onClick={() => updateStatus(co.id, key)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                            co.status === key ? s.cls + ' ring-2 ring-offset-1 ring-primary' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {co.approved_at && (
                      <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved {new Date(co.approved_at).toLocaleDateString()}
                        {co.approved_by && ` by ${co.approved_by}`}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={() => deleteMutation.mutate(co.id)}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete CO
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
