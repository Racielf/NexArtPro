/**
 * MaterialsSection — Optional structured materials block for estimates.
 * Renders as an addable/removable section with a table of material items.
 * Each item: name, description, qty, unit, unit_price, unit_cost (internal), line_total.
 */
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X, Package, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { calculateLineTotal } from '@/lib/estimateEngine';

const uid = () => Math.random().toString(36).slice(2, 10);
const UNITS = ['ea', 'bag', 'ton', 'cu yd', 'sq ft', 'ln ft', 'gal', 'box', 'roll', 'pallet', 'lump sum'];

const emptyMaterial = () => ({
  id: uid(),
  name: '',
  description: '',
  quantity: 1,
  unit: 'ea',
  unit_price: 0,
  unit_cost: 0,
  line_total: 0,
});

function MaterialRow({ item, onUpdate, onRemove, showCost }) {
  const update = (field, value) => {
    const numericFields = new Set(['quantity', 'unit_price', 'unit_cost']);
    const safeValue = numericFields.has(field) ? (parseFloat(value) || 0) : value;
    const updated = { ...item, [field]: safeValue };
    updated.line_total = calculateLineTotal(
      field === 'quantity' ? safeValue : updated.quantity,
      field === 'unit_price' ? safeValue : updated.unit_price,
    );
    onUpdate(updated);
  };

  return (
    <div className="grid items-center gap-2 px-4 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
      style={{ gridTemplateColumns: '3fr minmax(48px,60px) minmax(56px,76px) minmax(80px,100px) minmax(56px,90px) minmax(80px,100px) 28px' }}>
      {/* Name + description */}
      <div className="min-w-0">
        <Input
          value={item.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Material name"
          className="h-7 text-sm font-semibold border-transparent hover:border-slate-200 focus:border-primary bg-transparent hover:bg-white focus:bg-white px-2 rounded-md"
        />
        <Input
          value={item.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Description (optional)"
          className="h-6 text-xs text-slate-500 border-transparent hover:border-slate-200 focus:border-primary bg-transparent hover:bg-white focus:bg-white px-2 rounded-md mt-0.5"
        />
      </div>

      {/* Qty */}
      <Input type="number" value={item.quantity} onChange={e => update('quantity', e.target.value)}
        className="h-7 text-sm text-center border-slate-200 font-semibold px-1" min={0} />

      {/* Unit */}
      <select value={item.unit} onChange={e => update('unit', e.target.value)}
        className="h-7 text-[11px] border border-slate-200 rounded px-1 bg-white text-slate-600 font-medium">
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      {/* Unit Price */}
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
        <Input type="number" step="0.01" value={item.unit_price}
          onChange={e => update('unit_price', e.target.value)}
          className="h-7 pl-4 pr-1 text-sm text-right font-semibold border-slate-200" min={0} />
      </div>

      {/* Unit Cost (internal) */}
      {showCost ? (
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
          <Input type="number" step="0.01" value={item.unit_cost}
            onChange={e => update('unit_cost', e.target.value)}
            className="h-7 pl-4 text-sm text-right border-slate-200 bg-amber-50/60" min={0} />
        </div>
      ) : <div />}

      {/* Line total */}
      <div className="text-right text-sm font-bold text-slate-900 tabular-nums">
        ${(parseFloat(item.line_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>

      {/* Remove */}
      <button onClick={() => onRemove(item.id)}
        className="flex justify-center p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function MaterialsSection({ materials = [], onChange, showCost = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasMaterials = materials.length > 0;

  // Not enabled yet — show add button
  if (!hasMaterials) {
    return (
      <button
        onClick={() => onChange([emptyMaterial()])}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-600 border border-dashed border-slate-200 hover:border-emerald-300 rounded-xl w-full py-2.5 justify-center transition-colors bg-white/60 hover:bg-white"
      >
        <Package className="w-4 h-4" />
        Add materials section
      </button>
    );
  }

  const materialsSubtotal = materials.reduce((s, m) => s + (parseFloat(m.line_total) || 0), 0);
  const materialsCost = materials.reduce((s, m) => s + (parseFloat(m.unit_cost) || 0) * (parseFloat(m.quantity) || 0), 0);

  const updateItem = (updated) => onChange(materials.map(m => m.id === updated.id ? updated : m));
  const removeItem = (id) => {
    const next = materials.filter(m => m.id !== id);
    onChange(next);
  };
  const addItem = () => onChange([...materials, emptyMaterial()]);

  return (
    <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-emerald-800 text-white">
        <button onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Package className="w-3.5 h-3.5 opacity-70" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 leading-none mb-0.5">Section</p>
            <span className="font-bold text-sm tracking-wide">Materials</span>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <span className="text-[11px] text-white/60">{materials.length} item{materials.length !== 1 ? 's' : ''}</span>
          <span className="text-sm font-bold text-white tabular-nums">${materialsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          {showCost && materialsCost > 0 && (
            <span className="text-[10px] font-semibold text-emerald-300 tabular-nums">cost ${materialsCost.toFixed(2)}</span>
          )}
          <button onClick={() => onChange([])}
            className="p-1 rounded hover:bg-red-500/30 text-white/40 hover:text-white transition-colors"
            title="Remove materials section">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div className="grid text-[10px] text-slate-400 font-semibold uppercase tracking-wide px-4 py-2 bg-slate-50 border-b border-slate-100"
            style={{ gridTemplateColumns: '3fr minmax(48px,60px) minmax(56px,76px) minmax(80px,100px) minmax(56px,90px) minmax(80px,100px) 28px' }}>
            <div>Material</div>
            <div className="text-center">Qty</div>
            <div className="text-center">Unit</div>
            <div className="text-right">Unit Price</div>
            <div className={`text-right ${showCost ? 'text-amber-600' : ''}`}>{showCost ? 'Cost' : ''}</div>
            <div className="text-right">Total</div>
            <div />
          </div>

          {/* Rows */}
          <div className="min-h-[40px]">
            {materials.map(item => (
              <MaterialRow key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} showCost={showCost} />
            ))}
          </div>

          {/* Section Total Row */}
          <div className="px-6 py-3 border-t border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Materials Total</span>
            <div className="flex items-center gap-5">
              {showCost && materialsCost > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Internal cost · </span>
                  <span className="text-sm font-bold text-amber-700 tabular-nums">${materialsCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <span className="text-base font-bold text-emerald-900 tabular-nums">
                ${materialsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Add row */}
          <div className="px-6 py-2.5 border-t border-emerald-100 bg-white">
            <button onClick={addItem}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              <Plus className="w-4 h-4" />Add material item
            </button>
          </div>
        </>
      )}
    </div>
  );
}