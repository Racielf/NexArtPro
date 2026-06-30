import React from 'react';
import {
  CheckCircle2, Clock, User, Wrench, FileText,
  Camera, MessageSquare, DollarSign, AlertCircle, ArrowRight,
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

const STATUS_COLORS = {
  draft:       'bg-slate-100 text-slate-600',
  assigned:    'bg-blue-100 text-blue-700',
  scheduled:   'bg-indigo-100 text-indigo-700',
  on_the_way:  'bg-purple-100 text-purple-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  invoiced:    'bg-teal-100 text-teal-700',
};

function ActivityItem({ icon: Icon, iconClass, title, detail, time }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      {time && (
        <p className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">{time}</p>
      )}
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function WOActivityLogTab({ workOrder }) {
  if (!workOrder) return null;

  const events = [];

  // Created
  if (workOrder.created_date || workOrder.created_at) {
    events.push({
      id: 'created',
      icon: FileText,
      iconClass: 'bg-slate-100 text-slate-500',
      title: 'Work order created',
      detail: workOrder.title || '',
      time: formatTime(workOrder.created_date || workOrder.created_at),
      ts: new Date(workOrder.created_date || workOrder.created_at).getTime(),
    });
  }

  // Assignment
  if (workOrder.assigned_worker_name && workOrder.assigned_at) {
    events.push({
      id: 'assigned',
      icon: Wrench,
      iconClass: 'bg-blue-100 text-blue-600',
      title: `Assigned to ${workOrder.assigned_worker_name}`,
      detail: workOrder.assignment_source ? `Via ${workOrder.assignment_source}` : '',
      time: formatTime(workOrder.assigned_at),
      ts: new Date(workOrder.assigned_at).getTime(),
    });
  }

  // Status changes (if we have history from reassignment)
  if (workOrder.status === 'scheduled' || workOrder.status === 'on_the_way' ||
      workOrder.status === 'in_progress' || workOrder.status === 'completed' ||
      workOrder.status === 'invoiced') {
    if (workOrder.started_at) {
      events.push({
        id: 'started',
        icon: Clock,
        iconClass: 'bg-amber-100 text-amber-600',
        title: 'Work started',
        detail: workOrder.arrival_time ? `Arrival: ${workOrder.arrival_time}` : '',
        time: formatTime(workOrder.started_at),
        ts: new Date(workOrder.started_at).getTime(),
      });
    }
    if (workOrder.completed_at) {
      events.push({
        id: 'completed',
        icon: CheckCircle2,
        iconClass: 'bg-green-100 text-green-600',
        title: 'Work order completed',
        detail: workOrder.completed_by_user ? `By ${workOrder.completed_by_user}` : '',
        time: formatTime(workOrder.completed_at),
        ts: new Date(workOrder.completed_at).getTime(),
      });
    }
  }

  // Reassignment
  if (workOrder.previous_worker_name && workOrder.reassigned_at) {
    events.push({
      id: 'reassigned',
      icon: ArrowRight,
      iconClass: 'bg-orange-100 text-orange-600',
      title: `Reassigned from ${workOrder.previous_worker_name}`,
      detail: workOrder.reassigned_by ? `By ${workOrder.reassigned_by}` : '',
      time: formatTime(workOrder.reassigned_at),
      ts: new Date(workOrder.reassigned_at).getTime(),
    });
  }

  // Issues found
  if (workOrder.issues_found) {
    events.push({
      id: 'issues',
      icon: AlertCircle,
      iconClass: 'bg-red-100 text-red-600',
      title: 'Issues reported',
      detail: workOrder.issues_found.length > 80
        ? workOrder.issues_found.slice(0, 80) + '…'
        : workOrder.issues_found,
      time: workOrder.completed_at ? formatTime(workOrder.completed_at) : '',
      ts: workOrder.completed_at ? new Date(workOrder.completed_at).getTime() - 1 : 0,
    });
  }

  // Sort newest first
  events.sort((a, b) => b.ts - a.ts);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-slate-400">
        <Clock className="w-8 h-8 mb-2" />
        <p className="text-sm font-medium">No activity recorded yet</p>
        <p className="text-xs mt-1">Activity will appear as you update this work order</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700">Activity Log</p>
        <span className="text-xs text-slate-400">{events.length} events</span>
      </div>
      <div className="divide-y-0">
        {events.map(ev => (
          <ActivityItem key={ev.id} {...ev} />
        ))}
      </div>
    </div>
  );
}
