import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SERVICES_SEED, UNITS, CATEGORIES } from '@/components/settings/services/servicesSeed';

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

const EMPTY = {
  service_id: '',
  display_name: '',
  category: '',
  unit: 'each',
  base_price: '',
  estimated_cost: '',
  markup: '',
  notes: '',
  is_active: true,
  needs_review: false,
  source: 'manual',
};

export default function PriceBookForm({ entry, services, onSave, onClose }) {
  const [form, setForm] = useState(entry ? { ...entry, base_price: entry.base_price ?? '', estimated_cost: entry.estimated_cost ?? '', markup: entry.markup ?? '' } : { ...EMPTY });

  useEffect(() => {
    if (entry) {
      setForm({ ...entry, base_price: entry.base_price ?? '', estimated_cost: entry.estimated_cost ?? '', markup: entry.markup ?? '' });
    } else {
      setForm({ ...EMPTY });
    }
  }, [entry]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Auto-fill when a service is selected
  const handleServiceSelect = (svcId) => {
    const svc = services.find(s => s.id === svcId);
    if (!svc) { set('service_id', ''); return; }
    setForm(f => ({
      ...f,
      service_id: svcId,
      display_name: svc.name,
      category: svc.category,
      unit: svc.default_unit,
    }));
  };

  const handleSave = () => {
    if (!form.display_name.trim()) return;
    onSave({
      ...form,
      base_price:     form.base_price    !== '' ? parseFloat(form.base_price)    : null,
      estimated_cost: form.estimated_cost !== '' ? parseFloat(form.estimated_cost): null,
      markup:         form.markup        !== '' ? parseFloat(form.markup)        : null,
    });
  };

  // Computed margin preview
  const bp = parseFloat(form.base_price) || 0;
  const ec = parseFloat(form.estimated_cost) || 0;
  const margin = bp > 0 && ec > 0 ? (((bp - ec) / bp) * 100).toFixed(1) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{entry ? 'Edit Price Entry' : 'Add Price Entry'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Service selector */}
          <div>
            <label className={labelCls}>Link to Service (optional)</label>
            <select className={inputCls} value={form.service_id || ''} onChange={e => handleServiceSelect(e.target.value)}>
              <option value="">— select a service —</option>
              {services.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Auto-fills name, category, and unit</p>
          </div>

          {/* Display Name */}
          <div>
            <label className={labelCls}>Display Name *</label>
            <input className={inputCls} value={form.display_name}
              onChange={e => set('display_name', e.target.value)}
              placeholder="e.g. Interior Wall Painting" />
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">— select —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select className={inputCls} value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Base Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input className={`${inputCls} pl-7`} type="number" min="0" step="0.01"
                  value={form.base_price} onChange={e => set('base_price', e.target.value)}
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Est. Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input className={`${inputCls} pl-7`} type="number" min="0" step="0.01"
                  value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)}
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Markup %</label>
              <div className="relative">
                <input className={`${inputCls} pr-7`} type="number" min="0" step="1"
                  value={form.markup} onChange={e => set('markup', e.target.value)}
                  placeholder="—" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Margin preview */}
          {margin !== null && (
            <div className={`text-xs rounded-lg px-3 py-2 font-medium ${parseFloat(margin) >= 20 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              Gross margin: {margin}% &nbsp;(${(bp - ec).toFixed(2)} per {form.unit || 'unit'})
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Scope notes, exclusions, conditions…" />
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-1">
            {[
              { label: 'Active', key: 'is_active', color: 'bg-blue-500' },
              { label: 'Needs Review', key: 'needs_review', color: 'bg-amber-400' },
            ].map(t => (
              <label key={t.key} className="flex items-center gap-2.5 cursor-pointer">
                <button type="button" onClick={() => set(t.key, !form[t.key])}
                  className={`relative rounded-full transition-colors duration-200 flex-shrink-0 ${form[t.key] ? t.color : 'bg-slate-200'}`}
                  style={{ width: 40, height: 22 }}>
                  <span className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form[t.key] ? 'translate-x-[18px]' : 'translate-x-0'}`}
                    style={{ width: 18, height: 18 }} />
                </button>
                <span className="text-sm text-slate-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.display_name.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-lg disabled:opacity-40">
            {entry ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}