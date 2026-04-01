import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Mail, MessageSquare, CheckCheck, Eye, MousePointer,
  AlertCircle, Clock, Calendar, Truck, FileText, ThumbsUp, ThumbsDown
} from 'lucide-react';

const EVENT_META = {
  appointment_created:  { label: 'Appointment Scheduled', icon: Calendar,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
  appointment_reminder: { label: 'Reminder Sent',         icon: Clock,       color: 'text-indigo-600', bg: 'bg-indigo-50' },
  omw:                  { label: 'On My Way',             icon: Truck,       color: 'text-orange-600', bg: 'bg-orange-50' },
  estimate_sent:        { label: 'Estimate Sent',         icon: FileText,    color: 'text-yellow-700', bg: 'bg-yellow-50' },
  estimate_approved:    { label: 'Estimate Approved',     icon: ThumbsUp,    color: 'text-green-700',  bg: 'bg-green-50'  },
  estimate_declined:    { label: 'Estimate Declined',     icon: ThumbsDown,  color: 'text-red-600',    bg: 'bg-red-50'    },
};

const STATUS_META = {
  sent:      { icon: Mail,          label: 'Sent',      color: 'text-slate-500'  },
  delivered: { icon: CheckCheck,    label: 'Delivered', color: 'text-blue-500'   },
  opened:    { icon: Eye,           label: 'Opened',    color: 'text-green-600'  },
  clicked:   { icon: MousePointer,  label: 'Clicked',   color: 'text-purple-600' },
  failed:    { icon: AlertCircle,   label: 'Failed',    color: 'text-red-500'    },
};

export default function CommTimeline({ clientId, appointmentId, estimateId, limit = 50 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [clientId, appointmentId, estimateId]);

  const load = async () => {
    setLoading(true);
    let filter = {};
    if (estimateId)    filter = { estimate_id: estimateId };
    else if (appointmentId) filter = { appointment_id: appointmentId };
    else if (clientId) filter = { client_id: clientId };

    const data = Object.keys(filter).length
      ? await base44.entities.CommEvent.filter(filter, '-created_date', limit)
      : await base44.entities.CommEvent.list('-created_date', limit);

    setEvents(data);
    setLoading(false);
  };

  if (loading) return <div className="text-xs text-slate-400 py-2">Loading communications...</div>;
  if (events.length === 0) return <div className="text-xs text-slate-400 py-2 italic">No communications recorded yet.</div>;

  return (
    <div className="space-y-2">
      {events.map(ev => {
        const meta = EVENT_META[ev.event_type] || { label: ev.event_type, icon: Mail, color: 'text-slate-500', bg: 'bg-slate-50' };
        const statusMeta = STATUS_META[ev.status] || STATUS_META.sent;
        const StatusIcon = statusMeta.icon;
        const EvIcon = meta.icon;
        const ChannelIcon = ev.channel === 'sms' ? MessageSquare : Mail;

        return (
          <div key={ev.id} className="flex items-start gap-3">
            {/* Left dot/icon */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
              <EvIcon className={`w-3.5 h-3.5 ${meta.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                {/* Channel badge */}
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                  <ChannelIcon className="w-2.5 h-2.5" />{ev.channel}
                </span>
                {/* Status badge */}
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${statusMeta.color}`}>
                  <StatusIcon className="w-2.5 h-2.5" />{statusMeta.label}
                </span>
              </div>
              {ev.subject && <p className="text-xs text-slate-500 mt-0.5 truncate">{ev.subject}</p>}
              {ev.preview && <p className="text-[11px] text-slate-400 mt-0.5 truncate italic">{ev.preview}</p>}
              <p className="text-[10px] text-slate-300 mt-0.5">
                {ev.created_date ? format(new Date(ev.created_date), 'MMM d, yyyy · h:mm a') : ''}
                {ev.client_email && ` · ${ev.client_email}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}