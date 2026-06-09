import React, { useState } from 'react';
import { updatePriceBookEntry } from '@/lib/servicePersistence';
import { getBrainPolicy } from '@/lib/brainPolicyStore';

export default function PriceBookSuggestionsPanel({ suggestions = [], services, onApplied }) {
  const [localSuggestions, setLocalSuggestions] = useState(suggestions);
  const policy = getBrainPolicy();

  const applyChange = async (s, priceOverride = null) => {
    if (!policy.catalogIntelligence.allowWrite) return;

    const newPrice = priceOverride ?? s.suggestedPrice;

    await updatePriceBookEntry(s.entryId, { unit_price: newPrice }, services);

    setLocalSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'applied' } : x));

    if (onApplied) onApplied();
  };

  const reject = (s) => {
    setLocalSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'rejected' } : x));
  };

  const modify = (s) => {
    const val = prompt('Enter new price', s.suggestedPrice);
    if (!val) return;
    applyChange(s, Number(val));
  };

  return (
    <div className="space-y-3 mb-6">
      {localSuggestions.filter(s => s.status === 'awaiting_review').map(s => (
        <div key={s.id} className="border rounded-xl p-4 bg-white">
          <div className="flex justify-between text-sm font-semibold">
            <span>{s.displayName}</span>
            <span className="text-green-600">+{s.deltaPercent}%</span>
          </div>

          <div className="text-xs mt-2 text-slate-500">
            ${s.currentPrice} → ${s.suggestedPrice}
          </div>

          <p className="text-xs mt-2 text-gray-500">{s.reason}</p>

          <div className="flex gap-2 mt-3">
            <button
              disabled={!policy.catalogIntelligence.allowWrite}
              onClick={() => applyChange(s)}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs"
            >Apply</button>

            <button onClick={() => modify(s)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs">Modify</button>

            <button onClick={() => reject(s)} className="px-3 py-1 bg-gray-300 rounded text-xs">Ignore</button>
          </div>
        </div>
      ))}
    </div>
  );
}
