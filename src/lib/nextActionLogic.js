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
  CheckCircle2, XCircle, Handshake, HelpCircle, Zap
} from 'lucide-react';
import { getInvoiceFollowUpTiming } from './invoiceFollowUpTiming';

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

    /**
    * Get next action for an invoice (collections context).
    * Works with invoice records that have: status, due_date, sent_at, paid_at, amount_paid, total, client_response_status
    * Now includes follow-up timing intelligence.
    */
    export function getInvoiceNextAction(invoice) {
    if (!invoice) return null;

    // Get follow-up timing for this invoice
    const followUpTiming = getInvoiceFollowUpTiming(invoice);

    const status = invoice.status;
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const amountPaid = invoice.amount_paid || 0;
    const total = invoice.total || 0;
    const balanceDue = Math.max(0, total - amountPaid);
    const isOverdue = dueDate && dueDate < today && balanceDue > 0;

    const daysSinceSent = invoice.sent_at ? daysSince(invoice.sent_at) : null;

    // draft
    if (status === 'draft') {
     return { icon: ArrowRight, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', label: 'Ready to send', sub: 'Send to client when ready.' };
    }

    // sent but not sent_at yet (edge case)
    if (status === 'sent' && !invoice.sent_at) {
     return { icon: ArrowRight, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', label: 'Pending send', sub: 'Mark as sent.' };
    }

    // paid
    if (status === 'paid' || balanceDue <= 0) {
     return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Paid', sub: 'No action needed.' };
    }

    // client response: paying soon
    if (invoice.client_response_status === 'will_pay_soon') {
     return { icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Payment expected', sub: 'Client says paying soon.' };
    }

    // client response: has question
    if (invoice.client_response_status === 'has_question') {
     return { icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Awaiting clarification', sub: 'Client has a billing question.' };
    }

    // client response: needs time
    if (invoice.client_response_status === 'needs_time') {
     return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Extension granted', sub: 'Client requested more time.' };
    }

    // overdue
    if (isOverdue) {
     const daysOverdue = Math.floor((today - dueDate) / 86400000);
     return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Urgent collection', sub: `Overdue ${daysOverdue}d — Balance: $${balanceDue.toFixed(2)}` };
    }

    // sent, not overdue, partial payment
    if (amountPaid > 0 && balanceDue > 0) {
     return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Follow up on balance', sub: `Partial: $${amountPaid.toFixed(2)} / $${total.toFixed(2)}` };
    }

    // sent, no payment, approaching due date
    if (dueDate && daysSinceSent !== null) {
     const daysUntilDue = Math.floor((dueDate - today) / 86400000);
     if (daysUntilDue <= 3 && daysUntilDue > 0) {
       return { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Due soon', sub: `Due in ${daysUntilDue}d` };
      }
    }

    // sent, no payment, generic await
    if (status === 'sent' && balanceDue > 0) {
     return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Await payment', sub: `Sent ${daysSinceSent === 0 ? 'today' : `${daysSinceSent}d ago`} — Balance: $${balanceDue.toFixed(2)}` };
    }

    // cancelled / other terminal
    if (status === 'cancelled') {
     return { icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', label: 'Cancelled', sub: 'No action.' };
    }

    return null;
    }

    /**
    * Export follow-up timing helper for external use.
    */
    export { getInvoiceFollowUpTiming } from './invoiceFollowUpTiming';