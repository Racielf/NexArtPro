import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bell, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
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

  return notifications.sort((a, b) => b.priority - a.priority);
}

const typeStyles = {
  error:   { bar: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100' },
  warning: { bar: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
  success: { bar: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100' },
  info:    { bar: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100' },
};

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60 * 1000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const [workOrders, invoices, estimates, bankTransactions] = await Promise.all([
        base44.entities.WorkOrder.list('-created_date', 200),
        base44.entities.Invoice.list('-created_date', 200),
        base44.entities.Estimate.list('-created_date', 200),
        base44.entities.BankTransaction.list('-created_date', 200),
      ]);
      setNotifications(buildNotifications({ workOrders, invoices, estimates, bankTransactions }));
      setLastRefresh(new Date());
    } catch {
      // local_auth mode — no backend available
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-50 rounded-lg" />)}
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
          onClick={loadNotifications}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300">
            <Bell className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium text-slate-400">All clear!</p>
            <p className="text-xs text-slate-300 mt-0.5">No alerts right now</p>
          </div>
        ) : (
          notifications.map(n => {
            const s = typeStyles[n.type];
            return (
              <Link key={n.id} to={n.link}>
                <div className={`flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors relative overflow-hidden border-l-4 ${s.border} group`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${s.bar}`} />
                  <span className="text-base flex-shrink-0">{n.icon}</span>
                  <p className={`flex-1 text-sm font-medium ${s.text}`}>{n.message}</p>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {lastRefresh && (
        <div className="px-5 py-2 border-t border-slate-50">
          <p className="text-[10px] text-slate-300">Updated {format(lastRefresh, 'h:mm a')}</p>
        </div>
      )}
    </div>
  );
}