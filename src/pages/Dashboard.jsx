import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList, ArrowRight, Plus,
  DollarSign, TrendingUp, Briefcase, Bell,
  AlertTriangle, Clock, FileX, TrendingDown,
  Wrench, Navigation2, HardHat, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ════════════════════════════════════════════════════════════════ */
const PANEL_BG   = 'bg-[#0f1c2e]';
const PANEL_BDR  = 'border border-[#1e3a5f]/70';
const PANEL_H1   = 'h-[230px]'; // Row 1 fixed height
const PANEL_H2   = 'h-[200px]'; // Row 2 fixed height

/* ════════════════════════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* Panel shell — header + scrollable body */
function Panel({ title, accent, icon: Icon, iconCls, link, children, bodyClass = '' }) {
  return (
    <div className={`flex flex-col h-full ${PANEL_BG} ${PANEL_BDR} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-[7px] flex-shrink-0 ${accent}`}>
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className={`w-3 h-3 ${iconCls}`} />}
          <span className="text-[10px] font-black text-white uppercase tracking-[0.12em]">{title}</span>
        </div>
        {link && (
          <Link to={link} className="text-[9px] text-white/40 hover:text-white font-bold flex items-center gap-0.5 transition-colors">
            Ver <ArrowRight className="w-2 h-2" />
          </Link>
        )}
      </div>
      {/* Body */}
      <div className={`flex-1 overflow-y-auto ${bodyClass}`}>
        {children}
      </div>
    </div>
  );
}

/* List row */
function Row({ children }) {
  return (
    <div className="px-3 py-[6px] border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
      {children}
    </div>
  );
}

/* Empty state */
function Empty({ text }) {
  return <div className="flex items-center justify-center h-full text-[10px] text-slate-600">{text}</div>;
}

/* KPI chip in header */
function KpiChip({ label, value, dot, loading }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-[5px] bg-[#0f1c2e] border border-[#1e3a5f]/70 rounded-md flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      <div className="leading-none">
        <div className="text-[8px] text-slate-600 uppercase tracking-wider">{label}</div>
        <div className="text-[13px] font-black text-white tabular-nums leading-tight">{loading ? '—' : value}</div>
      </div>
    </div>
  );
}

/* Donut SVG */
function Donut({ pct = 0, hex = '#3b82f6', size = 40, sw = 4 }) {
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

/* ════════════════════════════════════════════════════════════════
   DIGITAL CLOCK
   ════════════════════════════════════════════════════════════════ */
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
    <div className="w-full bg-sidebar flex items-center justify-center gap-4 py-2.5 border-b border-sidebar-border select-none">
      <div className="flex items-end gap-1 tabular-nums leading-none">
        <span className="text-4xl font-black text-white" style={{ letterSpacing: '-1.5px' }}>
          {hh}<span className="text-sidebar-primary animate-pulse">:</span>{mm}
        </span>
        <div className="flex flex-col mb-0.5 ml-1 gap-0">
          <span className="text-sm font-black text-sidebar-primary leading-none">{ampm}</span>
          <span className="text-base font-bold text-slate-500 tabular-nums leading-none">{ss}</span>
        </div>
      </div>
      <div className="w-px h-8 bg-slate-700" />
      <p className="text-[10px] text-slate-500 capitalize">{dateStr}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ROW 1 PANELS — fixed height PANEL_H1
   ════════════════════════════════════════════════════════════════ */

/* 1A · Sales Funnel */
function SalesFunnel({ counts = {}, loading }) {
  const STAGES = [
    { key: 'leads',     label: 'Leads',     bar: '#64748b', link: '/leads' },
    { key: 'estimates', label: 'Estimates', bar: '#3b82f6', link: '/estimates' },
    { key: 'approved',  label: 'Approved',  bar: '#8b5cf6', link: '/estimates' },
    { key: 'jobs',      label: 'Jobs',      bar: '#f59e0b', link: '/work-orders' },
    { key: 'paid',      label: 'Paid',      bar: '#10b981', link: '/invoices' },
  ];
  const max = Math.max(1, ...STAGES.map(s => counts[s.key] || 0));
  return (
    <Panel title="Sales Funnel" accent="bg-violet-800" icon={TrendingUp} iconCls="text-violet-300" bodyClass="px-3 py-2 space-y-1.5 flex flex-col justify-center">
      {STAGES.map(s => {
        const count = counts[s.key] || 0;
        const pct = max > 0 ? Math.max(3, Math.round((count / max) * 100)) : 3;
        return (
          <Link key={s.key} to={s.link} className="flex items-center gap-2 group">
            <span className="text-[9px] font-bold text-slate-500 w-14 flex-shrink-0 group-hover:text-slate-300 transition-colors">{s.label}</span>
            <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden relative">
              <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, background: s.bar, opacity: 0.8 }} />
            </div>
            <span className="text-[10px] font-black tabular-nums w-5 text-right" style={{ color: s.bar }}>
              {loading ? '—' : count}
            </span>
          </Link>
        );
      })}
    </Panel>
  );
}

