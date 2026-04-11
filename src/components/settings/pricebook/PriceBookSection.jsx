import React, { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { PRICE_BOOK_SEED } from './priceBookSeed';
import { PRICE_BOOK_CATEGORIES, ITEM_TYPES } from './priceBookCategories';
import PriceBookTable from './PriceBookTable';
import PriceBookForm from './PriceBookForm';
import PriceBookImport from './PriceBookImport';

const STATUS_FILTERS = ['All', 'Active', 'Inactive', 'Needs Review', 'Priced', 'Unpriced'];

function genId() {
  return `pb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function PriceBookSection() {
  const [entries, setEntries] = useState(() => [...PRICE_BOOK_SEED]);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [catFilter, setCatFilter]       = useState('All');
  const [showForm, setShowForm]   = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showMarket, setShowMarket]     = useState(true);

  // ── Derived categories from actual data ──
  const usedCategories = useMemo(() => {
    const cats = new Set(entries.map(e => e.category).filter(Boolean));
    PRICE_BOOK_CATEGORIES.forEach(c => cats.add(c));
    return [...cats].sort();
  }, [entries]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter(e => {
      if (statusFilter === 'Active' && !e.is_active) return false;
      if (statusFilter === 'Inactive' && e.is_active) return false;
      if (statusFilter === 'Needs Review' && !e.needs_review) return false;
      const unpriced = e.unit_price === null || e.unit_price === undefined || e.unit_price === '';
      if (statusFilter === 'Priced' && unpriced) return false;
      if (statusFilter === 'Unpriced' && !unpriced) return false;

      if (typeFilter !== 'All' && e.type !== typeFilter) return false;
      if (catFilter !== 'All' && e.category !== catFilter) return false;

      if (q) {
        const fields = [e.display_name, e.category, e.unit, e.notes, e.type].map(f => (f || '').toLowerCase());
        if (!fields.some(f => f.includes(q))) return false;
      }
      return true;
    });
  }, [entries, search, statusFilter, typeFilter, catFilter]);

  // ── Handlers ──
  const openNew  = () => { setEditingEntry(null); setShowForm(true); };
  const openEdit = (e) => { setEditingEntry(e); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingEntry(null); };

  const handleSave = (form) => {
    if (editingEntry) {
      setEntries(prev => prev.map(e => e.id === form.id ? { ...form } : e));
    } else {
      setEntries(prev => [...prev, {
        ...form,
        id: genId(),
        source: 'manual',
        _original_display_name: form.display_name,
        _original_unit_price: form.unit_price,
        _original_unit_cost: form.unit_cost,
        _original_book_price: form.book_price,
        _original_notes: form.notes,
        _original_unit: form.unit,
      }]);
    }
    closeForm();
  };

  const toggleActive = (id) => setEntries(prev => prev.map(e => e.id === id ? { ...e, is_active: !e.is_active } : e));
  const toggleReview = (id) => setEntries(prev => prev.map(e => e.id === id ? { ...e, needs_review: !e.needs_review } : e));
  const handleInlinePriceUpdate = (id, field, value) => setEntries(prev => prev.map(e =>
    e.id === id ? { ...e, [field]: value, updated_date: new Date().toISOString() } : e
  ));

  // ── CSV Import ──
  const handleCsvImport = (rows) => {
    let added = 0, updated = 0, skipped = 0;
    setEntries(prev => {
      const next = [...prev];
      rows.forEach(row => {
        const name = (row.service_name || '').trim();
        if (!name) { skipped++; return; }
        const idx = next.findIndex(e => e.display_name?.toLowerCase() === name.toLowerCase());
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            ...(row.unit_price != null && { unit_price: row.unit_price }),
            ...(row.unit_cost != null && { unit_cost: row.unit_cost }),
            ...(row.book_price != null && { book_price: row.book_price }),
            ...(row.category && { category: row.category }),
            ...(row.uom && { unit: row.uom }),
            ...(row.type && { type: row.type }),
            ...(row.notes && { notes: row.notes }),
            needs_review: false,
          };
          updated++;
        } else {
          next.push({
            id: genId(),
            display_name: name,
            type: row.type || 'service',
            category: row.category || 'Misc',
            unit: row.uom || 'each',
            unit_price: row.unit_price ?? row.book_price ?? null,
            unit_cost: row.unit_cost ?? null,
            book_price: row.book_price ?? null,
            markup: null,
            notes: row.notes || '',
            is_active: true,
            needs_review: true,
            source: 'csv_import',
            _original_display_name: name,
            _original_unit_price: row.unit_price ?? null,
            _original_unit_cost: row.unit_cost ?? null,
            _original_book_price: row.book_price ?? null,
            _original_notes: row.notes || '',
            _original_unit: row.uom || 'each',
          });
          added++;
        }
      });
      return next;
    });
    return { added, updated, skipped };
  };

  // ── Stats ──
  const total = entries.length;
  const priced = entries.filter(e => e.unit_price != null && e.unit_price !== '').length;
  const unpriced = total - priced;
  const reviewing = entries.filter(e => e.needs_review).length;
  const serviceCount = entries.filter(e => e.type === 'service').length;
  const materialCount = entries.filter(e => e.type === 'material').length;
  const laborCount = entries.filter(e => e.type === 'labor').length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Total',     value: total,         color: 'text-slate-800' },
          { label: 'Services',  value: serviceCount,  color: 'text-blue-600' },
          { label: 'Materials', value: materialCount,  color: 'text-amber-600' },
          { label: 'Labor',     value: laborCount,     color: 'text-purple-600' },
          { label: 'Priced',    value: priced,         color: 'text-green-600' },
          { label: 'Review',    value: reviewing,      color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
            placeholder="Search services, materials, categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {[{ value: 'All', label: 'All' }, ...ITEM_TYPES].map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                typeFilter === t.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
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
          {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Market toggle */}
        <button
          onClick={() => setShowMarket(v => !v)}
          className={`flex items-center gap-2 text-xs font-medium rounded-xl px-3 py-2 border transition flex-shrink-0 ${
            showMarket
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${showMarket ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          Market Ref
        </button>

        {/* Add button */}
        <button onClick={openNew}
          className="flex items-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-xl px-4 py-2 flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Item
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
        onInlinePriceUpdate={handleInlinePriceUpdate}
        showMarket={showMarket}
      />

      {/* Form Modal */}
      {showForm && (
        <PriceBookForm
          entry={editingEntry}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
}