import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { nexartClient } from '@/api/nexartClient';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import {
  FileText, Plus, Pencil, Search, X, Trash2,
  TrendingUp, CheckCircle2, Target, Send,
  KanbanSquare, List, Eye, AlertCircle, Clock,
  BookOpen, LayoutTemplate, ArrowUpRight, Filter,
} from 'lucide-react';
import { getNextDocumentNumber } from '@/lib/documentNumbering';
import { archiveManyWithSnapshot, archiveWithSnapshot, filterActiveRecords } from '@/lib/softDelete';

// ─── V3 Color constants ─────────────────────────────────────────────────────
const C = {
  ink900:    '#0a1226',
  ink800:    '#14223f',
  ink700:    '#1c2c4c',
  ink600:    '#2b3d61',
  ink500:    '#4a5a7a',
  ink400:    '#768aab',
  cream50:   '#fbf5e6',
  cream100:  '#f6ecce',
  cream150:  '#efe1b1',
  cream300:  '#d8bb69',
  burnt400:  '#cc9a34',
  burnt500:  '#b07f1d',
  burnt600:  '#8a6213',
  burnt700:  '#6a4a0d',
  orange500: '#df6b2a',
  orange600: '#c1531a',
  borderSoft: '#ecdfbe',
  borderWarm: '#e0d2a4',
};

const SHADOW_CARD = '0 1px 2px rgba(10,18,38,.06), 0 1px 3px rgba(10,18,38,.04)';
const SHADOW_LIFT = '0 6px 16px rgba(10,18,38,.08), 0 2px 4px rgba(10,18,38,.05)';

// ─── Pipeline stages ────────────────────────────────────────────────────────
const PIPE_STAGES = [
  { id: 'draft',     label: 'Draft',     dot: '#a89c70' },
  { id: 'sent',      label: 'Sent',      dot: '#1f4862' },
  { id: 'viewed',    label: 'Viewed',    dot: '#3d2f7a' },
  { id: 'signed',    label: 'Signed',    dot: '#2c5a26' },
  { id: 'converted', label: 'Invoiced',  dot: '#4b1f6b' },
  { id: 'completed', label: 'Completed', dot: '#117ACA' },
  { id: 'lost',      label: 'Lost',      dot: '#842420' },
];

const STAGE_ORDER = ['draft','sent','viewed','signed','converted','completed'];

function stageProgress(status) {
  const i = STAGE_ORDER.indexOf(status);
  return i < 0 ? 0 : (i + 1) / STAGE_ORDER.length * 100;
}

