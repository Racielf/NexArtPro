import React from 'react';
import {
  Clock, Eye, MessageSquare, CheckCircle2, XCircle,
  ArrowRight, RefreshCw, AlertTriangle, Handshake
} from 'lucide-react';

/**
 * ProposalNextAction — Rule-based "Next Sales Action" guidance block.
 *
 * Pure display — reads proposal state, outputs decision signal.
 * No business logic changes, no API calls.
 */

const STALE_DAYS = 5; // days without response before "follow up recommended"

function daysSince(isoStr) {
  if (!isoStr) return null;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}

function getNextAction(proposal) {
  const status = proposal?.status;
  const daysSinceSent   = daysSince(proposal?.sent_at);
  const daysSinceViewed = daysSince(proposal?.last_viewed_at || proposal?.viewed_at);
  const hasViewed       = !!proposal?.viewed_at;
  const hasFollowUp     = !!proposal?.last_follow_up_at;

  switch (status) {
    case 'draft':
      return { icon: ArrowRight, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', label: 'Ready to prepare', sub: 'Add line items and send to client when ready.' };

    case 'review_needed':
      return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Internal review pending', sub: 'A team member needs to review before sending.' };

    case 'sent':
      if (hasViewed && daysSinceViewed !== null && daysSinceViewed >= STALE_DAYS) {
        return { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Follow up recommended', sub: `Client viewed ${daysSinceViewed}d ago — no response yet. Time to follow up.` };
      }
      if (hasViewed) {
        return { icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', label: 'Client viewed proposal', sub: `Viewed ${daysSinceViewed === 0 ? 'today' : `${daysSinceViewed}d ago`}. Stay alert for a response.` };
      }
      if (daysSinceSent !== null && daysSinceSent >= STALE_DAYS) {
        return { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Follow up recommended', sub: `Sent ${daysSinceSent}d ago — client hasn't opened yet. Consider following up.` };
      }
      return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Waiting for client response', sub: `Sent ${daysSinceSent === 0 ? 'today' : `${daysSinceSent}d ago`}. Give the client time to review.` };

    case 'pending_adjustment':
      return { icon: Handshake, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Adjustment requested', sub: 'Negotiation in progress. Review the adjustment estimate and respond.' };

    case 'approved':
    case 'accepted':
      return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Ready to convert', sub: 'Client approved. Convert to Invoice or Work Order to proceed.' };

    case 'converted_to_invoice':
      return { icon: RefreshCw, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', label: 'Invoice created', sub: 'Proposal converted. Follow up on invoice payment if needed.' };

    case 'converted_to_work_order':
      return { icon: RefreshCw, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Work order created', sub: 'Job is now in execution phase.' };

    case 'rejected':
      return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Deal lost', sub: 'Client rejected the proposal. You can reopen as draft to revise.' };

    default:
      return null;
  }
}

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