import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  ClipboardList, Users, Briefcase, AlertCircle
} from 'lucide-react';

function MetricCard({ icon: Icon, label, value, sub, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState({
    invoices: [], workOrders: [], workers: [], expenses: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [invoices, workOrders, workers, expenses] = await Promise.all([
        base44.entities.Invoice.list(),
        base44.entities.WorkOrder.list(),
        base44.entities.Worker.list(),
        base44.entities.WorkOrderExpense.list(),
      ]);
      setData({ invoices, workOrders, workers, expenses });
      setLoading(false);
    };
    load();
  }, []);

  const { invoices, workOrders, workers, expenses } = data;

  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const unpaidTotal = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);
  const unpaidCount = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).length;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = revenue - totalExpenses;
  const completedWOs = workOrders.filter(w => w.status === 'completed').length;
  const activeWorkers = workers.filter(w => w.active !== false).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Business overview and key metrics</p>
        </div>

        {/* Financial */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Financial Summary</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={TrendingUp} label="Total Revenue" value={`$${revenue.toFixed(2)}`}
              sub="From paid invoices" color="text-green-600" bg="bg-green-100"
            />
            <MetricCard
              icon={TrendingDown} label="Total Expenses" value={`$${totalExpenses.toFixed(2)}`}
              sub="Materials & job costs" color="text-red-600" bg="bg-red-100"
            />
            <MetricCard
              icon={DollarSign} label="Net Profit" value={`$${profit.toFixed(2)}`}
              sub="Revenue minus expenses"
              color={profit >= 0 ? 'text-green-600' : 'text-red-600'}
              bg={profit >= 0 ? 'bg-green-100' : 'bg-red-100'}
            />
            <MetricCard
              icon={AlertCircle} label="Unpaid Invoices" value={`$${unpaidTotal.toFixed(2)}`}
              sub={`${unpaidCount} invoice${unpaidCount !== 1 ? 's' : ''} pending`}
              color="text-amber-600" bg="bg-amber-100"
            />
          </div>
        </div>

        {/* Operations */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Operations</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={ClipboardList} label="Completed Work Orders" value={completedWOs}
              sub={`of ${workOrders.length} total`} color="text-primary" bg="bg-primary/10"
            />
            <MetricCard
              icon={FileText} label="Total Invoices" value={invoices.length}
              sub={`${invoices.filter(i => i.status === 'paid').length} paid`} color="text-blue-600" bg="bg-blue-100"
            />
            <MetricCard
              icon={Users} label="Active Workers" value={activeWorkers}
              sub={`of ${workers.length} total`} color="text-indigo-600" bg="bg-indigo-100"
            />
            <MetricCard
              icon={Briefcase} label="Work Orders" value={workOrders.length}
              sub={`${workOrders.filter(w => w.status === 'in_progress').length} in progress`}
              color="text-purple-600" bg="bg-purple-100"
            />
          </div>
        </div>

        {/* Invoice breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-bold text-slate-800 mb-4">Invoice Status Breakdown</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map(status => {
              const count = invoices.filter(i => i.status === status).length;
              const total = invoices.filter(i => i.status === status).reduce((s, i) => s + (i.total || 0), 0);
              return (
                <div key={status} className="bg-slate-50 rounded-lg border border-slate-100 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide capitalize mb-2">{status}</p>
                  <p className="text-xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-500 mt-1">${total.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Work Order breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-bold text-slate-800 mb-4">Work Order Status Breakdown</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           {['draft', 'assigned', 'scheduled', 'on_the_way', 'in_progress', 'completed', 'invoiced'].map(status => {
              const count = workOrders.filter(w => w.status === status).length;
              return (
                <div key={status} className="bg-slate-50 rounded-lg border border-slate-100 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{status.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-slate-900">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}