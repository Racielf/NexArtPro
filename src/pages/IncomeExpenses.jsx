import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Search, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const EXPENSE_CATEGORIES = ['materials', 'fuel', 'tools', 'subcontractors', 'payroll', 'office/admin', 'miscellaneous'];
const INCOME_CATEGORIES = ['service', 'parts', 'deposit', 'other'];
const METHODS = ['All Methods', 'Cash', 'Check', 'Card', 'Bank Transfer', 'Zelle', 'Venmo'];

const TYPE_COLORS = {
  income: 'bg-green-100 text-green-700 border-green-200',
  expense: 'bg-red-100 text-red-700 border-red-200',
};

export default function IncomeExpenses() {
  const [activeTab, setActiveTab] = useState('income');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All Methods');

  const entries = []; // Will be populated from entity

  const income = entries.filter(e => e.type === 'income');
  const expenses = entries.filter(e => e.type === 'expense');
  const totalIncome = income.reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = totalIncome - totalExpenses;

  const activeEntries = activeTab === 'income' ? income : expenses;
  const categories = activeTab === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Income & Expenses</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track all money in and out of the business</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Entry
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-slate-500">Total Income</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">${totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-sm font-medium text-slate-500">Total Expenses</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">${totalExpenses.toFixed(2)}</p>
          </div>
          <div className={`rounded-xl border shadow-sm p-5 ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <DollarSign className={`w-5 h-5 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <p className="text-sm font-medium text-slate-500">Net Profit</p>
            </div>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>${profit.toFixed(2)}</p>
          </div>
        </div>

        {/* Tabs + Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex border-b border-slate-200">
            {['income', 'expenses'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3.5 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'income' ? `Income (${income.length})` : `Expenses (${expenses.length})`}
              </button>
            ))}
          </div>
          <div className="p-4 flex flex-wrap gap-3 border-b border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option>All</option>
              {categories.map(c => <option key={c}>{c}</option>)}
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
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Type', 'Category', 'Amount', 'Date', 'Customer / Job', 'Method', 'Notes', 'Receipt'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <DollarSign className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No {activeTab} entries yet</p>
                    <p className="text-slate-300 text-xs mt-1">Click "Add Entry" to get started</p>
                  </td>
                </tr>
              ) : activeEntries.map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${TYPE_COLORS[e.type]}`}>{e.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{e.category}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">${(e.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{e.date || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.related_customer || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[150px]">{e.notes || '—'}</td>
                  <td className="px-4 py-3">{e.receipt_url ? <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline">View</a> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}