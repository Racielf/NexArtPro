import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import {
  FileText, Plus, Pencil, Search, X, Trash2,
  TrendingUp, CheckCircle2, Target, Send,
  KanbanSquare, List, Eye, AlertCircle, Clock,
  BookOpen, LayoutTemplate, ArrowUpRight,
} from 'lucide-react';
import { getNextDocumentNumber } from '@/lib/documentNumbering';
import { archiveManyWithSnapshot, archiveWithSnapshot, filterActiveRecords } from '@/lib/softDelete';

// ─── Pipeline stages (V3 order, MAIN status values) ────────────────────────
const PIPE_STAGES = [
  { id: 'draft',     label: 'Draft',     dot: '#a89c70', desc: 'Working' },
  { id: 'sent',      label: 'Sent',      dot: '#1f4862', desc: 'Awaiting open' },
  { id: 'viewed',    label: 'Viewed',    dot: '#3d2f7a', desc: 'Open, unsigned' },
  { id: 'signed',    label: 'Signed',    dot: '#2c5a26', desc: 'Won — ready to invoice' },
  { id: 'converted', label: 'Invoiced',  dot: '#4b1f6b', desc: 'Active job' },
  { id: 'completed', label: 'Completed', dot: '#117ACA', desc: 'Job done' },
  { id: 'lost',      label: 'Lost',      dot: '#842420', desc: 'Closed / dead' },
];

const STAGE_PROGRESS = { draft: 14, sent: 28, viewed: 42, signed: 57, converted: 71, completed: 86, lost: 100 };

function daysInStage(est) {
  const stageDate =
    est.status === 'signed'    ? est.signed_at :
    est.status === 'sent'      ? est.sent_at :
    est.status === 'viewed'    ? est.sent_at :
    est.status === 'completed' ? est.completed_at :
    est.updated_date || est.created_date;
  if (!stageDate) return 0;
  return Math.floor((Date.now() - new Date(stageDate).getTime()) / 86_400_000);
}

