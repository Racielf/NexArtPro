import React from 'react';
import { Badge } from '@/components/ui/badge';

// Semantic variant → Tailwind classes (calmer -50 surfaces, token-aligned)
const VARIANTS = {
  success:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  info:     'bg-blue-50 text-blue-700 border-blue-200',
  sky:      'bg-sky-50 text-sky-700 border-sky-200',
  warning:  'bg-amber-50 text-amber-700 border-amber-200',
  danger:   'bg-red-50 text-red-600 border-red-200',
  neutral:  'bg-slate-100 text-slate-600 border-slate-200',
  purple:   'bg-violet-50 text-violet-700 border-violet-200',
  teal:     'bg-teal-50 text-teal-700 border-teal-200',
  orange:   'bg-orange-50 text-orange-700 border-orange-200',
};

const DOT_COLOR = {
  success: 'bg-emerald-500',
  info:    'bg-blue-500',
  sky:     'bg-sky-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  neutral: 'bg-slate-400',
  purple:  'bg-violet-500',
  teal:    'bg-teal-500',
  orange:  'bg-orange-500',
};

const statusConfig = {
  // Appointments
  scheduled:        { label: 'Scheduled',        variant: 'info' },
  omw:              { label: 'On My Way',         variant: 'orange' },
  on_my_way:        { label: 'On My Way',         variant: 'orange' },
  on_the_way:       { label: 'On the Way',        variant: 'orange' },
  in_progress:      { label: 'In Progress',       variant: 'warning' },
  completed:        { label: 'Completed',         variant: 'success' },
  visit_completed:  { label: 'Visit Completed',   variant: 'teal' },
  cancelled:        { label: 'Cancelled',         variant: 'neutral' },

  // Estimates / Proposals
  draft:             { label: 'Draft',              variant: 'neutral' },
  sent:              { label: 'Sent',               variant: 'info' },
  viewed:            { label: 'Viewed',             variant: 'sky' },
  changes_requested: { label: 'Changes Requested',  variant: 'warning' },
  approved:          { label: 'Approved',           variant: 'success' },
  accepted:          { label: 'Accepted',           variant: 'success' },
  signed:            { label: 'Signed',             variant: 'success' },
  declined:          { label: 'Declined',           variant: 'danger' },
  rejected:          { label: 'Rejected',           variant: 'danger' },
  converted:         { label: 'Converted',          variant: 'purple' },
  review_needed:           { label: 'Review Needed',      variant: 'warning' },
  converted_to_invoice:    { label: 'Invoiced',           variant: 'teal' },
  converted_to_work_order: { label: 'Work Order',         variant: 'purple' },
  pending_adjustment:      { label: 'Pending Adjustment', variant: 'warning' },

  // Work Orders
  pending:  { label: 'Pending',  variant: 'warning' },
  assigned: { label: 'Assigned', variant: 'info' },
  invoiced: { label: 'Invoiced', variant: 'purple' },

  // Invoices
  partial: { label: 'Partial',  variant: 'warning' },
  paid:    { label: 'Paid',    variant: 'success' },
  overdue: { label: 'Overdue', variant: 'danger' },

  // Leads
  new:       { label: 'New',       variant: 'info' },
  contacted: { label: 'Contacted', variant: 'warning' },
};

export default function StatusBadge({ status, dot = true }) {
  const cfg = statusConfig[status];
  const label = cfg?.label ?? status ?? '—';
  const variant = cfg?.variant ?? 'neutral';
  const cls = VARIANTS[variant] ?? VARIANTS.neutral;
  const dotCls = DOT_COLOR[variant] ?? DOT_COLOR.neutral;
  return (
    <Badge variant="outline" className={`text-[11px] font-medium border whitespace-nowrap gap-1.5 ${cls}`}>
      {dot && <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />}
      {label}
    </Badge>
  );
}
