import React from 'react';
import { Eye, Layers, DollarSign, Grid3X3 } from 'lucide-react';

/**
 * ProposalPresentationModeSelector
 *
 * Controls how pricing and scope are presented to the client in the final document.
 * Modes:
 *   - detailed: full line items breakdown (default)
 *   - grouped: group totals only, no line items
 *   - lump_sum: total only, no breakdown
 *   - options_only: pricing options only (hide base estimate)
 */
export default function ProposalPresentationModeSelector({ mode = 'detailed', onChange }) {
  const modes = [
    {
      id: 'detailed',
      label: 'Detailed Breakdown',
      icon: Eye,
      description: 'Show all line items with prices (default)',
      color: 'violet',
    },
    {
      id: 'grouped',
      label: 'Grouped Summary',
      icon: Layers,
      description: 'Show group totals only (no line items)',
      color: 'blue',
    },
    {
      id: 'lump_sum',
      label: 'Lump Sum',
      icon: DollarSign,
      description: 'Show total only (no breakdown)',
      color: 'emerald',
    },
    {
      id: 'options_only',
      label: 'Pricing Options Only',
      icon: Grid3X3,
      description: 'Hide estimate, show pricing options only',
      color: 'amber',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      {/* Header */}
      <label className="block text-sm font-bold text-slate-900 mb-3">
        How to Present Pricing
      </label>
      <p className="text-xs text-slate-400 mb-4">
        Choose how much pricing detail the client sees in the final document.
      </p>

      {/* Mode grid */}
      <div className="grid grid-cols-2 gap-2">
        {modes.map(m => {
          const Icon = m.icon;
          const isSelected = mode === m.id;
          const colorClasses = {
            violet: isSelected
              ? 'bg-violet-50 border-violet-300 text-violet-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50',
            blue: isSelected
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50',
            emerald: isSelected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50',
            amber: isSelected
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-amber-200 hover:bg-amber-50',
          };

          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${colorClasses[m.color]}`}
            >
              <div className="flex items-start gap-2 mb-1">
                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-bold leading-tight">{m.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 pl-6">{m.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}