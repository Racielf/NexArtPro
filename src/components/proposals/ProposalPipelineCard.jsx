import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, Calendar, ArrowRight } from 'lucide-react';
import { getNextAction, daysSince } from '@/lib/nextActionLogic';

/**
 * ProposalPipelineCard — Compact card for Proposals in the Sales Pipeline.
 *
 * Shows:
 * - Status + proposal number + client name + total
 * - Next sales action signal (icon + label)
 * - Follow-up state (overdue badge, last/next dates, count)
 * - Quick path → opens proposal-editor
 */

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function timeAgo(isoStr) {
  if (!isoStr) return null;
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

const PROPOSAL_STATUS_BADGE = {
  draft:                   { label: 'Draft',       cls: 'bg-slate-100 text-slate-500' },
  review_needed:           { label: 'Review',      cls: 'bg-amber-100 text-amber-700' },
  sent:                    { label: 'Sent',         cls: 'bg-blue-100 text-blue-700' },
  approved:                { label: 'Approved',     cls: 'bg-emerald-100 text-emerald-700' },
  accepted:                { label: 'Accepted',     cls: 'bg-emerald-100 text-emerald-700' },
  rejected:                { label: 'Rejected',     cls: 'bg-red-100 text-red-600' },
  converted_to_invoice:    { label: 'Invoiced',     cls: 'bg-teal-100 text-teal-700' },
  converted_to_work_order: { label: 'Work Order',   cls: 'bg-purple-100 text-purple-700' },
  pending_adjustment:      { label: 'Adjustment',   cls: 'bg-amber-100 text-amber-700' },
};

export default function ProposalPipelineCard({ proposal }) {
  const navigate = useNavigate();
  const action = getNextAction(proposal);
  const badge = PROPOSAL_STATUS_BADGE[proposal.status] || PROPOSAL_STATUS_BADGE.draft;

  // Follow-up state
  const nextFollowUp = proposal.next_follow_up_at;
  const lastFollowUp = proposal.last_follow_up_at;
  const followUpCount = proposal.follow_up_count || 0;
  const isOverdue = nextFollowUp && new Date(nextFollowUp) < new Date();
  const nextFollowUpDays = nextFollowUp ? daysSince(nextFollowUp) : null;

  const Icon = action?.icon;

  return (
    <div
      onClick={() => navigate(`/proposal-editor?id=${proposal.id}`)}
      className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
    >
      {/* Top row: number + badge + total */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-primary">P#{proposal.proposal_number}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
            {isOverdue && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-0.5">
                <Bell className="w-2.5 h-2.5" /> Overdue
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
            {proposal.client_name || <span className="text-slate-400 italic">No client</span>}
          </p>
        </div>
        <span className="text-sm font-bold text-slate-900 flex-shrink-0 ml-2">
          {fmt(proposal.total_amount)}
        </span>
      </div>

      {/* Title */}
      {proposal.title && (
        <p className="text-[10px] text-slate-400 truncate mb-1.5">{proposal.title}</p>
      )}

      {/* Next Action signal — compact one-liner */}
      {action && Icon && (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-semibold mb-1.5 ${action.bg} ${action.color}`}>
          <Icon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{action.label}</span>
          {action.sub && (
            <span className="text-slate-400 font-normal truncate hidden group-hover:inline">— {action.sub}</span>
          )}
        </div>
      )}

      {/* Bottom meta row */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
        {proposal.view_count > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <Eye className="w-3 h-3" />{proposal.view_count}×
            {proposal.last_viewed_at && <span className="text-slate-300 ml-0.5">{timeAgo(proposal.last_viewed_at)}</span>}
          </span>
        )}
        {proposal.sent_at && !proposal.view_count && (
          <span className="inline-flex items-center gap-0.5">
            <Calendar className="w-3 h-3" /> Sent {timeAgo(proposal.sent_at)}
          </span>
        )}
        {followUpCount > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <Bell className="w-3 h-3" />{followUpCount}× followed up
          </span>
        )}
        {nextFollowUp && !isOverdue && (
          <span className="text-blue-500">
            Next follow-up: {new Date(nextFollowUp).toLocaleDateString()}
          </span>
        )}
        {isOverdue && nextFollowUp && (
          <span className="text-red-500 font-semibold">
            Was due: {new Date(nextFollowUp).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}