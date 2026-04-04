import React from 'react';

const STATUS_CONFIG = {
  new:              { label: 'New',             bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  scheduled:        { label: 'Scheduled',       bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500' },
  confirmed:        { label: 'Confirmed',       bg: 'bg-indigo-50',   text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  on_the_way:       { label: 'On The Way',      bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-500' },
  arrived:          { label: 'Arrived',         bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  visit_completed:  { label: 'Completed',       bg: 'bg-green-50',    text: 'text-green-700',   dot: 'bg-green-500' },
  follow_up_needed: { label: 'Follow-up',       bg: 'bg-yellow-50',   text: 'text-yellow-700',  dot: 'bg-yellow-500' },
  cancelled:        { label: 'Cancelled',       bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-400' },
  no_show:          { label: 'No Show',         bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500' },
};

export default function ApptStatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold ${textSize} ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}