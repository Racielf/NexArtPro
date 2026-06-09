import React, { useState } from 'react';
import { X, Trophy, ThumbsDown, CheckCircle2 } from 'lucide-react';

/**
 * CloseDealModal — Lightweight structured deal closing for Proposals.
 *
 * Props:
 *   open           — boolean
 *   onClose        — () => void
 *   onConfirm      — (closingData) => void  — caller persists
 *   pricingOptions — array from proposal_details.pricingOptions (optional)
 *   initialOutcome — 'won' | 'lost' | null  (pre-selects tab)
 */

const LOST_REASONS = [
  { value: 'price_too_high',    label: 'Price too high' },
  { value: 'chose_competitor',  label: 'Chose a competitor' },
  { value: 'project_cancelled', label: 'Project cancelled' },
  { value: 'no_budget',         label: 'No budget' },
  { value: 'no_response',       label: 'Client stopped responding' },
  { value: 'scope_mismatch',    label: 'Scope mismatch' },
  { value: 'other',             label: 'Other' },
];

export default function CloseDealModal({ open, onClose, onConfirm, pricingOptions = [], initialOutcome = null }) {
  const [outcome, setOutcome] = useState(initialOutcome || 'won');
  const [lostReason, setLostReason] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const hasPricingOptions = pricingOptions && pricingOptions.length > 0;

  const handleConfirm = async () => {
    setSaving(true);
    const closingData = {
      closed_at: new Date().toISOString(),
      close_outcome: outcome,
      close_note: closeNote.trim() || null,
      lost_reason: outcome === 'lost' ? (lostReason || null) : null,
      selected_pricing_option_id: outcome === 'won' && selectedOptionId ? selectedOptionId : null,
      selected_pricing_option_title: outcome === 'won' && selectedOptionId
        ? (pricingOptions.find(o => o.id === selectedOptionId)?.title || null)
        : null,
    };
    // Map outcome to proposal status
    if (outcome === 'won') {
      closingData.status = 'accepted';
      closingData.accepted_at = closingData.closed_at;
    } else {
      closingData.status = 'rejected';
      closingData.rejected_at = closingData.closed_at;
      if (lostReason) closingData.rejected_reason = lostReason;
    }
    await onConfirm(closingData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Close Deal</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Outcome toggle */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Outcome</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOutcome('won')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  outcome === 'won'
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                }`}
              >
                <Trophy className="w-4 h-4" /> Deal Won
              </button>
              <button
                onClick={() => setOutcome('lost')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  outcome === 'lost'
                    ? 'bg-red-500 border-red-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500'
                }`}
              >
                <ThumbsDown className="w-4 h-4" /> Deal Lost
              </button>
            </div>
            {/* Additional outcomes — compact row */}
            <div className="flex gap-2 mt-2">
              {['no_response', 'withdrawn'].map(o => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    outcome === o
                      ? 'bg-slate-700 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {o === 'no_response' ? 'No Response' : 'Withdrawn'}
                </button>
              ))}
            </div>
          </div>

          {/* Lost reason — only for lost / no_response / withdrawn */}
          {(outcome === 'lost' || outcome === 'no_response' || outcome === 'withdrawn') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                Reason <span className="text-slate-300 font-normal normal-case">(optional)</span>
              </label>
              <select
                value={lostReason}
                onChange={e => setLostReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary bg-white"
              >
                <option value="">— Select reason —</option>
                {LOST_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Pricing option selector — only for 'won' + has options */}
          {outcome === 'won' && hasPricingOptions && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                Option Selected <span className="text-slate-300 font-normal normal-case">(optional)</span>
              </label>
              <div className="space-y-1.5">
                {pricingOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(prev => prev === opt.id ? '' : opt.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all ${
                      selectedOptionId === opt.id
                        ? 'bg-violet-50 border-violet-400 text-violet-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                    }`}
                  >
                    <span className="font-semibold">{opt.title || `Option ${pricingOptions.indexOf(opt) + 1}`}</span>
                    <div className="flex items-center gap-2">
                      {opt.price && <span className="text-slate-400">${parseFloat(opt.price).toLocaleString()}</span>}
                      {selectedOptionId === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Close note */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
              Closing Note <span className="text-slate-300 font-normal normal-case">(internal, optional)</span>
            </label>
            <textarea
              value={closeNote}
              onChange={e => setCloseNote(e.target.value)}
              rows={2}
              placeholder="What happened? Any context for the team..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              outcome === 'won'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {saving ? 'Saving…' : outcome === 'won' ? '🏆 Mark as Won' : 'Record Outcome'}
          </button>
        </div>
      </div>
    </div>
  );
}