import React, { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { UNITS } from '@/components/settings/services/servicesSeed';
import { ITEM_TYPES, PRICE_BOOK_CATEGORIES } from './priceBookCategories';
import { getMarketReference, getPriceIndicator, formatDiff } from './marketUtils';

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

const EMPTY = {
  display_name: '',
  type: 'service',
  category: '',
  unit: 'sqft',
  unit_price: '',
  unit_cost: '',
  book_price: '',
  markup: '',
  notes: '',
  is_active: true,
  needs_review: false,
  source: 'manual',
};

export default function PriceBookForm({ entry, onSave, onClose }) {
  const [form, setForm] = useState(entry
    ? { ...entry, unit_price: entry.unit_price ?? '', unit_cost: entry.unit_cost ?? '', book_price: entry.book_price ?? '', markup: entry.markup ?? '' }
    : { ...EMPTY }
  );

  useEffect(() => {
    if (entry) {
      setForm({ ...entry, unit_price: entry.unit_price ?? '', unit_cost: entry.unit_cost ?? '', book_price: entry.book_price ?? '', markup: entry.markup ?? '' });
    } else {
      setForm({ ...EMPTY });
    }
  }, [entry]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.display_name.trim()) return;
    onSave({
      ...form,
      unit_price:  form.unit_price  !== '' ? parseFloat(form.unit_price)  : null,
      unit_cost:   form.unit_cost   !== '' ? parseFloat(form.unit_cost)   : null,
      book_price:  form.book_price  !== '' ? parseFloat(form.book_price)  : null,
      markup:      form.markup      !== '' ? parseFloat(form.markup)      : null,
    });
  };

  // Computed margin
  const up = parseFloat(form.unit_price) || 0;
  const uc = parseFloat(form.unit_cost) || 0;
  const margin = up > 0 && uc > 0 ? (((up - uc) / up) * 100).toFixed(1) : null;

  // Market reference
  const marketRef = getMarketReference(form);
  const indicator = up > 0 ? getPriceIndicator(up, marketRef) : null;
  const diff = up > 0 && marketRef ? formatDiff(up, marketRef.avg) : null;

  // Audit originals
  const hasOriginals = entry && (entry._original_display_name !== undefined || entry._original_unit_price !== undefined);
  const originalChanged = hasOriginals && (
    form.display_name !== entry._original_display_name ||
    String(form.unit_price) !== String(entry._original_unit_price) ||
    String(form.unit_cost) !== String(entry._original_unit_cost) ||
    form.notes !== entry._original_notes
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{entry ? 'Edit Price Book Item' : 'Add Price Book Item'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Type selector */}
          <div>
            <label className={labelCls}>Item Type *</label>
            <div className="flex gap-2">
              {ITEM_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => set('type', t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    form.type === t.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.display_name}
              onChange={e => set('display_name', e.target.value)}
              placeholder="e.g. Drywall Install per sqft" />
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">— select —</option>
                {PRICE_BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select className={inputCls} value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing — 3 columns */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className={`${labelCls} mb-0`}>Pricing</label>
              <span className="text-[10px] text-slate-300 italic">unit_price drives estimates · book_price is reference only</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-blue-600 mb-1">Unit Price (sell)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input className={`${inputCls} pl-7`} type="number" min="0" step="0.01"
                    value={form.unit_price} onChange={e => set('unit_price', e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Unit Cost (internal)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input className={`${inputCls} pl-7`} type="number" min="0" step="0.01"
                    value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Book Price (ref only)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input className={`${inputCls} pl-7`} type="number" min="0" step="0.01"
                    value={form.book_price} onChange={e => set('book_price', e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>

          {/* Margin preview */}
          {margin !== null && (
            <div className={`text-xs rounded-lg px-3 py-2 font-medium ${parseFloat(margin) >= 20 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              Gross margin: {margin}% &nbsp;(${(up - uc).toFixed(2)} per {form.unit || 'unit'})
            </div>
          )}

          {/* Market Reference */}
          {marketRef && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Market Reference (Oregon 2026)</p>
                {indicator && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${indicator.badgeCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${indicator.dotCls}`} />
                    {indicator.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{ label: 'Low', val: marketRef.low }, { label: 'Avg', val: marketRef.avg }, { label: 'High', val: marketRef.high }].map(r => (
                  <div key={r.label}>
                    <p className="text-xs text-slate-400 mb-0.5">{r.label}</p>
                    <p className="text-sm font-semibold text-slate-700">${r.val}</p>
                  </div>
                ))}
              </div>
              {diff && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
                  <span>Your price vs. market avg:</span>
                  <span className={`font-semibold ${indicator?.status === 'below' ? 'text-emerald-600' : indicator?.status === 'above' ? 'text-rose-600' : 'text-amber-600'}`}>{diff}</span>
                </div>
              )}
              <p className="text-[10px] text-slate-300 pt-0.5">Reference only — your prices are never changed automatically</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Scope notes, exclusions, conditions…" />
          </div>

          {/* Audit Reference */}
          {hasOriginals && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Lock className="w-3 h-3 text-amber-500" />
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Original Reference (Audit)</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Original name:</span>
                  <p className="text-slate-600 font-semibold truncate">{entry._original_display_name || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Original unit price:</span>
                  <p className="text-slate-600 font-semibold">{entry._original_unit_price != null ? `$${parseFloat(entry._original_unit_price).toFixed(2)}` : '—'}</p>
                </div>
              </div>
              {originalChanged && (
                <div className="pt-2 border-t border-amber-200 text-[10px] text-amber-700 font-medium">
                  ⚠ This record has been modified from its original imported value.
                </div>
              )}
            </div>
          )}

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
            {entry ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}