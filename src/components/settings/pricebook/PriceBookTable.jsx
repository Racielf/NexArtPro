import React, { useState } from 'react';
import { Pencil, AlertCircle, Clock } from 'lucide-react';
import { UNITS } from '@/components/settings/services/servicesSeed';
import { getMarketReference, getPriceIndicator } from './marketUtils';

const CATEGORY_COLORS = {
  'Painting':               'bg-blue-50 text-blue-600',
  'Drywall':                'bg-gray-100 text-gray-600',
  'Flooring':               'bg-amber-50 text-amber-600',
  'Carpentry':              'bg-orange-50 text-orange-600',
  'Bathroom Remodeling':    'bg-teal-50 text-teal-600',
  'Kitchen Remodeling':     'bg-green-50 text-green-600',
  'Demolition':             'bg-red-50 text-red-600',
  'Doors & Windows':        'bg-purple-50 text-purple-600',
  'Siding & Exterior':      'bg-lime-50 text-lime-600',
  'Framing':                'bg-yellow-50 text-yellow-600',
  'Trim & Finish':          'bg-pink-50 text-pink-600',
  'Tile':                   'bg-cyan-50 text-cyan-600',
  'Repairs':                'bg-rose-50 text-rose-600',
  'Cleaning & Final Touch': 'bg-sky-50 text-sky-600',
  'Misc':                   'bg-slate-100 text-slate-500',
};

function unitLabel(val) {
  return UNITS.find(u => u.value === val)?.label || val || '—';
}

// Returns true if the entry's price is stale (>6 months with no update)
function isStalePrice(entry) {
  const ref = entry.updated_date || entry.created_date;
  if (!ref) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(ref) < sixMonthsAgo;
}

// Suggested price = base_price × (1 + markup/100)
function suggestedPrice(base, markup) {
  const b = parseFloat(base);
  const m = parseFloat(markup);
  if (isNaN(b) || b <= 0) return null;
  if (isNaN(m) || m === 0) return b;
  return b * (1 + m / 100);
}

// Inline editable cell for Book Price
function InlinePriceCell({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(value !== null && value !== undefined ? String(value) : '');
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0) onCommit(parsed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span className="text-xs text-slate-400">$</span>
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-20 text-right text-sm font-semibold border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50"
        />
      </div>
    );
  }

  const isUnpriced = value === null || value === undefined || value === '';
  return (
    <button
      onClick={startEdit}
      title="Click to edit"
      className="group/price flex items-center justify-end gap-1.5 w-full hover:text-blue-600 transition-colors"
    >
      {isUnpriced
        ? <span className="text-slate-300 font-normal">—</span>
        : <span className="font-semibold text-slate-800">${parseFloat(value).toFixed(2)}</span>
      }
      <Pencil className="w-3 h-3 text-slate-200 group-hover/price:text-blue-400 transition-colors flex-shrink-0" />
    </button>
  );
}

export default function PriceBookTable({ entries, onEdit, onToggleActive, onToggleReview, onInlineUpdate, showMarket = true }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-14 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📖</span>
        </div>
        <p className="text-sm font-semibold text-slate-600 mb-1">No entries found</p>
        <p className="text-xs text-slate-400">Try adjusting your search or filter</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Service</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Unit</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Book Price</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Markup %</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Suggested</th>
            {showMarket && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">vs. Market</th>}
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Active</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Review</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map(e => {
            const catCls = CATEGORY_COLORS[e.category] || 'bg-slate-100 text-slate-500';
            const isUnpriced = e.base_price === null || e.base_price === undefined || e.base_price === '';
            const marketRef = showMarket ? getMarketReference(e) : null;
            const indicator = showMarket && !isUnpriced ? getPriceIndicator(e.base_price, marketRef) : null;
            const stale = isStalePrice(e);
            const suggested = suggestedPrice(e.base_price, e.markup);
            const markupVal = parseFloat(e.markup);

            return (
              <tr key={e.id} className={`group transition-colors hover:bg-slate-50/60 ${!e.is_active ? 'opacity-45' : ''}`}>

                {/* Service name */}
                <td className="px-5 py-3.5">
                  <div className="flex items-start gap-2">
                    {stale && (
                      <span title="Price not updated in 6+ months — review for Oregon market inflation" className="mt-0.5 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className={`font-medium leading-tight ${stale ? 'text-orange-700' : 'text-slate-800'}`}>{e.display_name}</p>
                      {e.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{e.notes}</p>}
                      {stale && <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full mt-1 inline-block">Stale — review price</span>}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${catCls}`}>{e.category || '—'}</span>
                </td>

                {/* Unit */}
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-xs text-slate-500 bg-slate-100 rounded-md px-2 py-0.5">{unitLabel(e.unit)}</span>
                </td>

                {/* Book Price — inline editable */}
                <td className="px-4 py-3.5 text-right">
                  <InlinePriceCell
                    value={e.base_price}
                    onCommit={val => onInlineUpdate && onInlineUpdate(e.id, val)}
                  />
                </td>

                {/* Markup % */}
                <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                  {!isNaN(markupVal) && markupVal > 0
                    ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+{markupVal}%</span>
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                </td>

                {/* Suggested Price */}
                <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                  {suggested != null
                    ? <span className="font-semibold text-slate-700">${suggested.toFixed(2)}</span>
                    : <span className="text-slate-300">—</span>
                  }
                </td>

                {/* Market indicator */}
                {showMarket && (
                  <td className="px-4 py-3.5 hidden xl:table-cell">
                    {marketRef && indicator ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-400">${marketRef.low}–${marketRef.high}</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${indicator.badgeCls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${indicator.dotCls}`} />
                          {indicator.label}
                        </span>
                      </div>
                    ) : <span className="text-slate-200 text-xs">—</span>}
                  </td>
                )}

                {/* Active */}
                <td className="px-4 py-3.5 text-center">
                  <button onClick={() => onToggleActive(e.id)} title={e.is_active ? 'Deactivate' : 'Activate'}>
                    <span className={`inline-block w-2 h-2 rounded-full ${e.is_active ? 'bg-green-400' : 'bg-slate-300'}`} />
                  </button>
                </td>

                {/* Review flag */}
                <td className="px-4 py-3.5 text-center hidden md:table-cell">
                  <button onClick={() => onToggleReview(e.id)} title="Toggle needs review">
                    <AlertCircle className={`w-3.5 h-3.5 ${e.needs_review ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`} />
                  </button>
                </td>

                {/* Edit modal */}
                <td className="px-4 py-3.5 text-right">
                  <button onClick={() => onEdit(e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-slate-700">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400 flex items-center gap-3">
        <span>{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
        <span className="flex items-center gap-1 text-orange-400">
          <Clock className="w-3 h-3" /> = price not updated in 6+ months
        </span>
      </div>
    </div>
  );
}