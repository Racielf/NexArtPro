/**
 * SmartSuggestionsPanel — Compact suggestion widget for ProposalEditor.
 *
 * Displays actionable guidance based on proposal context and historical data.
 * Collapsible, low visual weight, non-intrusive.
 */

import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Clock, Zap } from 'lucide-react';

const ICON_MAP = {
  pricing: <Zap className="w-3.5 h-3.5 text-violet-500" />,
  followup: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  scope: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
  strategy: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
  timeline: <Clock className="w-3.5 h-3.5 text-slate-500" />,
  urgency: <Lightbulb className="w-3.5 h-3.5 text-orange-500" />,
};

const PRIORITY_COLOR = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low: 'bg-slate-50 border-slate-200',
};

const PRIORITY_TEXT = {
  high: 'text-red-700',
  medium: 'text-amber-700',
  low: 'text-slate-700',
};

function SuggestionItem({ suggestion }) {
  return (
    <div className={`border rounded-lg px-3 py-2.5 space-y-1 ${PRIORITY_COLOR[suggestion.priority]}`}>
      <div className="flex items-start gap-2">
        {ICON_MAP[suggestion.type]}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${PRIORITY_TEXT[suggestion.priority]} leading-snug`}>
            {suggestion.message}
          </p>
          {suggestion.context && (
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              {suggestion.context}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmartSuggestionsPanel({ suggestions = [], open: initialOpen = true }) {
  const [open, setOpen] = useState(initialOpen);

  if (!suggestions || suggestions.length === 0) return null;

  const highPriority = suggestions.filter(s => s.priority === 'high');
  const otherSuggestions = suggestions.filter(s => s.priority !== 'high');

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-violet-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Smart Suggestions</span>
          {highPriority.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
              {highPriority.length} action{highPriority.length > 1 ? 's' : ''}
            </span>
          )}
          {highPriority.length === 0 && (
            <span className="text-[10px] text-slate-400">· {suggestions.length} total</span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
          {/* High priority first */}
          {highPriority.length > 0 && (
            <div className="space-y-2">
              {highPriority.map((s, i) => (
                <SuggestionItem key={i} suggestion={s} />
              ))}
            </div>
          )}

          {/* Other suggestions */}
          {otherSuggestions.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                {otherSuggestions.length} more suggestion{otherSuggestions.length > 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-2">
                {otherSuggestions.map((s, i) => (
                  <SuggestionItem key={i} suggestion={s} />
                ))}
              </div>
            </details>
          )}

          {/* Footer note */}
          <p className="text-[9px] text-slate-400 italic">
            Based on your proposal patterns and historical outcomes
          </p>
        </div>
      )}
    </div>
  );
}