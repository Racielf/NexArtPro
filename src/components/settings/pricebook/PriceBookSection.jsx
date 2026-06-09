import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Loader2, Brain, Sparkles, Upload, X } from 'lucide-react';
import { runPriceBookIntelligence } from '@/agent/agent';
import PriceBookSuggestionsPanel from './PriceBookSuggestionsPanel';
import PriceBookTable from './PriceBookTable';
import PriceBookForm from './PriceBookForm';
import PriceBookImport from './PriceBookImport';
import { 
  loadPriceBook, 
  loadServices, 
  createPriceBookEntry, 
  updatePriceBookEntry, 
  importPriceBookEntries 
} from '@/lib/servicePersistence';
import { PRICE_BOOK_CATEGORIES } from './priceBookCategories';

export default function PriceBookSection() {
  const [entries, setEntries] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brainResult, setBrainResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Active', 'Needs Review'
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals & Panels state
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    Promise.all([loadPriceBook(), loadServices()])
      .then(([pbData, svcData]) => {
        setEntries(pbData);
        setServices(svcData);
      })
      .catch(err => {
        console.error('Failed to load Price Book data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const runBrain = async () => {
    setAnalyzing(true);
    try {
      const result = await runPriceBookIntelligence(entries, services);
      setBrainResult(result);
    } catch (err) {
      console.error('Price Book Intelligence analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingEntry) {
        await updatePriceBookEntry(formData.id, formData, services);
      } else {
        await createPriceBookEntry(formData, services);
      }
      const refreshed = await loadPriceBook();
      setEntries(refreshed);
      setShowForm(false);
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to save Price Book entry:', err);
    }
  };

  const handleToggleActive = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    try {
      await updatePriceBookEntry(id, { is_active: !entry.is_active }, services);
      const refreshed = await loadPriceBook();
      setEntries(refreshed);
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const handleToggleReview = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    try {
      await updatePriceBookEntry(id, { needs_review: !entry.needs_review }, services);
      const refreshed = await loadPriceBook();
      setEntries(refreshed);
    } catch (err) {
      console.error('Failed to toggle needs_review status:', err);
    }
  };

  const handleInlinePriceUpdate = async (id, field, value) => {
    try {
      await updatePriceBookEntry(id, { [field]: value }, services);
      const refreshed = await loadPriceBook();
      setEntries(refreshed);
    } catch (err) {
      console.error('Failed to inline update price:', err);
    }
  };

  const handleImport = async (rows) => {
    try {
      const summary = await importPriceBookEntries(rows, entries, services);
      const refreshed = await loadPriceBook();
      setEntries(refreshed);
      return summary;
    } catch (err) {
      console.error('Failed to import Price Book entries:', err);
      throw err;
    }
  };

  const openNew = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  // Filtered entries
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter(e => {
      // Status filter
      if (filter === 'Active' && !e.is_active) return false;
      if (filter === 'Needs Review' && !e.needs_review) return false;

      // Category filter
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;

      // Search filter
      if (q) {
        const inName = (e.display_name || '').toLowerCase().includes(q);
        const inCat = (e.category || '').toLowerCase().includes(q);
        const inNotes = (e.notes || '').toLowerCase().includes(q);
        if (!inName && !inCat && !inNotes) return false;
      }
      return true;
    });
  }, [entries, search, filter, categoryFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Loading Price Book…</span>
      </div>
    );
  }

  const total = entries.length;
  const activeCount = entries.filter(e => e.is_active).length;
  const reviewCount = entries.filter(e => e.needs_review).length;

  return (
    <div className="space-y-6">
      {/* Header and Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Price Book</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your service catalog price reference sheets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Analyze Price Book */}
          <button
            onClick={runBrain}
            disabled={analyzing}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-indigo-100 transition duration-150 select-none disabled:opacity-50 ${
              analyzing ? 'cursor-not-allowed' : ''
            }`}
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            {analyzing ? 'Analyzing Price Book...' : 'Analyze Price Book'}
          </button>

          {/* Import CSV */}
          <button
            onClick={() => setShowImport(!showImport)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition ${
              showImport
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>

          {/* Add Item */}
          <button
            onClick={openNew}
            className="flex items-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-xl px-4 py-2 flex-shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Intelligence Suggestions Panel */}
      {brainResult?.suggestionQueue?.length > 0 && (
        <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Market Price Book Intelligence</h3>
          </div>
          <PriceBookSuggestionsPanel
            suggestions={brainResult.suggestionQueue}
            services={services}
            onApplied={async () => {
              const refreshed = await loadPriceBook();
              setEntries(refreshed);
            }}
          />
        </div>
      )}

      {/* Collapsible Import Panel */}
      {showImport && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative">
          <button
            onClick={() => setShowImport(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="max-w-3xl">
            <PriceBookImport onImport={handleImport} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Items', value: total, color: 'text-slate-800' },
          { label: 'Active Items', value: activeCount, color: 'text-green-600' },
          { label: 'Needs Review', value: reviewCount, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
            placeholder="Search by item name, notes, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {['All', 'Active', 'Needs Review'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                filter === f
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <select
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 focus:outline-none focus:border-blue-400 transition"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {PRICE_BOOK_CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      <PriceBookTable
        entries={filtered}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
        onToggleReview={handleToggleReview}
        onInlinePriceUpdate={handleInlinePriceUpdate}
        showMarket={true}
      />

      {/* Edit/Add Form Modal */}
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