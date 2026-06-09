import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, FileX, TrendingDown, Bell, Eye } from 'lucide-react';
import { computeProposalReminders } from '@/lib/proposalReminders';

function AlertRow({ icon: Icon, iconCls, bgCls, borderCls, title, desc, link, badge }) {
  return (
    <Link to={link} className="block group">
      <div className={`flex items-start gap-3 px-4 py-3.5 border-l-4 ${borderCls} ${bgCls} hover:brightness-95 transition-all`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${bgCls} border ${borderCls}`}>
          <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-slate-800 leading-tight">{title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${iconCls} ${bgCls} ${borderCls}`}>
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function AlertsPanel({ estimates = [], invoices = [], workOrders = [], proposals = [], loading }) {
  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Bell className="w-4 h-4 text-red-500" />
        <span className="text-sm font-semibold text-slate-800">Alerts</span>
      </div>
      <div className="p-5 text-center text-slate-300 text-xs">Loading…</div>
    </div>
  );

  const alerts = [];

  // Overdue invoices
  const overdue = invoices.filter(i => i.status === 'overdue');
  if (overdue.length > 0) {
    alerts.push({
      icon: FileX, iconCls: 'text-red-600', bgCls: 'bg-red-50', borderCls: 'border-red-300',
      title: `${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}`,
      desc: `$${overdue.reduce((s,i) => s + (i.total||0) - (i.amount_paid||0), 0).toLocaleString()} outstanding — follow up now`,
      link: '/invoices', badge: `${overdue.length}`,
    });
  }

  // Estimates pending >7 days
  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
  const staleSent = estimates.filter(e => ['sent','viewed'].includes(e.status) && e.sent_at < sevenDaysAgo);
  if (staleSent.length > 0) {
    alerts.push({
      icon: Clock, iconCls: 'text-amber-600', bgCls: 'bg-amber-50', borderCls: 'border-amber-300',
      title: `${staleSent.length} estimate${staleSent.length > 1 ? 's' : ''} awaiting response`,
      desc: 'Sent over 7 days ago — consider following up',
      link: '/estimates', badge: `${staleSent.length}`,
    });
  }

  // Changes requested
  const changesReq = estimates.filter(e => e.status === 'changes_requested');
  if (changesReq.length > 0) {
    alerts.push({
      icon: AlertTriangle, iconCls: 'text-orange-600', bgCls: 'bg-orange-50', borderCls: 'border-orange-300',
      title: `${changesReq.length} estimate${changesReq.length > 1 ? 's' : ''} need changes`,
      desc: 'Client requested revisions — review and resubmit',
      link: '/estimates', badge: `${changesReq.length}`,
    });
  }

  // Declined estimates
  const declined = estimates.filter(e => e.status === 'declined');
  if (declined.length > 0) {
    alerts.push({
      icon: TrendingDown, iconCls: 'text-slate-600', bgCls: 'bg-slate-50', borderCls: 'border-slate-300',
      title: `${declined.length} declined estimate${declined.length > 1 ? 's' : ''}`,
      desc: 'Review and consider revising the pricing or scope',
      link: '/estimates', badge: `${declined.length}`,
    });
  }

  // Approved estimates not yet converted
  const approvedNotConverted = estimates.filter(e => ['approved','signed'].includes(e.status));
  if (approvedNotConverted.length > 0) {
    alerts.push({
      icon: Bell, iconCls: 'text-violet-600', bgCls: 'bg-violet-50', borderCls: 'border-violet-300',
      title: `${approvedNotConverted.length} approved estimate${approvedNotConverted.length > 1 ? 's' : ''} pending conversion`,
      desc: 'Convert to Work Order to begin scheduling',
      link: '/estimates', badge: `${approvedNotConverted.length}`,
    });
  }

  // Proposal reminders
  const propReminders = computeProposalReminders(proposals);
  if (propReminders.overdue_follow_up.length > 0) {
    const n = propReminders.overdue_follow_up.length;
    alerts.push({
      icon: AlertTriangle, iconCls: 'text-red-600', bgCls: 'bg-red-50', borderCls: 'border-red-300',
      title: `${n} proposal follow-up${n > 1 ? 's' : ''} overdue`,
      desc: 'Scheduled follow-up dates have passed — act now',
      link: '/sales-pipeline', badge: `${n}`,
    });
  }
  if (propReminders.stale_viewed_no_response.length > 0) {
    const n = propReminders.stale_viewed_no_response.length;
    alerts.push({
      icon: Eye, iconCls: 'text-violet-600', bgCls: 'bg-violet-50', borderCls: 'border-violet-300',
      title: `${n} proposal${n > 1 ? 's' : ''} viewed — no response`,
      desc: 'Client opened but hasn\'t replied in 5+ days',
      link: '/proposals', badge: `${n}`,
    });
  }
  if (propReminders.stale_sent_not_viewed.length > 0) {
    const n = propReminders.stale_sent_not_viewed.length;
    alerts.push({
      icon: Clock, iconCls: 'text-orange-600', bgCls: 'bg-orange-50', borderCls: 'border-orange-300',
      title: `${n} proposal${n > 1 ? 's' : ''} sent — not opened`,
      desc: 'Sent 5+ days ago with no client view — follow up',
      link: '/proposals', badge: `${n}`,
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-slate-800">Alerts & Action Items</span>
        </div>
        {alerts.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
            {alerts.length} issues
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <Bell className="w-8 h-8 mb-2" />
          <p className="text-xs font-medium">No active alerts — all clear!</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
        </div>
      )}
    </div>
  );
}