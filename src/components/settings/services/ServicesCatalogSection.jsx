import React, { useState, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { SERVICES_SEED, CATEGORIES } from './servicesSeed';
import ServicesTable from './ServicesTable';
import ServiceForm from './ServiceForm';

const FILTERS = ['All', 'Active', 'Inactive', 'Needs Review'];

function genId() {
  return `svc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ServicesCatalogSection() {
  const [services, setServices] = useState(() => SERVICES_SEED);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingService, setEditingService] = useState(null);   // null = closed, false = new, object = edit
  const [showForm, setShowForm] = useState(false);

  // ── Filtered list ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return services.filter(s => {
      // Status filter
      if (filter === 'Active'      && !s.is_active)    return false;
      if (filter === 'Inactive'    && s.is_active)     return false;
      if (filter === 'Needs Review' && !s.needs_review) return false;
      // Category filter
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      // Search
      if (q) {
        const inName    = s.name.toLowerCase().includes(q);
        const inCat     = s.category.toLowerCase().includes(q);
        const inAliases = s.aliases.some(a => a.includes(q));
        const inDesc    = s.description?.toLowerCase().includes(q);
        if (!inName && !inCat && !inAliases && !inDesc) return false;
      }
      return true;
    });
  }, [services, search, filter, categoryFilter]);

  // ── Handlers ─────────────────────────────────────────────────
  const openNew  = () => { setEditingService(null); setShowForm(true); };
  const openEdit = (svc) => { setEditingService(svc); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingService(null); };

  const handleSave = (form) => {
    if (editingService) {
      setServices(prev => prev.map(s => s.id === form.id ? { ...form } : s));
    } else {
      setServices(prev => [...prev, { ...form, id: genId(), created_from: 'manual' }]);
    }
    closeForm();
  };

  const toggleActive = (id) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
  };

  const toggleReview = (id) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, needs_review: !s.needs_review } : s));
  };

  // ── Stats bar ─────────────────────────────────────────────────
  const total    = services.length;
  const active   = services.filter(s => s.is_active).length;
  const reviewing = services.filter(s => s.needs_review).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Services', value: total,     color: 'text-slate-800' },
          { label: 'Active',         value: active,    color: 'text-green-600' },
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
            placeholder="Search by name, category, or alias…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 focus:outline-none focus:border-blue-400 transition"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Add button */}
        <button onClick={openNew}
          className="flex items-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-xl px-4 py-2 flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Service
        </button>
      </div>

      {/* Table */}
      <ServicesTable
        services={filtered}
        onEdit={openEdit}
        onToggleActive={toggleActive}
        onToggleReview={toggleReview}
      />

      {/* Form Modal */}
      {showForm && (
        <ServiceForm
          service={editingService}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
}