/* 1B · Revenue 6m */
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function buildMonthlyData(invoices) {
  const map = {};
  invoices.forEach(inv => {
    if (inv.status !== 'paid') return;
    const d = new Date(inv.paid_at || inv.updated_date || '');
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    map[key] = (map[key] || 0) + (inv.total || 0);
  });
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: MONTH_LABELS[d.getMonth()], revenue: map[`${d.getFullYear()}-${d.getMonth()}`] || 0 };
  });
}
const RevTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-[10px] rounded px-2 py-1.5 shadow-xl border border-slate-700">
      <p className="font-semibold text-slate-300">{label}</p>
      <p className="text-emerald-400 font-black">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};
function RevenueChart({ invoices = [], loading }) {
  const data = buildMonthlyData(invoices);
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  return (
    <Panel title="Ingresos — 6 Meses" accent="bg-emerald-800" icon={DollarSign} iconCls="text-emerald-300" bodyClass="px-1 pt-1 pb-0">
      {loading
        ? <div className="flex items-center justify-center h-full text-[10px] text-slate-600">Cargando…</div>
        : <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barSize={18}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: '#334155' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip content={<RevTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="revenue" radius={[3,3,0,0]}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.revenue === maxVal ? '#10b981' : '#1d4ed8'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
      }
    </Panel>
  );
}

/* 1C · Job Pipeline */
const JP_STAGES = [
  { key: 'scheduled',   label: 'Scheduled',   icon: HardHat,      hex: '#3b82f6' },
  { key: 'on_the_way',  label: 'On My Way',   icon: Navigation2,  hex: '#f59e0b' },
  { key: 'in_progress', label: 'In Progress', icon: Wrench,       hex: '#8b5cf6' },
  { key: 'completed',   label: 'Completed',   icon: CheckCircle2, hex: '#10b981' },
];
function JobPipeline({ workOrders = [], loading }) {
  const counts = {
    scheduled:   workOrders.filter(w => w.status === 'scheduled').length,
    on_the_way:  workOrders.filter(w => w.status === 'on_the_way').length,
    in_progress: workOrders.filter(w => w.status === 'in_progress').length,
    completed:   workOrders.filter(w => w.status === 'completed').length,
  };
  return (
    <Panel title="Job Pipeline" accent="bg-amber-700" icon={Wrench} iconCls="text-amber-200" link="/work-orders" bodyClass="grid grid-cols-2 divide-x divide-y divide-white/5">
      {JP_STAGES.map(s => {
        const Icon = s.icon;
        return (
          <Link key={s.key} to="/work-orders" className="flex items-center gap-2 px-3 py-3 hover:bg-white/5 transition-colors">
            <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: s.hex + '22', border: `1px solid ${s.hex}44` }}>
              <Icon className="w-3.5 h-3.5" style={{ color: s.hex }} />
            </div>
            <div>
              <p className="text-xl font-black tabular-nums leading-none text-white">{loading ? '—' : counts[s.key] || 0}</p>
              <p className="text-[9px] font-semibold text-slate-500 leading-tight mt-0.5">{s.label}</p>
            </div>
          </Link>
        );
      })}
    </Panel>
  );
}

