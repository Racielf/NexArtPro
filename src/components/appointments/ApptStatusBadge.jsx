import React from 'react';

const STATUS_CONFIG = {
  new:              { label: 'New',             bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  confirmed:        { label: 'Confirmed',        bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  scheduled:        { label: 'Scheduled',        bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  on_the_way:       { label: 'On The Way',       bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  in_progress:      { label: 'In Progress',      bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: 'bg-yellow-500' },
  completed:        { label: 'Completed',        bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500' },
  cancelled:        { label: 'Cancelled',        bg: 'bg-red-100',     text: 'text-red-600',     dot: 'bg-red-400' },
  no_show:          { label: 'No Show',          bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500' },
  follow_up_needed: { label: 'Follow-up Needed', bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  omw:              { label: 'On The Way',       bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500' },
};

export default function ApptStatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const px = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${px} ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}