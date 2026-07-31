import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FileText, ReceiptText, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Card, Empty } from './DashboardPrimitives';

export default function ActivityFeed({ estimates = [], invoices = [], appointments = [], loading }) {
  const items = [];
  if (!loading) {
    estimates.slice(0, 6).forEach(e => {
      const d = new Date(e.created_date || e.updated_date || '');
      if (!isNaN(d)) items.push({ id: `est-${e.id}`, icon: FileText, hex: '#f59e0b', label: `Estimate #${e.estimate_number}`, sub: e.client_name, link: `/estimate-editor?id=${e.id}`, date: d });
    });
    invoices.slice(0, 6).forEach(i => {
      const d = new Date(i.created_date || i.updated_date || '');
      if (!isNaN(d)) items.push({ id: `inv-${i.id}`, icon: ReceiptText, hex: i.status === 'paid' ? '#16a34a' : i.status === 'overdue' ? '#dc2626' : '#3b82f6', label: `Invoice #${i.invoice_number}`, sub: `${i.client_name} · $${(i.total || 0).toLocaleString()}`, link: '/invoices', date: d });
    });
    appointments.slice(0, 4).forEach(a => {
      const d = new Date(a.appointment_date || a.scheduled_date || '');
      if (!isNaN(d)) items.push({ id: `appt-${a.id}`, icon: Calendar, hex: '#8b5cf6', label: a.title || 'Appointment', sub: a.customer_display_name || a.client_name, link: '/appointments', date: d });
    });
  }
  items.sort((a, b) => b.date - a.date);
  const visible = items.slice(0, 10);

  return (
    <Card title="Activity Feed" icon={Activity} link={null} className="h-full">
      {loading
        ? <Empty text="Cargando…" />
        : visible.length === 0
          ? <Empty text="Sin actividad reciente" icon={Activity} />
          : <div>
              {visible.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} to={item.link} className="flex items-center gap-3 px-4 py-3 border-b border-dashed border-border/40 last:border-0 hover:bg-amber-50/30 transition-colors group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.hex + '18', color: item.hex }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-700 truncate leading-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.sub}</p>
                    </div>
                    <p className="font-display text-[10px] text-slate-400 flex-shrink-0 tabular-nums">{format(item.date, 'MMM d')}</p>
                  </Link>
                );
              })}
            </div>
      }
    </Card>
  );
}
