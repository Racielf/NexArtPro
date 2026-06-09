import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Eye, Bell } from 'lucide-react';

/**
 * ProposalReminderBar — Lightweight surface for proposal follow-up reminders.
 *
 * Accepts a `reminders` object from computeProposalReminders().
 * Each pill is clickable: navigates to sales pipeline pre-filtered,
 * or calls onFilter(category) if provided for in-page filtering.
 *
 * Props:
 *   reminders  — result of computeProposalReminders()
 *   onFilter   — optional (category) => void for in-page filter
 *   linkTo     — optional string path to navigate on click (default: /sales-pipeline)
 */

const CATEGORIES = [
  {
    key: 'overdue_follow_up',
    label: (n) => `${n} follow-up overdue`,
    icon: AlertTriangle,
    bg: 'bg-red-50 border-red-200 hover:bg-red-100',
    text: 'text-red-700',
  },
  {
    key: 'follow_up_today',
    label: (n) => `${n} follow-up today`,
    icon: Bell,
    bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    text: 'text-amber-700',
  },
  {
    key: 'stale_viewed_no_response',
    label: (n) => `${n} viewed — no response`,
    icon: Eye,
    bg: 'bg-violet-50 border-violet-200 hover:bg-violet-100',
    text: 'text-violet-700',
  },
  {
    key: 'stale_sent_not_viewed',
    label: (n) => `${n} sent — not opened`,
    icon: Clock,
    bg: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    text: 'text-orange-700',
  },
];

export default function ProposalReminderBar({ reminders, onFilter, linkTo }) {
  const navigate = useNavigate();
  if (!reminders || reminders.total === 0) return null;

  const handleClick = (cat) => {
    if (onFilter) {
      onFilter(cat.key);
    } else {
      navigate(linkTo || '/sales-pipeline');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {CATEGORIES.map(cat => {
        const count = reminders[cat.key]?.length || 0;
        if (count === 0) return null;
        const Icon = cat.icon;
        return (
          <button
            key={cat.key}
            onClick={() => handleClick(cat)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${cat.bg} ${cat.text}`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {cat.label(count)}
          </button>
        );
      })}
    </div>
  );
}