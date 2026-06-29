import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Calendar, FileText, ClipboardList, Plus,
  DollarSign, TrendingUp, Bell,
  AlertTriangle, Clock, FileX,
  Wrench, Navigation2, HardHat, CheckCircle2,
  Zap, ChevronRight, UserX, RefreshCw, Send, ArrowRight,
  Briefcase, AlertCircle, PackageCheck, Activity,
  ReceiptText, TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/* ══════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
   ══════════════════════════════════════════════ */
function Card({ title, icon: Icon, link, linkLabel = 'Ver todas', children, className = '', bodyClass = '' }) {
  return (
    <div className={`flex flex-col border border-border rounded-xl overflow-hidden ${className}`} style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-card)', transition: 'var(--nexart-transition)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lift)'; e.currentTarget.style.borderColor = 'var(--border-warm)'; }} onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.borderColor = ''; }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 flex-shrink-0">
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
      <div className={`flex-1 overflow-y-auto scroll-smooth ${bodyClass}`}>
        {children}
      </div>
    </div>
  );
}

function Row({ children }) {
  return (
    <div className="px-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/40 transition-colors duration-150 cursor-pointer">
      {children}
    </div>
  );
}

function Empty({ text, sub, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 py-10 select-none">
      {Icon && <Icon className="w-5 h-5 text-slate-300 mb-0.5" />}
      <span className="text-[12px] font-semibold text-slate-400">{text}</span>
      {sub && <span className="text-[10px] text-slate-300">{sub}</span>}
    </div>
  );
}

