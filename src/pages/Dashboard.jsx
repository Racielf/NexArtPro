import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import useCompanyConfig from '@/hooks/useCompanyConfig';
import {
  Plus, DollarSign, TrendingUp, Bell, Briefcase, AlertCircle, PackageCheck, FileText,
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, KpiChip } from '@/components/dashboard/DashboardPrimitives';
import NxtStat from '@/components/dashboard/NxtStat';
import RecentWorkOrdersTable from '@/components/dashboard/RecentWorkOrdersTable';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import MoneyControl from '@/components/dashboard/MoneyControl';
import RevenueTrendCard from '@/components/dashboard/RevenueTrendCard';
import JobPipelineCard from '@/components/dashboard/JobPipelineCard';
import ApprovalGaugeCard from '@/components/dashboard/ApprovalGaugeCard';
import InvoiceStatusDonutCard from '@/components/dashboard/InvoiceStatusDonutCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import SalesFunnelCard from '@/components/dashboard/SalesFunnelCard';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import { formatMoney } from '@/components/dashboard/dashboardFormat';

/* ══════════════════════════════════════════════
   DIGITAL CLOCK
   ══════════════════════════════════════════════ */
function DigitalClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h24 = now.getHours();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="dash-clock w-full bg-amber-50/60 flex items-center justify-center gap-4 py-2 border-b border-border select-none">
      <div className="flex items-end gap-1 tabular-nums leading-none">
        <span className="font-display text-3xl font-black text-foreground" style={{ letterSpacing: '-1px' }}>
          {hh}<span className="text-primary">:</span>{mm}
        </span>
        <div className="flex flex-col mb-0.5 ml-1 gap-0">
          <span className="text-sm font-bold text-primary leading-none">{ampm}</span>
          <span className="text-sm font-semibold text-muted-foreground tabular-nums leading-none">{ss}</span>
        </div>
      </div>
      <div className="w-px h-6 bg-border" />
      <p className="text-[10px] text-muted-foreground capitalize">{dateStr}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════ */
