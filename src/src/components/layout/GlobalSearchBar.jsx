import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, ClipboardList, Users, Package, X, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { key: 'workOrders',  label: 'Work Orders', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
  { key: 'customers',  label: 'Customers',   icon: Users,          color: 'text-emerald-600 bg-emerald-50' },
  { key: 'materials',  label: 'Materials',   icon: Package,        color: 'text-amber-600 bg-amber-50' },
];

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ workOrders: [], customers: [], materials: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const totalResults = results.workOrders.length + results.customers.length + results.materials.length;

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults({ workOrders: [], customers: [], materials: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [workOrders, customers, materials] = await Promise.all([
        base44.entities.WorkOrder.list('-created_date', 200),
        base44.entities.Customer.list('-created_date', 200),
        base44.entities.Material.list('-created_date', 200),
      ]);

      const lq = q.toLowerCase();
      const filterWO = (workOrders || []).filter(wo =>
        (wo.client_name || '').toLowerCase().includes(lq) ||
        (wo.title || '').toLowerCase().includes(lq) ||
        String(wo.work_order_number || '').includes(lq)
      ).slice(0, 5);

      const filterCustomers = (customers || []).filter(c =>
        (c.display_name || `${c.first_name} ${c.last_name}`).toLowerCase().includes(lq) ||
        (c.email || '').toLowerCase().includes(lq) ||
        (c.phone || '').includes(lq)
      ).slice(0, 5);

      const filterMaterials = (materials || []).filter(m =>
        (m.name || '').toLowerCase().includes(lq) ||
        (m.sku || '').toLowerCase().includes(lq) ||
        (m.category || '').toLowerCase().includes(lq)
      ).slice(0, 5);

      setResults({ workOrders: filterWO, customers: filterCustomers, materials: filterMaterials });
    } catch (err) {
      console.warn('[GlobalSearch] search failed:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults({ workOrders: [], customers: [], materials: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (type, item) => {
    setOpen(false);
    setQuery('');
    if (type === 'workOrders') navigate(`/work-orders/${item.id}`);
    else if (type === 'customers') navigate(`/customers`);
    else if (type === 'materials') navigate(`/settings`);
  };

  const getItemLabel = (type, item) => {
    if (type === 'workOrders') return `WO #${item.work_order_number} — ${item.client_name}`;
    if (type === 'customers') return item.display_name || `${item.first_name} ${item.last_name}`;
    if (type === 'materials') return item.name;
    return '';
  };

  const getItemSub = (type, item) => {
    if (type === 'workOrders') return item.title || item.status;
    if (type === 'customers') return item.email || item.phone || '';
    if (type === 'materials') return item.sku ? `SKU: ${item.sku}` : (item.category || '');
    return '';
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div className="relative w-full max-w-sm">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search work orders, customers, materials… ⌘K"
          className="w-full pl-8 pr-8 h-8 rounded-lg bg-muted/60 text-sm placeholder:text-muted-foreground border border-border/60 outline-none focus:ring-1 focus:ring-ring transition"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
        ) : query ? (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1.5 left-0 w-full min-w-[380px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {totalResults === 0 && !loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No results for "<span className="font-medium text-slate-600">{query}</span>"
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {CATEGORIES.map(cat => {
                const items = results[cat.key];
                if (!items || items.length === 0) return null;
                const Icon = cat.icon;
                return (
                  <div key={cat.key}>
                    <div className="px-4 py-2 flex items-center gap-2 bg-slate-50">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${cat.color}`}>
                        <Icon className="w-3 h-3" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{cat.label}</span>
                    </div>
                    {items.map(item => {
                      const label = getItemLabel(cat.key, item);
                      const sub = getItemSub(cat.key, item);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(cat.key, item)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 group"
                        >
                          <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${cat.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700">
                              {highlight(label, query)}
                            </p>
                            {sub && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">
                                {highlight(sub, query)}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
            <span className="text-[11px] text-slate-400">↵ to select · Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}