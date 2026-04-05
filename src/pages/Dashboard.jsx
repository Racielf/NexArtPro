import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList, Receipt,
  TrendingUp, DollarSign, Users, ArrowRight,
  Plus, ChevronRight, AlertCircle, CheckCircle2,
  Clock, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [data, setData] = useState({
    todayAppointments: [],
    activeWorkOrders: [],
    recentEstimates: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [appts, estimates, workOrders, invoices] = await Promise.all([
      base44.entities.Appointment.list('-created_date', 200),
      base44.entities.Estimate.list('-created_date', 50),
      base44.entities.WorkOrder.list('-created_date', 100),
      base44.entities.Invoice.list('-created_date', 100),
    ]);

    const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0);

    setData({
      todayAppointments: appts.filter(a => a.appointment_date === today || a.scheduled_date === today),
      activeWorkOrders: workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status)).slice(0, 5),
      recentEstimates: estimates.slice(0, 5),
      stats: {
        todayAppts: appts.filter(a => a.appointment_date === today || a.scheduled_date === today).length,
        activeJobs: workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status)).length,
        openEstimates: estimates.filter(e => ['draft', 'sent', 'viewed', 'changes_requested'].includes(e.status)).length,
        approvedEstimates: estimates.filter(e => ['approved', 'signed'].includes(e.status)).length,
        revenue: paidRevenue,
        outstanding,
      }
    });
    setLoading(false);
  };

  const { todayAppointments, activeWorkOrders, recentEstimates, stats } = data;

  const kpis = [
    { label: "Today's Appts", value: stats.todayAppts ?? 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', link: '/appointments' },
    { label: 'Active Jobs', value: stats.activeJobs ?? 0, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50', link: '/work-orders' },
    { label: 'Open Estimates', value: stats.openEstimates ?? 0, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', link: '/estimates' },
    { label: 'Approved', value: stats.approvedEstimates ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/estimates' },
    { label: 'Revenue', value: `$${(stats.revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', link: '/invoices' },
    { label: 'Outstanding', value: `$${(stats.outstanding || 0).toLocaleString()}`, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', link: '/invoices' },
  ];

  const workflow = [
    { step: 1, label: 'Customer', icon: '👤', link: '/customers' },
    { step: 2, label: 'Appointment', icon: '📅', link: '/appointments' },
    { step: 3, label: 'Estimate', icon: '📋', link: '/estimates' },
    { step: 4, label: 'Work Order', icon: '🔧', link: '/work-orders' },
    { step: 5, label: 'Invoice', icon: '💰', link: '/invoices' },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/appointments"><Plus className="w-3.5 h-3.5 mr-1" />Appointment</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/estimates"><Plus className="w-3.5 h-3.5 mr-1" />Estimate</Link>
          </Button>
        </div>
      </div>

      {/* ── WORKFLOW (compact) ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-1 flex-wrap">
        {workflow.map((item, idx) => (
          <React.Fragment key={item.step}>
            <Link to={item.link}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              <span>{item.icon}</span>
              <span>{item.step}. {item.label}</span>
            </Link>
            {idx < workflow.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── 6 KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Link key={label} to={link}>
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-xl font-bold text-foreground">{loading ? '—' : value}</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── SUMMARY SECTIONS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Today */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Today</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold text-blue-700">{loading ? '—' : stats.todayAppts ?? 0}</p>
              <p className="text-xs text-blue-500">appointments</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-purple-600">{loading ? '—' : stats.activeJobs ?? 0}</p>
              <p className="text-xs text-purple-400">active jobs</p>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Pipeline</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold text-amber-700">{loading ? '—' : stats.openEstimates ?? 0}</p>
              <p className="text-xs text-amber-500">open estimates</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-emerald-600">{loading ? '—' : stats.approvedEstimates ?? 0}</p>
              <p className="text-xs text-emerald-500">approved</p>
            </div>
          </div>
        </div>

        {/* Money */}
        <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4">
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Money</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-2xl font-bold text-green-700">${(stats.revenue || 0).toLocaleString()}</p>
              <p className="text-xs text-green-500">collected</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-orange-500">${(stats.outstanding || 0).toLocaleString()}</p>
              <p className="text-xs text-orange-400">outstanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── LISTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Appointments */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-800">Today's Appointments</span>
            </div>
            <Link to="/appointments" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No appointments today</p>
              </div>
            ) : todayAppointments.map(appt => (
              <Link key={appt.id} to="/appointments">
                <div className="px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{appt.customer_display_name || appt.client_name}</p>
                      <p className="text-xs text-muted-foreground">{appt.start_time || appt.scheduled_time}</p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Active Work Orders */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-slate-800">Active Work Orders</span>
            </div>
            <Link to="/work-orders" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : activeWorkOrders.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active work orders</p>
              </div>
            ) : activeWorkOrders.map(wo => (
              <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                <div className="px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        <span className="text-purple-600 font-bold">#{wo.work_order_number}</span> · {wo.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{wo.title}</p>
                    </div>
                    <StatusBadge status={wo.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Estimates */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-800">Recent Estimates</span>
            </div>
            <Link to="/estimates" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : recentEstimates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No estimates yet</p>
              </div>
            ) : recentEstimates.map(est => (
              <Link key={est.id} to={`/estimate-editor?id=${est.id}`}>
                <div className="px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">#{est.estimate_number} · {est.client_name}</p>
                      <p className="text-xs text-muted-foreground">${(est.total || 0).toLocaleString()}</p>
                    </div>
                    <StatusBadge status={est.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}