export default function Dashboard() {
  const companyConfig = useCompanyConfig();

  const workOrdersQuery = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => nexartClient.entities.WorkOrder.list('-created_date', 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: () => nexartClient.entities.Invoice.list('-created_date', 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const estimatesQuery = useQuery({
    queryKey: ['estimates'],
    queryFn: () => nexartClient.entities.Estimate.list('-created_date', 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: () => nexartClient.entities.Appointment.list('-created_date', 200),
    staleTime: 30_000,
  });
  const proposalsQuery = useQuery({
    queryKey: ['proposals'],
    queryFn: () => nexartClient.entities.Proposal.list('-created_date', 100),
    staleTime: 30_000,
  });
  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: () => nexartClient.entities.Lead.list('-created_date', 100),
    staleTime: 30_000,
  });

  const loading = workOrdersQuery.isLoading || invoicesQuery.isLoading || estimatesQuery.isLoading
    || appointmentsQuery.isLoading || proposalsQuery.isLoading || leadsQuery.isLoading;

  const allWorkOrders = workOrdersQuery.data ?? [];
  const allInvoices = invoicesQuery.data ?? [];
  const allEstimates = estimatesQuery.data ?? [];
  const allAppointments = appointmentsQuery.data ?? [];
  const allProposals = proposalsQuery.data ?? [];
  const allLeads = leadsQuery.data ?? [];

  const { kpis, todayAppointments, funnelCounts } = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

    const todayAppts = allAppointments.filter(a => (a.appointment_date || a.scheduled_date) === today);
    const active = allWorkOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status));
    const completedMonth = allWorkOrders.filter(w => w.status === 'completed' && (w.updated_date || '').slice(0, 10) >= startOfMonth);
    const sent = allEstimates.filter(e => ['sent', 'viewed', 'changes_requested'].includes(e.status));
    const approved = allEstimates.filter(e => ['approved', 'signed'].includes(e.status));
    const approvalRate = (sent.length + approved.length) > 0 ? Math.round((approved.length / (sent.length + approved.length)) * 100) : 0;
    const monthRevenue = allInvoices.filter(i => i.status === 'paid' && (i.paid_at || i.updated_date || '').slice(0, 10) >= startOfMonth).reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = allInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);
    const overdueCount = allInvoices.filter(i => i.status === 'overdue').length;
    const paidCount = allInvoices.filter(i => i.status === 'paid').length;
    const nonDraftEstimates = allEstimates.filter(e => e.status !== 'draft');

    return {
      todayAppointments: todayAppts,
      kpis: {
        activeJobs: active.length,
        completedMonth: completedMonth.length,
        estimatesSent: sent.length,
        approvalRate,
        monthRevenue,
        outstanding,
        todayAppts: todayAppts.length,
        totalWO: allWorkOrders.length,
        overdueCount,
        leads: allLeads.length,
        approvedCount: approved.length,
      },
      funnelCounts: {
        leads: allLeads.length,
        estimates: nonDraftEstimates.length,
        approved: approved.length,
        jobs: allWorkOrders.length,
        paid: paidCount,
      },
    };
  }, [allWorkOrders, allInvoices, allEstimates, allAppointments, allLeads]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* CLOCK */}
      <DigitalClock />

      {/* TOPBAR */}
      <div className="dash-topbar sticky top-0 z-50 px-4 py-2 shadow-sm">
        <div className="dash-topbar-inner max-w-screen-2xl mx-auto flex items-center gap-3">
          <div className="dash-topbar-brand border-r border-slate-200 pr-3 flex-shrink-0">
            <h1 className="text-[13px] font-bold text-slate-800 leading-none">{companyConfig.name}</h1>
            <p className="text-[9px] text-slate-400 mt-0.5">Control Center · {format(new Date(), 'EEE MMM d, yyyy')}</p>
          </div>
          <div className="dash-topbar-kpis flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none py-0.5">
            <KpiChip label="Ingresos Mes"  value={formatMoney(kpis.monthRevenue)} color="orange"  loading={loading} tooltip="Revenue cobrado este mes" />
            <KpiChip label="Jobs Activos"  value={kpis.activeJobs ?? 0}          color="info"    loading={loading} tooltip="Work orders en progreso" />
            <KpiChip label="Por Cobrar"    value={formatMoney(kpis.outstanding)} color="accent"  loading={loading} tooltip="Facturas pendientes" />
            <KpiChip label="Citas Hoy"     value={kpis.todayAppts ?? 0}         color="success" loading={loading} tooltip="Appointments hoy" />
            <KpiChip label="Estimados"     value={kpis.estimatesSent ?? 0}      color="purple"  loading={loading} tooltip="Estimados enviados" />
            <KpiChip label="Aprobación"    value={`${kpis.approvalRate ?? 0}%`} color="danger"  loading={loading} tooltip="Tasa de aprobación" />
          </div>
          <div className="dash-topbar-actions flex gap-1.5 flex-shrink-0">
            <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] text-slate-600 border-slate-200 hover:bg-slate-50">
              <Link to="/appointments"><Plus className="w-3 h-3 mr-0.5" />Cita</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] text-slate-600 border-slate-200 hover:bg-slate-50">
              <Link to="/work-orders"><Plus className="w-3 h-3 mr-0.5" />WO</Link>
            </Button>
            <Button asChild size="sm" className="h-7 px-3 text-[10px]">
              <Link to="/estimates"><Plus className="w-3 h-3 mr-0.5" />Estimate</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="dash-content flex-1 max-w-screen-2xl mx-auto w-full px-5 py-5 flex flex-col gap-5">

        {/* ── ROW 1: NXT STAT CARDS ───────────────────────────────── */}
        <div className="nxt-stat-grid">
          <NxtStat
            icon={Briefcase}
            value={kpis.activeJobs ?? 0}
            label="Open Work Orders"
            change={loading ? null : `${kpis.totalWO ?? 0} total`}
            changeType="muted"
            color="info"
            loading={loading}
          />
          <NxtStat
            icon={AlertCircle}
            value={kpis.overdueCount ?? 0}
            label="Overdue Invoices"
            change={kpis.overdueCount > 0 ? 'Action needed' : 'All current'}
            changeType={kpis.overdueCount > 0 ? 'down' : 'up'}
            color="danger"
            loading={loading}
          />
          <NxtStat
            icon={PackageCheck}
            value={kpis.completedMonth ?? 0}
            label="Completed This Month"
            change="Work orders done"
            changeType="muted"
            color="success"
            loading={loading}
          />
          <NxtStat
            icon={DollarSign}
            value={formatMoney(kpis.outstanding)}
            label="Pipeline Receivable"
            change="Pending collection"
            changeType="muted"
            color="accent"
            loading={loading}
          />
          <NxtStat
            icon={FileText}
            value={kpis.estimatesSent ?? 0}
            label="Estimates Pending"
            change={`${kpis.approvalRate ?? 0}% approval rate`}
            changeType={(kpis.approvalRate ?? 0) >= 50 ? 'up' : 'muted'}
            color="purple"
            loading={loading}
          />
          <NxtStat
            icon={TrendingUp}
            value={formatMoney(kpis.monthRevenue)}
            label="Revenue This Month"
            change="Paid invoices"
            changeType="up"
            color="orange"
            loading={loading}
          />
        </div>

        {/* ── ROW 2: Financial Overview strip ─────────────────────── */}
        <MoneyControl monthRevenue={kpis.monthRevenue || 0} outstanding={kpis.outstanding || 0} invoices={allInvoices} loading={loading} activeJobsCount={kpis.activeJobs || 0} />

        {/* ── ROW 3: Recent WOs table (2/3) + Activity feed (1/3) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          <div className="lg:col-span-2">
            <RecentWorkOrdersTable workOrders={allWorkOrders} loading={loading} />
          </div>
          <ActivityFeed estimates={allEstimates} invoices={allInvoices} appointments={todayAppointments} loading={loading} />
        </div>

        {/* ── ROW 4: Revenue Trend (2/3) + Job Pipeline (1/3) ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          <div className="lg:col-span-2">
            <RevenueTrendCard invoices={allInvoices} loading={loading} monthRevenue={kpis.monthRevenue || 0} />
          </div>
          <JobPipelineCard workOrders={allWorkOrders} loading={loading} />
        </div>

        {/* ── ROW 4.5: Approval Gauge + Invoice Status Donut ──────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
          <ApprovalGaugeCard rate={kpis.approvalRate || 0} sentCount={kpis.estimatesSent || 0} approvedCount={kpis.approvedCount || 0} loading={loading} />
          <InvoiceStatusDonutCard invoices={allInvoices} loading={loading} />
        </div>

        {/* ── ROW 5: Sales Funnel + Alerts + Notifications ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          <SalesFunnelCard counts={funnelCounts} loading={loading} />
          <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} proposals={allProposals} loading={loading} />
          <Card title="Notificaciones" icon={Bell} className="h-full">
            <NotificationsPanel />
          </Card>
        </div>

      </div>
    </div>
  );
}
