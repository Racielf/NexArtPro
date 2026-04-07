import React, { useState, useMemo } from 'react';
// Labor-type categories (for Material/Labor filter)
const LABOR_CATEGORIES = new Set(['Labor', 'Misc', 'Admin', 'Plumbing', 'Electrical', 'HVAC']);
import { Plus, Search } from 'lucide-react';
import { PRICE_BOOK_SEED } from './priceBookSeed';
import { SERVICES_SEED, CATEGORIES } from '@/components/settings/services/servicesSeed';
import PriceBookTable from './PriceBookTable';
import PriceBookForm from './PriceBookForm';
import PriceBookImport from './PriceBookImport';

const FILTERS = ['All', 'Active', 'Inactive', 'Needs Review', 'Priced', 'Unpriced'];

function genId() {
  return `pb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// Resolve service_id by matching _service_name_ref against the seed catalog
function resolveSeeds(seed, services) {
  return seed.map(entry => {
    if (entry.service_id || !entry._service_name_ref) return entry;
    const matched = services.find(s => s.name === entry._service_name_ref);
    return { ...entry, service_id: matched?.id || null };
  });
}

export default function PriceBookSection() {
  const services = SERVICES_SEED; // Service catalog reference (read-only here)

  const [entries, setEntries] = useState(() => resolveSeeds(PRICE_BOOK_SEED, services));
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('All');
  const [catFilter, setCatFilter] = useState('All');
  const [showForm, setShowForm]   = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showMarket, setShowMarket] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'Material' | 'Labor'

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter(e => {
      if (filter === 'Active'       && !e.is_active)   return false;
      if (filter === 'Inactive'     && e.is_active)    return false;
      if (filter === 'Needs Review' && !e.needs_review) return false;
      const unpriced = e.base_price === null || e.base_price === undefined || e.base_price === '';
      if (filter === 'Priced'   &&  unpriced) return false;
      if (filter === 'Unpriced' && !unpriced) return false;
      if (catFilter !== 'All' && e.category !== catFilter) return false;
      if (typeFilter === 'Labor'    &&  !LABOR_CATEGORIES.has(e.category)) return false;
      if (typeFilter === 'Material' &&   LABOR_CATEGORIES.has(e.category)) return false;
      if (q) {
        const inName  = e.display_name?.toLowerCase().includes(q);
        const inCat   = e.category?.toLowerCase().includes(q);
        const inUnit  = e.unit?.toLowerCase().includes(q);
        const inNotes = e.notes?.toLowerCase().includes(q);
        if (!inName && !inCat && !inUnit && !inNotes) return false;
      }
      return true;
    });
  }, [entries, search, filter, catFilter, typeFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openNew  = () => { setEditingEntry(null); setShowForm(true); };
  const openEdit = (e) => { setEditingEntry(e); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingEntry(null); };

  const handleSave = (form) => {
    if (editingEntry) {
      setEntries(prev => prev.map(e => e.id === form.id ? { ...form } : e));
    } else {
      // Preserve original values as audit reference on first creation
      setEntries(prev => [...prev, {
        ...form,
        id: genId(),
        source: 'manual',
        _original_display_name: form.display_name,
        _original_base_price:   form.base_price,
        _original_notes:        form.notes,
        _original_unit:         form.unit,
      }]);
    }
    closeForm();
  };

  const toggleActive = (id) => setEntries(prev => prev.map(e => e.id === id ? { ...e, is_active: !e.is_active } : e));
  const toggleReview = (id) => setEntries(prev => prev.map(e => e.id === id ? { ...e, needs_review: !e.needs_review } : e));
  const handleInlineUpdate = (id, newPrice) => setEntries(prev => prev.map(e => e.id === id ? { ...e, base_price: newPrice, updated_date: new Date().toISOString() } : e));

  // ── CSV Import merge handler ───────────────────────────────────────────────
  const handleCsvImport = (rows) => {
    let added = 0, updated = 0, skipped = 0;
    setEntries(prev => {
      const next = [...prev];
      rows.forEach(row => {
        const name = (row.service_name || '').trim();
        if (!name) { skipped++; return; }
        const idx = next.findIndex(e => e.display_name?.toLowerCase() === name.toLowerCase());
        if (idx >= 0) {
          // Update book_price (and optional fields) — never overwrite manual edits
          next[idx] = {
            ...next[idx],
            base_price: row.book_price ?? next[idx].base_price,
            ...(row.category && { category: row.category }),
            ...(row.uom     && { unit: row.uom }),
            ...(row.notes   && { notes: row.notes }),
            ...(row.estimated_cost && { estimated_cost: row.estimated_cost }),
            needs_review: false,
          };
          updated++;
        } else {
          // New entry — snapshot original values as immutable audit reference
          const bpVal = row.book_price ?? null;
          const notesVal = row.notes || '';
          const uomVal = row.uom || 'each';
          next.push({
            id: genId(),
            display_name: name,
            _service_name_ref: name,
            service_id: null,
            category: row.category || 'Misc',
            unit: uomVal,
            base_price: bpVal,
            estimated_cost: row.estimated_cost || null,
            markup: null,
            notes: notesVal,
            is_active: true,
            needs_review: true,
            source: 'csv_import',
            // ── Audit originals (immutable, never overwritten after creation) ──
            _original_display_name: name,
            _original_base_price:   bpVal,
            _original_notes:        notesVal,
            _original_unit:         uomVal,
          });
          added++;
        }
      });
      return next;
    });
    return { added, updated, skipped };
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total    = entries.length;
  const priced   = entries.filter(e => e.base_price !== null && e.base_price !== '' && e.base_price !== undefined).length;
  const unpriced = total - priced;
  const reviewing = entries.filter(e => e.needs_review).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Entries',  value: total,     color: 'text-slate-800' },
          { label: 'Priced',         value: priced,    color: 'text-green-600' },
          { label: 'Unpriced',       value: unpriced,  color: 'text-slate-400' },
          { label: 'Needs Review',   value: reviewing, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
            placeholder="Search by service, category, unit, notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Material / Labor filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {['All', 'Material', 'Labor'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <select
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 focus:outline-none focus:border-blue-400 transition"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Market toggle */}
        <button
          onClick={() => setShowMarket(v => !v)}
          className={`flex items-center gap-2 text-xs font-medium rounded-xl px-3 py-2 border transition flex-shrink-0 ${
            showMarket
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
          title="Toggle Oregon market reference columns"
        >
          <span className={`w-2 h-2 rounded-full ${showMarket ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          Market Ref
        </button>

        {/* Add button */}
        <button onClick={openNew}
          className="flex items-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-xl px-4 py-2 flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Price
        </button>
      </div>

      {/* CSV Import */}
      <div className="mb-4">
        <PriceBookImport onImport={handleCsvImport} />
      </div>

      {/* Table */}
      <PriceBookTable
        entries={filtered}
        onEdit={openEdit}
        onToggleActive={toggleActive}
        onToggleReview={toggleReview}
        onInlineUpdate={handleInlineUpdate}
        showMarket={showMarket}
      />

      {/* Form Modal */}
      {showForm && (
        <PriceBookForm
          entry={editingEntry}
          services={services}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
}