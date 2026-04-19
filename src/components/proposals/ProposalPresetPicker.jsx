import React, { useState } from 'react';
import { PROPOSAL_PRESETS } from '@/lib/proposalPresets';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ProposalPresetPicker
 *
 * Lightweight inline UI to apply a content preset to proposalDetails.
 * Shows a compact row of preset buttons. Asks for confirmation only if
 * there is already non-empty content to avoid accidental overwrites.
 *
 * Props:
 *   proposalDetails  — current proposalDetails state
 *   onApply(details) — callback called with preset.details to merge in
 */
export default function ProposalPresetPicker({ proposalDetails, onApply }) {
  const [open, setOpen] = useState(false);
  const [pendingPreset, setPendingPreset] = useState(null);

  const hasContent =
    proposalDetails.scopeOfWork ||
    proposalDetails.inclusions ||
    proposalDetails.exclusions ||
    proposalDetails.timeline;

  const handleSelect = (preset) => {
    if (preset.id === 'custom') {
      onApply(preset.details);
      setOpen(false);
      return;
    }
    if (hasContent) {
      setPendingPreset(preset);
    } else {
      onApply(preset.details);
      setOpen(false);
    }
  };

  const confirmApply = () => {
    if (pendingPreset) {
      onApply(pendingPreset.details);
      setPendingPreset(null);
      setOpen(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Start Presets</span>
          <span className="text-[10px] text-slate-400 font-normal normal-case tracking-normal">apply reusable content</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {/* Preset grid */}
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mt-3 mb-3">
            Select a preset to prefill scope, inclusions, exclusions, and timeline. You can edit everything freely afterward.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PROPOSAL_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleSelect(preset)}
                className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 text-left transition-colors group"
              >
                <span className="text-lg leading-none flex-shrink-0">{preset.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-violet-700 leading-tight">{preset.label}</p>
                  <p className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{preset.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation dialog — only shown when overwriting existing content */}
      {pendingPreset && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-xs mx-4">
            <p className="text-sm font-bold text-slate-900 mb-1">Replace existing content?</p>
            <p className="text-xs text-slate-500 mb-4">
              Applying <strong>{pendingPreset.label}</strong> will overwrite your current scope, inclusions, exclusions, and timeline. You can still edit afterward.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingPreset(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApply}
                className="px-3 py-1.5 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Apply Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}