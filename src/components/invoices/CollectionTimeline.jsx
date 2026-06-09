/**
 * CollectionTimeline — Compact action timeline for collections
 *
 * Props:
 *   invoice: Invoice object
 */
import React from 'react';
import { getCollectionTimeline } from '@/lib/invoiceCollectionTimeline';
import { format } from 'date-fns';
import {
  Phone, DollarSign, AlertTriangle, CheckCircle2, User,
  MessageSquare, Clock, FileText
} from 'lucide-react';

const EVENT_ICONS = {
  follow_up_sent: Phone,
  client_contacted: Phone,
  promise_recorded: Clock,
  promise_broken: AlertTriangle,
  billing_issue_opened: AlertTriangle,
  billing_issue_assigned: User,
  billing_issue_resolved: CheckCircle2,
  sla_reviewed: FileText,
  sla_breach_resolved: CheckCircle2,
  payment_recorded: DollarSign,
  payment_removed: DollarSign,
  internal_note: MessageSquare,
};

const EVENT_LABELS = {
  follow_up_sent: 'Follow-up Sent',
  client_contacted: 'Client Contacted',
  promise_recorded: 'Promise to Pay Recorded',
  promise_broken: 'Promise Broken',
  billing_issue_opened: 'Billing Issue Opened',
  billing_issue_assigned: 'Issue Assigned',
  billing_issue_resolved: 'Issue Resolved',
  sla_reviewed: 'SLA Reviewed',
  sla_breach_resolved: 'Breach Resolved',
  payment_recorded: 'Payment Recorded',
  payment_removed: 'Payment Removed',
  internal_note: 'Internal Note',
};

const EVENT_COLORS = {
  follow_up_sent: 'bg-blue-50 border-blue-200 text-blue-700',
  client_contacted: 'bg-blue-50 border-blue-200 text-blue-700',
  promise_recorded: 'bg-amber-50 border-amber-200 text-amber-700',
  promise_broken: 'bg-red-50 border-red-200 text-red-700',
  billing_issue_opened: 'bg-red-50 border-red-200 text-red-700',
  billing_issue_assigned: 'bg-purple-50 border-purple-200 text-purple-700',
  billing_issue_resolved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  sla_reviewed: 'bg-slate-50 border-slate-200 text-slate-700',
  sla_breach_resolved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  payment_recorded: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  payment_removed: 'bg-amber-50 border-amber-200 text-amber-700',
  internal_note: 'bg-slate-50 border-slate-200 text-slate-700',
};

export default function CollectionTimeline({ invoice }) {
  const timeline = getCollectionTimeline(invoice);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          Collections Timeline
        </p>
        <p className="text-xs text-slate-500">No collection actions recorded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">
        Collections Timeline
      </p>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {timeline.map((event, idx) => {
          const Icon = EVENT_ICONS[event.type] || MessageSquare;
          const colorClass = EVENT_COLORS[event.type] || EVENT_COLORS.internal_note;
          const label = EVENT_LABELS[event.type] || event.type;

          return (
            <div
              key={event.id || idx}
              className={`border rounded-lg px-3 py-2 text-xs flex gap-2.5 ${colorClass}`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <p className="font-semibold">{label}</p>
                  <p className="text-[10px] opacity-70">
                    {format(new Date(event.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
                {event.actor && (
                  <p className="text-[10px] opacity-75 mt-0.5">
                    By {event.actor}
                  </p>
                )}
                {event.note && (
                  <p className="text-[10px] mt-1 italic opacity-80">
                    {event.note}
                  </p>
                )}
                {event.meta?.amount && (
                  <p className="text-[10px] mt-0.5 font-medium">
                    ${event.meta.amount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}