function KpiChip({ label, value, dot, loading, tooltip }) {
  return (
    <div title={tooltip} className="flex items-center gap-1.5 px-2.5 py-[5px] bg-amber-50/70 border border-border rounded-lg flex-shrink-0 shadow-sm hover:shadow hover:-translate-y-[1px] transition-all duration-150 cursor-default select-none">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      <div className="leading-none">
        <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`text-[13px] font-bold tabular-nums leading-tight ${loading ? 'text-muted-foreground/40' : 'text-foreground'}`}>
          {loading ? '···' : value}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   NXT STAT CARD (nexartwo 6-stat pattern)
   ══════════════════════════════════════════════ */
function NxtStat({ icon: Icon, value, label, change, changeType = 'muted', color = 'accent', loading }) {
  const colorMap = {
    accent:  { icon: 'var(--burnt-500)',  cssVar: 'var(--burnt-400)' },
    success: { icon: '#16a34a',           cssVar: '#16a34a' },
    danger:  { icon: '#dc2626',           cssVar: '#dc2626' },
    info:    { icon: '#2563eb',           cssVar: '#2563eb' },
    purple:  { icon: '#7c3aed',           cssVar: '#7c3aed' },
    orange:  { icon: 'var(--orange-500)', cssVar: 'var(--orange-500)' },
  };
  const c = colorMap[color] ?? colorMap.accent;
  return (
    <div className="nxt-stat-card" style={{ '--nxt-stat-color': c.cssVar }}>
      <div className="nxt-stat-icon" style={{ color: c.icon }}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <p className="nxt-stat-value">{loading ? <span className="text-[18px] text-muted-foreground/30">—</span> : value}</p>
      <p className="nxt-stat-label">{label}</p>
      {change && <p className={`nxt-stat-change ${changeType}`}>{change}</p>}
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
    <div className="dash-clock w-full bg-amber-50/60 flex items-center justify-center gap-4 py-2 border-b border-border select-none">
      <div className="flex items-end gap-1 tabular-nums leading-none">
        <span className="text-3xl font-black text-foreground" style={{ letterSpacing: '-1px' }}>
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
   MONEY CONTROL
   ══════════════════════════════════════════════ */
function MoneyControl({ monthRevenue = 0, outstanding = 0, invoices = [], loading, activeJobsCount = 0 }) {
  const overdueAmt = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const fmt = v => `$${v.toLocaleString()}`;
  return (
    <Card title="Money Control" icon={DollarSign} className="h-full">
      <div className="p-5 flex flex-col gap-4 h-full">
        <div className="money-control-grid grid grid-cols-2 gap-4 flex-1">
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Este mes</span>
            <span className={`text-3xl font-black tabular-nums text-emerald-700 leading-none ${loading ? 'opacity-30' : ''}`}>{loading ? '—' : fmt(monthRevenue)}</span>
            <span className="text-[10px] text-emerald-400 mt-0.5">ingresos cobrados</span>
          </div>
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Por cobrar</span>
            <span className={`text-3xl font-black tabular-nums text-blue-700 leading-none ${loading ? 'opacity-30' : ''}`}>{loading ? '—' : fmt(outstanding)}</span>
            <span className="text-[10px] text-blue-400 mt-0.5">pendiente de cobro</span>
          </div>
          <div className={`flex flex-col gap-1 p-3.5 rounded-xl border ${overdueAmt > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${overdueAmt > 0 ? 'text-red-500' : 'text-slate-400'}`}>
              Vencido {!loading && overdueCount > 0 && <span className="normal-case font-normal opacity-70">· {overdueCount}</span>}
            </span>
            <span className={`text-2xl font-bold tabular-nums leading-none ${loading ? 'opacity-30 text-slate-300' : overdueAmt > 0 ? 'text-red-600' : 'text-slate-300'}`}>{loading ? '—' : fmt(overdueAmt)}</span>
          </div>
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Jobs Activos</span>
            <span className={`text-2xl font-bold tabular-nums leading-none text-slate-700 ${loading ? 'opacity-30' : ''}`}>{loading ? '—' : activeJobsCount}</span>
            <span className="text-[10px] text-slate-400">en progreso</span>
          </div>
        </div>
        <Link to="/invoices" className="flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white overflow-hidden">
          <span className="flex items-center gap-2 flex-1 justify-center py-3 text-[13px] font-bold">
            <DollarSign className="w-4 h-4" />Cobrar ahora
          </span>
          <span className="border-l border-emerald-500/60 px-4 py-3 text-[11px] text-emerald-200 hover:text-white whitespace-nowrap font-medium">Ver facturas →</span>
        </Link>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════
   REVENUE CHART
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
  const prevMonthRevenue = data.length >= 2 ? data[data.length - 2].revenue : 0;
  const trendPct = prevMonthRevenue > 0 ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : null;
  const trendUp = trendPct !== null && trendPct >= 0;
  return (
    <Card title="Ingresos — 6 Meses" icon={TrendingUp} link="/invoices" linkLabel="Ver todas" className="h-full">
      <div className="px-4 pt-3 pb-2 flex flex-col h-full gap-2">
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
      {loading ? <Empty text="Cargando alertas…" />
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
                    <button onClick={() => setDismissed(prev => new Set([...prev, a.id]))} className="opacity-0 group-hover/alert:opacity-100 transition-opacity text-slate-300 hover:text-slate-500 text-[10px] px-1 font-bold">✕</button>
                  </div>
                </div>
              );
            })
      }
    </Card>
  );
}

/* ══════════════════════════════════════════════
   RECENT WOs TABLE (nexartwo style)
   ══════════════════════════════════════════════ */
const WO_STATUS_CHIP = {
  scheduled:   { label: 'Scheduled',   cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  on_the_way:  { label: 'On My Way',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  in_progress: { label: 'In Progress', cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  completed:   { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  invoiced:    { label: 'Invoiced',    cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-50 text-red-500 border-red-200' },
};
function RecentWOsTable({ workOrders = [], loading }) {
  const rows = workOrders.slice(0, 8);
  return (
    <Card title="Recent Work Orders" icon={ClipboardList} link="/work-orders" linkLabel="Ver todas →" className="h-full">
      {loading
        ? <Empty text="Cargando…" />
        : rows.length === 0
          ? <Empty text="No hay work orders" sub="Crea el primero desde Work Orders" />
          : <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Job</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Worker</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(wo => {
                    const chip = WO_STATUS_CHIP[wo.status] ?? { label: wo.status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                    return (
                      <tr key={wo.id} className="border-b border-slate-50 hover:bg-amber-50/30 transition-colors group">
                        <td className="px-4 py-3">
                          <Link to={`/work-orders/${wo.id}`} className="font-bold text-amber-600 hover:underline">
                            #{wo.work_order_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700 truncate max-w-[140px]">{wo.client_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-slate-500 truncate max-w-[180px]">{wo.title || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${chip.cls}`}>
                            {chip.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-slate-500 truncate max-w-[120px]">{wo.assigned_worker_name || <span className="text-amber-500 italic text-[10px]">Unassigned</span>}</p>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <p className="text-slate-400 tabular-nums">{wo.scheduled_date ? format(new Date(wo.scheduled_date), 'MMM d') : '—'}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      }
    </Card>
  );
}

/* ══════════════════════════════════════════════
   ACTIVITY FEED (nexartwo unified timeline)
   ══════════════════════════════════════════════ */
function ActivityFeed({ estimates = [], invoices = [], appointments = [], loading }) {
  const items = [];
  if (!loading) {
    estimates.slice(0, 6).forEach(e => {
      const d = new Date(e.created_date || e.updated_date || '');
      if (!isNaN(d)) items.push({ id: `est-${e.id}`, type: 'estimate', icon: FileText, hex: '#f59e0b', label: `Estimate #${e.estimate_number}`, sub: e.client_name, link: `/estimate-editor?id=${e.id}`, date: d });
    });
    invoices.slice(0, 6).forEach(i => {
      const d = new Date(i.created_date || i.updated_date || '');
      if (!isNaN(d)) items.push({ id: `inv-${i.id}`, type: 'invoice', icon: ReceiptText, hex: i.status === 'paid' ? '#16a34a' : i.status === 'overdue' ? '#dc2626' : '#3b82f6', label: `Invoice #${i.invoice_number}`, sub: `${i.client_name} · $${(i.total||0).toLocaleString()}`, link: '/invoices', date: d });
    });
    appointments.slice(0, 4).forEach(a => {
      const d = new Date(a.appointment_date || a.scheduled_date || '');
      if (!isNaN(d)) items.push({ id: `appt-${a.id}`, type: 'appointment', icon: Calendar, hex: '#8b5cf6', label: a.title || 'Appointment', sub: a.customer_display_name || a.client_name, link: '/appointments', date: d });
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
          : <div className="divide-y divide-slate-50">
              {visible.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} to={item.link} className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50/30 transition-colors group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.hex + '18', color: item.hex }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-700 truncate leading-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.sub}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums">{format(item.date, 'MMM d')}</p>
                  </Link>
                );
              })}
            </div>
      }
    </Card>
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
  const [allProposals, setAllProposals] = useState([]);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
    let appts, estimates, workOrders, invoices;
    try {
      let proposals;
      [appts, estimates, workOrders, invoices, proposals] = await Promise.all([
        nexartClient.entities.Appointment.list('-created_date', 200),
        nexartClient.entities.Estimate.list('-created_date', 100),
        nexartClient.entities.WorkOrder.list('-created_date', 100),
        nexartClient.entities.Invoice.list('-created_date', 100),
        nexartClient.entities.Proposal.list('-created_date', 100),
      ]);
      setAllProposals(proposals || []);
    } catch (err) {
      const isBase44Auth = sessionStorage.getItem('nexartpro_authenticated') === 'true';
      if (!isBase44Auth && sessionStorage.getItem('local_auth') === 'true') { setLoading(false); return; }
      throw err;
    }
    const todayAppts = appts.filter(a => (a.appointment_date || a.scheduled_date) === today);
    const active = workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status));
    const completedMonth = workOrders.filter(w => w.status === 'completed' && (w.updated_date || '').slice(0,10) >= startOfMonth);
    const sent = estimates.filter(e => ['sent', 'viewed', 'changes_requested'].includes(e.status));
    const approved = estimates.filter(e => ['approved', 'signed'].includes(e.status));
    const approvalRate = (sent.length + approved.length) > 0 ? Math.round((approved.length / (sent.length + approved.length)) * 100) : 0;
    const monthRevenue = invoices.filter(i => i.status === 'paid' && (i.paid_at || i.updated_date || '').slice(0, 10) >= startOfMonth).reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Math.max((i.total || 0) - (i.amount_paid || 0), 0), 0);
    const overdueCount = invoices.filter(i => i.status === 'overdue').length;
    const leads = await nexartClient.entities.Lead.list('-created_date', 100).catch(() => []);
    setTodayAppointments(todayAppts);
    setActiveWorkOrders(active.slice(0, 10));
    setAllWorkOrders(workOrders);
    setRecentEstimates(estimates.slice(0, 10));
    setAllEstimates(estimates);
    setAllInvoices(invoices);
    setKpis({ activeJobs: active.length, completedMonth: completedMonth.length, estimatesSent: sent.length, approvalRate, monthRevenue, outstanding, todayAppts: todayAppts.length, totalWO: workOrders.length, overdueCount, leads: leads.length });
    setLoading(false);
  };

  const fmt$ = v => `$${(v||0).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* CLOCK */}
      <DigitalClock />

      {/* TOPBAR */}
      <div className="dash-topbar sticky top-0 z-50 px-4 py-2 shadow-sm">
        <div className="dash-topbar-inner max-w-screen-2xl mx-auto flex items-center gap-3">
          <div className="dash-topbar-brand border-r border-slate-200 pr-3 flex-shrink-0">
            <h1 className="text-[13px] font-bold text-slate-800 leading-none">RC Art Contractors</h1>
            <p className="text-[9px] text-slate-400 mt-0.5">Control Center · {format(new Date(), 'EEE MMM d, yyyy')}</p>
          </div>
          <div className="dash-topbar-kpis flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none py-0.5">
            <KpiChip label="Ingresos Mes"  value={fmt$(kpis.monthRevenue)}                          dot="#10b981" loading={loading} tooltip="Revenue cobrado este mes" />
            <KpiChip label="Jobs Activos"  value={kpis.activeJobs ?? 0}                             dot="#3b82f6" loading={loading} tooltip="Work orders en progreso" />
            <KpiChip label="Por Cobrar"    value={fmt$(kpis.outstanding)}                           dot="#ef4444" loading={loading} tooltip="Facturas pendientes" />
            <KpiChip label="Citas Hoy"     value={kpis.todayAppts ?? 0}                             dot="#f59e0b" loading={loading} tooltip="Appointments hoy" />
            <KpiChip label="Estimados"     value={kpis.estimatesSent ?? 0}                          dot="#8b5cf6" loading={loading} tooltip="Estimados enviados" />
            <KpiChip label="Aprobación"    value={`${kpis.approvalRate ?? 0}%`}                     dot="#06b6d4" loading={loading} tooltip="Tasa de aprobación" />
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

        {/* ── ROW 1: NXT STAT CARDS (nexartwo pattern) ───────────────── */}
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
            value={fmt$(kpis.outstanding)}
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
            value={fmt$(kpis.monthRevenue)}
            label="Revenue This Month"
            change="Paid invoices"
            changeType="up"
            color="orange"
            loading={loading}
          />
        </div>

        {/* ── ROW 2: Recent WOs table (2/3) + Activity feed (1/3) ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: '320px' }}>
          <div className="lg:col-span-2">
            <RecentWOsTable workOrders={allWorkOrders} loading={loading} />
          </div>
          <ActivityFeed estimates={allEstimates} invoices={allInvoices} appointments={todayAppointments} loading={loading} />
        </div>

        {/* ── ROW 3: Money Control (2/3) + Revenue Chart (1/3) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: '300px' }}>
          <div className="lg:col-span-2">
            <MoneyControl monthRevenue={kpis.monthRevenue||0} outstanding={kpis.outstanding||0} invoices={allInvoices} loading={loading} activeJobsCount={kpis.activeJobs||0} />
          </div>
          <RevenueChart invoices={allInvoices} loading={loading} monthRevenue={kpis.monthRevenue||0} />
        </div>

        {/* ── ROW 4: Job Pipeline + Alerts + Notifications ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" style={{ minHeight: '220px' }}>
          <JobPipeline workOrders={allWorkOrders} loading={loading} />
          <AlertsPanel estimates={allEstimates} invoices={allInvoices} workOrders={allWorkOrders} loading={loading} />
          <Card title="Notificaciones" icon={Bell} className="h-full">
            <NotificationsPanel />
          </Card>
        </div>

      </div>
    </div>
  );
}
