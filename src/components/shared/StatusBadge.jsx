import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  // Appointments
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  omw: { label: 'On My Way', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  // Estimates
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  viewed: { label: 'Viewed', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  changes_requested: { label: 'Changes Requested', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  signed: { label: 'Signed', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700 border-red-200' },
  converted: { label: 'Converted', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  // Work Orders
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  invoiced: { label: 'Invoiced', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  // Invoices
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700 border-green-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <Badge variant="outline" className={`text-xs font-medium border ${config.className}`}>
      {config.label}
    </Badge>
  );
}