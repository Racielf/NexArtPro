import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList, ArrowRight, Plus,
  DollarSign, TrendingUp, Bell,
  AlertTriangle, Clock, FileX, TrendingDown,
  Wrench, Navigation2, HardHat, CheckCircle2,
  Zap, ChevronRight, UserX, RefreshCw, Send
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ════════════════════════════════════════════════════════════════
   DESIGN TOKENS  — light / professional
   ════════════════════════════════════════════════════════════════ */
const ROW_H = 'h-[240px]';

/* ════════════════════════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* Panel shell */
function Panel({ title, headerBg, icon: Icon, link, children, bodyClass = '' }) {
  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:-translate-y-[1px] active:scale-[0.995] transition-all duration-200 overflow-hidden">
      {/* Colored header */}
      <div className={`flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-black/8 ${headerBg}`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3 h-3 text-white/60" />}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90">{title}</span>
        </div>
        {link && (
          <Link to={link} className="text-[10px] text-white/50 hover:text-white/90 font-medium flex items-center gap-0.5 transition-colors">
            Ver <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        )}
      </div>
      {/* White body */}
      <div className={`flex-1 overflow-y-auto scroll-smooth bg-white ${bodyClass}`}>
        {children}
      </div>
    </div>
  );
}

/* List row */
function Row({ children }) {
  return (
    <div className="px-3 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 active:bg-slate-100 transition-colors duration-150 cursor-pointer">
      {children}
    </div>
  );
}

/* Empty state */
function Empty({ text, sub }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1 select-none">
      <span className="text-[11px] font-medium text-slate-400">{text}</span>
      {sub && <span className="text-[10px] text-slate-300">{sub}</span>}
    </div>
  );
}

