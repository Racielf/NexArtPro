import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { CATEGORIES } from './servicesSeed';
import ServicesTable from './ServicesTable';
import ServiceForm from './ServiceForm';
import { loadServices, createService, updateService } from '@/lib/servicePersistence';

const FILTERS = ['All', 'Active', 'Inactive', 'Needs Review'];

// genId no longer needed — Base44 generates IDs on create

export default function ServicesCatalogSection() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingService, setEditingService] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Load from persistent source on mount
  useEffect(() => {
    loadServices()
      .then(data => setServices(data))
      .finally(() => setLoading(false));
  }, []);

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
        const inName    = (s.name || '').toLowerCase().includes(q);
        const inCat     = (s.category || '').toLowerCase().includes(q);
        const inDesc    = (s.description || '').toLowerCase().includes(q);
        if (!inName && !inCat && !inDesc) return false;
      }
      return true;
    });
  }, [services, search, filter, categoryFilter]);

  // ── Handlers ─────────────────────────────────────────────────
  const openNew  = () => { setEditingService(null); setShowForm(true); };
  const openEdit = (svc) => { setEditingService(svc); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingService(null); };

  const handleSave = async (form) => {
    if (editingService) {
      await updateService(form.id, {
        name: form.name,
        category: form.category,
        description: form.description,
        unit: form.default_unit || form.unit || 'each',
        is_active: form.is_active,
      });
      setServices(prev => prev.map(s => s.id === form.id ? { ...s, ...form } : s));
    } else {
      const created = await createService({
        name: form.name,
        category: form.category,
        description: form.description || '',
        unit: form.default_unit || form.unit || 'each',
        type: 'service',
        is_active: true,
      });
      setServices(prev => [...prev, created]);
    }
    closeForm();
  };

  const toggleActive = async (id) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    await updateService(id, { is_active: !svc.is_active });
    setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
  };

  const toggleReview = async (id) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    // needs_review is UI-only, not on entity — just toggle local
    setServices(prev => prev.map(s => s.id === id ? { ...s, needs_review: !s.needs_review } : s));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Loading services catalog…</span>
      </div>
    );
  }

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