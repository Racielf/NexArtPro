import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList, Plus,
  DollarSign, TrendingUp, Bell,
  AlertTriangle, Clock, FileX,
  Wrench, Navigation2, HardHat, CheckCircle2,
  Zap, ChevronRight, UserX, RefreshCw, Send, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

/* ══════════════════════════════════════════════
   SHARED MICRO-COMPONENTS — clean SaaS style
   ══════════════════════════════════════════════ */

/* Card shell — white, subtle border, no colored header */
function Card({ title, icon: Icon, link, linkLabel = 'Ver todas', children, className = '', bodyClass = '' }) {
  return (
    <div className={`flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 overflow-hidden ${className}`}>
      {/* Clean header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{title}</span>
        </div>
        {link && (
          <Link to={link} className="text-[10px] text-slate-400 hover:text-slate-700 font-semibold flex items-center gap-0.5 transition-colors">
            {linkLabel} <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        )}
      </div>
      {/* Body */}
      <div className={`flex-1 overflow-y-auto scroll-smooth ${bodyClass}`}>
        {children}
      </div>
    </div>
  );
}

/* List row */
function Row({ children }) {
  return (
    <div className="px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer">
      {children}
    </div>
  );
}

/* Empty state */
function Empty({ text, sub, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 py-10 select-none">
      {Icon && <Icon className="w-5 h-5 text-slate-300 mb-0.5" />}
      <span className="text-[12px] font-semibold text-slate-400">{text}</span>
      {sub && <span className="text-[10px] text-slate-300">{sub}</span>}
    </div>
  );
}

/* KPI chip in topbar */
function KpiChip({ label, value, dot, loading, tooltip }) {
  return (
    <div title={tooltip} className="flex items-center gap-1.5 px-2.5 py-[5px] bg-white border border-slate-200 rounded-lg flex-shrink-0 shadow-sm hover:shadow hover:-translate-y-[1px] transition-all duration-150 cursor-default select-none">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      <div className="leading-none">
        <div className="text-[8px] text-slate-400 uppercase tracking-wider">{label}</div>
        <div className={`text-[13px] font-bold tabular-nums leading-tight ${loading ? 'text-slate-300' : 'text-slate-800'}`}>
          {loading ? '···' : value}
        </div>
      </div>
    </div>
  );
}

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

/* ══════════════════════════════════════════════
   MONEY CONTROL — wide card, financial focus
   ══════════════════════════════════════════════ */
