import React from 'react';
import { getNextAction } from '@/lib/nextActionLogic';

/**
 * ProposalNextAction — Rule-based "Next Sales Action" guidance block.
 * Logic lives in lib/nextActionLogic.js (shared with pipeline).
 */
export default function ProposalNextAction({ proposal }) {
  const action = getNextAction(proposal);
  if (!action) return null;
  const Icon = action.icon;

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs ${action.bg}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${action.color}`} />
      <div className="min-w-0">
        <p className={`font-bold leading-tight ${action.color}`}>{action.label}</p>
        <p className="text-slate-500 mt-0.5 leading-snug">{action.sub}</p>
      </div>
    </div>
  );
}