function fmtMoney(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function clientInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Pipe card (V3 design, MAIN data) ───────────────────────────────────────
function PipeCard({ est, onView, onEdit, onDragStart, onDragEnd }) {
  const days = daysInStage(est);
  const isStale = days >= 7 && !['converted', 'lost', 'signed', 'completed'].includes(est.status);
  const pct = STAGE_PROGRESS[est.status] || 0;
  const margin = est.gross_margin_pct ? parseFloat(est.gross_margin_pct).toFixed(1) : null;
  const initials = clientInitials(est.client_name);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, est.id)}
      onDragEnd={onDragEnd}
      onClick={() => onView(est.id)}
      className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all select-none group"
      style={{ opacity: 1 }}
    >
      {/* Number + date */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-[#d97706]">#{est.estimate_number}</span>
        <span className="text-[10px] text-slate-400">
          {est.created_date ? new Date(est.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
        </span>
      </div>

      {/* Client avatar + name */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-[#1f4862] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate leading-tight">
            {est.client_name || <span className="italic text-slate-400 font-normal">No client</span>}
          </div>
          {est.title && <div className="text-[11px] text-slate-400 truncate leading-tight">{est.title}</div>}
        </div>
      </div>

      {/* Amount */}
      <div className="text-base font-black text-slate-900 tabular-nums mb-1">
        {fmtMoney(est.total)}
      </div>

      {/* Margin */}
      {margin && (
        <div className="text-[10px] text-slate-400 mb-2">
          {margin}% margin
          {est.gross_margin ? ` · ${fmtMoney(est.gross_margin)} profit` : ''}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 rounded-full mb-2 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Footer: days + actions */}
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1 text-[10px] font-medium ${isStale ? 'text-red-500' : 'text-slate-400'}`}>
          {isStale ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {days}d in stage
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={e => { e.stopPropagation(); onView(est.id); }}
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={e => { e.stopPropagation(); onEdit(est.id); }}
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, trend, accent }) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-1 ${accent ? 'bg-[#0a1226] text-white' : 'bg-white border border-slate-200'}`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${accent ? 'text-slate-400' : 'text-slate-500'}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-black tabular-nums ${accent ? 'text-[#d97706]' : 'text-slate-900'}`}>{value}</div>
      <div className="flex items-center justify-between mt-1">
        <span className={`text-xs ${accent ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</span>
        {trend && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
const getCreatedId = (created) =>
  created?.id || created?._id || created?.data?.id || created?.data?._id || null;

export default function Estimates() {
  const navigate = useNavigate();
  const [estimates, setEstimates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [view, setView]             = useState('pipeline');
  const [creating, setCreating]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, estimate: null, canDelete: false });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dragOver, setDragOver]     = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await nexartClient.entities.Estimate.list('-created_date');
      setEstimates(filterActiveRecords(data || []));
    } catch (err) {
      toast.error('Could not load estimates');
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleNewEstimate = () => setShowConfirm(true);

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setCreating(true);
    try {
      const nextNum = await getNextDocumentNumber('estimate');
      const created = await nexartClient.entities.Estimate.create({
        estimate_number: nextNum,
        document_type:   'ESTIMATE',
        status:          'draft',
        client_name:     '',
        groups:          [],
        line_items:      [],
        materials:       [],
        other_costs:     [],
        tax_rate:        0,
        subtotal:        0,
        tax_amount:      0,
        total:           0,
      });
      const newId = getCreatedId(created);
      if (!newId) {
        toast.error('Estimate created but ID was not returned. Returning to list.');
        await loadData();
        return;
      }
      navigate(`/estimate-editor?id=${newId}&new=1`);
    } catch (err) {
      toast.error(`Could not create estimate: ${err?.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  // ── Delete/archive ────────────────────────────────────────────────────────
  const canDeleteEstimate = (est) => est.status === 'draft' || !est.sent_at;

  const handleDeleteClick = (est) => {
    setDeleteModal({ open: true, estimate: est, canDelete: canDeleteEstimate(est) });
  };

  const handleConfirmDelete = async () => {
    const est = deleteModal.estimate;
    if (!est) return;
    try {
      await archiveWithSnapshot(nexartClient.entities.Estimate, 'Estimate', est.id, 'Admin', 'Archived from Estimates list');
      setEstimates(prev => prev.filter(e => e.id !== est.id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(est.id); return s; });
      toast.success(`Estimate #${est.estimate_number} archived`);
    } catch (err) {
      toast.error(err?.message || 'Could not archive estimate');
    } finally {
      setDeleteModal({ open: false, estimate: null, canDelete: false });
    }
  };

  const handleDeleteSelected = async () => {
    const idsArray = Array.from(selectedIds);
    try {
      await archiveManyWithSnapshot(nexartClient.entities.Estimate, 'Estimate', idsArray, 'Admin', 'Bulk archived from Estimates list');
      setEstimates(prev => prev.filter(e => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
      toast.success(`${idsArray.length} estimate(s) archived`);
    } catch (err) {
      toast.error(err?.message || 'Could not archive selected estimates');
    } finally {
      setDeleteModal({ open: false, estimate: null, canDelete: false });
    }
  };

  // ── Drag & drop stage change ───────────────────────────────────────────────
  const handleMoveStage = useCallback(async (id, newStage) => {
    setEstimates(prev => prev.map(e => e.id === id ? { ...e, status: newStage } : e));
    try {
      await nexartClient.entities.Estimate.update(id, { status: newStage });
      toast.success(`Moved to ${newStage}`);
    } catch (err) {
      toast.error('Could not update status');
      loadData();
    }
  }, []);

  function onDragStart(e, id) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd(e) { /* no-op */ }
  function onDragOver(e, stage) { e.preventDefault(); setDragOver(stage); }
  function onDragLeave() { setDragOver(null); }
  function onDrop(e, stage) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) handleMoveStage(id, stage);
    setDragOver(null);
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect  = (id) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(e => e.id)));

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    estimates.filter(e =>
      e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      String(e.estimate_number || '').includes(search)
    ), [estimates, search]);

  const byStage = useMemo(() => {
    const groups = {};
    for (const s of PIPE_STAGES) groups[s.id] = [];
    for (const e of filtered) {
      const key = e.status === 'expired' ? 'lost' : (e.status || 'draft');
      if (groups[key]) groups[key].push(e);
      else groups['draft'].push(e);
    }
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    const pipelineValue = estimates.filter(e => ['draft','sent','viewed'].includes(e.status)).reduce((a,b) => a + (b.total || 0), 0);
    const wonValue      = estimates.filter(e => ['signed','converted','completed'].includes(e.status)).reduce((a,b) => a + (b.total || 0), 0);
    const sentCount     = estimates.filter(e => ['sent','viewed'].includes(e.status)).length;
    const staleCount    = estimates.filter(e => daysInStage(e) >= 7 && ['sent','viewed'].includes(e.status)).length;
    const signedCount   = estimates.filter(e => ['signed','converted','completed'].includes(e.status)).length;
    const totalSent     = estimates.filter(e => e.status !== 'draft').length;
    const winRate       = totalSent ? Math.round(signedCount / totalSent * 100) : 0;
    return { pipelineValue, wonValue, winRate, sentCount, staleCount };
  }, [estimates]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-[#f5f5f0]">

      {/* ── Modals ── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Archive {deleteModal.estimate ? 'Estimate' : 'Estimates'}?
            </h2>
            {deleteModal.estimate ? (
              deleteModal.canDelete ? (
                <>
                  <p className="text-sm text-slate-500 mb-4">Archive Estimate #{deleteModal.estimate.estimate_number}? It will remain recoverable in Recovery Center.</p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, estimate: null, canDelete: false })}>Cancel</Button>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleConfirmDelete}>Archive</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-4">This estimate cannot be archived — it has already been sent or is part of a live flow.</p>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, estimate: null, canDelete: false })}>Close</Button>
                  </div>
                </>
              )
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">{selectedIds.size} estimate(s) will be archived and remain recoverable.</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, estimate: null, canDelete: false })}>Cancel</Button>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteSelected}>Archive</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">New Estimate</h2>
              <button onClick={() => setShowConfirm(false)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">You're about to create a new estimate. You can cancel at any time without saving.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmCreate} disabled={creating} className="bg-[#d97706] hover:bg-[#b45309] text-white">
                {creating ? 'Creating…' : 'Create Estimate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Workspace</p>
            <h1 className="text-2xl font-black text-slate-900">Estimates</h1>
            <p className="text-sm text-slate-500 mt-1">
              Build pro estimates from your Price Book, send them, and watch them progress through the pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 text-slate-600" onClick={() => navigate('/price-book')}>
              <BookOpen className="w-3.5 h-3.5" /> Price Book
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white"
              onClick={handleNewEstimate}
              disabled={creating}
            >
              <Plus className="w-3.5 h-3.5" />
              {creating ? 'Creating…' : 'New Estimate'}
            </Button>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard
            icon={TrendingUp}
            label="Pipeline value"
            value={fmtMoney(stats.pipelineValue)}
            sub="Active estimates"
            trend="+18%"
            accent
          />
          <KpiCard
            icon={CheckCircle2}
            label="Won this month"
            value={fmtMoney(stats.wonValue)}
            sub="Signed + invoiced"
            trend="+22%"
          />
          <KpiCard
            icon={Target}
            label="Win rate"
            value={`${stats.winRate}%`}
            sub="Last 90 days"
            trend="+6pts"
          />
          <KpiCard
            icon={Send}
            label="Awaiting client"
            value={String(stats.sentCount)}
            sub={stats.staleCount > 0 ? `${stats.staleCount} stale` : 'Sent or viewed'}
          />
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 mb-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search estimates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex-1" />
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">{selectedIds.size} selected</span>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setDeleteModal({ open: true, estimate: null, canDelete: true })}>
                <Trash2 className="w-3.5 h-3.5" /> Archive
              </Button>
            </div>
          )}
          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'pipeline' ? 'bg-[#0a1226] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <KanbanSquare className="w-3.5 h-3.5" /> Pipeline
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'list' ? 'bg-[#0a1226] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#d97706] rounded-full animate-spin" />
        </div>
      ) : view === 'pipeline' ? (

        /* ── KANBAN PIPELINE ── */
        <div className="flex-1 overflow-x-auto px-6 py-4">
          <div className="flex gap-3 min-w-max pb-4">
            {PIPE_STAGES.map(stage => {
              const cards = byStage[stage.id] || [];
              const stageTotal = cards.reduce((a, b) => a + (b.total || 0), 0);
              const isOver = dragOver === stage.id;
              return (
                <div
                  key={stage.id}
                  className={`w-64 flex flex-col rounded-2xl border transition-all ${isOver ? 'border-[#d97706] bg-amber-50' : 'border-slate-200 bg-[#f5f5f0]'}`}
                  onDragOver={e => onDragOver(e, stage.id)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, stage.id)}
                >
                  {/* Column header */}
                  <div className="px-3 pt-3 pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.dot }} />
                    <span className="text-xs font-bold text-slate-700 flex-1">{stage.label}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-full px-1.5 py-0.5">{cards.length}</span>
                    {stageTotal > 0 && (
                      <span className="text-[10px] font-bold text-slate-500">{fmtMoney(stageTotal)}</span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 px-2 pb-3 space-y-2 min-h-[80px]">
                    {cards.map(est => (
                      <PipeCard
                        key={est.id}
                        est={est}
                        onView={id => navigate(`/estimate-editor?id=${id}`)}
                        onEdit={id => navigate(`/estimate-editor?id=${id}`)}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                    {cards.length === 0 && (
                      <div className="text-center py-6 text-[11px] text-slate-400">
                        Drop estimates here to mark {stage.label.toLowerCase()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      ) : (

        /* ── LIST VIEW ── */
        <div className="px-6 py-4">
          {/* Select all */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-500">Select all</span>
              </label>
              <span className="text-xs text-slate-400">({filtered.length} estimates)</span>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">No estimates</p>
              <p className="text-sm text-slate-400 mb-4">
                {search ? 'No results for your search.' : 'Create your first estimate to get started.'}
              </p>
              {!search && (
                <Button size="sm" onClick={handleNewEstimate} disabled={creating} className="bg-[#d97706] hover:bg-[#b45309] text-white">
                  <Plus className="w-4 h-4 mr-1.5" />{creating ? 'Creating…' : 'New Estimate'}
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="w-4 h-4 cursor-pointer" /></th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Estimate</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Client / Project</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Days</th>
                    <th className="w-24 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(est => (
                    <tr
                      key={est.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/estimate-editor?id=${est.id}`)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(est.id)} onChange={() => toggleSelect(est.id)} className="w-4 h-4 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#d97706] text-xs">#{est.estimate_number}</div>
                        {est.created_date && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(est.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#1f4862] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                            {clientInitials(est.client_name)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{est.client_name || <span className="italic text-slate-400 font-normal">No client</span>}</div>
                            {est.title && <div className="text-xs text-slate-400">{est.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-black text-slate-900 tabular-nums">{fmtMoney(est.total)}</div>
                        {est.gross_margin_pct > 0 && (
                          <div className="text-[10px] text-slate-400">{parseFloat(est.gross_margin_pct).toFixed(1)}% margin</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={est.status} />
                        {est.signed_at && (
                          <span className="ml-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5">SIGNED</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${daysInStage(est) >= 7 && ['sent','viewed'].includes(est.status) ? 'text-red-500' : 'text-slate-400'}`}>
                          {daysInStage(est)}d
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            onClick={() => navigate(`/estimate-editor?id=${est.id}`)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            onClick={() => handleDeleteClick(est)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
