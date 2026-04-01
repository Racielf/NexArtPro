import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Clock, Navigation, MapPin, User, Search, Trash2,
  Calendar, TrendingUp, Car, CheckCircle2, Timer
} from 'lucide-react';
import { format } from 'date-fns';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
}

function formatTime(isoStr) {
  if (!isoStr) return '—';
  try { return format(new Date(isoStr), 'h:mm a'); } catch { return '—'; }
}

export default function TimeTrackingHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMember, setFilterMember] = useState('all');

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    const data = await base44.entities.TimeEntry.list('-created_date', 100);
    setEntries(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    await base44.entities.TimeEntry.delete(id);
    toast.success('Entry deleted');
    loadEntries();
  };

  const members = ['all', ...new Set(entries.map(e => e.team_member).filter(Boolean))];

  const filtered = entries.filter(e => {
    const matchSearch = !search ||
      e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.team_member?.toLowerCase().includes(search.toLowerCase()) ||
      e.service?.toLowerCase().includes(search.toLowerCase()) ||
      e.project?.toLowerCase().includes(search.toLowerCase());
    const matchMember = filterMember === 'all' || e.team_member === filterMember;
    return matchSearch && matchMember;
  });

  // Summary stats
  const totalSeconds = filtered.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  const totalMiles = filtered.reduce((s, e) => s + (e.miles_traveled || 0), 0);
  const completedCount = filtered.filter(e => e.status === 'completed').length;
  const omwCount = filtered.filter(e => e.source === 'omw').length;

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Time Tracking History</h1>
            <p className="text-sm text-slate-500">All logged time entries & GPS mileage</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Timer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Time</div>
              <div className="text-lg font-bold text-slate-900">{formatDuration(totalSeconds)}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Miles</div>
              <div className="text-lg font-bold text-slate-900">{totalMiles.toFixed(1)} mi</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Completed</div>
              <div className="text-lg font-bold text-slate-900">{completedCount}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Entries</div>
              <div className="text-lg font-bold text-slate-900">{filtered.length}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, tech, service..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <select
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {members.map(m => (
              <option key={m} value={m}>{m === 'all' ? 'All Technicians' : m}</option>
            ))}
          </select>
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide"
            style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 40px' }}>
            <div>Technician</div>
            <div>Client / Project</div>
            <div>Date</div>
            <div>Start → End</div>
            <div className="text-center">Duration</div>
            <div className="text-center">Miles</div>
            <div></div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No time entries found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(entry => (
                <EntryRow key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-6 text-sm">
              <span className="text-slate-500">
                <span className="font-semibold text-slate-800">{filtered.length}</span> entries
              </span>
              <span className="text-slate-500">
                Total: <span className="font-semibold text-slate-800">{formatDuration(totalSeconds)}</span>
              </span>
              <span className="text-slate-500">
                Miles: <span className="font-semibold text-green-700">{totalMiles.toFixed(2)} mi</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryRow({ entry, onDelete }) {
  const isRunning = entry.status === 'running';
  const isOMW = entry.source === 'omw';

  return (
    <div
      className={`grid px-5 py-3 items-center gap-3 group hover:bg-slate-50 transition-colors ${isRunning ? 'bg-primary/5' : ''}`}
      style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 40px' }}
    >
      {/* Technician */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-800 truncate">{entry.team_member || '—'}</div>
          <div className="flex items-center gap-1 mt-0.5">
            {isRunning && (
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />Live
              </span>
            )}
            {isOMW && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200 px-1.5 py-0">
                OMW
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Client / Project */}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">{entry.client_name || '—'}</div>
        <div className="text-xs text-slate-400 truncate mt-0.5">
          {[entry.project, entry.service].filter(Boolean).join(' · ') || entry.note || ''}
        </div>
      </div>

      {/* Date */}
      <div className="text-sm text-slate-600">{formatDate(entry.date)}</div>

      {/* Start → End */}
      <div className="text-sm text-slate-600">
        <span>{formatTime(entry.start_time)}</span>
        {entry.end_time && (
          <>
            <span className="text-slate-300 mx-1">→</span>
            <span>{formatTime(entry.end_time)}</span>
          </>
        )}
      </div>

      {/* Duration */}
      <div className="text-center">
        <span className={`text-sm font-bold tabular-nums ${isRunning ? 'text-primary' : 'text-slate-800'}`}>
          {formatDuration(entry.duration_seconds)}
        </span>
      </div>

      {/* Miles */}
      <div className="text-center">
        {(entry.miles_traveled > 0) ? (
          <span className="flex items-center justify-center gap-1 text-sm font-medium text-green-700">
            <Navigation className="w-3.5 h-3.5" />
            {entry.miles_traveled.toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        )}
      </div>

      {/* Delete */}
      <div className="flex justify-end">
        <button
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}