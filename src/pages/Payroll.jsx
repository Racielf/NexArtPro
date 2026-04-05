import React, { useState } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const METHOD_COLORS = {
  cash: 'bg-green-100 text-green-700 border-green-200',
  check: 'bg-blue-100 text-blue-700 border-blue-200',
  card: 'bg-purple-100 text-purple-700 border-purple-200',
  'bank transfer': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  zelle: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const WORKER_TYPES = ['All Types', 'employee', 'subcontractor', 'agent'];
const METHODS = ['All Methods', 'Cash', 'Check', 'Card', 'Bank Transfer', 'Zelle'];

export default function Payroll() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [filterMethod, setFilterMethod] = useState('All Methods');

  const entries = []; // Will be populated from entity

  const totalPaid = entries.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage payments to workers, employees and subcontractors</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> New Payroll Entry
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-slate-900">{entries.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Paid Out</p>
            <p className="text-2xl font-bold text-slate-900">${totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Workers Paid</p>
            <p className="text-2xl font-bold text-slate-900">{new Set(entries.map(e => e.worker_id)).size}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by worker name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select
            className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            {WORKER_TYPES.map(t => <option key={t}>{t}</option>)}
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
                {['#', 'Worker', 'Type', 'Period Start', 'Period End', 'Amount', 'Payment Date', 'Method', 'Work Orders', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No payroll entries yet</p>
                    <p className="text-slate-300 text-xs mt-1">Click "New Payroll Entry" to add one</p>
                  </td>
                </tr>
              ) : entries.map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{e.payroll_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{e.worker_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs capitalize">{e.worker_type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.period_start || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.period_end || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">${(e.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{e.payment_date || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${METHOD_COLORS[e.payment_method?.toLowerCase()] || 'bg-slate-100 text-slate-500'}`}>
                      {e.payment_method || '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{e.related_work_orders || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[120px]">{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}