import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList, TrendingUp,
  AlertCircle, CheckCircle2, ArrowRight, Plus, ChevronRight,
  DollarSign, Percent
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import SalesFunnelCard from '@/components/dashboard/SalesFunnelCard';
import JobPipelineCard from '@/components/dashboard/JobPipelineCard';
import RevenueBreakdownCard from '@/components/dashboard/RevenueBreakdownCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';


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
  const [allWorkOrders, setAllWorkOrders] = useState([]);
  const [recentEstimates, setRecentEstimates] = useState([]);
  const [allEstimates, setAllEstimates] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [kpis, setKpis] = useState({});
  const [funnelCounts, setFunnelCounts] = useState({});

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

    const leads = await base44.entities.Lead.list('-created_date', 100).catch(() => []);

    setTodayAppointments(todayAppts);
    setActiveWorkOrders(active.slice(0, 6));
    setAllWorkOrders(workOrders);
    setRecentEstimates(estimates.slice(0, 6));
    setAllEstimates(estimates);
    setAllInvoices(invoices);
    setKpis({
      activeJobs: active.length,
      completedJobs: completed.length,
      estimatesSent: sent.length,
      approvalRate: `${approvalRate}%`,
      monthRevenue,
      outstanding,
    });
    setFunnelCounts({
      leads: leads.length,
      estimates: estimates.filter(e => e.status !== 'draft').length,
      approved: approved.length,
      jobs: workOrders.length,
      paid: invoices.filter(i => i.status === 'paid').length,
    });
    setLoading(false);
  };

  const kpiCards = [
    { label: 'Revenue This Month', value: `$${(kpis.monthRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/invoices', sub: 'Finance' },
    { label: 'Estimates Sent', value: kpis.estimatesSent ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', link: '/estimates', sub: 'Sales' },
    { label: 'Approved', value: funnelCounts.approved ?? 0, icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50', link: '/estimates', sub: 'Sales' },
    { label: 'Conversion Rate', value: kpis.approvalRate ?? '—', icon: Percent, color: 'text-amber-600', bg: 'bg-amber-50', link: '/estimates', sub: 'Sales' },
    { label: 'Active Jobs', value: kpis.activeJobs ?? 0, icon: ClipboardList, color: 'text-sky-600', bg: 'bg-sky-50', link: '/work-orders', sub: 'Operations' },
    { label: 'Outstanding', value: `$${(kpis.outstanding || 0).toLocaleString()}`, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', link: '/invoices', sub: 'Finance' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── DARK HEADER ── */}
      <div className="bg-slate-900 px-6 py-5">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white">
              <Link to="/appointments"><Plus className="w-3.5 h-3.5 mr-1.5" />Appointment</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white">
              <Link to="/work-orders"><Plus className="w-3.5 h-3.5 mr-1.5" />Work Order</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Link to="/estimates"><Plus className="w-3.5 h-3.5 mr-1.5" />Estimate</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-5">

        {/* ── KPI STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map(card => (
            <KPICard key={card.label} {...card} loading={loading} />
          ))}
        </div>

        {/* ── MAIN 2-COLUMN GRID ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-5 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">

            {/* Funnel + Revenue side by side on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SalesFunnelCard counts={funnelCounts} loading={loading} />
              <RevenueBreakdownCard invoices={allInvoices} loading={loading} />
            </div>

            {/* Lists row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <SectionList title="Today's Appointments" icon={Calendar} iconColor="text-blue-500" link="/appointments" empty="No appointments today">
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

              <SectionList title="Active Work Orders" icon={ClipboardList} iconColor="text-purple-500" link="/work-orders" empty="No active work orders">
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

              <SectionList title="Recent Estimates" icon={FileText} iconColor="text-amber-500" link="/estimates" empty="No estimates yet">
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

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">
            <JobPipelineCard workOrders={allWorkOrders} loading={loading} />
            <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} loading={loading} />
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <NotificationsPanel />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}