/**
 * OtherCostsSection — Internal-only job-level cost entries.
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

      <div className="relative flex-shrink-0" title="Internal cost only — not charged directly to the customer">
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

export default function OtherCostsSection({ otherCosts = [], onChange, billOtherCostsToClient = false, onBillToClientChange }) {
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
    <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-5 py-3 bg-amber-50">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1 text-left"
        >
          {expanded ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-amber-600" />}
          <DollarSign className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-800">Internal Job Cost</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 italic">expense bucket</span>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${billOtherCostsToClient ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-amber-500 bg-amber-100 border-amber-200'}`}>
            {billOtherCostsToClient ? 'Billed to client' : 'Internal only'}
          </span>
        </button>
        <div className="flex items-center gap-3 text-xs">
          {onBillToClientChange && (
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={billOtherCostsToClient}
                onChange={e => onBillToClientChange(e.target.checked)}
                className="accent-amber-600"
              />
              Bill to client
            </label>
          )}
          <span className="text-amber-600 font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <span className="font-bold text-amber-800">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No internal costs — click below to add</p>
          )}

          {items.map(item => (
            <CostRow key={item.id} item={item} onUpdate={updateCost} onRemove={removeCost} />
          ))}

          {total > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-200 bg-amber-50/60 -mx-5 px-5 pb-3 rounded-b">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Internal Job Cost Total</span>
              <span className="text-base font-bold text-amber-900 tabular-nums">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="mt-2">
            <button
              type="button"
              onClick={addCost}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 hover:border-amber-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Add internal cost
            </button>
          </div>
        </div>
      )}
    </div>
  );
}