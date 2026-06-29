import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { nexartClient } from '@/api/nexartClient';
import PriceBookForm   from './PriceBookForm';
import PriceBookImport from './PriceBookImport';
import {
  BookOpen, Plus, Download, Upload, Search, X, RefreshCw, Check, Home,
} from 'lucide-react';
import { format } from 'date-fns';

/* ── category palette ─────────────────────────────────────────────── */
const CAT_CONFIG = {
  'Electrical':        { bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c', text: '#9a3412' },
  'Plumbing':          { bg: '#eff6ff', border: '#bfdbfe', badge: '#2563eb', text: '#1e3a8a' },
  'Roofing':           { bg: '#fefce8', border: '#fde68a', badge: '#a16207', text: '#713f12' },
  'HVAC':              { bg: '#f0fdf4', border: '#bbf7d0', badge: '#15803d', text: '#14532d' },
  'Flooring':          { bg: '#fffbeb', border: '#fde68a', badge: '#d97706', text: '#78350f' },
  'Painting':          { bg: '#eef2ff', border: '#c7d2fe', badge: '#4338ca', text: '#312e81' },
  'Paint':             { bg: '#eef2ff', border: '#c7d2fe', badge: '#4338ca', text: '#312e81' },
  'Drywall':           { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', text: '#1e293b' },
  'Drywall / Framing': { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', text: '#1e293b' },
  'Framing':           { bg: '#fef3c7', border: '#fde68a', badge: '#b45309', text: '#78350f' },
  'Windows & Doors':   { bg: '#fdf4ff', border: '#e9d5ff', badge: '#7c3aed', text: '#4c1d95' },
  'Doors & Windows':   { bg: '#fdf4ff', border: '#e9d5ff', badge: '#7c3aed', text: '#4c1d95' },
  'Doors':             { bg: '#fdf4ff', border: '#e9d5ff', badge: '#7c3aed', text: '#4c1d95' },
  'Foundation':        { bg: '#f1f5f9', border: '#cbd5e1', badge: '#334155', text: '#0f172a' },
  'Landscaping':       { bg: '#f0fdf4', border: '#86efac', badge: '#166534', text: '#14532d' },
  'Cleaning':          { bg: '#f0f9ff', border: '#bae6fd', badge: '#0284c7', text: '#0c4a6e' },
  'Limpieza':          { bg: '#f0f9ff', border: '#bae6fd', badge: '#0284c7', text: '#0c4a6e' },
  'General Repairs':   { bg: '#fef9f0', border: '#fcd9a0', badge: '#c05621', text: '#7c2d12' },
  'Repairs':           { bg: '#fef9f0', border: '#fcd9a0', badge: '#c05621', text: '#7c2d12' },
  'Appliances':        { bg: '#fdf2f8', border: '#f9a8d4', badge: '#9d174d', text: '#831843' },
  'Demolition':        { bg: '#fff1f2', border: '#fecdd3', badge: '#b91c1c', text: '#7f1d1d' },
  'Demolicion':        { bg: '#fff1f2', border: '#fecdd3', badge: '#b91c1c', text: '#7f1d1d' },
  'Bathroom':          { bg: '#f0fdfa', border: '#99f6e4', badge: '#0f766e', text: '#134e4a' },
  'Kitchen':           { bg: '#f7fee7', border: '#bef264', badge: '#4d7c0f', text: '#365314' },
  'Tile':              { bg: '#ecfeff', border: '#a5f3fc', badge: '#0e7490', text: '#164e63' },
  'Concrete':          { bg: '#f1f5f9', border: '#94a3b8', badge: '#334155', text: '#0f172a' },
  'Cabinetry':         { bg: '#fffbeb', border: '#fde68a', badge: '#92400e', text: '#78350f' },
  'Countertop':        { bg: '#fdf4ff', border: '#d8b4fe', badge: '#7e22ce', text: '#4c1d95' },
  'Labor':             { bg: '#fdf4ff', border: '#d8b4fe', badge: '#7e22ce', text: '#4c1d95' },
  'Admin':             { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', text: '#1e293b' },
};
const DEFAULT_CAT = { bg: '#f8fafc', border: '#e2e8f0', badge: '#64748b', text: '#334155' };

function getCatCfg(cat) {
  if (!cat) return DEFAULT_CAT;
  return CAT_CONFIG[cat] || DEFAULT_CAT;
}

function pricingLabel(e) {
  if (e.book_price && parseFloat(e.book_price) > 0) return { label: 'Fixed',      cls: 'bg-red-50 text-red-600 border-red-200' };
  if (e.unit_price  && parseFloat(e.unit_price)  > 0) return { label: 'Negotiable', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  return { label: 'Ask', cls: 'bg-amber-50 text-amber-600 border-amber-200' };
}

function fmtUnit(u) {
  const map = { sqft: 'sq ft', lf: 'lin ft', ea: 'each', hr: 'hr', day: 'day', lot: 'lot', fix: 'fixture', gal: 'gal', ckt: 'circuit', sq: 'square', load: 'load', proj: 'project' };
  return map[u?.toLowerCase()] || u || 'each';
}

function fmtPrice(v, unit) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return null;
  const s = n % 1 === 0 ? `$${n.toLocaleString()}` : `$${n.toFixed(2)}`;
  return `${s}/${fmtUnit(unit)}`;
}

function buildCSV(entries) {
  const header = 'id,display_name,type,category,unit,unit_price,unit_cost,book_price,notes,is_active';
  const rows = entries.map(e => {
    const name = (e.display_name || '').replace(/"/g, '""');
    const note = (e.notes || '').replace(/"/g, '""');
    return `${e.id},"${name}",${e.type || ''},${e.category || ''},${e.unit || ''},${e.unit_price || ''},${e.unit_cost || ''},${e.book_price || ''},"${note}",${e.is_active ? 'true' : 'false'}`;
  });
  return [header, ...rows].join('\n');
}
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
}

/* ══════════════════════════════════════════════════════════════════
   SERVICE CARD
   ══════════════════════════════════════════════════════════════════ */
function ServiceCard({ entry, onClick }) {
  const cfg      = getCatCfg(entry.category);
  const price    = fmtPrice(entry.unit_price, entry.unit) || fmtPrice(entry.book_price, entry.unit);
  const pl       = pricingLabel(entry);
  const type     = entry.type || 'service';
  const typeLabel = { service: 'Service', material: 'Material', labor: 'Labor' }[type] || type;
  const isActive = entry.is_active !== false;

  return (
    <div
      onClick={() => onClick(entry)}
      className="group relative flex flex-col rounded-xl border cursor-pointer transition-all duration-150 hover:-translate-y-[2px] overflow-hidden"
      style={{
        background: isActive ? cfg.bg : '#f8fafc',
        borderColor: isActive ? cfg.border : '#e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        opacity: isActive ? 1 : 0.6,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = cfg.badge; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = isActive ? cfg.border : '#e2e8f0'; }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-[3px] leading-none flex-shrink-0"
          style={{ background: cfg.badge + '1a', color: cfg.badge }}
        >
          {entry.category || typeLabel}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {price ? (
            <>
              <span className="text-[14px] font-bold text-slate-800 tabular-nums leading-none whitespace-nowrap">{price}</span>
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: cfg.badge + '22', color: cfg.badge }}>
                <Check className="w-2.5 h-2.5" />
              </span>
            </>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 italic">No price</span>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="px-4 pb-1">
        <h3 className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-slate-900">
          {entry.display_name}
        </h3>
      </div>

      {/* Description */}
      <div className="px-4 pb-3 flex-1">
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
          {entry.notes || <span className="italic text-slate-300">No description</span>}
        </p>
      </div>

      {/* Tags footer */}
      <div className="px-3 pb-3 flex items-center gap-1.5 flex-wrap">
        <span className={`text-[9px] font-semibold px-2 py-[3px] rounded-full border leading-none ${
          type === 'material' ? 'bg-amber-50 text-amber-600 border-amber-200' :
          type === 'labor'    ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                'bg-blue-50 text-blue-600 border-blue-200'
        }`}>
          {typeLabel}
        </span>
        <span className="flex items-center gap-0.5 text-[9px] font-medium text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-[3px] leading-none">
          <Home className="w-2.5 h-2.5" /> Residential
        </span>
        <span className={`text-[9px] font-semibold px-2 py-[3px] rounded-full border leading-none ${pl.cls}`}>
          {pl.label}
        </span>
      </div>

      {!isActive && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Inactive</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRICE BOOK SECTION (Settings panel)
   ══════════════════════════════════════════════════════════════════ */
export default function PriceBookSection() {
  const [entries,    setEntries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [search,     setSearch]     = useState('');
  const [activeCat,  setActiveCat]  = useState('All');

  /* ── load ────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nexartClient.entities.PriceBookEntry.list('-created_date', 500);
      setEntries(data || []);
    } catch (err) {
      console.error('[PriceBookSection] load', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  /* ── CRUD ────────────────────────────────────────────────────── */
  const handleSave = async (form) => {
    try {
      if (form.id) {
        await nexartClient.entities.PriceBookEntry.update(form.id, form);
        setEntries(prev => prev.map(e => e.id === form.id ? { ...e, ...form } : e));
      } else {
        const created = await nexartClient.entities.PriceBookEntry.create({ ...form, source: 'manual' });
        setEntries(prev => [created, ...prev]);
      }
      setEditTarget(null);
      flashSaved();
    } catch (err) {
      console.error('[PriceBookSection] save', err);
    }
  };

  /* ── import ──────────────────────────────────────────────────── */
  const handleImport = useCallback((rows) => {
    let added = 0, updated = 0, skipped = 0;
    (async () => {
      for (const row of rows) {
        const name = (row.display_name || row.service_name || '').trim();
        if (!name) { skipped++; continue; }
        const existing = entries.find(e => (e.display_name || '').toLowerCase() === name.toLowerCase());
        if (existing) {
          const patch = {};
          if (row.book_price) patch.book_price = parseFloat(row.book_price);
          if (row.unit_price) patch.unit_price  = parseFloat(row.unit_price);
          if (row.category)   patch.category    = row.category;
          if (row.notes)      patch.notes       = row.notes;
          await nexartClient.entities.PriceBookEntry.update(existing.id, patch);
          updated++;
        } else {
          await nexartClient.entities.PriceBookEntry.create({
            display_name: name, type: 'service',
            category: row.category || '',
            unit: row.uom || row.unit || 'ea',
            unit_price: row.unit_price ? parseFloat(row.unit_price) : null,
            book_price: row.book_price ? parseFloat(row.book_price) : null,
            notes: row.notes || '', is_active: true, source: 'import',
          });
          added++;
        }
      }
      await load();
      flashSaved();
    })();
    return { added, updated, skipped };
  }, [entries, load]);

  /* ── categories ──────────────────────────────────────────────── */
  const categories = useMemo(() => {
    const live = entries.filter(e => !e.deleted_at);
    const set  = new Set(live.map(e => e.category).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [entries]);

  /* ── filtered ────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = entries.filter(e => !e.deleted_at);
    if (activeCat !== 'All') list = list.filter(e => e.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.display_name || '').toLowerCase().includes(q) ||
        (e.category     || '').toLowerCase().includes(q) ||
        (e.notes        || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, activeCat, search]);

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">

      {/* Header bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-slate-900">Price Book</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Standard service rates used across Estimates, Work Orders and Proposals
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {saved && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          <button
            onClick={() => downloadBlob(buildCSV(filtered), `price-book-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv')}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setShowImport(v => !v)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border transition ${
              showImport ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button
            onClick={() => load()}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setEditTarget({})}
            className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-lg text-white transition hover:opacity-90 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Service
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search services, categories…"
          className="w-full pl-9 pr-8 py-2 text-[12px] border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 transition"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <PriceBookImport onImport={handleImport} />
        </div>
      )}

      {/* Count row */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-500">
          {loading ? '…' : `${filtered.length} service${filtered.length !== 1 ? 's' : ''}`}
          {activeCat !== 'All' && <span className="text-slate-400 font-normal"> in {activeCat}</span>}
          {search && <span className="text-slate-400 font-normal"> matching "{search}"</span>}
        </span>
        {!loading && entries.filter(e => !e.deleted_at).length === 0 && (
          <button onClick={() => setShowImport(true)} className="text-[11px] text-amber-600 hover:underline">
            Import Oregon price template →
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 flex-nowrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition whitespace-nowrap"
            style={activeCat === cat
              ? { background: getCatCfg(cat === 'All' ? null : cat).badge, color: '#fff', borderColor: getCatCfg(cat === 'All' ? null : cat).badge }
              : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading Price Book…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">
            {entries.length === 0 ? 'Price Book vacío' : 'No results'}
          </p>
          <p className="text-xs text-slate-400 mb-4">
            {entries.length === 0
              ? 'Importa el template de Oregon o agrega servicios manualmente'
              : 'Try a different search or category'
            }
          </p>
          {entries.length === 0 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
              >
                <Upload className="w-3.5 h-3.5" /> Import Oregon CSV
              </button>
              <button
                onClick={() => setEditTarget({})}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Service
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          {filtered.map(entry => (
            <ServiceCard key={entry.id} entry={entry} onClick={e => setEditTarget(e)} />
          ))}
          <button
            onClick={() => setEditTarget({})}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all min-h-[140px] text-slate-400 hover:text-amber-600 group"
          >
            <div className="w-7 h-7 rounded-full border-2 border-slate-200 group-hover:border-amber-400 flex items-center justify-center transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold">Add Service</span>
          </button>
        </div>
      )}

      {/* Form modal */}
      {editTarget !== null && (
        <PriceBookForm
          entry={Object.keys(editTarget).length === 0 ? null : editTarget}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