function MoneyControl({ monthRevenue = 0, outstanding = 0, invoices = [], loading, activeJobsCount = 0 }) {
  const overdueAmt = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const fmt = v => `$${v.toLocaleString()}`;

  return (
    <Card title="Money Control" icon={DollarSign} className="h-full">
      <div className="p-5 flex flex-col gap-4 h-full">
        {/* 4 métricas — 2 grandes arriba, 2 pequeñas abajo */}
        <div className="grid grid-cols-2 gap-4 flex-1">
          {/* Este mes — hero metric */}
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Este mes</span>
            <span className={`text-3xl font-black tabular-nums text-emerald-700 leading-none ${loading ? 'opacity-30' : ''}`}>{loading ? '—' : fmt(monthRevenue)}</span>
            <span className="text-[10px] text-emerald-400 mt-0.5">ingresos cobrados</span>
          </div>
          {/* Por cobrar */}
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Por cobrar</span>
            <span className={`text-3xl font-black tabular-nums text-blue-700 leading-none ${loading ? 'opacity-30' : ''}`}>{loading ? '—' : fmt(outstanding)}</span>
            <span className="text-[10px] text-blue-400 mt-0.5">pendiente de cobro</span>
          </div>
          {/* Vencido */}
          <div className={`flex flex-col gap-1 p-3.5 rounded-xl border ${overdueAmt > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${overdueAmt > 0 ? 'text-red-500' : 'text-slate-400'}`}>
              Vencido {!loading && overdueCount > 0 && <span className="normal-case font-normal opacity-70">· {overdueCount} fact.</span>}
            </span>
            <span className={`text-2xl font-bold tabular-nums leading-none ${loading ? 'opacity-30 text-slate-300' : overdueAmt > 0 ? 'text-red-600' : 'text-slate-300'}`}>{loading ? '—' : fmt(overdueAmt)}</span>
          </div>
          {/* Jobs Activos */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Jobs Activos</span>
            <span className={`text-2xl font-bold tabular-nums leading-none text-slate-700 ${loading ? 'opacity-30' : ''}`}>{loading ? '—' : activeJobsCount}</span>
            <span className="text-[10px] text-slate-400">en progreso</span>
          </div>
        </div>

        {/* CTA */}
        <Link to="/invoices" className="flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white overflow-hidden">
          <span className="flex items-center gap-2 flex-1 justify-center py-3 text-[13px] font-bold">
            <DollarSign className="w-4 h-4" />
            Cobrar ahora
          </span>
          <span className="border-l border-emerald-500/60 px-4 py-3 text-[11px] text-emerald-200 hover:text-white whitespace-nowrap font-medium">
            Ver facturas →
          </span>
        </Link>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════
   REVENUE CHART — 6 months
   ══════════════════════════════════════════════ */
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
function RevenueChart({ invoices = [], loading, monthRevenue = 0 }) {
  const data = buildMonthlyData(invoices);
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  // Trend: compare current month vs previous month
  const prevMonthRevenue = data.length >= 2 ? data[data.length - 2].revenue : 0;
  const trendPct = prevMonthRevenue > 0 ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : null;
  const trendUp = trendPct !== null && trendPct >= 0;
  return (
    <Card title="Ingresos — 6 Meses" icon={TrendingUp} link="/invoices" linkLabel="Ver todas" className="h-full">
      <div className="px-4 pt-3 pb-2 flex flex-col h-full gap-2">
        {/* Este Mes stat + trend */}
        <div className="flex items-end gap-2">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Este Mes</span>
            <span className="text-3xl font-bold text-emerald-600 tabular-nums leading-none">{loading ? '—' : `$${(monthRevenue||0).toLocaleString()}`}</span>
          </div>
          {!loading && trendPct !== null && (
            <span className={`text-[11px] font-bold mb-0.5 px-1.5 py-0.5 rounded-md ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {trendUp ? '▲' : '▼'} {Math.abs(trendPct)}%
            </span>
          )}
        </div>
        {/* Area Chart */}
        <div className="flex-1 min-h-0">
          {loading
            ? <div className="flex items-center justify-center h-full text-[11px] text-slate-400">Cargando…</div>
            : <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 32, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: '#cbd5e1' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`} />
                  <Tooltip content={<RevTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={(props) => {
                    const { cx, cy, value } = props;
                    if (value !== maxVal) return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#10b981" fillOpacity={0.5} stroke="white" strokeWidth={1} />;
                    return (
                      <g key={props.key}>
                        <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="white" strokeWidth={2} />
                        <text x={cx + 8} y={cy - 6} fontSize={9} fontWeight={700} fill="#10b981">${(value/1000).toFixed(1)}k</text>
                      </g>
                    );
                  }} />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════
   JOB PIPELINE
   ══════════════════════════════════════════════ */
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
    <Card title="Job Pipeline" icon={Wrench} link="/work-orders" linkLabel="Ver →" className="h-full" bodyClass="grid grid-cols-2 divide-x divide-y divide-slate-100">
      {JP_STAGES.map(s => {
        const Icon = s.icon;
        return (
          <Link key={s.key} to="/work-orders" className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50/80 transition-colors group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <Icon className="w-4 h-4" style={{ color: s.hex }} />
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums leading-none text-slate-800">{loading ? '·' : counts[s.key] || 0}</p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          </Link>
        );
      })}
    </Card>
  );
}

/* ══════════════════════════════════════════════
   ALERTS PANEL
   ══════════════════════════════════════════════ */
const PRIORITY_CFG = {
  urgent: { label: 'URGENT', cls: 'bg-red-50 text-red-600 border-red-200' },
  high:   { label: 'HIGH',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  normal: { label: 'NORMAL', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function AlertsPanel({ estimates = [], invoices = [], workOrders = [], loading }) {
  const [dismissed, setDismissed] = useState(new Set());
  const alerts = [];
  if (!loading) {
    const overdue = invoices.filter(i => i.status === 'overdue');
    if (overdue.length) alerts.push({ id: 'overdue-inv', icon: FileX, hex: '#ef4444', title: `${overdue.length} factura${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`, btnLabel: 'Ver facturas', btnLink: '/invoices', priority: 'urgent', order: 10 });
    const changes = estimates.filter(e => e.status === 'changes_requested');
    if (changes.length) alerts.push({ id: 'changes-req', icon: AlertTriangle, hex: '#f97316', title: `${changes.length} cambio${changes.length>1?'s':''} solicitado${changes.length>1?'s':''}`, btnLabel: 'Revisar', btnLink: `/estimate-editor?id=${changes[0].id}`, priority: 'urgent', order: 9 });
    const approved = estimates.filter(e => ['approved','signed'].includes(e.status));
    if (approved.length) alerts.push({ id: 'approved-est', icon: CheckCircle2, hex: '#8b5cf6', title: `${approved.length} aprobado${approved.length>1?'s':''} sin convertir`, btnLabel: 'Convertir', btnLink: `/estimate-editor?id=${approved[0].id}`, priority: 'high', order: 8 });
    const sevenAgoMs = Date.now() - 7*24*60*60*1000;
    const stale = estimates.filter(e => ['sent','viewed'].includes(e.status) && e.sent_at && new Date(e.sent_at).getTime() < sevenAgoMs);
    if (stale.length) alerts.push({ id: 'stale-est', icon: Clock, hex: '#f59e0b', title: `${stale.length} estimado${stale.length>1?'s':''} sin respuesta`, btnLabel: 'Follow-up', btnLink: `/estimate-editor?id=${stale[0].id}`, priority: 'high', order: 7 });
    const unassigned = workOrders.filter(w => !['completed','invoiced','cancelled'].includes(w.status) && !w.assigned_worker_name);
    if (unassigned.length) alerts.push({ id: 'unassigned-wo', icon: UserX, hex: '#64748b', title: `${unassigned.length} job${unassigned.length>1?'s':''} sin asignar`, btnLabel: 'Asignar', btnLink: `/work-orders/${unassigned[0].id}`, priority: 'normal', order: 6 });
  }
  const visible = alerts.filter(a => !dismissed.has(a.id)).sort((a,b) => b.order - a.order).slice(0, 4);

  const titleWithCount = visible.length > 0
    ? <span className="flex items-center gap-1.5">Alertas <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">{visible.length}</span></span>
    : 'Alertas';

  return (
    <Card title={titleWithCount} icon={Bell} className="h-full">
      {loading
        ? <Empty text="Cargando alertas…" />
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
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group/alert">
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
                    <button onClick={() => setDismissed(prev => new Set([...prev, a.id]))} className="opacity-0 group-hover/alert:opacity-100 transition-opacity text-slate-300 hover:text-slate-500 text-[10px] px-1 font-bold" title="Dismiss">✕</button>
                  </div>
                </div>
              );
            })
      }
    </Card>
  );
}

/* ══════════════════════════════════════════════
   NEXT BEST ACTION
   ══════════════════════════════════════════════ */
const GROUP_CFG = {
  Sales:      { color: 'text-violet-600', dot: 'bg-violet-400' },
  Operations: { color: 'text-amber-600',  dot: 'bg-amber-400' },
  Finance:    { color: 'text-red-600',    dot: 'bg-red-400' },
};

function buildActions({ estimates, invoices, workOrders }) {
  const actions = [];
  const overdueInv = invoices.filter(i => i.status === 'overdue');
  if (overdueInv.length) {
    const amt = overdueInv.reduce((s,i) => s+(i.total||0)-(i.amount_paid||0), 0);
    actions.push({ id: 'finance-overdue', icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: `Cobrar $${amt.toLocaleString()} vencido`, sub: `${overdueInv.length} factura${overdueInv.length>1?'s':''} — contacta hoy`, link: '/invoices', priority: 'urgent', order: 10, group: 'Finance' });
  }
  const changesReq = estimates.filter(e => e.status === 'changes_requested');
  if (changesReq.length) actions.push({ id: 'sales-changes', icon: Send, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', label: `Revisar ${changesReq.length} cambio${changesReq.length>1?'s':''} solicitado${changesReq.length>1?'s':''}`, sub: 'El cliente espera respuesta', link: `/estimate-editor?id=${changesReq[0].id}`, priority: 'urgent', order: 9, group: 'Sales' });
  const signed = estimates.filter(e => ['approved','signed'].includes(e.status));
  if (signed.length) actions.push({ id: 'sales-convert', icon: RefreshCw, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', label: `Convertir ${signed.length} estimado${signed.length>1?'s':''} aprobado${signed.length>1?'s':''}`, sub: 'Los clientes esperan Work Orders', link: `/estimate-editor?id=${signed[0].id}`, priority: 'high', order: 8, group: 'Sales' });
  const sevenAgoMs = Date.now() - 7*24*60*60*1000;
  const stale = estimates.filter(e => ['sent','viewed'].includes(e.status) && e.sent_at && new Date(e.sent_at).getTime() < sevenAgoMs);
  if (stale.length) actions.push({ id: 'sales-followup', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: `Follow-up: ${stale.length} estimado${stale.length>1?'s':''} sin respuesta`, sub: '+7 días sin respuesta', link: `/estimate-editor?id=${stale[0].id}`, priority: 'high', order: 7, group: 'Sales' });
  const unassigned = workOrders.filter(w => !['completed','invoiced','cancelled'].includes(w.status) && !w.assigned_worker_name);
  if (unassigned.length) actions.push({ id: 'ops-unassigned', icon: UserX, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: `Asignar técnico: ${unassigned.length} job${unassigned.length>1?'s':''} sin asignar`, sub: 'Sin técnico = sin avance', link: `/work-orders/${unassigned[0].id}`, priority: 'normal', order: 6, group: 'Operations' });
  return actions.sort((a,b) => b.order - a.order);
}

function NextBestAction({ estimates = [], invoices = [], workOrders = [], loading }) {
  const [dismissed, setDismissed] = useState(new Set());
  const all = loading ? [] : buildActions({ estimates, invoices, workOrders });
  const filtered = all.filter(a => !dismissed.has(a.id));
  const actions = filtered.slice(0, 3);
  const totalPending = filtered.length;

  const allGrouped = {};
  filtered.forEach(a => { if (!allGrouped[a.group]) allGrouped[a.group] = []; allGrouped[a.group].push(a); });
  const GROUP_LINKS = { Finance: '/invoices', Operations: '/work-orders', Sales: '/estimates' };
  const dominantGroup = Object.entries(allGrouped).sort((a, b) => b[1].length - a[1].length)[0]?.[0];
  const verTodasLink = GROUP_LINKS[dominantGroup] ?? '/estimates';
  const grouped = {};
  actions.forEach(a => { if (!grouped[a.group]) grouped[a.group] = []; grouped[a.group].push(a); });
  const sortedGroups = ['Finance', 'Sales', 'Operations'].filter(g => grouped[g]);

  if (loading) return null;

  if (actions.length === 0) return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      <span className="text-[12px] font-semibold text-slate-600">All caught up</span>
      <span className="text-[11px] text-slate-400">— no urgent actions right now</span>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2.5">
        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Próximas acciones</span>
        <span className="ml-auto text-[9px] text-slate-400">{totalPending} pendiente{totalPending>1?'s':''}</span>
        {totalPending > 3 && (
          <Link to={verTodasLink} className="text-[9px] font-semibold text-blue-600 hover:underline">Ver todas →</Link>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {sortedGroups.map(grp => {
          const gcfg = GROUP_CFG[grp];
          return (
            <div key={grp} className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${gcfg.dot}`} />
                <span className={`text-[8px] font-bold uppercase tracking-widest ${gcfg.color}`}>{grp}</span>
                {allGrouped[grp]?.length > 1 && <span className={`text-[8px] opacity-60 ${gcfg.color}`}>· {allGrouped[grp].length}</span>}
              </div>
              {grouped[grp].map(a => {
                const Icon = a.icon;
                const pcfg = PRIORITY_CFG[a.priority];
                return (
                  <div key={a.id} className="flex items-center gap-1.5 group/item">
                    <Link to={a.link} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${a.bg} ${a.border} hover:brightness-95 active:scale-[0.98] transition-all`}>
                      <Icon className={`w-3 h-3 flex-shrink-0 ${a.color}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pcfg.cls} leading-none`}>{pcfg.label}</span>
                          <p className={`text-[11px] font-semibold leading-tight ${a.color}`}>{a.label}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-none mt-0.5">{a.sub}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover/item:text-slate-500 transition-colors flex-shrink-0" />
                    </Link>
                    <button onClick={() => setDismissed(prev => new Set([...prev, a.id]))} className="opacity-0 group-hover/item:opacity-100 transition-opacity text-slate-300 hover:text-slate-500 text-[10px] font-bold leading-none" title="Dismiss">✕</button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════ */
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
  const [allProposals, setAllProposals] = useState([]);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
    let appts, estimates, workOrders, invoices;
    try {
      let proposals;
      [appts, estimates, workOrders, invoices, proposals] = await Promise.all([
        base44.entities.Appointment.list('-created_date', 200),
        base44.entities.Estimate.list('-created_date', 100),
        base44.entities.WorkOrder.list('-created_date', 100),
        base44.entities.Invoice.list('-created_date', 100),
        base44.entities.Proposal.list('-created_date', 100),
      ]);
      setAllProposals(proposals || []);
    } catch (err) {
      const isBase44Auth = sessionStorage.getItem('nexartpro_authenticated') === 'true';
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

  const CARD_H = 'h-[260px]';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* CLOCK */}
      <DigitalClock />

      {/* TOPBAR */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2 shadow-sm">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          <div className="border-r border-slate-200 pr-3 flex-shrink-0">
            <h1 className="text-[13px] font-bold text-slate-800 leading-none">RC Art Contractors</h1>
            <p className="text-[9px] text-slate-400 mt-0.5">Control Center · {format(new Date(), 'EEE MMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none py-0.5">
            <KpiChip label="Ingresos Mes"  value={`$${(kpis.monthRevenue||0).toLocaleString()}`} dot="#10b981" loading={loading} tooltip="Revenue cobrado este mes" />
            <KpiChip label="Jobs Activos"  value={kpis.activeJobs ?? 0}                          dot="#3b82f6" loading={loading} tooltip="Work orders en progreso" />
            <KpiChip label="Por Cobrar"    value={`$${(kpis.outstanding||0).toLocaleString()}`}  dot="#ef4444" loading={loading} tooltip="Facturas pendientes" />
            <KpiChip label="Citas Hoy"     value={kpis.todayAppts ?? 0}                          dot="#f59e0b" loading={loading} tooltip="Appointments hoy" />
            <KpiChip label="Estimados"     value={kpis.estimatesSent ?? 0}                       dot="#8b5cf6" loading={loading} tooltip="Estimados enviados" />
            <KpiChip label="Aprobación"    value={`${kpis.approvalRate ?? 0}%`}                  dot="#06b6d4" loading={loading} tooltip="Tasa de aprobación" />
          </div>
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

      {/* CONTENT */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4 flex flex-col gap-4">

        {/* ── FILA 1: Money Control (dominante col-span-2) + Revenue Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-visible" style={{ minHeight: '300px' }}>
          <div className="lg:col-span-2">
            <MoneyControl monthRevenue={kpis.monthRevenue||0} outstanding={kpis.outstanding||0} invoices={allInvoices} loading={loading} activeJobsCount={kpis.activeJobs||0} />
          </div>
          <RevenueChart invoices={allInvoices} loading={loading} monthRevenue={kpis.monthRevenue||0} />
        </div>

        {/* ── FILA 2: Next Actions (col-span-2, dominante) + soporte derecha */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 overflow-visible" style={{ minHeight: '260px' }}>
          {/* Próximas Acciones — col-span-2, foco de la fila */}
          <Card title="Próximas Acciones" icon={Zap} link={null} linkLabel="" className="xl:col-span-2 h-full">
            <div className="px-5 py-4 h-full flex flex-col">
              {loading
                ? <Empty text="Cargando…" />
                : (() => {
                    const all = buildActions({ estimates: allEstimates, invoices: allInvoices, workOrders: allWorkOrders });
                    if (all.length === 0) return (
                      <div className="flex items-center gap-3 py-6 px-2">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-600">Todo al día</p>
                          <p className="text-[11px] text-slate-400">No hay acciones urgentes pendientes</p>
                        </div>
                      </div>
                    );
                    return (
                      <>
                        <p className="text-[11px] text-slate-400 mb-3">
                          <span className="font-bold text-slate-700">{Math.min(all.length, 4)} prioritarias</span> de {all.length} pendientes
                        </p>
                        <div className="flex flex-col gap-2.5 flex-1">
                         {all.slice(0, 4).map(a => {
                           const Icon = a.icon;
                           const groupCfg = GROUP_CFG[a.group];
                           const pcfg = PRIORITY_CFG[a.priority];
                           return (
                             <div key={a.id} className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group/row">
                               <div className="flex items-center gap-3 min-w-0">
                                 <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-slate-200 shadow-sm">
                                   <Icon className={`w-4 h-4 ${a.color}`} />
                                 </div>
                                 <div className="min-w-0">
                                   <div className="flex items-center gap-1.5 mb-1">
                                     <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${groupCfg.dot}`} />
                                     <span className={`text-[9px] font-semibold uppercase tracking-wide ${groupCfg.color} opacity-80`}>{a.group}</span>
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pcfg.cls} leading-none`}>{pcfg.label}</span>
                                   </div>
                                   <p className="text-[13px] font-semibold text-slate-700 truncate leading-tight">{a.label}</p>
                                   <p className="text-[10px] text-slate-400 truncate mt-0.5">{a.sub}</p>
                                 </div>
                               </div>
                               <Link to={a.link} className="flex-shrink-0 text-[11px] font-bold px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shadow-sm">
                                 {a.priority === 'urgent' ? 'Actuar →' : a.group === 'Operations' ? 'Asignar →' : 'Ver →'}
                               </Link>
                             </div>
                           );
                         })}
                        </div>
                      </>
                    );
                  })()
              }
            </div>
          </Card>

          {/* Job Pipeline */}
          <JobPipeline workOrders={allWorkOrders} loading={loading} />

          {/* Alertas */}
          <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} proposals={allProposals} loading={loading} />
        </div>

        {/* ── FILA 3: Work Orders + Estimados + Citas + Notificaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-visible" style={{ minHeight: '220px' }}>

          {/* Work Orders */}
          <Card title="Work Orders" icon={ClipboardList} link="/work-orders" linkLabel="Ver →" className="h-full">
            {loading ? <Empty text="Cargando…" />
              : activeWorkOrders.length === 0 ? <Empty text="Sin work orders activos" sub="No hay jobs en curso" />
              : activeWorkOrders.slice(0, 4).map(wo => {
                const isUnassigned = !wo.assigned_worker_name;
                const isOverdue = wo.scheduled_date && wo.scheduled_date < format(new Date(), 'yyyy-MM-dd');
                return (
                  <div key={wo.id} className="group">
                    <Row>
                      <Link to={`/work-orders/${wo.id}`} className="block">
                        <p className="text-xs font-semibold text-slate-700 truncate leading-tight">
                          <span className="text-blue-600 font-bold">#{wo.work_order_number}</span> {wo.client_name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isUnassigned && <span className="text-[8px] font-semibold px-1 py-px rounded bg-amber-50 text-amber-600 border border-amber-200">Sin asignar</span>}
                          {isOverdue && <span className="text-[8px] font-semibold px-1 py-px rounded bg-red-50 text-red-500 border border-red-200">Vencido</span>}
                          {!isUnassigned && !isOverdue && <span className="text-[10px] text-slate-400 truncate">{wo.title}</span>}
                        </div>
                      </Link>
                    </Row>
                  </div>
                );
              })
            }
          </Card>

          {/* Estimados */}
          <Card title="Estimados" icon={FileText} link="/estimates" linkLabel="Ver todas" className="h-full">
            {loading ? <Empty text="Cargando…" />
              : recentEstimates.length === 0 ? <Empty text="Sin estimados recientes" sub="No hay estimados creados aún" />
              : recentEstimates.slice(0, 4).map(est => {
                const needsFollowUp = ['sent','viewed'].includes(est.status) && est.sent_at && new Date(est.sent_at) < new Date(Date.now() - 5*24*60*60*1000);
                const needsAction = est.status === 'changes_requested';
                const isWon = ['approved','signed'].includes(est.status);
                const ctaLabel = needsFollowUp ? 'Follow-up' : needsAction ? 'Revisar' : isWon ? 'Convertir' : 'Abrir';
                const ctaColor = needsFollowUp ? 'bg-amber-50 text-amber-600 border-amber-200' : needsAction ? 'bg-orange-50 text-orange-600 border-orange-200' : isWon ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200';
                return (
                  <div key={est.id} className="group">
                    <Row>
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/estimate-editor?id=${est.id}`} className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 truncate leading-tight">
                            <span className="text-[9px] font-bold text-amber-500">#{est.estimate_number}</span> {est.client_name}
                          </p>
                          <p className="text-[10px] text-slate-400">${(est.total||0).toLocaleString()}</p>
                        </Link>
                        <Link to={`/estimate-editor?id=${est.id}`} className={`text-[9px] font-semibold px-1.5 py-px rounded border flex-shrink-0 ${ctaColor} ${(needsFollowUp || needsAction || isWon) ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                          {ctaLabel} →
                        </Link>
                      </div>
                    </Row>
                  </div>
                );
              })
            }
          </Card>

          {/* Citas de Hoy */}
          <Card title="Citas de Hoy" icon={Calendar} link="/appointments" linkLabel="Ver →" className="h-full">
            {loading ? <Empty text="Cargando…" />
              : todayAppointments.length === 0 ? <Empty icon={CheckCircle2} text="Sin citas hoy" sub="✔ Todo está al día" />
              : todayAppointments.map(appt => (
                <div key={appt.id} className="group">
                  <Row>
                    <div className="flex items-center justify-between gap-2">
                      <Link to="/appointments" className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 truncate leading-tight">{appt.customer_display_name || appt.client_name}</p>
                        <p className="text-[10px] text-slate-400">{appt.start_time || 'Sin hora'} · {appt.service_type || 'Visita'}</p>
                      </Link>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <StatusBadge status={appt.status} />
                        {appt.customer_phone && (
                          <a href={`tel:${appt.customer_phone}`} className="p-1 rounded bg-blue-50 hover:bg-blue-100 transition-all" title={`Llamar: ${appt.customer_phone}`}>
                            <span className="text-[9px] font-bold text-blue-600">☎</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </Row>
                </div>
              ))
            }
          </Card>

          {/* Notificaciones */}
          <Card title="Notificaciones" icon={Bell} className="h-full">
            <NotificationsPanel />
          </Card>

        </div>

      </div>
    </div>
  );
}