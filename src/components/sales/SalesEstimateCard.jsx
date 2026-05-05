import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock, User, Calendar, TrendingUp } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { getFollowUpCategory } from '@/lib/salesPipeline';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SalesEstimateCard({ estimate }) {
  const navigate = useNavigate();
  const followUpCat = getFollowUpCategory(estimate);

  const followUpColors = {
    overdue: 'bg-red-100 text-red-700 border-red-200',
    today: 'bg-amber-100 text-amber-700 border-amber-200',
    upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
  };

  return (
    <div
      onClick={() => navigate(`/estimate-editor?id=${estimate.id}`)}
      className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
    >
      {/* Top row: number + total */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-primary">#{estimate.estimate_number}</span>
            <StatusBadge status={estimate.status} />
          </div>
          <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
            {estimate.client_name || <span className="text-slate-400 italic">No client</span>}
          </p>
        </div>
        <span className="text-sm font-bold text-slate-900 flex-shrink-0 ml-2">
          {fmt(estimate.total)}
        </span>
      </div>

      {/* Title */}
      {estimate.title && (
        <p className="text-xs text-slate-500 truncate mb-2">{estimate.title}</p>
      )}

      {/* Financial row: margin % + profit + health badge */}
      {(() => {
        const marginPct = Number(estimate.gross_margin_pct);
        const profit = Number(estimate.net_profit);
        const hasMargin = !Number.isNaN(marginPct) && estimate.gross_margin_pct != null;
        const hasProfit = !Number.isNaN(profit) && estimate.net_profit != null;
        if (!hasMargin && !hasProfit) return null;

        let badge = null;
        if (hasMargin) {
          if (marginPct < 25) badge = { label: 'Low margin', cls: 'bg-red-100 text-red-700 border-red-200' };
          else if (marginPct <= 40) badge = { label: 'Review margin', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
          else badge = { label: 'Healthy', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        }

        return (
          <div className="flex items-center justify-between gap-2 mb-2 text-[11px]">
            <div className="flex items-center gap-2 text-slate-500">
              {hasMargin && (
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {marginPct.toFixed(1)}%
                </span>
              )}
              {hasProfit && (
                <span className="font-semibold text-slate-700">{fmt(profit)}</span>
              )}
            </div>
            {badge && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
        );
      })()}

      {/* Metrics row */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
        {estimate.view_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {estimate.view_count}x
            {estimate.last_viewed_at && <span className="text-slate-300">· {timeAgo(estimate.last_viewed_at)}</span>}
          </span>
        )}
        {estimate.sent_at && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Sent {timeAgo(estimate.sent_at)}
          </span>
        )}
        {estimate.assigned_to && (
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {estimate.assigned_to}
          </span>
        )}
      </div>

      {/* Follow-up badge */}
      {followUpCat && (
        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${followUpColors[followUpCat]}`}>
          <Clock className="w-3 h-3" />
          {followUpCat === 'overdue' ? 'Overdue' : followUpCat === 'today' ? 'Due today' : 'Upcoming'}
        </div>
      )}
    </div>
  );
}