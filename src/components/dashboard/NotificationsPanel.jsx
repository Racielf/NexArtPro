import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { nexartClient } from '@/api/nexartClient';
import { Bell, ChevronRight, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';

const ESTIMATE_FOLLOWUP_DAYS = 5;

function buildNotifications({ workOrders, invoices, estimates, bankTransactions }) {
  const notifications = [];
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // A. BANK — uncategorized transactions
  const uncategorized = bankTransactions.filter(t => !t.is_reviewed);
  if (uncategorized.length > 0) {
    notifications.push({
      id: 'bank-unreviewed',
      type: 'warning',
      icon: '🏦',
      message: `${uncategorized.length} new transaction${uncategorized.length > 1 ? 's' : ''} need review`,
      link: '/income-expenses',
      priority: 2,
    });
  }

  // B. PAYMENTS received (invoices marked paid in last 7 days)
  const recentPaid = invoices.filter(i => {
    if (i.status !== 'paid' || !i.paid_at) return false;
    const paidDate = new Date(i.paid_at);
    return (today - paidDate) / (1000 * 60 * 60 * 24) <= 7;
  });
  if (recentPaid.length > 0) {
    const total = recentPaid.reduce((s, i) => s + (i.total || 0), 0);
    notifications.push({
      id: 'payments-received',
      type: 'success',
      icon: '💰',
      message: `Payment received: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      link: '/invoices',
      priority: 1,
    });
  }

  // C. INVOICES overdue
  const overdue = invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && i.due_date < todayStr));
  if (overdue.length > 0) {
    notifications.push({
      id: 'invoices-overdue',
      type: 'error',
      icon: '📄',
      message: `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} overdue`,
      link: '/invoices',
      priority: 3,
    });
  }

  // D. WORK ORDERS
  const activeWOs = workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status));

  const unassigned = activeWOs.filter(w => !w.assigned_worker_id && !w.assigned_worker_name);
  if (unassigned.length > 0) {
    notifications.push({
      id: 'wo-unassigned',
      type: 'warning',
      icon: '👷',
      message: `${unassigned.length} job${unassigned.length > 1 ? 's' : ''} need assignment`,
      link: '/work-orders',
      priority: 2,
    });
  }

  const unscheduled = activeWOs.filter(w => !w.scheduled_date);
  if (unscheduled.length > 0) {
    notifications.push({
      id: 'wo-unscheduled',
      type: 'info',
      icon: '📅',
      message: `${unscheduled.length} job${unscheduled.length > 1 ? 's' : ''} not scheduled`,
      link: '/work-orders',
      priority: 2,
    });
  }

  const overdueWOs = activeWOs.filter(w => w.scheduled_date && w.scheduled_date < todayStr);
  if (overdueWOs.length > 0) {
    notifications.push({
      id: 'wo-overdue',
      type: 'error',
      icon: '⚠️',
      message: `${overdueWOs.length} job${overdueWOs.length > 1 ? 's' : ''} overdue`,
      link: '/work-orders',
      priority: 3,
    });
  }

  // E. ESTIMATES pending follow-up
  const followupCutoff = format(subDays(today, ESTIMATE_FOLLOWUP_DAYS), 'yyyy-MM-dd');
  const pendingEstimates = estimates.filter(e =>
    ['sent', 'viewed'].includes(e.status) &&
    (e.sent_at || e.updated_date || '').slice(0, 10) <= followupCutoff
  );
  if (pendingEstimates.length > 0) {
    notifications.push({
      id: 'estimates-followup',
      type: 'info',
      icon: '📝',
      message: `Follow up: ${pendingEstimates.length} estimate${pendingEstimates.length > 1 ? 's' : ''} pending`,
      link: '/estimates',
      priority: 2,
    });
  }

  // F. ESTIMATES — recent client activity (last 48h)
  const recentCutoff = new Date(today.getTime() - 48 * 60 * 60 * 1000);

  const recentApproved = estimates.filter(e => e.status === 'approved' && e.approved_at && new Date(e.approved_at) >= recentCutoff);
  if (recentApproved.length > 0) {
    notifications.push({
      id: 'estimates-approved',
      type: 'success',
      icon: '✅',
      message: `${recentApproved.length} estimate${recentApproved.length > 1 ? 's' : ''} approved by client`,
      link: '/estimates',
      priority: 3,
    });
  }

  const recentSigned = estimates.filter(e => e.status === 'signed' && e.signed_at && new Date(e.signed_at) >= recentCutoff);
  if (recentSigned.length > 0) {
    notifications.push({
      id: 'estimates-signed',
      type: 'success',
      icon: '✍️',
      message: `${recentSigned.length} estimate${recentSigned.length > 1 ? 's' : ''} signed by client`,
      link: '/estimates',
      priority: 4,
    });
  }

  const recentDeclined = estimates.filter(e => e.status === 'declined' && e.declined_at && new Date(e.declined_at) >= recentCutoff);
  if (recentDeclined.length > 0) {
    notifications.push({
      id: 'estimates-declined',
      type: 'error',
      icon: '❌',
      message: `${recentDeclined.length} estimate${recentDeclined.length > 1 ? 's' : ''} declined`,
      link: '/estimates',
      priority: 3,
    });
  }

  const recentChanges = estimates.filter(e => e.status === 'changes_requested' && e.changes_requested_at && new Date(e.changes_requested_at) >= recentCutoff);
  if (recentChanges.length > 0) {
    notifications.push({
      id: 'estimates-changes',
      type: 'warning',
      icon: '🔄',
      message: `${recentChanges.length} estimate${recentChanges.length > 1 ? 's' : ''} — changes requested`,
      link: '/estimates',
      priority: 3,
    });
  }

  const recentViewed = estimates.filter(e => e.status === 'viewed' && e.viewed_at && new Date(e.viewed_at) >= recentCutoff);
  if (recentViewed.length > 0) {
    notifications.push({
      id: 'estimates-viewed',
      type: 'info',
      icon: '👁️',
      message: `${recentViewed.length} estimate${recentViewed.length > 1 ? 's' : ''} viewed by client`,
      link: '/estimates',
      priority: 1,
    });
  }

  return notifications.sort((a, b) => b.priority - a.priority);
}

const typeStyles = {
  error:   { bar: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100' },
  warning: { bar: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
  success: { bar: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100' },
  info:    { bar: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100' },
};

export default function NotificationsPanel() {
  const woQuery = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => nexartClient.entities.WorkOrder.list('-created_date', 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const invQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: () => nexartClient.entities.Invoice.list('-created_date', 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const estQuery = useQuery({
    queryKey: ['estimates'],
    queryFn: () => nexartClient.entities.Estimate.list('-created_date', 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const bankQuery = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: () => nexartClient.entities.BankTransaction.list('-created_date', 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const loading = woQuery.isLoading || invQuery.isLoading || estQuery.isLoading || bankQuery.isLoading;
  const notifications = loading ? [] : buildNotifications({
    workOrders: woQuery.data || [],
    invoices: invQuery.data || [],
    estimates: estQuery.data || [],
    bankTransactions: bankQuery.data || [],
  });
  const lastRefresh = [woQuery.dataUpdatedAt, invQuery.dataUpdatedAt, estQuery.dataUpdatedAt, bankQuery.dataUpdatedAt]
    .filter(Boolean)
    .reduce((max, t) => Math.max(max, t), 0);

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 rounded-lg" />)}
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-800">Alerts</span>
          {notifications.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {notifications.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { woQuery.refetch(); invQuery.refetch(); estQuery.refetch(); bankQuery.refetch(); }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List — max 3 visible, scroll if more */}
      <div className="overflow-y-auto" style={{ maxHeight: '192px' }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300">
            <Bell className="w-7 h-7 mb-2" />
            <p className="text-sm font-semibold text-slate-400">Todo al día</p>
            <p className="text-xs text-slate-300 mt-0.5">Sin alertas pendientes</p>
          </div>
        ) : (
          notifications.map(n => {
            const s = typeStyles[n.type];
            return (
              <Link key={n.id} to={n.link}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group">
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${s.bar}`} />
                  <span className="text-sm flex-shrink-0">{n.icon}</span>
                  <p className={`flex-1 text-[11px] font-semibold ${s.text} leading-snug`}>{n.message}</p>
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {lastRefresh > 0 && (
        <div className="px-5 py-2 border-t border-slate-50">
          <p className="text-[10px] text-slate-300">Updated {format(new Date(lastRefresh), 'h:mm a')}</p>
        </div>
      )}
    </div>
  );
}