/* KPI chip in header */
function KpiChip({ label, value, dot, loading, tooltip }) {
  return (
    <div title={tooltip} className="flex items-center gap-1.5 px-2.5 py-[5px] bg-white border border-slate-200/80 rounded-lg flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] active:scale-[0.97] transition-all duration-150 cursor-default select-none">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      <div className="leading-none">
        <div className="text-[8px] text-slate-400 uppercase tracking-wider">{label}</div>
        <div className={`text-[13px] font-bold tabular-nums leading-tight transition-all duration-300 ${loading ? 'text-slate-300' : 'text-slate-800'}`}>
          {loading ? '···' : value}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DIGITAL CLOCK  — light version
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
    <div className="w-full bg-white flex items-center justify-center gap-4 py-2 border-b border-slate-200 select-none">
      <div className="flex items-end gap-1 tabular-nums leading-none">
        <span className="text-3xl font-black text-slate-800" style={{ letterSpacing: '-1px' }}>
          {hh}<span className="text-blue-500">:</span>{mm}
        </span>
        <div className="flex flex-col mb-0.5 ml-1 gap-0">
          <span className="text-sm font-bold text-blue-500 leading-none">{ampm}</span>
          <span className="text-sm font-semibold text-slate-400 tabular-nums leading-none">{ss}</span>
        </div>
      </div>
      <div className="w-px h-6 bg-slate-200" />
      <p className="text-[10px] text-slate-400 capitalize">{dateStr}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ROW 1 PANELS
   ════════════════════════════════════════════════════════════════ */

/* 1A · Sales Funnel */
function SalesFunnel({ counts = {}, kpis = {}, loading }) {
  const STAGES = [
    { key: 'leads',     label: 'Leads',     bar: '#94a3b8', link: '/leads' },
    { key: 'estimates', label: 'Estimates', bar: '#3b82f6', link: '/estimates' },
    { key: 'approved',  label: 'Approved',  bar: '#8b5cf6', link: '/estimates' },
    { key: 'jobs',      label: 'Jobs',      bar: '#f59e0b', link: '/work-orders' },
    { key: 'paid',      label: 'Paid',      bar: '#10b981', link: '/invoices' },
  ];
  const max = Math.max(1, ...STAGES.map(s => counts[s.key] || 0));
  return (
    <Panel title="Sales Funnel" headerBg="bg-violet-500" icon={TrendingUp}>
      {/* 3 mini KPI stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { l: 'Ingresos', v: `$${((kpis.monthRevenue||0)/1000).toFixed(1)}k`, hex: '#10b981' },
          { l: 'Activos',  v: kpis.activeJobs ?? 0,                             hex: '#3b82f6' },
          { l: 'Aprob.',   v: `${kpis.approvalRate ?? 0}%`,                     hex: '#8b5cf6' },
        ].map(k => (
          <div key={k.l} className="px-2.5 py-2 flex flex-col">
            <span className="text-[8px] text-slate-500 uppercase tracking-wide leading-none">{k.l}</span>
            <span className="text-base font-bold tabular-nums leading-tight mt-0.5" style={{ color: k.hex }}>
              {loading ? '—' : k.v}
            </span>
          </div>
        ))}
      </div>
      {/* Funnel bars */}
      <div className="px-3 py-2.5 space-y-2">
        {STAGES.map((s, idx) => {
          const count = counts[s.key] || 0;
          const pct = max > 0 ? Math.max(3, Math.round((count / max) * 100)) : 3;
          return (
            <Link key={s.key} to={s.link} className="flex items-center gap-2 group active:scale-[0.99] transition-transform duration-100">
              <span className="text-[9px] font-medium text-slate-400 w-14 flex-shrink-0 group-hover:text-slate-600 transition-colors">{s.label}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: loading ? '0%' : `${pct}%`,
                    background: s.bar,
                    opacity: 0.75,
                    transition: `width ${600 + idx * 80}ms cubic-bezier(0.4,0,0.2,1)`,
                  }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums w-5 text-right transition-colors duration-200" style={{ color: s.bar }}>
                {loading ? '·' : count}
              </span>
            </Link>
          );
        })}
      </div>
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
    <div className="bg-white text-slate-800 text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg border border-slate-200">
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="text-emerald-600 font-bold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};
function RevenueChart({ invoices = [], loading, monthRevenue = 0, outstanding = 0 }) {
  const data = buildMonthlyData(invoices);
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  return (
    <Panel title="Ingresos — 6 Meses" headerBg="bg-emerald-500" icon={DollarSign}>
      {/* Totals strip */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-3 py-1.5">
          <span className="text-[8px] text-slate-500 uppercase tracking-wide block">Este Mes</span>
          <span className="text-base font-bold text-emerald-600 tabular-nums leading-tight">{loading ? '—' : `$${(monthRevenue||0).toLocaleString()}`}</span>
        </div>
        <div className="px-3 py-1.5">
          <span className="text-[8px] text-slate-500 uppercase tracking-wide block">Por Cobrar</span>
          <span className="text-base font-bold text-red-500 tabular-nums leading-tight">{loading ? '—' : `$${(outstanding||0).toLocaleString()}`}</span>
        </div>
      </div>
      {/* Chart */}
      <div className="px-1 pt-1 pb-0" style={{ height: 'calc(100% - 48px)' }}>
        {loading
          ? <div className="flex items-center justify-center h-full text-[11px] text-slate-400">Cargando…</div>
          : <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 6, left: -14, bottom: 0 }} barSize={20}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#cbd5e1' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip content={<RevTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="revenue" radius={[4,4,0,0]}>
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.revenue === maxVal ? '#10b981' : '#3b82f6'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        }
      </div>
    </Panel>
  );
}

/* 1C · Job Pipeline */
const JP_STAGES = [
  { key: 'scheduled',   label: 'Scheduled',   icon: HardHat,      hex: '#3b82f6', bg: '#eff6ff' },
  { key: 'on_the_way',  label: 'On My Way',   icon: Navigation2,  hex: '#f59e0b', bg: '#fffbeb' },
  { key: 'in_progress', label: 'In Progress', icon: Wrench,       hex: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'completed',   label: 'Completed',   icon: CheckCircle2, hex: '#10b981', bg: '#f0fdf4' },
];
function JobPipeline({ workOrders = [], loading }) {
  const counts = {
    scheduled:   workOrders.filter(w => w.status === 'scheduled').length,
    on_the_way:  workOrders.filter(w => w.status === 'on_the_way').length,
    in_progress: workOrders.filter(w => w.status === 'in_progress').length,
    completed:   workOrders.filter(w => w.status === 'completed').length,
  };
  return (
    <Panel title="Job Pipeline" headerBg="bg-amber-500" icon={Wrench} link="/work-orders" bodyClass="grid grid-cols-2 divide-x divide-y divide-slate-100">
      {JP_STAGES.map(s => {
        const Icon = s.icon;
        return (
          <Link key={s.key} to="/work-orders" className="flex items-center gap-2.5 px-3 py-3 hover:bg-slate-50/80 active:bg-slate-100 active:scale-[0.98] transition-all duration-150 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200" style={{ background: s.bg, border: `1px solid ${s.hex}22` }}>
              <Icon className="w-3.5 h-3.5 opacity-70" style={{ color: s.hex }} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none text-slate-900">{loading ? '·' : counts[s.key] || 0}</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          </Link>
        );
      })}
    </Panel>
  );
}

/* 1D · Alerts with recommended actions */
function AlertsPanel({ estimates = [], invoices = [], workOrders = [], loading }) {
  const alerts = [];
  if (!loading) {
    const overdue = invoices.filter(i => i.status === 'overdue');
    if (overdue.length) alerts.push({
      icon: FileX, hex: '#ef4444', bg: '#fef2f2',
      title: `${overdue.length} factura${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`,
      desc: `$${overdue.reduce((s,i) => s+(i.total||0)-(i.amount_paid||0),0).toLocaleString()} pendiente`,
      action: 'Llamar al cliente hoy →',
      link: '/invoices', badge: overdue.length, urgent: true,
    });
    const sevenAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    const stale = estimates.filter(e => ['sent','viewed'].includes(e.status) && e.sent_at < sevenAgo);
    if (stale.length) alerts.push({
      icon: Clock, hex: '#f59e0b', bg: '#fffbeb',
      title: `${stale.length} estimado${stale.length>1?'s':''} sin respuesta`,
      desc: 'Enviado hace +7 días',
      action: 'Enviar follow-up →',
      link: '/estimates', badge: stale.length,
    });
    const changes = estimates.filter(e => e.status === 'changes_requested');
    if (changes.length) alerts.push({
      icon: AlertTriangle, hex: '#f97316', bg: '#fff7ed',
      title: `${changes.length} cambio${changes.length>1?'s':''} solicitado${changes.length>1?'s':''}`,
      desc: 'El cliente pidió revisiones',
      action: 'Revisar y reenviar →',
      link: '/estimates', badge: changes.length, urgent: true,
    });
    const approved = estimates.filter(e => ['approved','signed'].includes(e.status));
    if (approved.length) alerts.push({
      icon: CheckCircle2, hex: '#8b5cf6', bg: '#f5f3ff',
      title: `${approved.length} aprobado${approved.length>1?'s':''} listo${approved.length>1?'s':''}`,
      desc: 'Esperando conversión',
      action: 'Crear Work Order →',
      link: '/estimates', badge: approved.length,
    });
    const unassigned = workOrders.filter(w => !['completed','invoiced','cancelled'].includes(w.status) && !w.assigned_worker_name);
    if (unassigned.length) alerts.push({
      icon: UserX, hex: '#64748b', bg: '#f8fafc',
      title: `${unassigned.length} job${unassigned.length>1?'s':''} sin asignar`,
      desc: 'Sin técnico designado',
      action: 'Asignar ahora →',
      link: '/work-orders', badge: unassigned.length,
    });
  }
  const visible = alerts.slice(0, 4);
  return (
    <Panel title={`Alertas${alerts.length > 0 ? ` (${alerts.length})` : ''}`} headerBg="bg-red-500" icon={Bell}>
      {loading
        ? <Empty text="Cargando alertas…" />
        : alerts.length === 0
          ? <div className="flex flex-col items-center justify-center h-full gap-1.5 select-none">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-[11px] font-medium text-slate-500">Todo en orden</span>
              <span className="text-[10px] text-slate-300">No hay acciones pendientes</span>
            </div>
          : visible.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} to={a.link} className="flex items-start gap-2.5 px-3 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 active:scale-[0.99] transition-all duration-150 group">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: a.bg, border: `1px solid ${a.hex}25` }}>
                    <Icon className="w-3 h-3" style={{ color: a.hex }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-semibold text-slate-700 leading-tight">{a.title}</p>
                      {a.urgent && <span className="text-[8px] font-bold px-1 py-px rounded bg-red-100 text-red-600 uppercase tracking-wide">Urgente</span>}
                    </div>
                    <p className="text-[10px] font-medium mt-0.5 leading-none" style={{ color: a.hex }}>{a.action}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: a.bg, color: a.hex, border: `1px solid ${a.hex}30` }}>
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
   NEXT BEST ACTION BAR
   ════════════════════════════════════════════════════════════════ */
function buildActions({ estimates, invoices, workOrders, todayAppts }) {
  const actions = [];
  const today = format(new Date(), 'yyyy-MM-dd');

  const signed = estimates.filter(e => ['approved','signed'].includes(e.status));
  if (signed.length) actions.push({
    icon: RefreshCw, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200',
    label: `Convertir ${signed.length} estimado${signed.length>1?'s':''} aprobado${signed.length>1?'s':''}`,
    sub: 'Los clientes están esperando — crea los Work Orders',
    link: '/estimates', priority: 10,
  });

  const overdueInv = invoices.filter(i => i.status === 'overdue');
  if (overdueInv.length) {
    const amt = overdueInv.reduce((s,i) => s+(i.total||0)-(i.amount_paid||0), 0);
    actions.push({
      icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
      label: `Cobrar $${amt.toLocaleString()} en facturas vencidas`,
      sub: `${overdueInv.length} factura${overdueInv.length>1?'s':''} — contacta al cliente hoy`,
      link: '/invoices', priority: 9,
    });
  }

  const changesReq = estimates.filter(e => e.status === 'changes_requested');
  if (changesReq.length) actions.push({
    icon: Send, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',
    label: `Responder ${changesReq.length} solicitud${changesReq.length>1?'es':''} de cambios`,
    sub: 'El cliente espera una revisión — no dejes enfriar el deal',
    link: '/estimates', priority: 8,
  });

  const sevenAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
  const stale = estimates.filter(e => ['sent','viewed'].includes(e.status) && e.sent_at < sevenAgo);
  if (stale.length) actions.push({
    icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
    label: `Hacer follow-up a ${stale.length} estimado${stale.length>1?'s':''} sin respuesta`,
    sub: 'Más de 7 días enviados — un mensaje puede cerrar el trato',
    link: '/estimates', priority: 7,
  });

  const unassigned = workOrders.filter(w => !['completed','invoiced','cancelled'].includes(w.status) && !w.assigned_worker_name);
  if (unassigned.length) actions.push({
    icon: UserX, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200',
    label: `Asignar técnico a ${unassigned.length} job${unassigned.length>1?'s':''} pendiente${unassigned.length>1?'s':''}`,
    sub: 'Los trabajos sin asignar no avanzan — asigna ahora',
    link: '/work-orders', priority: 6,
  });

  return actions.sort((a,b) => b.priority - a.priority).slice(0, 3);
}

function NextBestAction({ estimates = [], invoices = [], workOrders = [], todayAppts = 0, loading }) {
  const actions = loading ? [] : buildActions({ estimates, invoices, workOrders, todayAppts });
  if (loading || actions.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Próximas acciones</span>
      </div>
      <div className="w-px h-5 bg-slate-200 flex-shrink-0 hidden sm:block" />
      <div className="flex flex-wrap gap-2 flex-1">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <Link key={i} to={a.link}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${a.bg} ${a.border} hover:brightness-95 active:scale-[0.98] transition-all duration-150 group`}>
              <Icon className={`w-3 h-3 flex-shrink-0 ${a.color}`} />
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold leading-tight ${a.color}`}>{a.label}</p>
                <p className="text-[9px] text-slate-400 leading-none mt-0.5 hidden sm:block">{a.sub}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* ── RELOJ ─────────────────────────────────────────────────────── */}
      <DigitalClock />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2 shadow-sm">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          {/* Brand */}
          <div className="border-r border-slate-200 pr-3 flex-shrink-0">
            <h1 className="text-[13px] font-bold text-slate-800 leading-none">RC Art Contractors</h1>
            <p className="text-[9px] text-slate-400 mt-0.5">Control Center · {format(new Date(), 'EEE MMM d, yyyy')}</p>
          </div>
          {/* KPI strip */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none py-0.5">
            <KpiChip label="Ingresos Mes"   value={`$${(kpis.monthRevenue||0).toLocaleString()}`} dot="#10b981" loading={loading} tooltip="Revenue cobrado este mes" />
            <KpiChip label="Jobs Activos"   value={kpis.activeJobs ?? 0}                          dot="#3b82f6" loading={loading} tooltip="Work orders en progreso" />
            <KpiChip label="Por Cobrar"     value={`$${(kpis.outstanding||0).toLocaleString()}`}  dot="#ef4444" loading={loading} tooltip="Facturas pendientes de cobro" />
            <KpiChip label="Citas Hoy"      value={kpis.todayAppts ?? 0}                          dot="#f59e0b" loading={loading} tooltip="Appointments programados hoy" />
            <KpiChip label="Estimados"      value={kpis.estimatesSent ?? 0}                       dot="#8b5cf6" loading={loading} tooltip="Estimados enviados sin respuesta" />
            <KpiChip label="Aprobación"     value={`${kpis.approvalRate ?? 0}%`}                  dot="#06b6d4" loading={loading} tooltip="Tasa de aprobación de estimados" />
          </div>
          {/* Actions */}
          <div className="flex gap-1.5 flex-shrink-0">
            <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] text-slate-600 border-slate-200 hover:bg-slate-50">
              <Link to="/appointments"><Plus className="w-3 h-3 mr-0.5" />Cita</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] text-slate-600 border-slate-200 hover:bg-slate-50">
              <Link to="/work-orders"><Plus className="w-3 h-3 mr-0.5" />WO</Link>
            </Button>
            <Button asChild size="sm" className="h-7 px-3 text-[10px] bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Link to="/estimates"><Plus className="w-3 h-3 mr-0.5" />Estimate</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-3 py-3 flex flex-col gap-3">

        {/* ▸ NEXT BEST ACTION */}
        <NextBestAction estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} todayAppts={kpis.todayAppts} loading={loading} />

        {/* ▸ ROW 1: Analytics panels */}
        <div className={`grid grid-cols-4 gap-3 ${ROW_H}`}>
          <SalesFunnel counts={funnelCounts} kpis={kpis} loading={loading} />
          <RevenueChart invoices={allInvoices} loading={loading} monthRevenue={kpis.monthRevenue||0} outstanding={kpis.outstanding||0} />
          <JobPipeline workOrders={allWorkOrders} loading={loading} />
          <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} loading={loading} />
        </div>

        {/* ▸ ROW 2: List panels */}
        <div className={`grid grid-cols-4 gap-3 ${ROW_H}`}>

          {/* Citas de Hoy */}
          <Panel title="Citas de Hoy" headerBg="bg-blue-500" icon={Calendar} link="/appointments">
            {loading ? <Empty text="Cargando…" sub="Un momento…" />
              : todayAppointments.length === 0 ? <Empty text="Sin citas hoy" sub="No hay appointments programados" />
              : todayAppointments.map(appt => (
                <Link key={appt.id} to="/appointments">
                  <Row>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate leading-tight">{appt.customer_display_name || appt.client_name}</p>
                        <p className="text-[10px] text-slate-400">{appt.start_time || 'Sin hora'}</p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  </Row>
                </Link>
              ))
            }
          </Panel>

          {/* Work Orders Activos */}
          <Panel title="Work Orders" headerBg="bg-purple-500" icon={ClipboardList} link="/work-orders">
            {loading ? <Empty text="Cargando…" sub="Un momento…" />
              : activeWorkOrders.length === 0 ? <Empty text="Sin work orders activos" sub="No hay jobs en curso" />
              : activeWorkOrders.map(wo => {
                const isUnassigned = !wo.assigned_worker_name;
                const isOverdue = wo.scheduled_date && wo.scheduled_date < format(new Date(), 'yyyy-MM-dd');
                return (
                  <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                    <Row>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate leading-tight">
                            <span className="text-violet-600 font-bold">#{wo.work_order_number}</span> {wo.client_name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {isUnassigned && <span className="text-[8px] font-bold px-1 py-px rounded bg-slate-100 text-slate-500 uppercase tracking-wide">Sin asignar</span>}
                            {isOverdue && <span className="text-[8px] font-bold px-1 py-px rounded bg-red-50 text-red-500 uppercase tracking-wide">Vencido</span>}
                            {!isUnassigned && !isOverdue && <span className="text-[10px] text-slate-400 truncate">{wo.title}</span>}
                          </div>
                        </div>
                        <StatusBadge status={wo.status} />
                      </div>
                    </Row>
                  </Link>
                );
              })
            }
          </Panel>

          {/* Estimados Recientes */}
          <Panel title="Estimados Recientes" headerBg="bg-orange-500" icon={FileText} link="/estimates">
            {loading ? <Empty text="Cargando…" sub="Un momento…" />
              : recentEstimates.length === 0 ? <Empty text="Sin estimados recientes" sub="Crea tu primer estimado" />
              : recentEstimates.map(est => {
                const needsFollowUp = ['sent','viewed'].includes(est.status) && est.sent_at && new Date(est.sent_at) < new Date(Date.now() - 5*24*60*60*1000);
                const needsAction = est.status === 'changes_requested';
                const isWon = ['approved','signed'].includes(est.status);
                return (
                  <Link key={est.id} to={`/estimate-editor?id=${est.id}`}>
                    <Row>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-amber-500 flex-shrink-0">#{est.estimate_number}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate leading-tight">{est.client_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {needsFollowUp && <span className="text-[8px] font-bold px-1 py-px rounded bg-amber-50 text-amber-600 uppercase tracking-wide">Follow-up</span>}
                              {needsAction && <span className="text-[8px] font-bold px-1 py-px rounded bg-orange-50 text-orange-600 uppercase tracking-wide">Revisar</span>}
                              {isWon && <span className="text-[8px] font-bold px-1 py-px rounded bg-emerald-50 text-emerald-600 uppercase tracking-wide">Aprobado</span>}
                              {!needsFollowUp && !needsAction && !isWon && <span className="text-[10px] text-slate-400 tabular-nums">${(est.total||0).toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={est.status} />
                      </div>
                    </Row>
                  </Link>
                );
              })
            }
          </Panel>

          {/* Notificaciones */}
          <Panel title="Notificaciones" headerBg="bg-slate-700" icon={Bell}>
            <NotificationsPanel />
          </Panel>

        </div>
      </div>
    </div>
  );
}