function daysInStage(est) {
  const d =
    est.status === 'signed'    ? est.signed_at :
    est.status === 'sent'      ? est.sent_at :
    est.status === 'viewed'    ? est.sent_at :
    est.status === 'completed' ? est.completed_at :
    est.updated_date || est.created_date;
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

function fmtMoney(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function clientInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── PipeCard — exact V3 visual ─────────────────────────────────────────────
function PipeCard({ est, onView, onEdit, onDragStart, onDragEnd }) {
  const days = daysInStage(est);
  const isOld = days >= 7 && !['converted','lost','signed','completed'].includes(est.status);
  const pct = stageProgress(est.status);
  const margin = est.gross_margin_pct ? parseFloat(est.gross_margin_pct) : 0;
  const profit = est.gross_margin ? parseFloat(est.gross_margin) : 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, est.id)}
      onDragEnd={onDragEnd}
      onClick={() => onView(est.id)}
      style={{
        background: '#fff',
        border: `1px solid ${C.borderSoft}`,
        borderRadius: 12,
        padding: 12,
        boxShadow: SHADOW_CARD,
        cursor: 'pointer',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = SHADOW_LIFT; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = SHADOW_CARD; }}
    >
      {/* Number + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace', fontSize: 11, color: C.ink500, fontWeight: 600 }}>
        <span style={{ color: C.burnt400 }}>#{est.estimate_number}</span>
        <span>{est.created_date ? new Date(est.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
      </div>

      {/* Avatar + client name — V3: rounded-square cream bg */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: C.cream100, color: C.burnt600,
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: '11.5px',
          border: `1px solid ${C.cream300}`, flexShrink: 0,
        }}>
          {clientInitials(est.client_name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.15, color: C.ink900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {est.client_name || <span style={{ fontStyle: 'italic', color: C.ink400, fontWeight: 400 }}>No client</span>}
          </div>
          {est.title && (
            <div style={{ fontSize: '11.5px', color: C.ink500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {est.title}
            </div>
          )}
        </div>
      </div>

      {/* Amount — Fraunces display font, V3 22px 800 */}
      <div style={{ fontFamily: '"Fraunces", serif', fontWeight: 800, fontSize: 22, letterSpacing: '-0.01em', marginTop: 10, lineHeight: 1, color: C.ink900, fontVariantNumeric: 'tabular-nums' }}>
        {fmtMoney(est.total)}
      </div>

      {/* Margin */}
      {margin > 0 && (
        <div style={{ fontSize: 11, color: C.ink500, marginTop: 3 }}>
          {margin.toFixed(1)}% margin{profit > 0 && <> · {fmtMoney(profit)} profit</>}
        </div>
      )}

      {/* Progress bar — V3: gradient burnt→orange */}
      <div style={{ height: 4, background: C.cream100, borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: `linear-gradient(90deg, ${C.burnt400}, ${C.orange500})` }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.borderSoft}`, fontSize: 11, color: C.ink500 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: isOld ? C.orange600 : C.ink500 }}>
          {isOld ? <AlertCircle style={{ width: 12, height: 12 }} /> : <Clock style={{ width: 12, height: 12 }} />}
          {days}d in stage
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button style={{ padding: '3px 5px', borderRadius: 6, border: 'none', background: 'transparent', color: C.ink500, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onView(est.id); }}>
            <Eye style={{ width: 13, height: 13 }} />
          </button>
          <button style={{ padding: '3px 5px', borderRadius: 6, border: 'none', background: 'transparent', color: C.ink500, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onEdit(est.id); }}>
            <Pencil style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI card — exact V3 visual ─────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, trend, variant }) {
  const isInk   = variant === 'ink';
  const isBurnt = variant === 'burnt';

  return (
    <div style={{
      background: isInk ? C.ink900 : isBurnt ? `linear-gradient(135deg, ${C.cream100}, ${C.cream150})` : '#fff',
      border: `1px solid ${isInk ? C.ink900 : isBurnt ? C.cream300 : C.borderSoft}`,
      borderRadius: 14,
      padding: '16px 18px',
      boxShadow: SHADOW_CARD,
    }}>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: isInk ? '#93a4c4' : C.ink500, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon style={{ width: 13, height: 13 }} />
        {label}
      </div>
      <div style={{ fontFamily: '"Fraunces", serif', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1, color: isInk ? '#fff' : C.ink900, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: isInk ? '#93a4c4' : C.ink500 }}>
        <span>{sub}</span>
        {trend && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, background: isInk ? 'rgba(255,255,255,0.06)' : 'rgba(44,90,38,.10)', color: isInk ? '#f5d989' : '#2c5a26', fontWeight: 700, fontSize: 11 }}>
            <ArrowUpRight style={{ width: 11, height: 11 }} />{trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
const getCreatedId = (c) => c?.id || c?._id || c?.data?.id || c?.data?._id || null;

export default function Estimates() {
  const navigate = useNavigate();
  const [estimates, setEstimates]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [view, setView]               = useState('pipeline');
  const [creating, setCreating]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, estimate: null, canDelete: false });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dragOver, setDragOver]       = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await nexartClient.entities.Estimate.list('-created_date');
      setEstimates(filterActiveRecords(data || []));
    } catch {
      toast.error('Could not load estimates');
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEstimate = () => setShowConfirm(true);

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setCreating(true);
    try {
      const nextNum = await getNextDocumentNumber('estimate');
      const created = await nexartClient.entities.Estimate.create({
        estimate_number: nextNum, document_type: 'ESTIMATE', status: 'draft',
        client_name: '', groups: [], line_items: [], materials: [], other_costs: [],
        tax_rate: 0, subtotal: 0, tax_amount: 0, total: 0,
      });
      const newId = getCreatedId(created);
      if (!newId) { toast.error('Created but no ID returned.'); await loadData(); return; }
      navigate(`/estimate-editor?id=${newId}&new=1`);
    } catch (err) {
      toast.error(`Could not create: ${err?.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const canDeleteEstimate = (est) => est.status === 'draft' || !est.sent_at;
  const handleDeleteClick = (est) => setDeleteModal({ open: true, estimate: est, canDelete: canDeleteEstimate(est) });
  const closeDeleteModal  = () => setDeleteModal({ open: false, estimate: null, canDelete: false });

  const handleConfirmDelete = async () => {
    const est = deleteModal.estimate;
    if (!est) return;
    try {
      await archiveWithSnapshot(nexartClient.entities.Estimate, 'Estimate', est.id, 'Admin', 'Archived from Estimates list');
      setEstimates(prev => prev.filter(e => e.id !== est.id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(est.id); return s; });
      toast.success(`Estimate #${est.estimate_number} archived`);
    } catch (err) { toast.error(err?.message || 'Could not archive'); }
    finally { closeDeleteModal(); }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    try {
      await archiveManyWithSnapshot(nexartClient.entities.Estimate, 'Estimate', ids, 'Admin', 'Bulk archived');
      setEstimates(prev => prev.filter(e => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} estimate(s) archived`);
    } catch (err) { toast.error(err?.message || 'Could not archive'); }
    finally { closeDeleteModal(); }
  };

  const handleMoveStage = useCallback(async (id, newStage) => {
    setEstimates(prev => prev.map(e => e.id === id ? { ...e, status: newStage } : e));
    try {
      await nexartClient.entities.Estimate.update(id, { status: newStage });
      toast.success(`Moved to ${newStage}`);
    } catch { toast.error('Could not update status'); loadData(); }
  }, []);

  function onDragStart(e, id) { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }
  function onDragEnd() {}
  function onDragOver(e, stage) { e.preventDefault(); setDragOver(stage); }
  function onDragLeave() { setDragOver(null); }
  function onDrop(e, stage) { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) handleMoveStage(id, stage); setDragOver(null); }

  const toggleSelect    = (id) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(e => e.id)));

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
      (groups[key] = groups[key] || []).push(e);
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

  // ── Modal helper ──────────────────────────────────────────────────────────
  const ModalBtn = ({ children, onClick, danger, primary, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 16px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
        border: danger ? 'none' : primary ? 'none' : `1px solid ${C.borderSoft}`,
        background: danger ? '#dc2626' : primary ? C.burnt500 : '#fff',
        color: danger ? '#fff' : primary ? C.cream50 : C.ink700,
        opacity: disabled ? 0.7 : 1,
      }}
    >{children}</button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: C.cream50 }}>

      {/* Modals */}
      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,18,38,.45)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 45px -10px rgba(10,18,38,.22)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink900, marginBottom: 8 }}>Archive {deleteModal.estimate ? 'Estimate' : 'Estimates'}?</h2>
            {deleteModal.estimate ? (
              deleteModal.canDelete ? (
                <>
                  <p style={{ fontSize: 13, color: C.ink500, marginBottom: 20 }}>Archive Estimate #{deleteModal.estimate.estimate_number}? Stays recoverable in Recovery Center.</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <ModalBtn onClick={closeDeleteModal}>Cancel</ModalBtn>
                    <ModalBtn onClick={handleConfirmDelete} danger>Archive</ModalBtn>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: C.ink500, marginBottom: 20 }}>This estimate cannot be archived — it has already been sent.</p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><ModalBtn onClick={closeDeleteModal}>Close</ModalBtn></div>
                </>
              )
            ) : (
              <>
                <p style={{ fontSize: 13, color: C.ink500, marginBottom: 20 }}>{selectedIds.size} estimate(s) will be archived and remain recoverable.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <ModalBtn onClick={closeDeleteModal}>Cancel</ModalBtn>
                  <ModalBtn onClick={handleDeleteSelected} danger>Archive</ModalBtn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,18,38,.45)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 45px -10px rgba(10,18,38,.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink900 }}>New Estimate</h2>
              <button style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: C.ink400 }} onClick={() => setShowConfirm(false)}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <p style={{ fontSize: 13, color: C.ink500, marginBottom: 20 }}>You're about to create a new estimate. You can cancel at any time without saving.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <ModalBtn onClick={() => setShowConfirm(false)}>Cancel</ModalBtn>
              <ModalBtn onClick={handleConfirmCreate} primary disabled={creating}>{creating ? 'Creating…' : 'Create Estimate'}</ModalBtn>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: C.ink500 }}>Workspace</div>
            <h1 style={{ fontFamily: '"Fraunces", serif', fontWeight: 900, fontSize: 38, letterSpacing: '-0.02em', lineHeight: 1.05, color: C.ink900, margin: '4px 0 8px' }}>Estimates</h1>
            <p style={{ fontSize: 13, color: C.ink500, lineHeight: 1.5, maxWidth: 520, margin: 0 }}>
              Build pro estimates from your Price Book, send them out, and watch them progress through the pipeline. Signed estimates convert to invoices in one click.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginTop: 8 }}>
            <button
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1px solid ${C.borderWarm}`, background: '#fff', fontWeight: 600, fontSize: 13, color: C.ink700, cursor: 'pointer' }}
              onClick={() => navigate('/templates')}
            >
              <LayoutTemplate style={{ width: 14, height: 14 }} /> Templates
            </button>
            <button
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1px solid ${C.borderWarm}`, background: '#fff', fontWeight: 600, fontSize: 13, color: C.ink700, cursor: 'pointer' }}
              onClick={() => navigate('/price-book')}
            >
              <BookOpen style={{ width: 14, height: 14 }} /> Price Book
            </button>
            <button
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: C.burnt500, color: C.cream50, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(176,127,29,.35)', opacity: creating ? 0.7 : 1 }}
              onClick={handleNewEstimate} disabled={creating}
            >
              <Plus style={{ width: 14, height: 14 }} /> {creating ? 'Creating…' : 'New Estimate'}
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, margin: '22px 0' }}>
          <KpiCard icon={TrendingUp}   label="Pipeline value"  value={fmtMoney(stats.pipelineValue)} sub="Active estimates"   trend="+18%"  variant="ink" />
          <KpiCard icon={CheckCircle2} label="Won this month"  value={fmtMoney(stats.wonValue)}       sub="Signed + invoiced" trend="+22%"  variant="burnt" />
          <KpiCard icon={Target}       label="Win rate"        value={`${stats.winRate}%`}             sub="Last 90 days"      trend="+6pts" />
          <KpiCard icon={Send}         label="Awaiting client" value={String(stats.sentCount)}         sub={stats.staleCount > 0 ? `${stats.staleCount} stale` : 'Sent or viewed'} />
        </div>

        {/* Toolbar card */}
        <div style={{ background: '#fff', border: `1px solid ${C.borderSoft}`, borderRadius: 14, boxShadow: SHADOW_CARD, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.borderSoft}` }}>
            <h3 style={{ fontFamily: '"Fraunces", serif', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', color: C.ink900, margin: 0 }}>
              {view === 'pipeline' ? 'Pipeline' : 'All Estimates'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {view === 'list' && (
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: C.ink400, pointerEvents: 'none' }} />
                  <input
                    placeholder="Search estimates…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 32, paddingRight: 10, height: 32, border: `1px solid ${C.borderWarm}`, borderRadius: 8, fontSize: 13, color: C.ink900, background: '#fff', width: 200, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              )}
              {selectedIds.size > 0 && (
                <button
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => setDeleteModal({ open: true, estimate: null, canDelete: true })}
                >
                  <Trash2 style={{ width: 12, height: 12 }} /> Archive {selectedIds.size}
                </button>
              )}
              {/* View toggle */}
              <div style={{ display: 'inline-flex', background: '#fff', border: `1px solid ${C.borderWarm}`, borderRadius: 10, padding: 3, gap: 2 }}>
                {[{ id: 'pipeline', icon: KanbanSquare, label: 'Pipeline' }, { id: 'list', icon: List, label: 'List' }].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 30, padding: '0 12px', borderRadius: 7, border: 'none',
                      background: view === v.id ? C.ink900 : 'transparent',
                      color: view === v.id ? '#fff' : C.ink600,
                      fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                      transition: 'background 120ms, color 120ms', fontFamily: 'inherit',
                    }}
                  >
                    <v.icon style={{ width: 13, height: 13 }} /> {v.label}
                  </button>
                ))}
              </div>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.borderWarm}`, background: '#fff', color: C.ink600, fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Filter style={{ width: 12, height: 12 }} /> Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.cream150}`, borderTopColor: C.burnt400 }} />
        </div>
      ) : view === 'pipeline' ? (

        /* KANBAN */
        <div style={{ padding: '0 32px 40px', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPE_STAGES.length}, minmax(240px, 1fr))`, gap: 14, alignItems: 'start' }}>
            {PIPE_STAGES.map(stage => {
              const cards = byStage[stage.id] || [];
              const total = cards.reduce((a,b) => a + (b.total || 0), 0);
              const isDrop = dragOver === stage.id;
              return (
                <div
                  key={stage.id}
                  style={{
                    background: isDrop ? '#fbf0d3' : C.cream50,
                    border: `1px solid ${isDrop ? C.burnt400 : C.borderSoft}`,
                    borderRadius: 14, minHeight: 460,
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', transition: 'background 150ms',
                  }}
                  onDragOver={(e) => onDragOver(e, stage.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, stage.id)}
                >
                  {/* Column header — white bg */}
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.borderSoft}`, background: '#fff' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: stage.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: C.ink800, letterSpacing: '0.02em' }}>{stage.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: C.cream100, color: C.burnt700, padding: '2px 8px', borderRadius: 999, border: `1px solid ${C.cream300}` }}>
                      {cards.length}
                    </span>
                    {total > 0 && (
                      <span style={{ marginLeft: 'auto', fontFamily: '"Fraunces", serif', fontWeight: 700, fontSize: 13, color: C.ink700, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(total)}
                      </span>
                    )}
                  </div>
                  {/* Cards */}
                  <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
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
                      <div style={{ padding: '24px 8px', textAlign: 'center', fontSize: 12, color: C.ink400, opacity: 0.8 }}>
                        Drop estimates here to mark them {stage.label.toLowerCase()}.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      ) : (

        /* LIST */
        <div style={{ padding: '0 32px 40px' }}>
          {filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.ink500 }}>
                <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ width: 15, height: 15 }} />
                Select all
              </label>
              <span style={{ fontSize: 12, color: C.ink400 }}>({filtered.length} estimates)</span>
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ background: '#fff', border: `1px solid ${C.borderSoft}`, borderRadius: 14, padding: '80px 24px', textAlign: 'center', boxShadow: SHADOW_CARD }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: C.cream100, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText style={{ width: 22, height: 22, color: C.cream300 }} />
              </div>
              <p style={{ fontWeight: 700, color: C.ink800, fontSize: 15, marginBottom: 6 }}>No estimates</p>
              <p style={{ fontSize: 13, color: C.ink500, marginBottom: 20 }}>
                {search ? 'No results for your search.' : 'Create your first estimate to get started.'}
              </p>
              {!search && (
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: C.burnt500, color: C.cream50, fontWeight: 700, fontSize: 13, cursor: 'pointer' }} onClick={handleNewEstimate} disabled={creating}>
                  <Plus style={{ width: 14, height: 14 }} /> {creating ? 'Creating…' : 'New Estimate'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: '#fff', border: `1px solid ${C.borderSoft}`, borderRadius: 14, boxShadow: SHADOW_CARD, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, padding: '10px 14px', borderBottom: `1px solid ${C.borderSoft}`, background: C.cream50 }}>
                      <input type="checkbox" checked={selectedIds.size === filtered.length} onChange={toggleSelectAll} style={{ width: 15, height: 15 }} />
                    </th>
                    {['Estimate','Client / Project','Total','Margin','Status','Days',''].map(col => (
                      <th key={col} style={{ textAlign: col === 'Total' ? 'right' : 'left', padding: '10px 14px', borderBottom: `1px solid ${C.borderSoft}`, background: C.cream50, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink500, fontWeight: 700 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((est, i) => {
                    const isLast = i === filtered.length - 1;
                    const margin = est.gross_margin_pct ? parseFloat(est.gross_margin_pct) : 0;
                    const profit = est.gross_margin ? parseFloat(est.gross_margin) : 0;
                    return (
                      <tr
                        key={est.id}
                        style={{ borderBottom: isLast ? 'none' : `1px solid ${C.borderSoft}`, cursor: 'pointer', transition: 'background 120ms' }}
                        onClick={() => navigate(`/estimate-editor?id=${est.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = '#fdfaf0'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(est.id)} onChange={() => toggleSelect(est.id)} style={{ width: 15, height: 15 }} />
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <div style={{ fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace', fontSize: 11, fontWeight: 600, color: C.burnt400 }}>#{est.estimate_number}</div>
                          {est.created_date && <div style={{ fontSize: '11.5px', color: C.ink500, marginTop: 3 }}>{new Date(est.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.cream100, color: C.burnt600, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '11.5px', border: `1px solid ${C.cream300}`, flexShrink: 0 }}>
                              {clientInitials(est.client_name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: C.ink900 }}>{est.client_name || <span style={{ fontStyle: 'italic', color: C.ink400, fontWeight: 400 }}>No client</span>}</div>
                              {est.title && <div style={{ fontSize: '11.5px', color: C.ink500 }}>{est.title}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ fontFamily: '"Fraunces", serif', fontWeight: 800, fontSize: 18, color: C.ink900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{fmtMoney(est.total)}</div>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          {margin > 0
                            ? <><div style={{ fontWeight: 600, fontSize: 13 }}>{margin.toFixed(1)}%</div><div style={{ fontSize: 11, color: C.ink500 }}>{fmtMoney(profit)} profit</div></>
                            : <span style={{ fontSize: 12, color: C.ink400 }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <StatusBadge status={est.status} />
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 13, color: daysInStage(est) >= 7 && ['sent','viewed'].includes(est.status) ? C.orange600 : C.ink500 }}>
                            {daysInStage(est)}d
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              style={{ padding: '5px 7px', borderRadius: 7, border: 'none', background: 'transparent', color: C.ink400, cursor: 'pointer' }}
                              onClick={() => navigate(`/estimate-editor?id=${est.id}`)}
                              onMouseEnter={e => e.currentTarget.style.background = C.cream100}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            ><Pencil style={{ width: 13, height: 13 }} /></button>
                            <button
                              style={{ padding: '5px 7px', borderRadius: 7, border: 'none', background: 'transparent', color: C.ink400, cursor: 'pointer' }}
                              onClick={() => handleDeleteClick(est)}
                              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.ink400; }}
                            ><Trash2 style={{ width: 13, height: 13 }} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
