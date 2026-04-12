/**
 * OtherCostsSection — Internal-only job-level cost entries.
 *
 * Tracks expenses not captured in line item unit_cost:
 * helper labor, gas, permits, dump fees, etc.
 *
 * Props:
 *   otherCosts — array of { id, name, amount, note }
 *   onChange   — (updated: array) => void
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus, X, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 10);

const SUGGESTIONS = [
  'Helper labor',
  'Gas / Fuel',
  'Mileage / Travel',
  'Equipment rental',
  'Permits',
  'Dump fees',
  'Misc materials',
  'Other',
];

function CostRow({ item, onUpdate, onRemove }) {
  const update = (field, value) => {
    const val = field === 'amount' ? (parseFloat(value) || 0) : value;
    onUpdate({ ...item, [field]: val });
  };

  return (
    <div className="flex items-center gap-2 group">
      <select
        value={SUGGESTIONS.includes(item.name) ? item.name : '__custom'}
        onChange={e => {
          if (e.target.value === '__custom') return;
          update('name', e.target.value);
        }}
        className="h-8 text-xs border border-slate-200 rounded px-2 bg-white text-slate-700 font-medium w-40 flex-shrink-0"
      >
        {SUGGESTIONS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
        {!SUGGESTIONS.includes(item.name) && (
          <option value="__custom">{item.name || 'Custom'}</option>
        )}
      </select>

      {!SUGGESTIONS.includes(item.name) && (
        <Input
          value={item.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Cost name"
          className="h-8 text-xs border-slate-200 w-28"
        />
      )}

      <div className="relative flex-shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={item.amount}
          onChange={e => update('amount', e.target.value)}
          className="h-8 pl-5 pr-2 text-xs text-right font-semibold border-slate-200 w-24"
        />
      </div>

      <Input
        value={item.note || ''}
        onChange={e => update('note', e.target.value)}
        placeholder="Note (optional)"
        className="h-8 text-xs border-slate-200 flex-1 min-w-0"
      />

      <button
        onClick={() => onRemove(item.id)}
        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function OtherCostsSection({ otherCosts = [], onChange }) {
  const [expanded, setExpanded] = useState(otherCosts.length > 0);

  const items = Array.isArray(otherCosts) ? otherCosts : [];
  const total = items.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

  const addCost = () => {
    onChange([...items, { id: uid(), name: 'Helper labor', amount: 0, note: '' }]);
    setExpanded(true);
  };

  const updateCost = (updated) => {
    onChange(items.map(c => c.id === updated.id ? updated : c));
  };

  const removeCost = (id) => {
    onChange(items.filter(c => c.id !== id));
  };

  return (
    <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-amber-50 hover:bg-amber-100/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-amber-600" />}
          <DollarSign className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-800">Other Costs</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-amber-500 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
            Internal only
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-amber-600 font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <span className="font-bold text-amber-800">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 py-4 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No additional costs — click below to add</p>
          )}

          {items.map(item => (
            <CostRow key={item.id} item={item} onUpdate={updateCost} onRemove={removeCost} />
          ))}

          <button
            type="button"
            onClick={addCost}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add cost
          </button>
        </div>
      )}
    </div>
  );
}