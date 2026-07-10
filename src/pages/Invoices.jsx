import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Search, FileText, Eye, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { filterActiveRecords } from '@/lib/softDelete';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';

// ─── Status Tabs ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'draft',   label: 'Draft' },
  { key: 'sent',    label: 'Sent' },
  { key: 'partial', label: 'Partial' },
  { key: 'paid',    label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'void',    label: 'Void' },
];

function matchesTab(inv, tab) {
  if (tab === 'all') return true;
  const d = computeInvoiceDerivedFields(inv);
  if (tab === 'partial') return d.payment_status === 'partial';
  if (tab === 'paid')    return d.payment_status === 'paid';
  if (tab === 'overdue') return isInvoiceOverdue(inv) && d.payment_status !== 'paid';
  if (tab === 'void')    return inv.status === 'void';
  return inv.status === tab;
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    base44.entities.Invoice.list('-created_date', 300)
      .then(data => {
        setInvoices(filterActiveRecords(data || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(inv => {
      if (!matchesTab(inv, statusFilter)) return false;
      if (!q) return true;
      return (
        String(inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.client_name || '').toLowerCase().includes(q) ||
        (inv.client_email || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, search, statusFilter]);

  // Summary metrics
  const totalOutstanding = useMemo(() =>
    invoices.reduce((sum, inv) => {
      const d = computeInvoiceDerivedFields(inv);
      return d.payment_status !== 'paid' && !['void'].includes(inv.status)
        ? sum + (d.balance_due || 0)
        : sum;
    }, 0),
    [invoices]
  );

  const tabCount = (tab) =>
    tab === 'all' ? invoices.length : invoices.filter(i => matchesTab(i, tab)).length;

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total${totalOutstanding > 0 ? ` · ${fmt(totalOutstanding)} outstanding` : ''}`}
        actionLabel="Create Invoice"
        onAction={() => navigate('/invoice-create')}
      />

      <PageShell>
        {/* ── Status Tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_TABS.map(tab => {
            const count = tabCount(tab.key);
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice number or client…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-700 font-semibold mb-1">No invoices found</h3>
            <p className="text-slate-400 text-sm mb-4">
              {search ? 'Try a different search term' : statusFilter !== 'all' ? `No ${statusFilter} invoices` : 'Create your first invoice to get started'}
            </p>
            {statusFilter === 'all' && !search && (
              <Button onClick={() => navigate('/invoice-create')} className="gap-1.5">
                <Plus className="w-4 h-4" />Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_100px_96px_96px_90px_80px] gap-0 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              {['Invoice', 'Client', 'Due', 'Total', 'Balance', 'Status', ''].map((h, i) => (
                <p key={i} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</p>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50">
              {filtered.map(inv => {
                const derived = computeInvoiceDerivedFields(inv);
                const overdue = isInvoiceOverdue(inv);
                const isPaid = derived.payment_status === 'paid';
                const isPartial = derived.payment_status === 'partial';

                return (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}
                    className="grid grid-cols-[1fr_1fr_100px_96px_96px_90px_80px] gap-0 px-4 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors items-center"
                  >
                    {/* Invoice # */}
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        #{inv.invoice_number || inv.id?.slice(-6)}
                      </p>
                      {inv.title && <p className="text-xs text-slate-400 truncate">{inv.title}</p>}
                    </div>

                    {/* Client */}
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 font-medium truncate">{inv.client_name || '—'}</p>
                      {inv.client_email && <p className="text-xs text-slate-400 truncate">{inv.client_email}</p>}
                    </div>

                    {/* Due */}
                    <p className={`text-xs ${overdue && !isPaid ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                      {inv.due_date
                        ? format(new Date(inv.due_date), 'MMM d, yyyy')
                        : '—'}
                    </p>

                    {/* Total */}
                    <p className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(inv.total)}</p>

                    {/* Balance */}
                    <p className={`text-sm font-semibold tabular-nums ${
                      isPaid ? 'text-emerald-600' : derived.balance_due > 0 ? 'text-red-600' : 'text-slate-400'
                    }`}>
                      {isPaid ? fmt(0) : fmt(derived.balance_due)}
                    </p>

                    {/* Status */}
                    <div>
                      <StatusBadge
                        status={isPaid ? 'paid' : isPartial ? 'partial' : overdue ? 'overdue' : inv.status}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        title="View invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!isPaid && inv.status !== 'void' && (
                        <button
                          onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Add payment"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</p>
              {totalOutstanding > 0 && (
                <p className="text-xs font-semibold text-red-600">{fmt(totalOutstanding)} outstanding</p>
              )}
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}