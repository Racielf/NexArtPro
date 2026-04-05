import React, { useState } from 'react';
import { CreditCard, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS = {
  paid: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  refunded: 'bg-gray-100 text-gray-600 border-gray-200',
};

const METHODS = ['All Methods', 'Cash', 'Check', 'Card', 'Bank Transfer', 'Zelle', 'Venmo'];
const STATUSES = ['All Statuses', 'paid', 'pending', 'failed', 'refunded'];

export default function Payments() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterMethod, setFilterMethod] = useState('All Methods');
  const [showForm, setShowForm] = useState(false);

  const payments = []; // Will be populated from entity

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payments</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track payments received from clients</p>
          </div>
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New Payment
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by customer or invoice..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
          >
            {METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Customer', 'Invoice', 'Amount', 'Date', 'Method', 'Status', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No payments recorded yet</p>
                    <p className="text-slate-300 text-xs mt-1">Click "New Payment" to add one</p>
                  </td>
                </tr>
              ) : payments.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{p.payment_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.customer_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.invoice_number || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">${(p.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.payment_date || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.payment_method || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] || ''}`}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[150px]">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}