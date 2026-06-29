import React, { useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle2, Clock, Wrench, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: Clock,         cls: 'text-slate-400' },
  in_progress: { label: 'In Progress', icon: Wrench,        cls: 'text-blue-500' },
  completed:   { label: 'Completed',   icon: CheckCircle2,  cls: 'text-emerald-500' },
};

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n || 0));
}

const EMPTY_ITEM = { name: '', description: '', category: '', unit: 'ea', price: '', qty: 1 };

export default function WOLineItemsTab({ workOrderId }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [pbSearch, setPbSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wo-line-items', workOrderId],
    queryFn: () => nexartClient.entities.WorkOrderLineItem.filter(
      { work_order_id: workOrderId }, 'sort_order'
    ),
    enabled: !!workOrderId,
  });

  const { data: priceBook = [] } = useQuery({
    queryKey: ['price-book-active'],
    queryFn: () => nexartClient.entities.PriceBookEntry.filter({ is_active: true }, 'display_name'),
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data) => nexartClient.entities.WorkOrderLineItem.create({
      ...data,
      work_order_id: workOrderId,
      sort_order: items.length,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['wo-line-items', workOrderId]);
      setShowAdd(false);
      setForm(EMPTY_ITEM);
      setPbSearch('');
      toast.success('Item added');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => {
      const patch = { status };
      if (status === 'completed') patch.completed_at = new Date().toISOString();
      if (status === 'pending') { patch.completed_at = null; patch.completed_by = null; }
      return nexartClient.entities.WorkOrderLineItem.update(id, patch);
    },
    onSuccess: () => qc.invalidateQueries(['wo-line-items', workOrderId]),
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => nexartClient.entities.WorkOrderLineItem.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['wo-line-items', workOrderId]);
      toast.success('Item removed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Item name is required'); return; }
    addMutation.mutate({
      ...form,
      price: parseFloat(form.price) || 0,
      qty: parseFloat(form.qty) || 1,
    });
  };

  const selectFromPB = (entry) => {
    setForm({
      name:        entry.display_name || entry.name,
      description: entry.notes || '',
      category:    entry.category || '',
      unit:        entry.unit || 'ea',
      price:       entry.unit_price || entry.book_price || '',
      qty:         1,
    });
    setPbSearch('');
  };

  const filteredPB = pbSearch.length >= 2
    ? priceBook.filter(e => {
        const q = pbSearch.toLowerCase();
        return (e.display_name || e.name || '').toLowerCase().includes(q)
          || (e.category || '').toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const completedCount = items.filter(i => i.status === 'completed').length;
  const totalEstimate  = items.reduce((s, i) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0);
  const pct = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {completedCount}/{items.length} done
          </span>
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap ml-2">
            {fmtUSD(totalEstimate)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(v => !v)}>
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-slate-700">New Line Item</p>
            <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY_ITEM); setPbSearch(''); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 w-full rounded-lg border border-slate-200 px-3 py-2 bg-white">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search price book…"
                value={pbSearch}
                onChange={e => setPbSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent focus:outline-none"
              />
            </div>
            {filteredPB.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                {filteredPB.map(entry => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => selectFromPB(entry)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{entry.display_name || entry.name}</p>
                      <p className="text-xs text-slate-500">{entry.category} · {entry.unit}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 ml-2">
                      {fmtUSD(entry.unit_price || entry.book_price || 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Item name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            placeholder="Description (optional)"
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-2 bg-white">
              <span className="text-slate-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Price"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="flex-1 text-sm bg-transparent focus:outline-none"
              />
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Qty"
              value={form.qty}
              onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {['ea','hr','day','sqft','lf','lot','gal','fix','ckt','load'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAdd(false); setForm(EMPTY_ITEM); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding…' : 'Add Item'}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <CheckCircle2 className="w-8 h-8 mb-3 opacity-40" />
          <p className="text-sm">No line items yet</p>
          <p className="text-xs mt-1 opacity-70">Add items from the price book or create custom ones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const lineTotal = Number(item.price || 0) * Number(item.qty || 1);
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const nextStatus = item.status === 'completed' ? 'pending' : item.status === 'in_progress' ? 'completed' : 'in_progress';
            return (
              <div
                key={item.id}
                className={`group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                  item.status === 'completed'   ? 'bg-emerald-50 border-emerald-200' :
                  item.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                  'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: nextStatus })}
                  className={`flex-shrink-0 mt-0.5 ${cfg.cls}`}
                  title={`Mark as ${STATUS_CONFIG[nextStatus]?.label}`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${
                    item.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}>
                    {item.name}
                  </p>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    {item.category && <span>{item.category}</span>}
                    <span>{item.qty} {item.unit}</span>
                    {item.completed_at && (
                      <span className="text-emerald-600">
                        ✓ {new Date(item.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-slate-700">{fmtUSD(lineTotal)}</span>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {items.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-900">
                Total: {fmtUSD(totalEstimate)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
