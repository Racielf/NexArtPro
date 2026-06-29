import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { nexartClient } from '@/api/nexartClient';
import PriceBookTable from '@/components/settings/pricebook/PriceBookTable';
import PriceBookForm  from '@/components/settings/pricebook/PriceBookForm';
import PriceBookImport from '@/components/settings/pricebook/PriceBookImport';
import { ITEM_TYPES, PRICE_BOOK_CATEGORIES } from '@/components/settings/pricebook/priceBookCategories';
import {
  BookOpen, Plus, Download, Upload, Search, X, RefreshCw,
  TrendingUp, AlertCircle, CheckCircle2, Package, SlidersHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';

/* ── helpers ─────────────────────────────────────────────────────── */
function buildCSV(entries) {
  const header = 'id,display_name,type,category,unit,unit_price,unit_cost,book_price,margin,notes,is_active';
  const rows = entries.map(e => {
    const up = parseFloat(e.unit_price) || 0;
    const uc = parseFloat(e.unit_cost)  || 0;
    const margin = up > 0 && uc > 0 ? (((up - uc) / up) * 100).toFixed(1) : '';
    const note = (e.notes || '').replace(/"/g, '""');
    const name = (e.display_name || '').replace(/"/g, '""');
    return `${e.id},"${name}",${e.type || ''},${e.category || ''},${e.unit || ''},${up || ''},${uc || ''},${e.book_price || ''},${margin},"${note}",${e.is_active ? 'true' : 'false'}`;
  });
  return [header, ...rows].join('\n');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

/* ── stat chip ───────────────────────────────────────────────────── */
function StatChip({ icon: Icon, value, label, color = 'slate', loading }) {
  const colors = {
    slate:  'bg-slate-50 border-slate-200 text-slate-700',
    green:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    red:    'bg-red-50 border-red-200 text-red-600',
  };
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${colors[color]} select-none`}>
      <Icon className="w-4 h-4 opacity-60 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</p>
        <p className={`text-xl font-bold tabular-nums leading-tight ${loading ? 'opacity-20' : ''}`}>{loading ? '—' : value}</p>
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────── */
export default function PriceBook() {
  const [entries,    setEntries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // null = closed, {} = new, {...} = edit
  const [showImport, setShowImport] = useState(false);
  const [saved,      setSaved]      = useState(false);

  // Filters
  const [search,    setSearch]    = useState('');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [catFilter,    setCatFilter]    = useState('all');
  const [activeFilter, setActiveFilter] = useState('all'); // all | active | inactive
  const [reviewFilter, setReviewFilter] = useState(false);

  /* ── load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nexartClient.entities.PriceBookEntry.list('-created_date', 500);
      setEntries(data || []);
    } catch (err) {
      console.error('[PriceBook] load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── flash save badge ─────────────────────────────────────────── */
  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── CRUD ─────────────────────────────────────────────────────── */
  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (form.id) {
        await nexartClient.entities.PriceBookEntry.update(form.id, form);
        setEntries(prev => prev.map(e => e.id === form.id ? { ...e, ...form } : e));
      } else {
        const created = await nexartClient.entities.PriceBookEntry.create({
          ...form,
          source: form.source || 'manual',
        });
        setEntries(prev => [created, ...prev]);
      }
      setEditTarget(null);
      flashSaved();
    } catch (err) {
      console.error('[PriceBook] save error', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const next = !entry.is_active;
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_active: next } : e));
    try {
      await nexartClient.entities.PriceBookEntry.update(id, { is_active: next });
    } catch { load(); }
  };

  const handleToggleReview = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const next = !entry.needs_review;
    setEntries(prev => prev.map(e => e.id === id ? { ...e, needs_review: next } : e));
    try {
      await nexartClient.entities.PriceBookEntry.update(id, { needs_review: next });
    } catch { load(); }
  };

  const handleInlinePriceUpdate = async (id, field, value) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    try {
      await nexartClient.entities.PriceBookEntry.update(id, { [field]: value });
    } catch { load(); }
  };

  /* ── import handler ───────────────────────────────────────────── */
  const handleImport = useCallback((rows) => {
    let added = 0, updated = 0, skipped = 0;
    const updates = [];
    const creates = [];

    rows.forEach(row => {
      if (!row.service_name && !row.display_name) { skipped++; return; }
      const name = (row.display_name || row.service_name || '').trim();
      if (!name) { skipped++; return; }

      const existing = entries.find(e =>
        (e.display_name || '').toLowerCase() === name.toLowerCase()
      );

      const bookPrice = row.book_price !== undefined ? parseFloat(row.book_price) || null : undefined;
      const unitPrice = row.unit_price !== undefined ? parseFloat(row.unit_price) || null : undefined;

      if (existing) {
        const patch = {};
        if (bookPrice !== undefined) patch.book_price = bookPrice;
        if (unitPrice !== undefined) patch.unit_price = unitPrice;
        if (row.category) patch.category = row.category;
        if (row.notes)    patch.notes    = row.notes;
        if (row.uom || row.unit) patch.unit = row.uom || row.unit;
        updates.push({ id: existing.id, patch });
        updated++;
      } else {
        creates.push({
          display_name: name,
          type: 'service',
          category: row.category || '',
          unit: row.uom || row.unit || 'sqft',
          unit_price: unitPrice || null,
          book_price: bookPrice || null,
          notes: row.notes || '',
          is_active: true,
          needs_review: false,
          source: 'import',
        });
        added++;
      }
    });

    // Apply optimistically then sync
    (async () => {
      try {
        for (const { id, patch } of updates) {
          await nexartClient.entities.PriceBookEntry.update(id, patch);
        }
        for (const payload of creates) {
          await nexartClient.entities.PriceBookEntry.create(payload);
        }
        await load();
        flashSaved();
      } catch (err) {
        console.error('[PriceBook] import error', err);
        load();
      }
    })();

    return { added, updated, skipped };
  }, [entries, load]);

  /* ── filtered list ────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = entries.filter(e => !e.deleted_at);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.display_name || '').toLowerCase().includes(q) ||
        (e.category     || '').toLowerCase().includes(q) ||
        (e.notes        || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') list = list.filter(e => e.type === typeFilter);
    if (catFilter  !== 'all') list = list.filter(e => e.category === catFilter);
    if (activeFilter === 'active')   list = list.filter(e => e.is_active);
    if (activeFilter === 'inactive') list = list.filter(e => !e.is_active);
    if (reviewFilter) list = list.filter(e => e.needs_review);
    return list;
  }, [entries, search, typeFilter, catFilter, activeFilter, reviewFilter]);

  /* ── stats ────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const live = entries.filter(e => !e.deleted_at);
    const priced    = live.filter(e => e.unit_price != null && e.unit_price !== '');
    const reviewing = live.filter(e => e.needs_review);
    const margins = live.map(e => {
      const up = parseFloat(e.unit_price) || 0;
      const uc = parseFloat(e.unit_cost)  || 0;
      return up > 0 && uc > 0 ? ((up - uc) / up) * 100 : null;
    }).filter(m => m !== null);
    const avgMargin = margins.length ? (margins.reduce((a,b)=>a+b,0)/margins.length).toFixed(1) : '—';
    return { total: live.length, priced: priced.length, unpriced: live.length - priced.length, reviewing: reviewing.length, avgMargin };
  }, [entries]);

  /* ── used categories ──────────────────────────────────────────── */
  const usedCategories = useMemo(() => {
    const set = new Set(entries.map(e => e.category).filter(Boolean));
    return [...set].sort();
  }, [entries]);

  const hasFilters = search || typeFilter !== 'all' || catFilter !== 'all' || activeFilter !== 'all' || reviewFilter;

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">

      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">Price Book</h1>
                <p className="text-[11px] text-muted-foreground">Tarifas y márgenes para servicios, materiales y mano de obra</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {saved && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3" /> Guardado
                </span>
              )}
              <button onClick={() => downloadBlob(buildCSV(filtered), `price-book-${todayStr()}.csv`, 'text/csv;charset=utf-8;')}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted/50 text-slate-600 transition">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={() => {
                const payload = {
                  exportedAt: new Date().toISOString(),
                  count: filtered.length,
                  entries: filtered.map(e => ({
                    id: e.id, display_name: e.display_name, type: e.type,
                    category: e.category, unit: e.unit, unit_price: e.unit_price,
                    unit_cost: e.unit_cost, book_price: e.book_price, notes: e.notes,
                    is_active: e.is_active,
                  })),
                };
                downloadBlob(JSON.stringify(payload, null, 2), `price-book-${todayStr()}.json`, 'application/json');
              }}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted/50 text-slate-600 transition">
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
              <button onClick={() => setShowImport(v => !v)}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border transition ${showImport ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-border hover:bg-muted/50 text-slate-600'}`}>
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
              <button onClick={() => load()}
                className="p-2 rounded-lg border border-border hover:bg-muted/50 text-slate-500 transition"
                title="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setEditTarget({})}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 flex flex-col gap-5">

        {/* ── STATS ROW ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <StatChip icon={Package}       value={stats.total}        label="Total Items"   color="slate"  loading={loading} />
          <StatChip icon={CheckCircle2}  value={stats.priced}       label="Priced"        color="green"  loading={loading} />
          <StatChip icon={BookOpen}      value={stats.unpriced}     label="Not Priced"    color={stats.unpriced > 0 ? 'amber' : 'slate'} loading={loading} />
          <StatChip icon={TrendingUp}    value={stats.avgMargin === '—' ? '—' : `${stats.avgMargin}%`} label="Avg Margin" color="blue" loading={loading} />
          {stats.reviewing > 0 && (
            <StatChip icon={AlertCircle} value={stats.reviewing}    label="Needs Review"  color="red"    loading={loading} />
          )}
        </div>

        {/* ── IMPORT PANEL ──────────────────────────────────────── */}
        {showImport && (
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4">
            <PriceBookImport onImport={handleImport} />
          </div>
        )}

        {/* ── FILTER BAR ────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar items…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex gap-1">
            {[{ value: 'all', label: 'All Types' }, ...ITEM_TYPES].map(t => (
              <button key={t.value} onClick={() => setTypeFilter(t.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                  typeFilter === t.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Category dropdown */}
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="text-[11px] font-medium border border-border rounded-lg px-3 py-2 bg-background text-slate-600 focus:outline-none focus:border-primary/60 transition">
            <option value="all">All Categories</option>
            {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Active filter */}
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value)}
            className="text-[11px] font-medium border border-border rounded-lg px-3 py-2 bg-background text-slate-600 focus:outline-none focus:border-primary/60 transition">
            <option value="all">All Status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          {/* Review filter */}
          <button onClick={() => setReviewFilter(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold border transition ${
              reviewFilter ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-background border-border text-slate-500 hover:bg-slate-50'
            }`}>
            <AlertCircle className="w-3 h-3" />
            Review
          </button>

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={() => { setSearch(''); setTypeFilter('all'); setCatFilter('all'); setActiveFilter('all'); setReviewFilter(false); }}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition px-2">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}

          {/* Result count */}
          <span className="ml-auto text-[11px] text-slate-400">
            {loading ? '…' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
            {hasFilters && entries.length > filtered.length && ` (de ${entries.length})`}
          </span>
        </div>

        {/* ── TABLE ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando Price Book…</span>
          </div>
        ) : (
          <PriceBookTable
            entries={filtered}
            onEdit={entry => setEditTarget(entry)}
            onToggleActive={handleToggleActive}
            onToggleReview={handleToggleReview}
            onInlinePriceUpdate={handleInlinePriceUpdate}
            showMarket={true}
          />
        )}

        {/* ── EMPTY STATE ───────────────────────────────────────── */}
        {!loading && entries.filter(e => !e.deleted_at).length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Price Book vacío</p>
            <p className="text-xs text-slate-400 mb-4">Agrega items manualmente o importa un CSV con precios de Oregon</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>
              <button onClick={() => setEditTarget({})}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── FORM MODAL ────────────────────────────────────────────── */}
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
