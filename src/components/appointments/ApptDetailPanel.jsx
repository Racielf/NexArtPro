import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, MapPin, User, Clock, Wrench, FileText,
  CheckCircle, Navigation, UserCheck, RefreshCw, X, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApptStatusBadge from './ApptStatusBadge';
import CommTimeline from '@/components/shared/CommTimeline';

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

  const timeDisplay = [appt.scheduled_time, appt.end_time].filter(Boolean).join(' – ');

  const quickActions = [
    { label: 'Confirm',       status: 'confirmed',        icon: UserCheck,    show: ['new', 'scheduled'] },
    { label: 'On The Way',    status: 'on_the_way',       icon: Navigation,   show: ['confirmed', 'scheduled'] },
    { label: 'In Progress',   status: 'in_progress',      icon: Clock,        show: ['on_the_way', 'confirmed', 'scheduled'] },
    { label: 'Complete',      status: 'completed',        icon: CheckCircle,  show: ['in_progress', 'on_the_way', 'scheduled', 'confirmed'] },
    { label: 'Follow-up',     status: 'follow_up_needed', icon: RefreshCw,    show: ['completed'] },
    { label: 'Cancel',        status: 'cancelled',        icon: X,            show: ['new', 'confirmed', 'scheduled', 'on_the_way'] },
  ].filter(a => a.show.includes(appt.status));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-2 bg-slate-50">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Appointment Detail</p>
          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{appt.client_name}</p>
          <div className="mt-1">
            <ApptStatusBadge status={appt.status} />
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Date/Time/Service */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-2">
          {appt.title && (
            <p className="text-sm font-semibold text-slate-800">{appt.title}</p>
          )}
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {appt.scheduled_date && (
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.scheduled_date}{timeDisplay ? ` · ${timeDisplay}` : ''}</span>
              </div>
            )}
            {appt.service_type && (
              <div className="flex items-center gap-2 text-slate-600">
                <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.service_type}</span>
              </div>
            )}
            {appt.assigned_to && (
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.assigned_to}</span>
              </div>
            )}
          </div>
        </div>

        {/* Customer info */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
          <div className="space-y-1.5 text-xs">
            {appt.client_phone && (
              <a href={`tel:${appt.client_phone}`} className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{appt.client_phone}
              </a>
            )}
            {appt.client_email && (
              <a href={`mailto:${appt.client_email}`} className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{appt.client_email}
              </a>
            )}
            {appt.client_address && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />{appt.client_address}
              </div>
            )}
          </div>
          {appt.client_id && (
            <Link to="/clients" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1">
              View Customer Profile →
            </Link>
          )}
        </div>

        {/* Notes */}
        {(appt.description || appt.notes) && (
          <div className="px-4 py-3 border-b border-slate-100 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</p>
            {appt.description && <p className="text-xs text-slate-600 leading-relaxed">{appt.description}</p>}
            {appt.notes && <p className="text-xs text-slate-500 leading-relaxed italic">{appt.notes}</p>}
          </div>
        )}

        {/* Related */}
        {(appt.estimate_id || appt.job_id) && (
          <div className="px-4 py-3 border-b border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Related</p>
            {appt.estimate_id && (
              <Link to={`/estimate-editor?id=${appt.estimate_id}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <FileText className="w-3.5 h-3.5" />View Estimate
              </Link>
            )}
          </div>
        )}

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map(({ label, status, icon: Icon }) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(appt.id, status)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors text-slate-600"
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create Estimate CTA */}
        {['completed', 'in_progress'].includes(appt.status) && (
          <div className="px-4 py-3 border-b border-slate-100">
            <Button size="sm" variant="outline" className="w-full text-xs border-primary text-primary hover:bg-primary/5" asChild>
              <Link to={`/estimates?appointment=${appt.id}&client_name=${encodeURIComponent(appt.client_name || '')}&client_email=${encodeURIComponent(appt.client_email || '')}&client_address=${encodeURIComponent(appt.client_address || '')}&client_phone=${encodeURIComponent(appt.client_phone || '')}`}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />Create Estimate
              </Link>
            </Button>
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