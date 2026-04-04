import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Car, User, Calendar, ChevronLeft, Activity, Timer, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const TYPE_META = {
  travel:  { label: 'Travel',   bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  icon: Navigation },
  on_site: { label: 'On Site',  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    icon: MapPin },
  admin:   { label: 'Admin',    bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400',   icon: Activity },
  other:   { label: 'Other',    bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  icon: Clock },
};

function TypeBadge({ type }) {
  const m = TYPE_META[type] || TYPE_META.other;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function fmt(iso) {
  if (!iso) return '—';
  try { return format(new Date(iso), 'MMM d · h:mm a'); } catch { return iso; }
}

function fmtDur(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ApptTimeTracking() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('appointment');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.TimeTrackingLog.list('-start_time', 200);
    setLogs(data);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (typeFilter !== 'all' && l.tracking_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![l.customer_name, l.worker_name, l.notes, l.start_location].filter(Boolean).some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  // Group logic
  const grouped = {};
  filtered.forEach(log => {
    let key, label;
    if (groupBy === 'appointment') {
      key = log.appointment_id || 'no-appt';
      label = log.customer_name ? `Appt: ${log.customer_name}` : 'No Appointment';
    } else if (groupBy === 'customer') {
      key = log.customer_id || log.customer_name || 'unknown';
      label = log.customer_name || 'Unknown Customer';
    } else {
      key = log.worker_name || 'unassigned';
      label = log.worker_name || 'Unassigned';
    }
    if (!grouped[key]) grouped[key] = { label, logs: [], totalMiles: 0, totalMin: 0 };
    grouped[key].logs.push(log);
    grouped[key].totalMiles += log.miles_traveled || 0;
    grouped[key].totalMin += log.duration_minutes || 0;
  });

  const totalMiles = filtered.reduce((s, l) => s + (l.miles_traveled || 0), 0);
  const totalMin = filtered.reduce((s, l) => s + (l.duration_minutes || 0), 0);
  const activeLogs = logs.filter(l => l.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/appointments" className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Time Tracking</h1>
              <p className="text-xs text-slate-400 mt-0.5">Travel logs, on-site time, and mileage per appointment</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5 text-center">
              <p className="text-sm font-bold text-orange-700">{totalMiles.toFixed(1)} mi</p>
              <p className="text-[10px] text-orange-500 font-medium">Total Miles</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-center">
              <p className="text-sm font-bold text-blue-700">{fmtDur(totalMin)}</p>
              <p className="text-[10px] text-blue-500 font-medium">Total Time</p>
            </div>
            {activeLogs > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-sm font-bold text-green-700">{activeLogs} active</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <Input placeholder="Search customer, worker, notes..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm w-56" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="on_site">On Site</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {['appointment', 'customer', 'worker'].map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${groupBy === g ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {g === 'appointment' ? 'By Appointment' : g === 'customer' ? 'By Customer' : 'By Worker'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Timer className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm text-slate-400 font-medium">No tracking logs yet</p>
            <p className="text-xs text-slate-300 mt-1">Logs are created automatically when you use OMW and Arrived actions</p>
          </div>
        ) : (
          Object.entries(grouped).map(([key, group]) => (
            <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Group header */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {groupBy === 'appointment' && <Calendar className="w-4 h-4 text-slate-400" />}
                  {groupBy === 'customer' && <User className="w-4 h-4 text-slate-400" />}
                  {groupBy === 'worker' && <User className="w-4 h-4 text-slate-400" />}
                  <span className="font-semibold text-sm text-slate-800">{group.label}</span>
                  <span className="text-xs text-slate-400">{group.logs.length} log{group.logs.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {group.totalMiles > 0 && (
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />{group.totalMiles.toFixed(1)} mi
                    </span>
                  )}
                  {group.totalMin > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{fmtDur(group.totalMin)}
                    </span>
                  )}
                </div>
              </div>

              {/* Log rows */}
              <div className="divide-y divide-slate-100">
                {group.logs.map(log => {
                  const meta = TYPE_META[log.tracking_type] || TYPE_META.other;
                  const Icon = meta.icon;
                  return (
                    <div key={log.id} className={`flex items-start gap-4 px-5 py-3.5 ${log.status === 'active' ? 'bg-green-50/40' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${meta.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TypeBadge type={log.tracking_type} />
                          {log.status === 'active' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />LIVE
                            </span>
                          )}
                          {log.worker_name && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <User className="w-3 h-3" />{log.worker_name}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Start</span>
                            {fmt(log.start_time)}
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">End</span>
                            {log.status === 'active' ? <span className="text-green-600 font-medium">In Progress…</span> : fmt(log.end_time)}
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Duration</span>
                            {log.status === 'active' ? <span className="text-green-600 font-medium">—</span> : fmtDur(log.duration_minutes)}
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Miles</span>
                            {log.miles_traveled > 0 ? `${log.miles_traveled.toFixed(2)} mi` : '—'}
                          </div>
                        </div>
                        {(log.start_location || log.end_location) && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span>{log.start_location || '?'}{log.end_location && ` → ${log.end_location}`}</span>
                          </div>
                        )}
                        {log.notes && <p className="text-xs text-slate-400 mt-1 italic">{log.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}