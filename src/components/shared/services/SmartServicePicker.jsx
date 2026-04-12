import React, { useState, useEffect, useRef, useCallback } from 'react';
import { buildTempService } from './serviceSearch';
import { searchServicesUnified } from './serviceSearchUnified';
import { Plus, BookOpen, Tag, Database } from 'lucide-react';

const UNIT_DISPLAY = {
  each: 'ea', sqft: 'sqft', linear_ft: 'ln ft', room: 'room', wall: 'wall',
  door: 'door', window: 'win', box: 'box', gallon: 'gal', bag: 'bag',
  hour: 'hr', day: 'day', project: 'proj', custom: 'custom',
  // also pass through existing ea/hr/sq ft values unchanged
};

function unitDisplay(u) {
  return UNIT_DISPLAY[u] || u || 'ea';
}

const CAT_COLORS = {
  'Painting': 'bg-blue-50 text-blue-600',
  'Drywall': 'bg-gray-100 text-gray-600',
  'Flooring': 'bg-amber-50 text-amber-600',
  'Carpentry': 'bg-orange-50 text-orange-600',
  'Bathroom Remodeling': 'bg-teal-50 text-teal-600',
  'Kitchen Remodeling': 'bg-green-50 text-green-600',
  'Demolition': 'bg-red-50 text-red-600',
  'Doors & Windows': 'bg-purple-50 text-purple-600',
  'Siding & Exterior': 'bg-lime-50 text-lime-600',
  'Framing': 'bg-yellow-50 text-yellow-600',
  'Trim & Finish': 'bg-pink-50 text-pink-600',
  'Tile': 'bg-cyan-50 text-cyan-600',
  'Repairs': 'bg-rose-50 text-rose-600',
  'Cleaning & Final Touch': 'bg-sky-50 text-sky-600',
  'Concrete': 'bg-stone-100 text-stone-600',
  'Misc': 'bg-slate-100 text-slate-500',
};

/**
 * SmartServicePicker
 *
 * Drop-in replacement for a plain text input in line items.
 * Props:
 *   value        — current service_name string
 *   onChange     — (name: string) => void  — called on every keystroke
 *   onSelect     — ({ name, unit, unit_price, unit_cost, description }) => void
 *   placeholder  — string
 *   className    — extra classes for the input
 */
export default function SmartServicePicker({ value, onChange, onSelect, placeholder = 'Service name', className = '' }) {
  const [query, setQuery]     = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value changes (e.g. reset on new item)
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Search whenever query changes — unified search across seed + Base44
  // Debounced to avoid rapid-fire API calls on fast typing
  useEffect(() => {
    if (!focused || query.trim().length < 1) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchServicesUnified(query).then(hits => {
        if (cancelled) return;
        setResults(hits);
        setOpen(hits.length > 0 || query.trim().length >= 2);
      });
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, focused]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v); // keep parent in sync as user types
  };

  const handleSelect = (result) => {
    const name = result.name;
    setQuery(name);
    setOpen(false);
    setFocused(false);
    // NOTE: Do NOT call onChange(name) here — onSelect builds the full item.
    // Calling onChange first would trigger a state update with stale pricing (zeros),
    // which can race with onSelect and overwrite the correct prices.
    const picked = {
      service_id: result.id || null,
      name,
      description: result.description || '',
      unit: unitDisplay(result.unit),
      unit_price: result.unit_price != null ? Number(result.unit_price) : null,
      unit_cost:  result.unit_cost != null ? Number(result.unit_cost) : null,
      book_price: result.book_price != null ? Number(result.book_price) : null,
      category:   result.category || 'Misc',
      type:       result.type || 'service',
      source:     result.source || 'seed',
      _from_picker: true,
    };
    onSelect(picked);
  };

  const handleCreateNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const temp = buildTempService(trimmed);
    setOpen(false);
    setFocused(false);
    // NOTE: Same as handleSelect — skip onChange to avoid stale-price race.
    onSelect({
      service_id: null,
      name: trimmed,
      description: '',
      unit: 'ea',
      unit_price: 0,
      unit_cost: 0,
      category: 'Misc',
      type: 'service',
      source: 'custom',
      _from_picker: true,
      _is_new: true,
    });
  };

  const showCreate = focused && query.trim().length >= 2 && !results.some(r => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-[340px] max-h-72 overflow-y-auto">
          {results.length > 0 && (
            <div className="py-1.5">
              {results.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleSelect(r); }}
                  className="w-full px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left group"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {r.source === 'base44'
                      ? <Database className="w-3.5 h-3.5 text-emerald-400" />
                      : r.source === 'seed'
                        ? <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        : <Tag className="w-3.5 h-3.5 text-slate-300" />
                    }
                  </div>

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{r.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CAT_COLORS[r.category] || 'bg-slate-100 text-slate-500'}`}>
                        {r.category}
                      </span>
                      <span className="text-[10px] text-slate-400">{unitDisplay(r.unit)}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 text-right">
                    {r.unit_price !== null
                      ? <span className="text-sm font-bold text-slate-800">${parseFloat(r.unit_price).toFixed(2)}</span>
                      : <span className="text-xs text-slate-300">no price</span>
                    }
                    <p className="text-[10px] text-slate-400">/{unitDisplay(r.unit)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Create new */}
          {showCreate && (
            <div className={results.length > 0 ? 'border-t border-slate-100' : ''}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); handleCreateNew(); }}
                className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-blue-50 transition-colors text-left group"
              >
                <Plus className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-600">Create "{query.trim()}"</p>
                  <p className="text-[10px] text-slate-400">Add as new service · marked for review</p>
                </div>
              </button>
            </div>
          )}

          {/* No results hint */}
          {results.length === 0 && !showCreate && query.trim().length >= 2 && (
            <div className="px-4 py-4 text-center text-xs text-slate-400">
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}