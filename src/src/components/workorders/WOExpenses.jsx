import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Package, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { archiveWithSnapshot } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { useAuth } from '@/lib/AuthContext';

const PAYMENT_METHODS = ['cash', 'card', 'check', 'company_card', 'advance'];
const EXPENSE_TYPES = ['materials', 'tools', 'fuel', 'food', 'cash_advance', 'other'];

const emptyForm = {
  description: '',
  vendor: '',
  amount: '',
  expense_type: 'materials',
  payment_method: 'cash',
  notes: '',
};

export default function WOExpenses({ workOrderId, workOrderNumber }) {
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadExpenses(); }, [workOrderId]);

  const loadExpenses = async () => {
    const data = await base44.entities.WorkOrderExpense.filter({ work_order_id: workOrderId });
    setExpenses(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.description || !form.amount) {
      toast.error('Description and amount are required');
      return;
    }
    setSaving(true);
    await base44.entities.WorkOrderExpense.create({
      ...form,
      amount: parseFloat(form.amount) || 0,
      work_order_id: workOrderId,
      work_order_number: workOrderNumber,
    });
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    toast.success('Expense added');
    loadExpenses();
  };

  const handleDelete = async (expId) => {
    if (!confirm('Delete this expense?')) return;
    await archiveWithSnapshot(base44.entities.WorkOrderExpense, 'WorkOrderExpense', expId, actor, 'Deleted by user');
    await logAuditEvent('archive', 'WorkOrderExpense', expId, actor, {});
    toast.success('Expense deleted');
    loadExpenses();
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-slate-900">Materials & Expenses</h2>
          {expenses.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">
              {expenses.length}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(v => !v)}>
          {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add'}
        </Button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Description *</label>
                <input
                  className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. PVC pipe 1/2 inch"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Vendor</label>
                <input
                  className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Home Depot"
                  value={form.vendor}
                  onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-md pl-6 pr-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Type</label>
                <select
                  className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.expense_type}
                  onChange={e => setForm(p => ({ ...p, expense_type: e.target.value }))}
                >
                  {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Payment Method</label>
                <select
                  className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.payment_method}
                  onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Notes</label>
                <input
                  className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Optional note"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? 'Saving…' : 'Save Expense'}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">Loading…</p>
        ) : expenses.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400">
            <Package className="w-6 h-6 mb-2" />
            <p className="text-sm">No expenses recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {exp.vendor && <span className="text-xs text-slate-400">{exp.vendor}</span>}
                    <span className="text-[10px] bg-slate-200 text-slate-500 rounded px-1.5 py-0.5">{exp.expense_type}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-500 rounded px-1.5 py-0.5">{exp.payment_method}</span>
                    {exp.notes && <span className="text-xs text-slate-400 italic truncate">{exp.notes}</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-800 flex-shrink-0">${(exp.amount || 0).toFixed(2)}</span>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <span className="text-sm font-bold text-slate-800">
                Total: <span className="text-primary">${total.toFixed(2)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}