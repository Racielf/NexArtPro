import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList,
  AlertCircle, CheckCircle2, ArrowRight, Plus,
  DollarSign, TrendingUp, Briefcase, Bell
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import SalesFunnelCard from '@/components/dashboard/SalesFunnelCard';
import JobPipelineCard from '@/components/dashboard/JobPipelineCard';
import RevenueBreakdownCard from '@/components/dashboard/RevenueBreakdownCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';

/* ── Donut SVG ── */
function Donut({ pct = 0, hex = '#3b82f6', size = 48, sw = 5 }) {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={hex} strokeWidth={sw}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  );
}

/* ── Digital Clock ── */
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
    <div className="w-full bg-sidebar flex items-center justify-center gap-3 py-3 border-b border-sidebar-border select-none">
      <div className="flex items-end gap-1 tabular-nums leading-none">
        <span className="text-5xl font-black text-white" style={{ letterSpacing: '-2px' }}>
          {hh}<span className="text-sidebar-primary animate-pulse">:</span>{mm}
        </span>
        <div className="flex flex-col mb-0.5 ml-1">
          <span className="text-base font-black text-sidebar-primary leading-none">{ampm}</span>
          <span className="text-lg font-bold text-slate-400 tabular-nums leading-none">{ss}</span>
        </div>
      </div>
      <div className="w-px h-10 bg-slate-700" />
      <p className="text-[11px] text-slate-400 capitalize">{dateStr}</p>
    </div>
  );
}

/* ── KPI strip card ── */
function KpiChip({ label, value, hex, dot, loading }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg flex-shrink-0">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
      <div>
        <div className="text-[9px] text-slate-500 uppercase tracking-widest leading-none">{label}</div>
        <div className="text-[15px] font-black text-white tabular-nums leading-tight">{loading ? '—' : value}</div>
      </div>
    </div>
  );
}

