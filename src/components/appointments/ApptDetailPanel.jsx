import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, MapPin, User, Clock, Wrench, FileText,
  CheckCircle, Navigation, UserCheck, RefreshCw, X, Pencil,
  AlertCircle, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApptStatusBadge from './ApptStatusBadge';
import CommTimeline from '@/components/shared/CommTimeline';

const QUICK_ACTIONS = [
  { label: 'Confirm',    status: 'confirmed',       icon: UserCheck,    show: ['new', 'scheduled'] },
  { label: 'On The Way', status: 'on_the_way',      icon: Navigation,   show: ['confirmed', 'scheduled', 'new'] },
  { label: 'Arrived',    status: 'arrived',         icon: MapPin,       show: ['on_the_way', 'confirmed'] },
  { label: 'Complete',   status: 'visit_completed', icon: CheckCircle,  show: ['arrived', 'on_the_way', 'in_progress', 'confirmed', 'scheduled'] },
  { label: 'Follow-up',  status: 'follow_up_needed',icon: RefreshCw,    show: ['visit_completed'] },
  { label: 'No Show',    status: 'no_show',         icon: ThumbsDown,   show: ['confirmed', 'scheduled', 'arrived', 'on_the_way'] },
  { label: 'Cancel',     status: 'cancelled',       icon: X,            show: ['new', 'confirmed', 'scheduled', 'on_the_way', 'arrived'] },
];

export default function ApptDetailPanel({ appt, onClose, onEdit, onStatusChange }) {
  if (!appt) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500">Select an appointment</p>
        <p className="text-xs text-slate-400 mt-1">Click any row to view details</p>
      </div>
    );
  }

  const timeDisplay = [appt.start_time, appt.end_time].filter(Boolean).join(' – ');
  const quickActions = QUICK_ACTIONS.filter(a => a.show.includes(appt.status));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-2 bg-slate-50">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Appointment</p>
          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{appt.customer_display_name}</p>
          <div className="mt-1.5">
            <ApptStatusBadge status={appt.status} />
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

        {/* Date / Time / Service */}
        <div className="px-4 py-3 space-y-2">
          {appt.title && <p className="text-sm font-semibold text-slate-800">{appt.title}</p>}
          <div className="space-y-1.5 text-xs text-slate-600">
            {appt.appointment_date && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.appointment_date}{timeDisplay ? ` · ${timeDisplay}` : ''}</span>
              </div>
            )}
            {appt.arrival_window && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500">Arrival window: {appt.arrival_window}</span>
              </div>
            )}
            {appt.service_type && (
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.service_type}</span>
              </div>
            )}
            {appt.assigned_worker_name && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.assigned_worker_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
          <div className="space-y-1.5 text-xs">
            {appt.customer_phone && (
              <a href={`tel:${appt.customer_phone}`} className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{appt.customer_phone}
              </a>
            )}
            {appt.customer_email && (
              <a href={`mailto:${appt.customer_email}`} className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{appt.customer_email}
              </a>
            )}
            {appt.service_address && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />{appt.service_address}
              </div>
            )}
          </div>
          {appt.customer_id && (
            <Link to="/customers" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              View Customer Profile →
            </Link>
          )}
        </div>

        {/* Notes */}
        {(appt.description || appt.notes || appt.internal_notes) && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</p>
            {appt.description && <p className="text-xs text-slate-600 leading-relaxed">{appt.description}</p>}
            {appt.notes && <p className="text-xs text-slate-500 leading-relaxed">{appt.notes}</p>}
            {appt.internal_notes && (
              <div className="bg-amber-50 border border-amber-100 rounded p-2">
                <p className="text-[10px] font-bold text-amber-600 mb-0.5 uppercase tracking-wide">Internal</p>
                <p className="text-xs text-amber-800 leading-relaxed">{appt.internal_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map(({ label, status, icon: Icon }) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(appt.id, status)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors text-left
                    ${status === 'cancelled' || status === 'no_show'
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5'}`}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {appt.estimate_id && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Related</p>
            <Link to={`/estimate-editor?id=${appt.estimate_id}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <FileText className="w-3.5 h-3.5" />View Estimate
            </Link>
          </div>
        )}

        {/* Create Estimate CTA */}
        {['visit_completed', 'arrived'].includes(appt.status) && (
          <div className="px-4 py-3">
            <Link
              to="/estimates"
              className="flex items-center justify-center gap-1.5 text-xs font-medium w-full px-3 py-2 rounded-md border border-primary text-primary hover:bg-primary/5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />Create Estimate
            </Link>
          </div>
        )}

        {/* Timestamps */}
        {(appt.omw_started_at || appt.arrived_at || appt.completed_at) && (
          <div className="px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeline</p>
            {appt.omw_started_at && <p className="text-xs text-slate-500">🚗 OMW: {new Date(appt.omw_started_at).toLocaleTimeString()}</p>}
            {appt.arrived_at && <p className="text-xs text-slate-500">📍 Arrived: {new Date(appt.arrived_at).toLocaleTimeString()}</p>}
            {appt.completed_at && <p className="text-xs text-slate-500">✅ Completed: {new Date(appt.completed_at).toLocaleTimeString()}</p>}
          </div>
        )}

        {/* Communications */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Communications</p>
          <CommTimeline appointmentId={appt.id} limit={8} />
        </div>
      </div>
    </div>
  );
}