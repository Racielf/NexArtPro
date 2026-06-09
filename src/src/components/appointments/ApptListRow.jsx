import React from 'react';
import { MapPin, Clock, User, Wrench, ChevronRight } from 'lucide-react';
import ApptStatusBadge from './ApptStatusBadge';

export default function ApptListRow({ appt, isSelected, onClick }) {
  const timeDisplay = [appt.start_time, appt.end_time].filter(Boolean).join(' – ');
  const dateObj = appt.appointment_date ? new Date(appt.appointment_date + 'T00:00:00') : null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 cursor-pointer transition-colors group
        ${isSelected ? 'bg-blue-50 border-l-2 border-l-primary' : 'hover:bg-slate-50 border-l-2 border-l-transparent'}`}
    >
      {/* Date block */}
      <div className="flex-shrink-0 w-12 text-center">
        <div className="text-xs font-bold text-slate-500 uppercase leading-none">
          {dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short' }) : '—'}
        </div>
        <div className={`text-xl font-extrabold leading-tight ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
          {dateObj ? dateObj.getDate() : '—'}
        </div>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-slate-900 truncate">{appt.customer_display_name}</span>
          <ApptStatusBadge status={appt.status} size="xs" />
        </div>
        {(appt.title || appt.description) && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{appt.title || appt.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {timeDisplay && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />{timeDisplay}
            </span>
          )}
          {appt.service_type && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Wrench className="w-3 h-3" />{appt.service_type}
            </span>
          )}
          {appt.service_address && (
            <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-48">
              <MapPin className="w-3 h-3 flex-shrink-0" />{appt.service_address}
            </span>
          )}
          {appt.assigned_worker_name && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <User className="w-3 h-3" />{appt.assigned_worker_name}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'}`} />
    </div>
  );
}