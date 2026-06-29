import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast }    from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '@/lib/AuthContext';
import ArchiveReasonModal from '@/components/shared/ArchiveReasonModal';
import { archiveWithSnapshot, archiveManyWithSnapshot, filterActiveRecords } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import {
  ClipboardList, Plus, Layers, Search, TrendingUp, Zap,
  Hammer, AlertCircle, CheckCircle2, ArrowUpRight, Receipt,
  ShieldCheck, LayoutList, Kanban, Pencil, MapPin, User,
  MoreVertical, ChevronRight,
} from 'lucide-react';

/* ── Status config (matches V3 + MAIN DB) ─────────────────────────── */
const WO_STATUSES = [
  { id: 'draft',       label: 'Draft',       dot: '#b8a97a', bg: '#faf8f2', desc: 'Building scope' },
  { id: 'assigned',    label: 'Assigned',    dot: '#1f4862', bg: '#f0f5f9', desc: 'Crew assigned' },
  { id: 'in-progress', label: 'In Progress', dot: '#df6b2a', bg: '#fff8f4', desc: 'On site' },
  { id: 'inspection',  label: 'Inspection',  dot: '#6c52b7', bg: '#f8f5ff', desc: 'Awaiting sign-off' },
  { id: 'completed',   label: 'Completed',   dot: '#2c7a26', bg: '#f2faf2', desc: 'Ready to invoice' },
];

const STATUS_MAP = Object.fromEntries(WO_STATUSES.map(s => [s.id, s]));

