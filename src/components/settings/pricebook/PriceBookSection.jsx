import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { PRICE_BOOK_CATEGORIES, ITEM_TYPES } from './priceBookCategories';
import PriceBookTable from './PriceBookTable';
import PriceBookForm from './PriceBookForm';
import PriceBookImport from './PriceBookImport';
import { loadPriceBook, createPriceBookEntry, updatePriceBookEntry, importPriceBookEntries, loadServices } from '@/lib/servicePersistence';

const STATUS_FILTERS = ['All', 'Active', 'Inactive', 'Needs Review', 'Priced', 'Unpriced'];

// genId no longer needed — Base44 generates IDs on create

export default function PriceBookSection() {
  const [entries, setEntries] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [catFilter, setCatFilter]       = useState('All');
  const [showForm, setShowForm]   = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showMarket, setShowMarket]     = useState(true);

  // Load from persistent source on mount
  useEffect(() => {
    Promise.all([loadPriceBook(), loadServices()])
      .then(([pbData, svcData]) => {
        setEntries(pbData);
        setServices(svcData);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const handleSave = async (form) => {
    const payload = {
      display_name: form.display_name,
      service_id: form.service_id || '',
      type: form.type || 'service',
      category: form.category || 'Misc',
      unit: form.unit || 'each',
      unit_price: form.unit_price ?? 0,
      unit_cost: form.unit_cost ?? 0,
      book_price: form.book_price ?? 0,
      markup: form.markup ?? 0,
      notes: form.notes || '',
      is_active: form.is_active !== false,
      needs_review: form.needs_review || false,
    };
    if (editingEntry) {
      await updatePriceBookEntry(form.id, payload, services);
      setEntries(prev => prev.map(e => e.id === form.id ? { ...e, ...payload } : e));
    } else {
      const created = await createPriceBookEntry({ ...payload, source: 'manual' }, services);
      setEntries(prev => [...prev, created]);
    }
    closeForm();
  };

  const toggleActive = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    await updatePriceBookEntry(id, { is_active: !entry.is_active }, services);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_active: !e.is_active } : e));
  };
  const toggleReview = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    await updatePriceBookEntry(id, { needs_review: !entry.needs_review }, services);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, needs_review: !e.needs_review } : e));
  };
  const handleInlinePriceUpdate = async (id, field, value) => {
    await updatePriceBookEntry(id, { [field]: value }, services);
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  // ── CSV Import ──
  const handleCsvImport = async (rows) => {
    const result = await importPriceBookEntries(rows, entries, services);
    // Reload all entries from persistent source
    const refreshed = await loadPriceBook();
    setEntries(refreshed);
    return result;
  };

  // ── Stats ──
  const total = entries.length;
  const priced = entries.filter(e => e.unit_price != null && e.unit_price !== '').length;
  const unpriced = total - priced;
  const reviewing = entries.filter(e => e.needs_review).length;
  const serviceCount = entries.filter(e => e.type === 'service').length;
  const materialCount = entries.filter(e => e.type === 'material').length;
  const laborCount = entries.filter(e => e.type === 'labor').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Loading price book…</span>
      </div>
    );
  }

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