/* 1D · Alerts */
function AlertsPanel({ estimates = [], invoices = [], workOrders = [], loading }) {
  const alerts = [];
  if (!loading) {
    const overdue = invoices.filter(i => i.status === 'overdue');
    if (overdue.length) alerts.push({ icon: FileX, hex: '#ef4444', title: `${overdue.length} factura${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`, desc: `$${overdue.reduce((s,i) => s+(i.total||0)-(i.amount_paid||0),0).toLocaleString()} pendiente`, link: '/invoices', badge: overdue.length });
    const sevenAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    const stale = estimates.filter(e => ['sent','viewed'].includes(e.status) && e.sent_at < sevenAgo);
    if (stale.length) alerts.push({ icon: Clock, hex: '#f59e0b', title: `${stale.length} estimado${stale.length>1?'s':''} sin respuesta`, desc: 'Enviado hace +7 días', link: '/estimates', badge: stale.length });
    const changes = estimates.filter(e => e.status === 'changes_requested');
    if (changes.length) alerts.push({ icon: AlertTriangle, hex: '#f97316', title: `${changes.length} cambio${changes.length>1?'s':''} solicitado${changes.length>1?'s':''}`, desc: 'El cliente pidió revisiones', link: '/estimates', badge: changes.length });
    const declined = estimates.filter(e => e.status === 'declined');
    if (declined.length) alerts.push({ icon: TrendingDown, hex: '#64748b', title: `${declined.length} estimado${declined.length>1?'s':''} rechazado${declined.length>1?'s':''}`, desc: 'Revisar precio o alcance', link: '/estimates', badge: declined.length });
    const approved = estimates.filter(e => ['approved','signed'].includes(e.status));
    if (approved.length) alerts.push({ icon: Bell, hex: '#8b5cf6', title: `${approved.length} aprobado${approved.length>1?'s':''} sin convertir`, desc: 'Convertir a Work Order', link: '/estimates', badge: approved.length });
  }
  return (
    <Panel title="Alertas" accent="bg-red-900" icon={Bell} iconCls="text-red-300">
      {loading
        ? <Empty text="Cargando…" />
        : alerts.length === 0
          ? <Empty text="Sin alertas activas ✓" />
          : alerts.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} to={a.link} className="flex items-start gap-2.5 px-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: a.hex + '22' }}>
                    <Icon className="w-3 h-3" style={{ color: a.hex }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-300 leading-tight">{a.title}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5 leading-snug">{a.desc}</p>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: a.hex + '22', color: a.hex }}>
                    {a.badge}
                  </span>
                </Link>
              );
            })
      }
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
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
    const approvalRate = (sent.length + approved.length) > 0 ? Math.round((approved.length / (sent.length + approved.length)) * 100) : 0;
    const monthRevenue = invoices.filter(i => i.status === 'paid' && (i.paid_at || i.updated_date || '').slice(0, 10) >= startOfMonth).reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);
    const leads = await base44.entities.Lead.list('-created_date', 100).catch(() => []);
    setTodayAppointments(todayAppts);
    setActiveWorkOrders(active.slice(0, 10));
    setAllWorkOrders(workOrders);
    setRecentEstimates(estimates.slice(0, 10));
    setAllEstimates(estimates);
    setAllInvoices(invoices);
    setKpis({ activeJobs: active.length, completedJobs: completed.length, estimatesSent: sent.length, approvalRate, monthRevenue, outstanding, todayAppts: todayAppts.length, totalWO: workOrders.length });
    setFunnelCounts({ leads: leads.length, estimates: estimates.filter(e => e.status !== 'draft').length, approved: approved.length, jobs: workOrders.length, paid: invoices.filter(i => i.status === 'paid').length });
    setLoading(false);
  };

  const completionPct = kpis.totalWO > 0 ? Math.round(((kpis.completedJobs || 0) / kpis.totalWO) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#070e1a] flex flex-col">

      {/* ── RELOJ ─────────────────────────────────────────────────────── */}
      <DigitalClock />

      {/* ── HEADER BANDA ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#0a1628] border-b border-[#1e3a5f]/80 px-4 py-1.5">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          {/* Brand */}
          <div className="border-r border-slate-800 pr-3 flex-shrink-0">
            <h1 className="text-[13px] font-black text-white leading-none">RC Art Contractors</h1>
            <p className="text-[9px] text-slate-600 mt-0.5">Control Center · {format(new Date(), 'EEE MMM d, yyyy')}</p>
          </div>
          {/* KPI strip */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none py-0.5">
            <KpiChip label="Ingresos Mes"   value={`$${(kpis.monthRevenue||0).toLocaleString()}`} dot="#10b981" loading={loading} />
            <KpiChip label="Jobs Activos"   value={kpis.activeJobs ?? 0}                          dot="#3b82f6" loading={loading} />
            <KpiChip label="Por Cobrar"     value={`$${(kpis.outstanding||0).toLocaleString()}`}  dot="#ef4444" loading={loading} />
            <KpiChip label="Citas Hoy"      value={kpis.todayAppts ?? 0}                          dot="#f59e0b" loading={loading} />
            <KpiChip label="Estimados"      value={kpis.estimatesSent ?? 0}                       dot="#8b5cf6" loading={loading} />
            <KpiChip label="Aprobación"     value={`${kpis.approvalRate ?? 0}%`}                  dot="#06b6d4" loading={loading} />
          </div>
          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[9px] border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white">
              <Link to="/appointments"><Plus className="w-2.5 h-2.5 mr-0.5" />Cita</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[9px] border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white">
              <Link to="/work-orders"><Plus className="w-2.5 h-2.5 mr-0.5" />WO</Link>
            </Button>
            <Button asChild size="sm" className="h-6 px-2.5 text-[9px] bg-blue-700 hover:bg-blue-600 text-white border-0">
              <Link to="/estimates"><Plus className="w-2.5 h-2.5 mr-0.5" />Estimate</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-3 py-2 flex flex-col gap-2">

        {/* ▸ KPI HERO ROW */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Ingresos Este Mes', val: `$${(kpis.monthRevenue||0).toLocaleString()}`, sub: 'Facturas pagadas', sub2: { l: 'Por cobrar', v: `$${(kpis.outstanding||0).toLocaleString()}` }, pct: kpis.approvalRate??0, hex: '#10b981', icon: DollarSign, link: '/invoices' },
            { label: 'Pipeline de Ventas', val: kpis.estimatesSent??0, sub: 'Estimados enviados', sub2: { l: 'Aprobados', v: funnelCounts.approved??0 }, pct: kpis.approvalRate??0, hex: '#3b82f6', icon: TrendingUp, link: '/estimates' },
            { label: 'Operaciones', val: kpis.activeJobs??0, sub: 'WOs activos', sub2: { l: 'Completados', v: kpis.completedJobs??0 }, pct: completionPct, hex: '#8b5cf6', icon: Briefcase, link: '/work-orders' },
          ].map(k => (
            <Link key={k.label} to={k.link} className="block">
              <div className={`${PANEL_BG} ${PANEL_BDR} rounded-lg p-3 hover:border-white/20 transition-all`} style={{ borderLeftWidth: 3, borderLeftColor: k.hex }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">{k.label}</div>
                    <div className="text-2xl font-black tabular-nums leading-none" style={{ color: k.hex }}>
                      {loading ? <span className="text-slate-700">—</span> : k.val}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1">{k.sub}</div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <Donut pct={k.pct} hex={k.hex} size={40} sw={4} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] font-black tabular-nums" style={{ color: k.hex }}>{loading ? '—' : `${k.pct}%`}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[8px] text-slate-600 font-semibold">{k.sub2.l}</span>
                  <span className="text-[11px] font-black tabular-nums" style={{ color: k.hex }}>{loading ? '—' : k.sub2.v}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ▸ ROW 1: 4 equal panels */}
        <div className={`grid grid-cols-4 gap-2 ${PANEL_H1}`}>
          <SalesFunnel counts={funnelCounts} loading={loading} />
          <RevenueChart invoices={allInvoices} loading={loading} />
          <JobPipeline workOrders={allWorkOrders} loading={loading} />
          <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} loading={loading} />
        </div>

        {/* ▸ ROW 2: 4 equal list panels */}
        <div className={`grid grid-cols-4 gap-2 ${PANEL_H2}`}>

          {/* Citas de Hoy */}
          <Panel title="Citas de Hoy" accent="bg-blue-900" icon={Calendar} iconCls="text-blue-300" link="/appointments">
            {loading ? <Empty text="Cargando…" />
              : todayAppointments.length === 0 ? <Empty text="Sin citas hoy" />
              : todayAppointments.map(appt => (
                <Link key={appt.id} to="/appointments">
                  <Row>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-300 truncate leading-tight">{appt.customer_display_name || appt.client_name}</p>
                        <p className="text-[9px] text-slate-600">{appt.start_time || '—'}</p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  </Row>
                </Link>
              ))
            }
          </Panel>

          {/* Work Orders Activos */}
          <Panel title="Work Orders" accent="bg-violet-900" icon={ClipboardList} iconCls="text-violet-300" link="/work-orders">
            {loading ? <Empty text="Cargando…" />
              : activeWorkOrders.length === 0 ? <Empty text="Sin work orders activos" />
              : activeWorkOrders.map(wo => (
                <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                  <Row>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-300 truncate leading-tight">
                          <span className="text-violet-400 font-black">#{wo.work_order_number}</span> {wo.client_name}
                        </p>
                        <p className="text-[9px] text-slate-600 truncate">{wo.title}</p>
                      </div>
                      <StatusBadge status={wo.status} />
                    </div>
                  </Row>
                </Link>
              ))
            }
          </Panel>

          {/* Estimados Recientes */}
          <Panel title="Estimados Recientes" accent="bg-amber-900" icon={FileText} iconCls="text-amber-300" link="/estimates">
            {loading ? <Empty text="Cargando…" />
              : recentEstimates.length === 0 ? <Empty text="Sin estimados" />
              : recentEstimates.map(est => (
                <Link key={est.id} to={`/estimate-editor?id=${est.id}`}>
                  <Row>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="text-[9px] font-black text-amber-500 flex-shrink-0">#{est.estimate_number}</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-300 truncate leading-tight">{est.client_name}</p>
                          <p className="text-[9px] text-slate-600 tabular-nums">${(est.total||0).toLocaleString()}</p>
                        </div>
                      </div>
                      <StatusBadge status={est.status} />
                    </div>
                  </Row>
                </Link>
              ))
            }
          </Panel>

          {/* Notificaciones */}
          <Panel title="Notificaciones" accent="bg-slate-800" icon={Bell} iconCls="text-slate-400">
            <NotificationsPanel />
          </Panel>

        </div>
      </div>
    </div>
  );
}