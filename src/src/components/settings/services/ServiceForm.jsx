import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, UNITS } from './servicesSeed';

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

const EMPTY = {
  name: '', category: CATEGORIES[0], description: '',
  default_unit: 'each', aliases: [], is_active: true,
  needs_review: false, created_from: 'manual',
};

export default function ServiceForm({ service, onSave, onClose }) {
  const [form, setForm] = useState(service ? { ...service } : { ...EMPTY });
  const [aliasInput, setAliasInput] = useState('');

  useEffect(() => {
    setForm(service ? { ...service } : { ...EMPTY });
    setAliasInput('');
  }, [service]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addAlias = () => {
    const v = aliasInput.trim().toLowerCase();
    if (!v || form.aliases.includes(v)) return;
    set('aliases', [...form.aliases, v]);
    setAliasInput('');
  };

  const removeAlias = (a) => set('aliases', form.aliases.filter(x => x !== a));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">
            {service ? 'Edit Service' : 'Add Service'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Name */}
          <div>
            <label className={labelCls}>Service Name *</label>
            <input className={inputCls} value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="e.g. Interior Wall Painting" />
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Default Unit</label>
              <select className={inputCls} value={form.default_unit} onChange={e => set('default_unit', e.target.value)}>
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={2} value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Short description of the service" />
          </div>

          {/* Aliases */}
          <div>
            <label className={labelCls}>Aliases</label>
            <div className="flex gap-2 mb-2">
              <input
                className={`${inputCls} flex-1`}
                value={aliasInput}
                onChange={e => setAliasInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                placeholder="Add alias, press Enter"
              />
              <button onClick={addAlias}
                className="px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                Add
              </button>
            </div>
            {form.aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.aliases.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1">
                    {a}
                    <button onClick={() => removeAlias(a)} className="text-slate-400 hover:text-red-500 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${form.is_active ? 'bg-blue-500' : 'bg-slate-200'}`}
                style={{ height: 22 }}>
                <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`}
                  style={{ width: 18, height: 18 }} />
              </button>
              <span className="text-sm text-slate-700">Active</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button type="button" onClick={() => set('needs_review', !form.needs_review)}
                className={`relative w-10 rounded-full transition-colors duration-200 flex-shrink-0 ${form.needs_review ? 'bg-amber-400' : 'bg-slate-200'}`}
                style={{ height: 22 }}>
                <span className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.needs_review ? 'translate-x-5' : 'translate-x-0'}`}
                  style={{ width: 18, height: 18 }} />
              </button>
              <span className="text-sm text-slate-700">Needs Review</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.name.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-lg disabled:opacity-40">
            {service ? 'Save Changes' : 'Add Service'}
          </button>
        </div>
      </div>
    </div>
  );
}