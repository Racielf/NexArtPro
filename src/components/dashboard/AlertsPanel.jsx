import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, AlertTriangle, Clock, FileX, CheckCircle2, UserX, Eye, TrendingDown,
} from 'lucide-react';
import { computeProposalReminders } from '@/lib/proposalReminders';
import { Card, Empty } from './DashboardPrimitives';

const PRIORITY_CFG = {
  urgent: { label: 'URGENT', cls: 'bg-red-50 text-red-600 border-red-200' },
  high:   { label: 'HIGH',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  normal: { label: 'NORMAL', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export default function AlertsPanel({ estimates = [], invoices = [], workOrders = [], proposals = [], loading }) {
  const [dismissed, setDismissed] = useState(new Set());
  const alerts = [];

  if (!loading) {
    const overdue = invoices.filter(i => i.status === 'overdue');
    if (overdue.length) alerts.push({ id: 'overdue-inv', icon: FileX, hex: '#ef4444', title: `${overdue.length} factura${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`, btnLabel: 'Ver facturas', btnLink: '/invoices', priority: 'urgent', order: 12 });

    const changes = estimates.filter(e => e.status === 'changes_requested');
    if (changes.length) alerts.push({ id: 'changes-req', icon: AlertTriangle, hex: '#f97316', title: `${changes.length} cambio${changes.length > 1 ? 's' : ''} solicitado${changes.length > 1 ? 's' : ''}`, btnLabel: 'Revisar', btnLink: `/estimate-editor?id=${changes[0].id}`, priority: 'urgent', order: 11 });

    const reminders = computeProposalReminders(proposals);
    if (reminders.overdue_follow_up.length) {
      const n = reminders.overdue_follow_up.length;
      alerts.push({ id: 'prop-overdue-followup', icon: AlertTriangle, hex: '#ef4444', title: `${n} follow-up${n > 1 ? 's' : ''} de propuesta vencido${n > 1 ? 's' : ''}`, btnLabel: 'Ver', btnLink: '/sales-pipeline', priority: 'urgent', order: 10 });
    }

    const approved = estimates.filter(e => ['approved', 'signed'].includes(e.status));
    if (approved.length) alerts.push({ id: 'approved-est', icon: CheckCircle2, hex: '#8b5cf6', title: `${approved.length} aprobado${approved.length > 1 ? 's' : ''} sin convertir`, btnLabel: 'Convertir', btnLink: `/estimate-editor?id=${approved[0].id}`, priority: 'high', order: 9 });

    const sevenAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const stale = estimates.filter(e => ['sent', 'viewed'].includes(e.status) && e.sent_at && new Date(e.sent_at).getTime() < sevenAgoMs);
    if (stale.length) alerts.push({ id: 'stale-est', icon: Clock, hex: '#f59e0b', title: `${stale.length} estimado${stale.length > 1 ? 's' : ''} sin respuesta`, btnLabel: 'Follow-up', btnLink: `/estimate-editor?id=${stale[0].id}`, priority: 'high', order: 8 });

    if (reminders.stale_viewed_no_response.length) {
      const n = reminders.stale_viewed_no_response.length;
      alerts.push({ id: 'prop-viewed-no-response', icon: Eye, hex: '#8b5cf6', title: `${n} propuesta${n > 1 ? 's' : ''} vista${n > 1 ? 's' : ''} sin respuesta`, btnLabel: 'Ver', btnLink: '/proposals', priority: 'high', order: 7 });
    }

    if (reminders.stale_sent_not_viewed.length) {
      const n = reminders.stale_sent_not_viewed.length;
      alerts.push({ id: 'prop-sent-not-viewed', icon: Clock, hex: '#f97316', title: `${n} propuesta${n > 1 ? 's' : ''} enviada${n > 1 ? 's' : ''} sin abrir`, btnLabel: 'Ver', btnLink: '/proposals', priority: 'normal', order: 6 });
    }

    const unassigned = workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status) && !w.assigned_worker_name);
    if (unassigned.length) alerts.push({ id: 'unassigned-wo', icon: UserX, hex: '#64748b', title: `${unassigned.length} job${unassigned.length > 1 ? 's' : ''} sin asignar`, btnLabel: 'Asignar', btnLink: `/work-orders/${unassigned[0].id}`, priority: 'normal', order: 5 });

    const declined = estimates.filter(e => e.status === 'declined');
    if (declined.length) alerts.push({ id: 'declined-est', icon: TrendingDown, hex: '#64748b', title: `${declined.length} estimado${declined.length > 1 ? 's' : ''} rechazado${declined.length > 1 ? 's' : ''}`, btnLabel: 'Revisar', btnLink: '/estimates', priority: 'normal', order: 4 });
  }

  const visible = alerts.filter(a => !dismissed.has(a.id)).sort((a, b) => b.order - a.order).slice(0, 4);
  const titleWithCount = visible.length > 0
    ? <span className="flex items-center gap-1.5">Alertas <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">{visible.length}</span></span>
    : 'Alertas';

  return (
    <Card title={titleWithCount} icon={Bell} className="h-full">
      {loading ? <Empty text="Cargando alertas…" />
        : visible.length === 0
          ? <div className="flex flex-col items-center justify-center h-full gap-2 py-10 select-none">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span className="text-[12px] font-semibold text-slate-500">Todo al día</span>
              <span className="text-[10px] text-slate-400">Sin acciones urgentes</span>
            </div>
          : visible.map(a => {
              const Icon = a.icon;
              const pcfg = PRIORITY_CFG[a.priority];
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors group/alert">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50 border border-slate-100">
                    <Icon className="w-3.5 h-3.5" style={{ color: a.hex }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pcfg.cls} leading-none`}>{pcfg.label}</span>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-700 leading-tight truncate">{a.title}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link to={a.btnLink} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors whitespace-nowrap shadow-sm">
                      {a.btnLabel}
                    </Link>
                    <button onClick={() => setDismissed(prev => new Set([...prev, a.id]))} className="opacity-0 group-hover/alert:opacity-100 transition-opacity text-slate-300 hover:text-slate-500 text-[10px] px-1 font-bold">✕</button>
                  </div>
                </div>
              );
            })
      }
    </Card>
  );
}
