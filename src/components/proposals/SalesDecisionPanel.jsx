/**
 * SalesDecisionPanel — Displays orchestrated sales decision guidance
 *
 * Integrates pricing strategy, follow-up timing, scope clarity, and competitive positioning
 * into one compact, actionable recommendation widget.
 */

import React from 'react';
import { TrendingUp, AlertCircle, Clock, Target, Lightbulb, ChevronRight } from 'lucide-react';

const ICON_MAP = {
  pricing_sensitivity: <Target className="w-4 h-4 text-amber-500" />,
  pricing_strategy: <TrendingUp className="w-4 h-4 text-violet-500" />,
  presentation_mode: <Lightbulb className="w-4 h-4 text-blue-500" />,
  early_followup: <AlertCircle className="w-4 h-4 text-red-500" />,
  followup_intensity: <Clock className="w-4 h-4 text-slate-500" />,
  client_velocity: <TrendingUp className="w-4 h-4 text-emerald-500" />,
  scope_clarity: <AlertCircle className="w-4 h-4 text-amber-500" />,
  scope_detail: <Lightbulb className="w-4 h-4 text-slate-500" />,
  inclusions_exclusions: <Lightbulb className="w-4 h-4 text-slate-500" />,
  competitive_threat: <Target className="w-4 h-4 text-red-500" />,
  repeat_customer: <TrendingUp className="w-4 h-4 text-emerald-500" />,
};

const CONFIDENCE_COLOR = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low: 'bg-slate-50 border-slate-200',
};

const CONFIDENCE_TEXT = {
  high: 'text-red-700',
  medium: 'text-amber-700',
  low: 'text-slate-700',
};

function RecommendationItem({ recommendation }) {
  return (
    <div className={`border rounded-lg p-3 space-y-1.5`}>
      <div className="flex items-start gap-2">
        {ICON_MAP[recommendation.type] || <Lightbulb className="w-4 h-4 text-slate-500" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 leading-snug">
            {recommendation.title}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
            {recommendation.reason}
          </p>
          <p className="text-[11px] font-medium text-primary mt-1.5 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {recommendation.action}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SalesDecisionPanel({ decision, open: initialOpen = true }) {
  const [open, setOpen] = React.useState(initialOpen);

  if (!decision?.primaryRecommendation) return null;

  const { primaryRecommendation, secondaryRecommendations = [], confidence } = decision;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Sales Decision Engine</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            confidence === 'high' ? 'bg-red-100 text-red-600' :
            confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {confidence} confidence
          </span>
        </div>
        {open ? (
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
          {/* Primary recommendation — always prominent */}
          <div className={`border-2 rounded-lg p-3.5 space-y-2 ${CONFIDENCE_COLOR[confidence]}`}>
            <div className="flex items-start gap-2">
              {ICON_MAP[primaryRecommendation.type]}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${CONFIDENCE_TEXT[confidence]} leading-snug`}>
                  {primaryRecommendation.title}
                </p>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                  {primaryRecommendation.reason}
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-2 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  {primaryRecommendation.action}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary recommendations — collapsible */}
          {secondaryRecommendations.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                {secondaryRecommendations.length} more recommendation{secondaryRecommendations.length > 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-2">
                {secondaryRecommendations.map((rec, i) => (
                  <RecommendationItem key={i} recommendation={rec} />
                ))}
              </div>
            </details>
          )}

          {/* Footer */}
          <p className="text-[9px] text-slate-400 italic">
            Synthesized from proposal context, client history, and historical patterns
          </p>
        </div>
      )}
    </div>
  );
}