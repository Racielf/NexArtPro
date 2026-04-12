import React from 'react';
import { AlertTriangle, Clock, CalendarClock } from 'lucide-react';

export default function SalesFollowUpBar({ summary, onFilterFollowUp }) {
  const sections = [
    {
      key: 'overdue',
      label: 'Overdue',
      count: summary.overdue.length,
      icon: AlertTriangle,
      bg: 'bg-red-50 border-red-200 hover:bg-red-100',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
    {
      key: 'today',
      label: 'Due Today',
      count: summary.today.length,
      icon: Clock,
      bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    {
      key: 'upcoming',
      label: 'Upcoming',
      count: summary.upcoming.length,
      icon: CalendarClock,
      bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      text: 'text-blue-600',
      dot: 'bg-blue-500',
    },
  ];

  const totalFollowUps = summary.overdue.length + summary.today.length + summary.upcoming.length;
  if (totalFollowUps === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {sections.map(s => {
        if (s.count === 0) return null;
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            onClick={() => onFilterFollowUp(s.key)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${s.bg} ${s.text}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {s.count} {s.label}
          </button>
        );
      })}
    </div>
  );
}