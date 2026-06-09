import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EXPENSE_TYPES = [
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'food', label: 'Food' },
  { value: 'cash_advance', label: 'Cash Advance' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'check', label: 'Check' },
  { value: 'company_card', label: 'Company Card' },
  { value: 'advance', label: 'From Advance' },
];

const TYPE_COLORS = {
  materials: 'bg-blue-50 text-blue-700',
  tools: 'bg-indigo-50 text-indigo-700',
  fuel: 'bg-orange-50 text-orange-700',
  food: 'bg-amber-50 text-amber-700',
  cash_advance: 'bg-red-50 text-red-700',
  other: 'bg-slate-100 text-slate-600',
};

const EMPTY = { expense_type: 'materials', description: '', vendor: '', amount: '', payment_method: 'cash', reimbursable: false, cash_advance_amount: '', notes: '', worker_name: '' };

export default function WOExpensesSection({ workOrder, woId }) {
  const [expenses, setExpenses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, [woId]);

  const load = async () => {
    const data = await base44.entities.WorkOrderExpense.filter({ work_order_id: woId }, '-created_date');
    setExpenses(data);
  };

  const handleNew = () => {
    setForm({
      ...EMPTY,
      worker_name: workOrder.performed_by_worker_name || workOrder.assigned_worker_name || '',
    });
    setEditing('new');
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      work_order_id: woId,
      work_order_number: workOrder.work_order_number,
      amount: parseFloat(form.amount) || 0,
      cash_advance_amount: parseFloat(form.cash_advance_amount) || 0,
    };
    if (editing === 'new') {
      await base44.entities.WorkOrderExpense.create(payload);
      toast.success('Expense added');
    } else {
      await base44.entities.WorkOrderExpense.update(editing, payload);
      toast.success('Expense updated');
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.WorkOrderExpense.delete(id);
    toast.success('Expense removed');
    load();
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Expenses &amp; Materials
          </h3>
          {expenses.length > 0 && (
            <span className="text-sm font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
              Total: ${total.toFixed(2)}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />Add Expense
        </Button>
      </div>

      {expenses.length === 0 && editing !== 'new' && (
        <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No expenses recorded yet.
        </div>
      )}

      {/* FORM */}
      {editing && (
        <div className="border border-primary/30 rounded-lg p-4 mb-4 bg-primary/5">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">
            {editing === 'new' ? 'New Expense' : 'Edit Expense'}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Type</label>
              <select value={form.expense_type} onChange={e => setForm(f => ({ ...f, expense_type: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary">
                {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Amount ($)</label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-8 text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cash Advance ($)</label>
              <Input type="number" step="0.01" value={form.cash_advance_amount} onChange={e => setForm(f => ({ ...f, cash_advance_amount: e.target.value }))} className="h-8 text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-sm" placeholder="What was purchased..." />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Vendor / Store</label>
              <Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className="h-8 text-sm" placeholder="Home Depot, Lowe's..." />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Worker</label>
              <Input value={form.worker_name} onChange={e => setForm(f => ({ ...f, worker_name: e.target.value }))} className="h-8 text-sm" placeholder="Who made this expense" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-sm" placeholder="Additional notes..." />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-3 cursor-pointer">
            <input type="checkbox" checked={form.reimbursable} onChange={e => setForm(f => ({ ...f, reimbursable: e.target.checked }))} className="rounded" />
            Reimbursable to worker
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white gap-1">
              <Save className="w-3.5 h-3.5" />Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="gap-1">
              <X className="w-3.5 h-3.5" />Cancel
            </Button>
          </div>
        </div>
      )}

      {/* TABLE */}
      {expenses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-2 text-xs font-semibold text-slate-500">Type</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500">Description</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500">Vendor</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500">Method</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500">Amount</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500">Worker</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TYPE_COLORS[e.expense_type] || 'bg-slate-100 text-slate-600'}`}>
                      {EXPENSE_TYPES.find(t => t.value === e.expense_type)?.label || e.expense_type}
                    </span>
                    {e.reimbursable && <span className="ml-1 text-[10px] text-red-500 font-semibold">REIMB</span>}
                  </td>
                  <td className="py-2.5 text-slate-700 max-w-[150px] truncate">{e.description || '—'}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{e.vendor || '—'}</td>
                  <td className="py-2.5 text-slate-500 text-xs capitalize">{e.payment_method?.replace('_', ' ')}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">${(e.amount || 0).toFixed(2)}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{e.worker_name || '—'}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setForm({ ...e }); setEditing(e.id); }}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(e.id)}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}