/* ── Mosaic panel header ── */
function PanelHead({ title, bg, icon: Icon, iconCls, link }) {
  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 ${bg}`}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className={`w-3 h-3 ${iconCls}`} />}
        <span className="text-[10px] font-black text-white uppercase tracking-widest">{title}</span>
      </div>
      {link && (
        <Link to={link} className="text-[9px] text-white/50 hover:text-white flex items-center gap-0.5 font-bold">
          Ver <ArrowRight className="w-2 h-2" />
        </Link>
      )}
    </div>
  );
}

/* ── List row ultra compact ── */
function Row({ children }) {
  return (
    <div className="px-2 py-1 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
      {children}
    </div>
  );
}

/* ── Compact KPI hero box ── */
function HeroBox({ label, value, sub, subVal, pct, hex, bg, border, icon: Icon, iconCls, link, loading }) {
  return (
    <Link to={link} className="block">
      <div className={`bg-white border-l-4 ${border} rounded-lg p-2.5 hover:shadow-md transition-all`}
           style={{ borderLeftColor: hex }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className={`w-7 h-7 rounded-md ${bg} flex items-center justify-center mb-1.5`}>
              <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</div>
            <div className="text-2xl font-black text-slate-900 tabular-nums leading-tight mt-0.5">
              {loading ? <span className="text-slate-200">—</span> : value}
            </div>
            <div className="text-[10px] text-slate-400 leading-none mt-0.5">{sub}</div>
          </div>
          <div className="relative flex-shrink-0 mt-0.5">
            <Donut pct={pct ?? 0} hex={hex} size={44} sw={5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-black text-white tabular-nums">{loading ? '—' : `${pct}%`}</span>
            </div>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[9px] text-slate-400 font-semibold">{subVal?.label}</span>
          <span className="text-[11px] font-black tabular-nums" style={{ color: hex }}>
            {loading ? '—' : subVal?.val}
          </span>
        </div>
      </div>
    </Link>
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
      if (!isBase44Auth && sessionStorage.getItem('local_auth') === 'true') { setLoading(false); return; }
      throw err;
    }
    const todayAppts = appts.filter(a => (a.appointment_date || a.scheduled_date) === today);
    const active = workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status));
    const completed = workOrders.filter(w => w.status === 'completed');
    const sent = estimates.filter(e => ['sent', 'viewed', 'changes_requested'].includes(e.status));
    const approved = estimates.filter(e => ['approved', 'signed'].includes(e.status));
    const approvalRate = (sent.length + approved.length) > 0
      ? Math.round((approved.length / (sent.length + approved.length)) * 100) : 0;
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
    setKpis({ activeJobs: active.length, completedJobs: completed.length, estimatesSent: sent.length, approvalRate, monthRevenue, outstanding, todayAppts: todayAppts.length, totalWO: workOrders.length });
    setFunnelCounts({ leads: leads.length, estimates: estimates.filter(e => e.status !== 'draft').length, approved: approved.length, jobs: workOrders.length, paid: invoices.filter(i => i.status === 'paid').length });
    setLoading(false);
  };

  const completionPct = kpis.totalWO > 0 ? Math.round(((kpis.completedJobs || 0) / kpis.totalWO) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0f172a]">

      {/* ══ RELOJ ═══════════════════════════════════════════════════════ */}
      <DigitalClock />

      {/* ══ HEADER BANDA ════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b-2 border-slate-700 px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3">
          {/* Title */}
          <div className="border-r border-slate-700 pr-4 flex-shrink-0">
            <h1 className="text-[14px] font-black text-white leading-none">RC Art Contractors</h1>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Control Center · {format(new Date(), 'EEE MMM d')}</p>
          </div>
          {/* KPI chips */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
            <KpiChip label="Ingresos Mes"   value={`$${(kpis.monthRevenue||0).toLocaleString()}`} dot="#10b981" loading={loading} />
            <KpiChip label="Jobs Activos"   value={kpis.activeJobs ?? 0}                          dot="#3b82f6" loading={loading} />
            <KpiChip label="Por Cobrar"     value={`$${(kpis.outstanding||0).toLocaleString()}`}  dot="#ef4444" loading={loading} />
            <KpiChip label="Citas Hoy"      value={kpis.todayAppts ?? 0}                          dot="#f59e0b" loading={loading} />
            <KpiChip label="Estimados Env." value={kpis.estimatesSent ?? 0}                       dot="#8b5cf6" loading={loading} />
            <KpiChip label="Tasa Aprob."    value={`${kpis.approvalRate ?? 0}%`}                  dot="#06b6d4" loading={loading} />
          </div>
          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[10px] border border-slate-700 text-slate-300 hover:bg-slate-800">
              <Link to="/appointments"><Plus className="w-2.5 h-2.5 mr-0.5" />Cita</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[10px] border border-slate-700 text-slate-300 hover:bg-slate-800">
              <Link to="/work-orders"><Plus className="w-2.5 h-2.5 mr-0.5" />WO</Link>
            </Button>
            <Button asChild size="sm" className="h-6 px-2.5 text-[10px] bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Link to="/estimates"><Plus className="w-2.5 h-2.5 mr-0.5" />Estimate</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══════════════════════════════════════════════════════ */}
      <div className="max-w-screen-2xl mx-auto px-3 py-2 space-y-2">

        {/* ── ROW A: 3 Hero KPIs compactos ── */}
        <div className="grid grid-cols-3 gap-2">
          <HeroBox
            label="Ingresos Este Mes" value={`$${(kpis.monthRevenue||0).toLocaleString()}`}
            sub="Facturas pagadas" subVal={{ label: 'Por cobrar', val: `$${(kpis.outstanding||0).toLocaleString()}` }}
            pct={kpis.approvalRate ?? 0} hex="#10b981" bg="bg-emerald-900/40" border="border-emerald-500"
            icon={DollarSign} iconCls="text-emerald-400" link="/invoices" loading={loading}
          />
          <HeroBox
            label="Pipeline Ventas" value={kpis.estimatesSent ?? 0}
            sub="Estimados enviados" subVal={{ label: 'Aprobados', val: funnelCounts.approved ?? 0 }}
            pct={kpis.approvalRate ?? 0} hex="#3b82f6" bg="bg-blue-900/40" border="border-blue-500"
            icon={TrendingUp} iconCls="text-blue-400" link="/estimates" loading={loading}
          />
          <HeroBox
            label="Operaciones" value={kpis.activeJobs ?? 0}
            sub="Work orders activos" subVal={{ label: 'Completados', val: kpis.completedJobs ?? 0 }}
            pct={completionPct} hex="#8b5cf6" bg="bg-violet-900/40" border="border-violet-500"
            icon={Briefcase} iconCls="text-violet-400" link="/work-orders" loading={loading}
          />
        </div>

        {/* ── ROW B: Mosaico 4 columnas analítico ── */}
        <div className="grid grid-cols-4 gap-2 items-start">

          {/* Col 1: Funnel + Citas */}
          <div className="space-y-2">
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <SalesFunnelCard counts={funnelCounts} loading={loading} />
            </div>
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <PanelHead title="Citas de Hoy" bg="bg-blue-700" icon={Calendar} iconCls="text-blue-200" link="/appointments" />
              <div className="divide-y divide-slate-700/60 max-h-44 overflow-y-auto">
                {loading ? <div className="px-2 py-3 text-[10px] text-slate-500">Cargando…</div> :
                  todayAppointments.length === 0
                    ? <div className="px-2 py-3 text-[10px] text-slate-500 text-center">Sin citas hoy</div>
                    : todayAppointments.map(appt => (
                      <Link key={appt.id} to="/appointments">
                        <Row>
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-slate-200 truncate">{appt.customer_display_name || appt.client_name}</p>
                              <p className="text-[9px] text-slate-500">{appt.start_time || '—'}</p>
                            </div>
                            <StatusBadge status={appt.status} />
                          </div>
                        </Row>
                      </Link>
                    ))
                }
              </div>
            </div>
          </div>

          {/* Col 2: Revenue + Estimados */}
          <div className="space-y-2">
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <RevenueBreakdownCard invoices={allInvoices} loading={loading} />
            </div>
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <PanelHead title="Estimados Recientes" bg="bg-amber-600" icon={FileText} iconCls="text-amber-200" link="/estimates" />
              <div className="divide-y divide-slate-700/60 max-h-44 overflow-y-auto">
                {loading ? <div className="px-2 py-3 text-[10px] text-slate-500">Cargando…</div> :
                  recentEstimates.length === 0
                    ? <div className="px-2 py-3 text-[10px] text-slate-500 text-center">Sin estimados</div>
                    : recentEstimates.map(est => (
                      <Link key={est.id} to={`/estimate-editor?id=${est.id}`}>
                        <Row>
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-amber-400 flex-shrink-0">#{est.estimate_number}</span>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-slate-200 truncate">{est.client_name}</p>
                                <p className="text-[9px] text-slate-500 tabular-nums">${(est.total||0).toLocaleString()}</p>
                              </div>
                            </div>
                            <StatusBadge status={est.status} />
                          </div>
                        </Row>
                      </Link>
                    ))
                }
              </div>
            </div>
          </div>

          {/* Col 3: Job Pipeline + Work Orders */}
          <div className="space-y-2">
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <JobPipelineCard workOrders={allWorkOrders} loading={loading} />
            </div>
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <PanelHead title="Work Orders Activos" bg="bg-violet-700" icon={ClipboardList} iconCls="text-violet-200" link="/work-orders" />
              <div className="divide-y divide-slate-700/60 max-h-44 overflow-y-auto">
                {loading ? <div className="px-2 py-3 text-[10px] text-slate-500">Cargando…</div> :
                  activeWorkOrders.length === 0
                    ? <div className="px-2 py-3 text-[10px] text-slate-500 text-center">Sin work orders</div>
                    : activeWorkOrders.map(wo => (
                      <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                        <Row>
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-slate-200 truncate">
                                <span className="text-violet-400 font-black">#{wo.work_order_number}</span> {wo.client_name}
                              </p>
                              <p className="text-[9px] text-slate-500 truncate">{wo.title}</p>
                            </div>
                            <StatusBadge status={wo.status} />
                          </div>
                        </Row>
                      </Link>
                    ))
                }
              </div>
            </div>
          </div>

          {/* Col 4: Alerts + Notifications */}
          <div className="space-y-2">
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} loading={loading} />
            </div>
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
              <PanelHead title="Notificaciones" bg="bg-slate-600" icon={Bell} iconCls="text-slate-300" />
              <div className="max-h-48 overflow-y-auto">
                <NotificationsPanel />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}