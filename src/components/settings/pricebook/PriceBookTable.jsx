import React, { useState } from 'react';
import { Pencil, AlertCircle, Clock } from 'lucide-react';
import { UNITS } from '@/components/settings/services/servicesSeed';
import { CATEGORY_COLORS, getTypeConfig } from './priceBookCategories';
import { getMarketReference, getPriceIndicator } from './marketUtils';

function unitLabel(val) {
  return UNITS.find(u => u.value === val)?.label || val || '—';
}

function isStalePrice(entry) {
  const ref = entry.updated_date || entry.created_date;
  if (!ref) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(ref) < sixMonthsAgo;
}

function InlinePriceCell({ value, onCommit, label = '' }) {
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
        <input autoFocus type="number" step="0.01" min="0" value={draft}
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
    <button onClick={startEdit} title={`Click to edit ${label}`}
      className="group/price flex items-center justify-end gap-1.5 w-full hover:text-blue-600 transition-colors">
      {isUnpriced
        ? <span className="text-slate-300 font-normal">—</span>
        : <span className="font-semibold text-slate-800">${parseFloat(value).toFixed(2)}</span>
      }
      <Pencil className="w-3 h-3 text-slate-200 group-hover/price:text-blue-400 transition-colors flex-shrink-0" />
    </button>
  );
}

export default function PriceBookTable({ entries, onEdit, onToggleActive, onToggleReview, onInlinePriceUpdate, showMarket = true }) {
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
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Item</th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16 hidden sm:table-cell">Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Unit</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wide">Price</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Cost</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wide hidden xl:table-cell">Book</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Margin</th>
            {showMarket && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">vs. Market</th>}
            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-10">On</th>
            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell w-10">Rev</th>
            <th className="px-3 py-3 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map(e => {
            const catCls = CATEGORY_COLORS[e.category] || 'bg-slate-100 text-slate-500';
            const typeConfig = getTypeConfig(e.type);
            const up = parseFloat(e.unit_price) || 0;
            const uc = parseFloat(e.unit_cost) || 0;
            const margin = up > 0 && uc > 0 ? (((up - uc) / up) * 100).toFixed(1) : null;
            const marketRef = showMarket ? getMarketReference(e) : null;
            const indicator = showMarket && up > 0 ? getPriceIndicator(up, marketRef) : null;
            const stale = isStalePrice(e);

            return (
              <tr key={e.id} className={`group transition-colors hover:bg-slate-50/60 ${!e.is_active ? 'opacity-45' : ''}`}>
                {/* Name */}
                <td className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    {stale && <Clock className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" title="Price not updated in 6+ months" />}
                    <div className="min-w-0">
                      <p className={`font-medium leading-tight ${stale ? 'text-orange-700' : 'text-slate-800'}`}>{e.display_name}</p>
                      {e.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{e.notes}</p>}
                    </div>
                  </div>
                </td>

                {/* Type badge */}
                <td className="px-3 py-3 hidden sm:table-cell">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                </td>

                {/* Category */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${catCls}`}>{e.category || '—'}</span>
                </td>

                {/* Unit */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-slate-500 bg-slate-100 rounded-md px-2 py-0.5">{unitLabel(e.unit)}</span>
                </td>

                {/* Unit Price (editable) */}
                <td className="px-4 py-3 text-right">
                  <InlinePriceCell value={e.unit_price} label="unit price"
                    onCommit={val => onInlinePriceUpdate?.(e.id, 'unit_price', val)} />
                </td>

                {/* Unit Cost (editable) */}
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <InlinePriceCell value={e.unit_cost} label="unit cost"
                    onCommit={val => onInlinePriceUpdate?.(e.id, 'unit_cost', val)} />
                </td>

                {/* Book Price */}
                <td className="px-4 py-3 text-right hidden xl:table-cell">
                  {e.book_price != null && e.book_price !== ''
                    ? <span className="text-xs text-slate-400">${parseFloat(e.book_price).toFixed(2)}</span>
                    : <span className="text-slate-200 text-xs">—</span>
                  }
                </td>

                {/* Margin */}
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  {margin !== null
                    ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${parseFloat(margin) >= 20 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{margin}%</span>
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                </td>

                {/* Market indicator */}
                {showMarket && (
                  <td className="px-4 py-3 hidden xl:table-cell">
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
                <td className="px-3 py-3 text-center">
                  <button onClick={() => onToggleActive(e.id)} title={e.is_active ? 'Deactivate' : 'Activate'}>
                    <span className={`inline-block w-2 h-2 rounded-full ${e.is_active ? 'bg-green-400' : 'bg-slate-300'}`} />
                  </button>
                </td>

                {/* Review */}
                <td className="px-3 py-3 text-center hidden md:table-cell">
                  <button onClick={() => onToggleReview(e.id)} title="Toggle review">
                    <AlertCircle className={`w-3.5 h-3.5 ${e.needs_review ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`} />
                  </button>
                </td>

                {/* Edit */}
                <td className="px-3 py-3 text-right">
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