/* ── Priority badge ───────────────────────────────────────────────── */
const PRIORITY_BADGE = {
  high:      { label: 'HIGH',      cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  urgent:    { label: 'URGENT',    cls: 'bg-red-100 text-red-600 border-red-300' },
  emergency: { label: 'URGENT',    cls: 'bg-red-100 text-red-600 border-red-300' },
  low:       { label: 'LOW',       cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  normal:    null,
};

/* ── Initials from name ───────────────────────────────────────────── */
function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
}

/* ── Avatar color from name (deterministic) ──────────────────────── */
const AV_COLORS = ['#d97706','#2563eb','#059669','#7c3aed','#db2777','#0891b2'];
function avColor(name = '') { return AV_COLORS[name.charCodeAt(0) % AV_COLORS.length]; }

/* ── Format currency ─────────────────────────────────────────────── */
function fmt$(n) {
  if (!n && n !== 0) return '—';
  return '$' + Math.round(n).toLocaleString();
}

/* ══════════════════════════════════════════════════════════════════
   WO KANBAN CARD
   ══════════════════════════════════════════════════════════════════ */
function WOCard({ wo, onClick, onEdit }) {
  const pb      = PRIORITY_BADGE[wo.priority?.toLowerCase()] || null;
  const pct     = Math.min(100, Math.max(0, Number(wo.progress_percentage) || 0));
  const isOver  = wo.actual_cost && wo.total && wo.actual_cost > wo.total;
  const status  = STATUS_MAP[wo.status] || WO_STATUSES[0];
  const crew    = wo.assigned_to ? [wo.assigned_to] : [];

  return (
    <div
      onClick={() => onClick(wo.id)}
      className="group relative rounded-xl border bg-white cursor-pointer mb-2.5 overflow-hidden transition-all duration-150"
      style={{ borderColor: '#e8e3d8', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = '#d4c99a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#e8e3d8'; e.currentTarget.style.transform = ''; }}
    >
      {/* Left priority stripe */}
      {pb && <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: wo.priority === 'high' ? '#d97706' : '#ef4444' }} />}

      <div className="px-4 pt-3 pb-3" style={{ paddingLeft: pb ? '18px' : '16px' }}>
        {/* Top row: WO# + priority badge */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">
            WO#{wo.work_order_number || wo.id?.slice(0,8)}
          </span>
          <div className="flex items-center gap-1">
            {pb && (
              <span className={`text-[9px] font-bold px-1.5 py-[2px] rounded border leading-none ${pb.cls}`}>
                {pb.label}
              </span>
            )}
            <button
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 text-slate-400 transition-opacity"
              onClick={e => { e.stopPropagation(); onEdit(wo); }}
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2 mb-1">
          {wo.title || wo.client_name}
        </div>

        {/* Client / project */}
        <div className="text-[11px] text-slate-400 mb-2.5 flex items-center gap-1 truncate">
          <ClipboardList className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{wo.client_name || 'No client'}</span>
        </div>

        {/* Progress bar */}
        {wo.status !== 'draft' && wo.status !== 'cancelled' && (
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex-1 h-[5px] rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: pct + '%',
                  background: pct === 100 ? '#2c7a26' : pct > 60 ? '#d97706' : '#df6b2a',
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500 font-mono w-7 text-right">{pct}%</span>
          </div>
        )}

        {/* Footer: budget + crew */}
        <div className="flex items-center justify-between">
          <span className={`text-[13px] font-bold font-mono ${isOver ? 'text-red-600' : 'text-slate-800'}`}>
            {fmt$(wo.total || wo.total_amount)}
          </span>
          {/* Crew avatars */}
          <div className="flex items-center -space-x-1.5">
            {crew.slice(0, 3).map((name, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-[1.5px] border-white flex-shrink-0"
                style={{ background: avColor(name), zIndex: 10 - i }}
                title={name}
              >
                {initials(name)}
              </div>
            ))}
            {crew.length > 3 && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-[1.5px] border-white bg-slate-400">
                +{crew.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KPI CARD
   ══════════════════════════════════════════════════════════════════ */
function KpiCard({ label, value, sub, trend, icon: Icon, variant = 'white' }) {
  const vars = {
    ink:   { bg: '#0d1a2e', fg: '#f5f0e8', sub: '#a89a7a', trend: '#c9b67c', border: '#1e2e45' },
    burnt: { bg: '#f5f0dc', fg: '#1a1208', sub: '#7a6a40', trend: '#8a6a20', border: '#e8d9aa' },
    white: { bg: '#ffffff', fg: '#1a1810', sub: '#7a7060', trend: '#2c7a26', border: '#e8e3d8' },
  };
  const c = vars[variant] || vars.white;
  return (
    <div className="rounded-2xl px-5 py-4 flex flex-col gap-1 flex-1 min-w-0" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-center gap-1.5 mb-0.5" style={{ color: c.sub }}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[26px] font-black tabular-nums leading-none" style={{ color: c.fg, fontFamily: "'Fraunces', serif" }}>
        {value}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[11px]" style={{ color: c.sub }}>{sub}</span>
        {trend && (
          <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: c.trend }}>
            <ArrowUpRight className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function WorkOrders() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const actor     = user?.email || user?.id || 'unknown';

  const [workOrders,       setWorkOrders]       = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState('');
  const [view,             setView]             = useState('board');
  const [editing,          setEditing]          = useState(null);
  const [showForm,         setShowForm]         = useState(false);
  const [form,             setForm]             = useState({});
  const [selectedIds,      setSelectedIds]      = useState(new Set());
  const [archiveModal,     setArchiveModal]     = useState({ open: false, id: null, label: '' });
  const [archiveBulkModal, setArchiveBulkModal] = useState(false);

  /* ── load ─────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await nexartClient.entities.WorkOrder.list('-created_date');
    setWorkOrders(filterActiveRecords(data));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── edit ─────────────────────────────────────────────────────── */
  const openEdit = (wo) => { setEditing(wo); setForm({ ...wo }); setShowForm(true); };

  const handleSave = async () => {
    if (editing?.id) {
      await nexartClient.entities.WorkOrder.update(editing.id, form);
      toast.success('Work order updated');
    } else {
      await nexartClient.entities.WorkOrder.create({ ...form, status: form.status || 'draft' });
      toast.success('Work order created');
    }
    setShowForm(false);
    loadData();
  };

  /* ── archive ──────────────────────────────────────────────────── */
  const handleDelete = (wo) => setArchiveModal({ open: true, id: wo.id, label: `WO#${wo.work_order_number}` });

  const handleConfirmArchive = async (reason) => {
    const { id } = archiveModal;
    setArchiveModal({ open: false, id: null, label: '' });
    await archiveWithSnapshot(nexartClient.entities.WorkOrder, 'WorkOrder', id, actor, reason);
    toast.success('Work order archived');
    loadData();
  };

  const handleConfirmBulkArchive = async (reason) => {
    setArchiveBulkModal(false);
    const ids = Array.from(selectedIds);
    await archiveManyWithSnapshot(nexartClient.entities.WorkOrder, 'WorkOrder', ids, actor, reason);
    setWorkOrders(prev => prev.filter(w => !selectedIds.has(w.id)));
    setSelectedIds(new Set());
    toast.success(`${ids.length} work order${ids.length === 1 ? '' : 's'} archived`);
  };

  /* ── select ───────────────────────────────────────────────────── */
  const toggleSelect = (id) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  /* ── filter ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => workOrders.filter(w => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (w.client_name || '').toLowerCase().includes(q)
        || String(w.work_order_number || '').includes(q)
        || (w.title || '').toLowerCase().includes(q);
  }), [workOrders, search]);

  /* ── group by status for kanban ───────────────────────────────── */
  const byStatus = useMemo(() => {
    const g = Object.fromEntries(WO_STATUSES.map(s => [s.id, []]));
    for (const wo of filtered) {
      const key = wo.status?.toLowerCase()?.replace('_', '-') || 'draft';
      if (g[key]) g[key].push(wo);
      else g['draft'].push(wo);
    }
    return g;
  }, [filtered]);

  /* ── KPIs ─────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const active = workOrders.filter(w => w.status !== 'cancelled');
    const today  = new Date().toISOString().slice(0, 10);
    return {
      budget:    active.reduce((a, w) => a + (Number(w.total) || Number(w.total_amount) || 0), 0),
      posted:    active.reduce((a, w) => a + (Number(w.actual_cost) || 0), 0),
      count:     active.length,
      inProg:    workOrders.filter(w => w.status === 'in-progress').length,
      overdue:   workOrders.filter(w => w.status === 'in-progress' && w.scheduled_date && w.scheduled_date < today).length,
      completed: workOrders.filter(w => w.status === 'completed').length,
    };
  }, [workOrders]);

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: '#f9f7f2' }}>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="px-7 pt-8 pb-5 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 mb-1">Execution</div>
            <h1 className="text-[38px] font-black text-slate-900 leading-none mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Work Orders
            </h1>
            <p className="text-[13px] text-slate-500 max-w-lg leading-relaxed">
              Every job in flight — generated from signed estimates or stood up directly.
              Each Work Order tracks scope, crew, time, materials, P&amp;L, and Oregon CCB compliance.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-xl border border-slate-300 hover:bg-white hover:shadow-sm text-slate-700 transition-all"
              onClick={() => navigate('/price-book')}
            >
              <Layers className="w-3.5 h-3.5" /> Service Library
            </button>
            <button
              className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 shadow"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              onClick={() => openEdit({ id: null, work_order_number: 'New', title: '', client_name: '', status: 'draft' })}
            >
              <Plus className="w-3.5 h-3.5" /> New Work Order
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────── */}
      <div className="px-7 mb-6 max-w-[1600px] mx-auto">
        <div className="flex gap-3">
          <KpiCard label="Active Budget"    value={fmt$(kpis.budget)}    sub={`Across ${kpis.count} WOs`}     trend="+14%"    icon={TrendingUp}    variant="ink" />
          <KpiCard label="Posted to Date"   value={fmt$(kpis.posted)}    sub="Labor + materials posted"        trend="+8%"     icon={Zap}           variant="burnt" />
          <KpiCard label="In Progress"      value={kpis.inProg}          sub="Crews on site"                   trend="Healthy" icon={Hammer}        variant="white" />
          <KpiCard label="Behind Schedule"  value={kpis.overdue}         sub={kpis.overdue > 0 ? 'Need attention' : 'All on track'} trend={kpis.overdue > 0 ? '!' : '✓'} icon={AlertCircle} variant="white" />
          <KpiCard label="Ready to Invoice" value={kpis.completed}       sub="Completed WOs"                   icon={CheckCircle2} variant="white" />
        </div>
      </div>

      {/* ── BOARD/LIST TOGGLE ─────────────────────────────────── */}
      <div className="px-7 mb-5 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border px-5 py-3" style={{ borderColor: '#e8e3d8' }}>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold text-slate-800">{view === 'board' ? 'Board' : 'List'}</h3>
            <span className="text-[11px] text-slate-400 font-medium">{filtered.length} work orders</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-[12px] border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-400 w-48"
                style={{ borderColor: '#e8e3d8' }}
              />
            </div>
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#e8e3d8' }}>
              <button
                onClick={() => setView('board')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors"
                style={{ background: view === 'board' ? '#0d1a2e' : '#fff', color: view === 'board' ? '#fff' : '#7a7060' }}
              >
                <Kanban className="w-3.5 h-3.5" /> Board
              </button>
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors"
                style={{ background: view === 'list' ? '#0d1a2e' : '#fff', color: view === 'list' ? '#fff' : '#7a7060' }}
              >
                <LayoutList className="w-3.5 h-3.5" /> List
              </button>
            </div>
            {/* CCB badge */}
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-amber-400">
              <ShieldCheck className="w-3 h-3" /> CCB #247277 Oregon
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────── */}
      <div className="px-7 pb-10 max-w-[1600px] mx-auto">

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
            <span className="text-[12px] font-bold text-amber-700">{selectedIds.size} selected</span>
            <button
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              onClick={() => setArchiveBulkModal(true)}
            >
              Archive selected
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <ClipboardList className="w-6 h-6 animate-pulse mr-2" /> Loading work orders…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-6 h-6 text-amber-500" />
            </div>
            <p className="font-semibold text-slate-600 mb-1">No work orders{search ? ' matching "' + search + '"' : ''}</p>
            <p className="text-sm text-slate-400">Convert an approved estimate or create one manually</p>
          </div>

        ) : view === 'board' ? (
          /* ── KANBAN BOARD ─────────────────────────────────── */
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minWidth: 0 }}>
            {WO_STATUSES.map(stage => {
              const cards = byStatus[stage.id] || [];
              return (
                <div key={stage.id} className="flex-shrink-0 w-[240px]">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.dot }} />
                    <span className="text-[12px] font-bold text-slate-700">{stage.label}</span>
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white border text-slate-500" style={{ borderColor: '#e8e3d8' }}>
                      {cards.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className="min-h-[80px]">
                    {cards.length === 0 ? (
                      <div className="text-[11px] text-slate-300 text-center py-5 px-2 italic">{stage.desc}</div>
                    ) : (
                      cards.map(wo => (
                        <WOCard
                          key={wo.id}
                          wo={wo}
                          onClick={id => navigate(`/work-orders/${id}`)}
                          onEdit={openEdit}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          /* ── LIST VIEW ────────────────────────────────────── */
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e3d8' }}>
            {/* List header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: '#f0ebe0', background: '#faf8f2' }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={() => {
                    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filtered.map(w => w.id)));
                  }}
                  className="w-4 h-4"
                />
                <span className="text-[11px] font-semibold text-slate-500">Select all</span>
              </label>
            </div>

            {filtered.map((wo, i) => {
              const st  = STATUS_MAP[wo.status] || WO_STATUSES[0];
              const pb  = PRIORITY_BADGE[wo.priority?.toLowerCase()] || null;
              const pct = Math.min(100, Math.max(0, Number(wo.progress_percentage) || 0));
              return (
                <div
                  key={wo.id}
                  className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-amber-50/40 transition-colors border-b last:border-0"
                  style={{ borderColor: '#f0ebe0' }}
                  onClick={() => navigate(`/work-orders/${wo.id}`)}
                >
                  <label className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(wo.id)} onChange={() => toggleSelect(wo.id)} className="w-4 h-4" />
                  </label>

                  {/* WO info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-amber-600 font-mono">WO#{wo.work_order_number}</span>
                      {pb && <span className={`text-[9px] font-bold px-1.5 py-[2px] rounded border ${pb.cls}`}>{pb.label}</span>}
                    </div>
                    <div className="text-[13px] font-semibold text-slate-800 truncate">{wo.title || wo.client_name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{wo.client_name}{wo.client_address ? ` · ${wo.client_address}` : ''}</div>
                  </div>

                  {/* Progress */}
                  <div className="w-28 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: pct + '%', background: pct === 100 ? '#2c7a26' : '#d97706' }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">{pct}%</span>
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="w-24 text-right flex-shrink-0">
                    <span className="text-[13px] font-bold text-slate-800 font-mono">{fmt$(wo.total || wo.total_amount)}</span>
                  </div>

                  {/* Status */}
                  <div className="w-28 flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: st.dot }} />
                      {st.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                      onClick={() => openEdit(wo)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ARCHIVE MODALS ───────────────────────────────────── */}
      <ArchiveReasonModal
        open={archiveModal.open}
        onCancel={() => setArchiveModal({ open: false, id: null, label: '' })}
        onConfirm={handleConfirmArchive}
        entityLabel={archiveModal.label || 'Work Order'}
      />
      <ArchiveReasonModal
        open={archiveBulkModal}
        onCancel={() => setArchiveBulkModal(false)}
        onConfirm={handleConfirmBulkArchive}
        count={selectedIds.size}
        entityLabel="Work Order"
      />

      {/* ── EDIT DIALOG ──────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? `Edit Work Order #${editing.work_order_number}` : 'New Work Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="WO description" />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Technician name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Scheduled Date</Label>
                <Input type="date" value={form.scheduled_date || ''} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.status || 'draft'}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  {WO_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex justify-between gap-2 pt-1">
              {editing?.id && (
                <button
                  className="text-[12px] font-semibold text-red-500 hover:text-red-700 transition-colors"
                  onClick={() => { setShowForm(false); handleDelete(editing); }}
                >
                  Archive WO
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
