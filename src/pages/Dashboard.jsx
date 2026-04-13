import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList, TrendingUp,
  AlertCircle, CheckCircle2, ArrowRight, Plus, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';

const WORKFLOW_STEPS = [
  { label: 'Customer', link: '/customers' },
  { label: 'Appointment', link: '/appointments' },
  { label: 'Estimate', link: '/estimates' },
  { label: 'Work Order', link: '/work-orders' },
  { label: 'Invoice', link: '/invoices' },
];

function KPICard({ label, value, sub, icon: Icon, color, bg, link, loading }) {
  return (
    <Link to={link}>
      <div className="bg-white border border-border rounded-2xl p-4 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
          <Icon className={`w-[15px] h-[15px] ${color}`} />
        </div>
        <div className="text-2xl font-bold text-foreground leading-none">
          {loading ? <span className="text-muted-foreground/30 text-base">—</span> : value}
        </div>
        <div className="text-[11px] font-semibold text-muted-foreground mt-1.5 leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/50 mt-0.5 uppercase tracking-wide">{sub}</div>}
      </div>
    </Link>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-border/50">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-3.5 animate-pulse flex items-center gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted rounded w-1/2" />
          </div>
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  );
}

function SectionList({ title, icon: Icon, iconColor, link, children, empty }) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <Link to={link} className="text-xs text-primary flex items-center gap-0.5 hover:underline font-medium">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-border/50 min-h-[80px]">
        {children || (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30">
            <Icon className="w-7 h-7 mb-2" />
            <p className="text-xs">{empty}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [activeWorkOrders, setActiveWorkOrders] = useState([]);
  const [recentEstimates, setRecentEstimates] = useState([]);
  const [kpis, setKpis] = useState({});

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

    let appts, estimates, workOrders, invoices;
    try {
      [appts, estimates, workOrders, invoices] = await Promise.all([
        base44.entities.Appointment.list('-created_date', 200),
        base44.entities.Estimate.list('-created_date', 100),
        base44.entities.WorkOrder.list('-created_date', 100),
        base44.entities.Invoice.list('-created_date', 100),
      ]);
    } catch (err) {
      // Only swallow errors for pure local_auth sessions (no base44 real auth)
      const isBase44Auth = sessionStorage.getItem('base44_authenticated') === 'true';
      if (!isBase44Auth && sessionStorage.getItem('local_auth') === 'true') {
        setLoading(false);
        return;
      }
      throw err;
    }

    const todayAppts = appts.filter(a => (a.appointment_date || a.scheduled_date) === today);
    const active = workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status));
    const completed = workOrders.filter(w => w.status === 'completed');
    const sent = estimates.filter(e => ['sent', 'viewed', 'changes_requested'].includes(e.status));
    const approved = estimates.filter(e => ['approved', 'signed'].includes(e.status));
    const approvalRate = (sent.length + approved.length) > 0
      ? Math.round((approved.length / (sent.length + approved.length)) * 100)
      : 0;
    const monthRevenue = invoices
      .filter(i => i.status === 'paid' && (i.paid_at || i.updated_date || '').slice(0, 10) >= startOfMonth)
      .reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = invoices
      .filter(i => ['sent', 'overdue'].includes(i.status))
      .reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);

    setTodayAppointments(todayAppts);
    setActiveWorkOrders(active.slice(0, 6));
    setRecentEstimates(estimates.slice(0, 6));
    setKpis({
      activeJobs: active.length,
      completedJobs: completed.length,
      estimatesSent: sent.length,
      approvalRate: `${approvalRate}%`,
      monthRevenue,
      outstanding,
    });
    setLoading(false);
  };

  const kpiCards = [
    { label: 'Active Jobs', value: kpis.activeJobs ?? 0, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', link: '/work-orders', sub: 'Operation' },
    { label: 'Completed Jobs', value: kpis.completedJobs ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/work-orders', sub: 'Operation' },
    { label: 'Estimates Sent', value: kpis.estimatesSent ?? 0, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', link: '/estimates', sub: 'Sales' },
    { label: 'Approval Rate', value: kpis.approvalRate ?? '—', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', link: '/estimates', sub: 'Sales' },
    { label: 'Revenue This Month', value: `$${(kpis.monthRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', link: '/invoices', sub: 'Finance' },
    { label: 'Outstanding', value: `$${(kpis.outstanding || 0).toLocaleString()}`, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', link: '/invoices', sub: 'Finance' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/appointments"><Plus className="w-3.5 h-3.5 mr-1.5" />Appointment</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/work-orders"><Plus className="w-3.5 h-3.5 mr-1.5" />Work Order</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/estimates"><Plus className="w-3.5 h-3.5 mr-1.5" />Estimate</Link>
          </Button>
        </div>
      </div>

      {/* ── WORKFLOW PROGRESS BAR ── */}
      <div className="bg-white border border-border rounded-2xl px-6 py-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Business Workflow</p>
        <div className="flex items-center gap-0">
          {WORKFLOW_STEPS.map((step, idx) => (
            <React.Fragment key={step.label}>
              <Link to={step.link} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="w-full h-1.5 rounded-full bg-primary/15 group-hover:bg-primary/35 transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">{step.label}</span>
              </Link>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0 -mt-4" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── 6 KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(card => (
          <KPICard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* ── SUMMARY BANDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl px-6 py-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Today</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-4xl font-bold">{loading ? '—' : todayAppointments.length}</p>
              <p className="text-sm text-slate-400 mt-1">appointments</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-400">{loading ? '—' : kpis.activeJobs ?? 0}</p>
              <p className="text-sm text-slate-500">active jobs</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-500 text-white rounded-2xl px-6 py-5">
          <p className="text-[10px] font-bold text-amber-200/70 uppercase tracking-widest mb-3">Pipeline</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-4xl font-bold">{loading ? '—' : kpis.estimatesSent ?? 0}</p>
              <p className="text-sm text-amber-100/80 mt-1">pending estimates</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{loading ? '—' : kpis.approvalRate ?? '—'}</p>
              <p className="text-sm text-amber-100/80">approval rate</p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-700 text-white rounded-2xl px-6 py-5">
          <p className="text-[10px] font-bold text-emerald-300/60 uppercase tracking-widest mb-3">Revenue</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">${(kpis.monthRevenue || 0).toLocaleString()}</p>
              <p className="text-sm text-emerald-200/70 mt-1">this month</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-red-300">${(kpis.outstanding || 0).toLocaleString()}</p>
              <p className="text-sm text-emerald-200/70">outstanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <NotificationsPanel />

      {/* ── LISTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Appointments */}
        <SectionList
          title="Today's Appointments"
          icon={Calendar}
          iconColor="text-blue-500"
          link="/appointments"
          empty="No appointments today"
        >
          {loading ? <LoadingRows /> : todayAppointments.length === 0 ? null : (
            todayAppointments.map(appt => (
              <Link key={appt.id} to="/appointments">
                <div className="px-5 py-3.5 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{appt.customer_display_name || appt.client_name}</p>
                      <p className="text-xs text-muted-foreground">{appt.start_time || appt.scheduled_time || '—'}</p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </SectionList>

        {/* Active Work Orders */}
        <SectionList
          title="Active Work Orders"
          icon={ClipboardList}
          iconColor="text-purple-500"
          link="/work-orders"
          empty="No active work orders"
        >
          {loading ? <LoadingRows /> : activeWorkOrders.length === 0 ? null : (
            activeWorkOrders.map(wo => (
              <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                <div className="px-5 py-3.5 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        <span className="text-purple-600 font-semibold">#{wo.work_order_number}</span> {wo.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{wo.title}</p>
                    </div>
                    <StatusBadge status={wo.status} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </SectionList>

        {/* Recent Estimates */}
        <SectionList
          title="Recent Estimates"
          icon={FileText}
          iconColor="text-amber-500"
          link="/estimates"
          empty="No estimates yet"
        >
          {loading ? <LoadingRows /> : recentEstimates.length === 0 ? null : (
            recentEstimates.map(est => (
              <Link key={est.id} to={`/estimate-editor?id=${est.id}`}>
                <div className="px-5 py-3.5 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        <span className="text-amber-600 font-semibold">#{est.estimate_number}</span> {est.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">${(est.total || 0).toLocaleString()}</p>
                    </div>
                    <StatusBadge status={est.status} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </SectionList>

      </div>
    </div>
  );
}