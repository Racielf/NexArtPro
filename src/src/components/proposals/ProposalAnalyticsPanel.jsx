import React, { useState } from 'react';
import { TrendingUp, Trophy, XCircle, Clock, ChevronDown, ChevronUp, Star } from 'lucide-react';

/**
 * ProposalAnalyticsPanel — Lightweight sales intelligence from real Proposal outcome data.
 *
 * Derives:
 * - Win / Loss / Total counts + Win Rate
 * - Average days to close
 * - Lost reason breakdown (ranked)
 * - Winning pricing option counts
 * - Follow-up effectiveness on won deals
 *
 * Pure computation — no external calls, no side effects.
 * Only renders when there is meaningful closed data (won + lost >= 3).
 */

const LOST_REASON_LABELS = {
  price_too_high: 'Price Too High',
  chose_competitor: 'Chose Competitor',
  project_cancelled: 'Project Cancelled',
  no_budget: 'No Budget',
  no_response: 'No Response',
  scope_mismatch: 'Scope Mismatch',
  other: 'Other',
};

function Stat({ label, value, sub, color = 'text-slate-800' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xl font-black tabular-nums leading-none ${color}`}>{value}</span>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-none">{label}</span>
      {sub && <span className="text-[10px] text-slate-400 mt-0.5">{sub}</span>}
    </div>
  );
}

export default function ProposalAnalyticsPanel({ proposals = [] }) {
  const [open, setOpen] = useState(false);

  const closed = proposals.filter(p => p.close_outcome);
  const won = closed.filter(p => p.close_outcome === 'won');
  const lost = closed.filter(p => p.close_outcome === 'lost');

  // Only show when we have enough real data
  if (closed.length < 3) return null;

  const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;

  // Average days to close (sent_at → closed_at)
  const closeTimes = closed
    .filter(p => p.sent_at && p.closed_at)
    .map(p => Math.round((new Date(p.closed_at) - new Date(p.sent_at)) / 86400000));
  const avgCloseDays = closeTimes.length
    ? Math.round(closeTimes.reduce((s, d) => s + d, 0) / closeTimes.length)
    : null;

  // Lost reason breakdown
  const lostReasonMap = {};
  lost.forEach(p => {
    const r = p.lost_reason || 'other';
    lostReasonMap[r] = (lostReasonMap[r] || 0) + 1;
  });
  const lostReasons = Object.entries(lostReasonMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Winning pricing option counts
  const optionMap = {};
  won.filter(p => p.selected_pricing_option_title).forEach(p => {
    const t = p.selected_pricing_option_title;
    optionMap[t] = (optionMap[t] || 0) + 1;
  });
  const winningOptions = Object.entries(optionMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Follow-up effectiveness
  const wonWithFollowUp = won.filter(p => (p.follow_up_count || 0) > 0);
  const avgFollowUpWon = won.length > 0
    ? (won.reduce((s, p) => s + (p.follow_up_count || 0), 0) / won.length).toFixed(1)
    : null;

  const winColor = winRate >= 50 ? 'text-emerald-600' : winRate >= 30 ? 'text-amber-600' : 'text-red-600';
  const winBg   = winRate >= 50 ? 'bg-emerald-50 border-emerald-200' : winRate >= 30 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header — always visible, toggleable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Proposal Analytics</span>
          <span className="text-[10px] text-slate-400 font-normal">· {closed.length} closed deals</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Win rate pill — always visible */}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${winBg} ${winColor}`}>
            {winRate}% win rate
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-100">

          {/* ── Row 1: Core KPIs ── */}
          <div className="grid grid-cols-4 gap-4 pt-2">
            <Stat label="Won" value={won.length} color="text-emerald-600" sub={`$${won.reduce((s, p) => s + (p.total_amount || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Stat label="Lost" value={lost.length} color="text-red-500" />
            <Stat label="Win Rate" value={`${winRate}%`} color={winColor} sub={`of ${closed.length} closed`} />
            {avgCloseDays !== null && (
              <Stat label="Avg. Close" value={`${avgCloseDays}d`} color="text-slate-700" sub="sent → closed" />
            )}
          </div>

          {/* ── Row 2: Lost Reasons + Options side by side ── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Lost reasons */}
            {lostReasons.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Why We Lose</span>
                </div>
                <div className="space-y-1.5">
                  {lostReasons.map(([reason, count]) => {
                    const pct = lost.length > 0 ? Math.round((count / lost.length) * 100) : 0;
                    return (
                      <div key={reason} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-slate-700 truncate">{LOST_REASON_LABELS[reason] || reason}</span>
                            <span className="text-[10px] font-bold text-slate-500 ml-2 flex-shrink-0">{count}×</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Winning pricing options */}
            {winningOptions.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="w-3 h-3 text-violet-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Winning Options</span>
                </div>
                <div className="space-y-1.5">
                  {winningOptions.map(([title, count], i) => (
                    <div key={title} className="flex items-center gap-2">
                      <span className={`text-[10px] font-black w-4 text-center flex-shrink-0 ${i === 0 ? 'text-violet-500' : 'text-slate-400'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-[11px] text-slate-700 flex-1 truncate">{title}</span>
                      <span className="text-[10px] font-bold text-violet-500 flex-shrink-0">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up effectiveness */}
            {avgFollowUpWon !== null && won.length >= 2 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Follow-up Insight</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Avg follow-ups on won deals</span>
                    <span className="font-bold text-blue-600">{avgFollowUpWon}×</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Won with ≥1 follow-up</span>
                    <span className="font-bold text-slate-700">{wonWithFollowUp.length} / {won.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}