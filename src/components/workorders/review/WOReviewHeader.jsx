import React from 'react';
import { MapPin, Calendar, Hash } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

export default function WOReviewHeader({ workOrder }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Work Order #{workOrder.work_order_number}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{workOrder.title || workOrder.client_name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{workOrder.client_name}</p>
        </div>
        <StatusBadge status={workOrder.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
        {workOrder.client_address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <span>{workOrder.client_address}</span>
          </div>
        )}
        {workOrder.scheduled_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{format(new Date(workOrder.scheduled_date + 'T12:00:00'), 'MMMM d, yyyy')}</span>
            {workOrder.scheduled_time && <span className="text-slate-400">· {workOrder.scheduled_time}</span>}
          </div>
        )}
      </div>
    </div>
  );
}