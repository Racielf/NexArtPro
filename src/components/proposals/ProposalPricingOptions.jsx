import React from 'react';
import { Plus, Trash2, Star } from 'lucide-react';

const BADGE_OPTIONS = ['', 'Most Popular', 'Best Value', 'Recommended'];

const DEFAULT_OPTION = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
  title: '',
  description: '',
  price: '',
  badge: '',
  itemsIncluded: '',
  itemsExcluded: '',
});

/**
 * ProposalPricingOptions — Editor for structured 3-tier pricing anchoring.
 *
 * Stores as proposal_details.pricingOptions[]
 * Completely optional — if empty, proposal renders single-price flow.
 */
export default function ProposalPricingOptions({ pricingOptions = [], onChange }) {
  const options = pricingOptions.length > 0 ? pricingOptions : [];

  const add = () => {
    if (options.length >= 4) return;
    onChange([...options, DEFAULT_OPTION()]);
  };

  const remove = (id) => onChange(options.filter(o => o.id !== id));

  const update = (id, field, value) =>
    onChange(options.map(o => o.id === id ? { ...o, [field]: value } : o));

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <label className="block text-sm font-bold text-slate-900">Investment Options</label>
          <p className="text-xs text-slate-400 mt-0.5">
            Present 2–3 tiered options to anchor your client's decision (optional).
          </p>
        </div>
        {options.length < 4 && (
          <button
            onClick={add}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Option
          </button>
        )}
      </div>

      {options.length === 0 ? (
        <div className="mt-4 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
          <p className="text-sm text-slate-400">No pricing options configured.</p>
          <p className="text-xs text-slate-300 mt-1">
            Proposal will use single-price display. Add options to enable price anchoring.
          </p>
          <button
            onClick={add}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add First Option
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {options.map((opt, idx) => (
            <div key={opt.id} className="border border-slate-200 rounded-lg p-4 relative bg-slate-50/50">
              {/* Option header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Option {idx + 1}</span>
                <button
                  onClick={() => remove(opt.id)}
                  className="ml-auto p-1 rounded text-slate-300 hover:text-red-400 transition-colors"
                  title="Remove option"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={opt.title}
                    onChange={e => update(opt.id, 'title', e.target.value)}
                    placeholder="e.g. Core, Pro, Premium"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none bg-white"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={opt.price}
                    onChange={e => update(opt.id, 'price', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none bg-white"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description</label>
                  <input
                    type="text"
                    value={opt.description}
                    onChange={e => update(opt.id, 'description', e.target.value)}
                    placeholder="Brief summary of what this option covers"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none bg-white"
                  />
                </div>

                {/* Badge */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    <Star className="w-3 h-3 inline mr-0.5 text-amber-400" />Badge (optional)
                  </label>
                  <select
                    value={opt.badge}
                    onChange={e => update(opt.id, 'badge', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none bg-white"
                  >
                    {BADGE_OPTIONS.map(b => (
                      <option key={b} value={b}>{b || '— None —'}</option>
                    ))}
                  </select>
                </div>

                {/* What's Included */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">What's Included</label>
                  <textarea
                    value={opt.itemsIncluded}
                    onChange={e => update(opt.id, 'itemsIncluded', e.target.value)}
                    placeholder="One item per line..."
                    rows={3}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none bg-white resize-none"
                  />
                </div>

                {/* What's Excluded */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">What's Not Included</label>
                  <textarea
                    value={opt.itemsExcluded}
                    onChange={e => update(opt.id, 'itemsExcluded', e.target.value)}
                    placeholder="One item per line..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none bg-white resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}