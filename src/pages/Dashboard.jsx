import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList,
  AlertCircle, CheckCircle2, ArrowRight, Plus,
  DollarSign, Percent, TrendingUp, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import SalesFunnelCard from '@/components/dashboard/SalesFunnelCard';
import JobPipelineCard from '@/components/dashboard/JobPipelineCard';
import RevenueBreakdownCard from '@/components/dashboard/RevenueBreakdownCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';

/* ── Donut ring (pure SVG, no deps) ── */
function DonutRing({ pct = 0, color = '#3b82f6', size = 64, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  );
}

/* ── Hero KPI (large, Power-BI style) ── */
function HeroKPI({ label, sublabel, value, subvalue, sublabelB, pct, color, bg, borderColor, icon: Icon, link, loading }) {
  return (
    <Link to={link}>
      <div className={`bg-white border-t-4 ${borderColor} rounded-xl p-4 shadow-sm hover:shadow-md transition-all h-full`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</div>
            <div className="text-3xl font-black text-slate-900 tabular-nums leading-none">
              {loading ? <span className="text-slate-200 text-xl">—</span> : value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{sublabel}</div>
          </div>
          {pct !== undefined && (
            <div className="relative flex-shrink-0">
              <DonutRing pct={pct} color={color.replace('text-','').includes('emerald') ? '#10b981' : color.includes('blue') ? '#3b82f6' : color.includes('amber') ? '#f59e0b' : color.includes('red') ? '#ef4444' : '#8b5cf6'} size={60} stroke={6} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-slate-800 tabular-nums">{loading ? '—' : `${pct}%`}</span>
              </div>
            </div>
          )}
        </div>
        {subvalue !== undefined && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold">{sublabelB}</span>
            <span className="text-sm font-bold text-slate-700 tabular-nums">{loading ? '—' : subvalue}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Compact list row ── */
function ListRow({ children }) {
  return (
    <div className="px-3 py-1.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      {children}
    </div>
  );
}

/* ── Panel wrapper ── */
function Panel({ title, icon: Icon, iconCls, accentCls, link, children, loading }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className={`flex items-center justify-between px-3 py-2 ${accentCls || 'bg-slate-800'}`}>
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${iconCls || 'text-slate-300'}`} />}
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">{title}</span>
        </div>
        {link && (
          <Link to={link} className="text-[10px] text-slate-400 hover:text-white font-semibold flex items-center gap-0.5">
            Ver <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        )}
      </div>
      <div className="flex-1">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1,2,3].map(i => (
              <div key={i} className="px-3 py-2 animate-pulse flex gap-2 items-center">
                <div className="flex-1 h-2.5 bg-slate-100 rounded" />
                <div className="w-12 h-4 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : children}
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
    setActiveWorkOrders(active.slice(0, 8));
    setAllWorkOrders(workOrders);
    setRecentEstimates(estimates.slice(0, 8));
    setAllEstimates(estimates);
    setAllInvoices(invoices);
    setKpis({
      activeJobs: active.length,
      completedJobs: completed.length,
      estimatesSent: sent.length,
      approvalRate,
      monthRevenue,
      outstanding,
      todayAppts: todayAppts.length,
      totalWO: workOrders.length,
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

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Title block */}
            <div className="border-r border-slate-700 pr-5">
              <h1 className="text-[15px] font-black text-white tracking-tight leading-tight">
                RC Art Contractors
              </h1>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                Dashboard · {format(new Date(), 'EEE, MMM d yyyy')}
              </p>
            </div>
            {/* Header stat pills */}
            <div className="hidden md:flex items-center gap-2">
              {[
                { label: 'Ingresos Mes', val: `$${(kpis.monthRevenue || 0).toLocaleString()}`, dot: 'bg-emerald-500' },
                { label: 'Jobs Activos', val: kpis.activeJobs ?? 0, dot: 'bg-blue-500' },
                { label: 'Por Cobrar', val: `$${(kpis.outstanding || 0).toLocaleString()}`, dot: 'bg-red-500' },
                { label: 'Citas Hoy', val: kpis.todayAppts ?? 0, dot: 'bg-amber-500' },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700/80">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
                  <div>
                    <div className="text-[9px] text-slate-500 leading-none uppercase tracking-wider">{m.label}</div>
                    <div className="text-[13px] font-black text-white tabular-nums leading-tight">
                      {loading ? '—' : m.val}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
              <Link to="/appointments"><Plus className="w-3 h-3 mr-1" />Cita</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
              <Link to="/work-orders"><Plus className="w-3 h-3 mr-1" />Work Order</Link>
            </Button>
            <Button asChild size="sm" className="h-7 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Link to="/estimates"><Plus className="w-3 h-3 mr-1" />Estimate</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-3 space-y-3">

        {/* ══ ROW 1: 3 HERO KPIs ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <HeroKPI
            label="Ingresos Este Mes"
            sublabel="Facturas pagadas"
            value={`$${(kpis.monthRevenue || 0).toLocaleString()}`}
            sublabelB="Por cobrar"
            subvalue={`$${(kpis.outstanding || 0).toLocaleString()}`}
            pct={kpis.approvalRate ?? 0}
            color="text-emerald-600"
            bg="bg-emerald-50"
            borderColor="border-emerald-500"
            icon={DollarSign}
            link="/invoices"
            loading={loading}
          />
          <HeroKPI
            label="Pipeline de Ventas"
            sublabel="Estimados enviados"
            value={kpis.estimatesSent ?? 0}
            sublabelB="Aprobados"
            subvalue={funnelCounts.approved ?? 0}
            pct={kpis.approvalRate ?? 0}
            color="text-blue-600"
            bg="bg-blue-50"
            borderColor="border-blue-500"
            icon={TrendingUp}
            link="/estimates"
            loading={loading}
          />
          <HeroKPI
            label="Operaciones"
            sublabel="Work orders activos"
            value={kpis.activeJobs ?? 0}
            sublabelB="Completados"
            subvalue={kpis.completedJobs ?? 0}
            pct={kpis.totalWO > 0 ? Math.round(((kpis.completedJobs||0) / kpis.totalWO) * 100) : 0}
            color="text-violet-600"
            bg="bg-violet-50"
            borderColor="border-violet-500"
            icon={Briefcase}
            link="/work-orders"
            loading={loading}
          />
        </div>

        {/* ══ ROW 2: MOSAICO ANALÍTICO 3 COLS ═════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_320px] gap-3 items-start">

          {/* ── COL IZQUIERDA ── */}
          <div className="space-y-3">
            {/* Sales Funnel compacto */}
            <SalesFunnelCard counts={funnelCounts} loading={loading} />

            {/* Today Appointments */}
            <Panel title="Citas de Hoy" icon={Calendar} iconCls="text-blue-300" accentCls="bg-blue-700" link="/appointments" loading={loading}>
              {todayAppointments.length === 0 ? (
                <div className="py-5 text-center text-slate-300 text-[11px]">Sin citas hoy</div>
              ) : todayAppointments.map(appt => (
                <Link key={appt.id} to="/appointments">
                  <ListRow>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{appt.customer_display_name || appt.client_name}</p>
                        <p className="text-[10px] text-slate-400">{appt.start_time || appt.scheduled_time || '—'}</p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  </ListRow>
                </Link>
              ))}
            </Panel>
          </div>

          {/* ── COL CENTRO ── */}
          <div className="space-y-3">
            {/* Revenue chart */}
            <RevenueBreakdownCard invoices={allInvoices} loading={loading} />

            {/* Recent Estimates */}
            <Panel title="Estimados Recientes" icon={FileText} iconCls="text-amber-300" accentCls="bg-amber-600" link="/estimates" loading={loading}>
              {recentEstimates.length === 0 ? (
                <div className="py-5 text-center text-slate-300 text-[11px]">Sin estimados</div>
              ) : recentEstimates.map(est => (
                <Link key={est.id} to={`/estimate-editor?id=${est.id}`}>
                  <ListRow>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[10px] font-black text-amber-600 flex-shrink-0">#{est.estimate_number}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{est.client_name}</p>
                          <p className="text-[10px] text-slate-400 tabular-nums">${(est.total || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <StatusBadge status={est.status} />
                    </div>
                  </ListRow>
                </Link>
              ))}
            </Panel>
          </div>

          {/* ── COL DERECHA (control) ── */}
          <div className="space-y-3">
            {/* Job Pipeline compacto */}
            <JobPipelineCard workOrders={allWorkOrders} loading={loading} />

            {/* Active Work Orders */}
            <Panel title="Work Orders Activos" icon={ClipboardList} iconCls="text-violet-300" accentCls="bg-violet-700" link="/work-orders" loading={loading}>
              {activeWorkOrders.length === 0 ? (
                <div className="py-5 text-center text-slate-300 text-[11px]">Sin work orders activos</div>
              ) : activeWorkOrders.map(wo => (
                <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                  <ListRow>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">
                          <span className="text-violet-600 font-black">#{wo.work_order_number}</span> {wo.client_name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{wo.title}</p>
                      </div>
                      <StatusBadge status={wo.status} />
                    </div>
                  </ListRow>
                </Link>
              ))}
            </Panel>

            {/* Alerts */}
            <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} loading={loading} />

            {/* Notifications */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center px-3 py-2 bg-slate-700">
                <span className="w-2 h-2 rounded-full bg-blue-400 mr-1.5 flex-shrink-0" />
                <span className="text-[11px] font-bold text-white uppercase tracking-widest">Notificaciones</span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                <NotificationsPanel />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}