/**
 * nextActionLogic.js — Shared rule engine for "Next Sales Action" derivation.
 *
 * Used by:
 *   - ProposalNextAction (proposal editor sidebar)
 *   - ProposalPipelineCard (pipeline board/list)
 *
 * Pure functions — no React, no API calls.
 */

import {
  Clock, Eye, ArrowRight, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Handshake
} from 'lucide-react';

export const STALE_DAYS = 5;

export function daysSince(isoStr) {
  if (!isoStr) return null;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}

/**
 * Returns a signal object for the given proposal/document.
 * Works for both Estimate and Proposal entities (shared field names).
 *
 * @param {Object} doc — proposal or estimate record
 * @returns {{ icon, color, bg, label, sub } | null}
 */
export function getNextAction(doc) {
  if (!doc) return null;
  const status         = doc.status;
  const daysSinceSent  = daysSince(doc.sent_at);
  const daysSinceViewed = daysSince(doc.last_viewed_at || doc.viewed_at);
  const hasViewed      = !!doc.viewed_at;

  switch (status) {
    case 'draft':
      return { icon: ArrowRight, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', label: 'Ready to prepare', sub: 'Send to client when ready.' };

    case 'review_needed':
      return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Review pending', sub: 'Needs internal review before sending.' };

    case 'sent':
      if (hasViewed && daysSinceViewed !== null && daysSinceViewed >= STALE_DAYS) {
        return { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Follow up recommended', sub: `Viewed ${daysSinceViewed}d ago — no response.` };
      }
      if (hasViewed) {
        return { icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', label: 'Client viewed', sub: `${daysSinceViewed === 0 ? 'Viewed today' : `Viewed ${daysSinceViewed}d ago`}` };
      }
      if (daysSinceSent !== null && daysSinceSent >= STALE_DAYS) {
        return { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Follow up recommended', sub: `Sent ${daysSinceSent}d ago — not opened.` };
      }
      return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Waiting for client', sub: `Sent ${daysSinceSent === 0 ? 'today' : `${daysSinceSent}d ago`}` };

    case 'pending_adjustment':
      return { icon: Handshake, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Negotiation in progress', sub: 'Review adjustment estimate.' };

    case 'approved':
    case 'accepted':
      return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Ready to convert', sub: 'Convert to Invoice or Work Order.' };

    case 'converted_to_invoice':
      return { icon: RefreshCw, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', label: 'Invoice created', sub: 'Follow up on payment.' };

    case 'converted_to_work_order':
      return { icon: RefreshCw, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Work order active', sub: 'Job in execution phase.' };

    case 'rejected':
      return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Deal lost', sub: 'Reopen as draft to revise.' };

    default:
      return null;
  }
}