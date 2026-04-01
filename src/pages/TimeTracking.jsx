import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Calendar, Play, Square,
  Plus, MapPin, Navigation, Clock, Trash2, User, Search,
  Timer, Car, CheckCircle2, History
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function calcMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(isoStr) {
  if (!isoStr) return '—';
  try { return format(new Date(isoStr), 'h:mm a'); } catch { return '—'; }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
}

export default function TimeTracking() {
  const [activeTab, setActiveTab] = useState('timer');

  // --- Timer state ---
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [teamMember, setTeamMember] = useState('Technician');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningEntry, setRunningEntry] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);
  const [currentMiles, setCurrentMiles] = useState(0);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newForm, setNewForm] = useState({ client_name: '', project: '', service: '', note: '' });
  const [clients, setClients] = useState([]);

  // --- History state ---
  const [allEntries, setAllEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMember, setFilterMember] = useState('all');

  const watchIdRef = useRef(null);
  const startPosRef = useRef(null);
  const timerRef = useRef(null);
  const timerStartRef = useRef(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadEntries();
    base44.entities.Client.list('-created_date', 50).then(setClients);
  }, [dateStr, teamMember]);

  useEffect(() => {
    if (activeTab === 'history') loadAllEntries();
  }, [activeTab]);

  useEffect(() => {
    if (runningEntry) {
      timerStartRef.current = Date.now() - (elapsed * 1000);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [runningEntry?.id]);

  const loadEntries = async () => {
    setLoading(true);
    const data = await base44.entities.TimeEntry.filter({ date: dateStr });
    setEntries(data);
    const running = data.find(e => e.status === 'running');
    if (running && !runningEntry) {
      const startMs = new Date(running.start_time).getTime();
      const elapsedSec = Math.floor((Date.now() - startMs) / 1000) + (running.duration_seconds || 0);
      setRunningEntry(running);
      setElapsed(elapsedSec);
      timerStartRef.current = Date.now() - (elapsedSec * 1000);
    }
    setLoading(false);
  };

  const loadAllEntries = async () => {
    setHistoryLoading(true);
    const data = await base44.entities.TimeEntry.list('-created_date', 200);
    setAllEntries(data);
    setHistoryLoading(false);
  };

  const startGPS = useCallback((entryId) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      startPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGpsActive(true);
      setCurrentMiles(0);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (newPos) => {
          if (startPosRef.current) {
            const miles = calcMiles(startPosRef.current.lat, startPosRef.current.lng, newPos.coords.latitude, newPos.coords.longitude);
            setCurrentMiles(miles);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      base44.entities.TimeEntry.update(entryId, { start_lat: pos.coords.latitude, start_lng: pos.coords.longitude });
    }, () => { toast.error('GPS not available — tracking without location'); });
  }, []);

  const stopGPS = useCallback(async (entryId) => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (!navigator.geolocation) { setGpsActive(false); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await base44.entities.TimeEntry.update(entryId, { end_lat: pos.coords.latitude, end_lng: pos.coords.longitude, miles_traveled: parseFloat(currentMiles.toFixed(2)) });
      setGpsActive(false); setCurrentMiles(0);
    }, () => { setGpsActive(false); });
  }, [currentMiles]);

  const handleStartTimer = async () => {
    if (runningEntry) { toast.error('Stop the current timer first'); return; }
    const entry = await base44.entities.TimeEntry.create({
      team_member: teamMember, date: dateStr,
      client_name: newForm.client_name || '', project: newForm.project || '',
      service: newForm.service || '', note: newForm.note || '',
      start_time: new Date().toISOString(), status: 'running', duration_seconds: 0, miles_traveled: 0,
    });
    setRunningEntry(entry); setElapsed(0); timerStartRef.current = Date.now();
    setShowNewEntry(false); setNewForm({ client_name: '', project: '', service: '', note: '' });
    startGPS(entry.id);
    toast.success('Timer started! GPS tracking active.');
    await loadEntries();
  };

  const handleStopTimer = async () => {
    if (!runningEntry) return;
    clearInterval(timerRef.current);
    const finalSeconds = elapsed;
    await base44.entities.TimeEntry.update(runningEntry.id, {
      end_time: new Date().toISOString(), status: 'completed',
      duration_seconds: finalSeconds, miles_traveled: parseFloat(currentMiles.toFixed(2)),
    });
    await stopGPS(runningEntry.id);
    toast.success(`Timer stopped — ${formatDuration(finalSeconds)} logged, ${currentMiles.toFixed(2)} mi`);
    setRunningEntry(null); setElapsed(0);
    await loadEntries();
  };

  const handleAddManualEntry = async () => {
    if (!newForm.client_name && !newForm.service) { toast.error('Add a client or service name'); return; }
    await base44.entities.TimeEntry.create({
      team_member: teamMember, date: dateStr,
      client_name: newForm.client_name, project: newForm.project,
      service: newForm.service, note: newForm.note,
      status: 'completed', duration_seconds: 0,
      start_time: new Date().toISOString(), end_time: new Date().toISOString(),
    });
    setShowNewEntry(false); setNewForm({ client_name: '', project: '', service: '', note: '' });
    toast.success('Entry added'); loadEntries();
  };

  const handleDelete = async (id) => {
    if (runningEntry?.id === id) {
      clearInterval(timerRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      setRunningEntry(null); setElapsed(0); setGpsActive(false);
    }
    await base44.entities.TimeEntry.delete(id);
    toast.success('Entry deleted');
    loadEntries();
    if (activeTab === 'history') loadAllEntries();
  };

  const weekTotal = entries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  const dayTotal = entries.filter(e => e.date === dateStr).reduce((s, e) => s + (e.duration_seconds || 0), 0);

  // History filters
  const historyMembers = ['all', ...new Set(allEntries.map(e => e.team_member).filter(Boolean))];
  const filteredHistory = allEntries.filter(e => {
    const matchSearch = !search ||
      e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.team_member?.toLowerCase().includes(search.toLowerCase()) ||
      e.service?.toLowerCase().includes(search.toLowerCase()) ||
      e.project?.toLowerCase().includes(search.toLowerCase());
    const matchMember = filterMember === 'all' || e.team_member === filterMember;
    return matchSearch && matchMember;
  });
  const histTotalSec = filteredHistory.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  const histTotalMiles = filteredHistory.reduce((s, e) => s + (e.miles_traveled || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Time Tracking</h1>
          <p className="text-sm text-slate-500">GPS-enabled time & mileage logging</p>
        </div>
        {activeTab === 'timer' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Logged by:</span>
            <select
              value={teamMember}
              onChange={e => setTeamMember(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option>Technician</option>
              <option>Rodolfo Fernandez</option>
              <option>John Smith</option>
              <option>Maria Lopez</option>
            </select>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timer' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Clock className="w-4 h-4" />Timer
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <History className="w-4 h-4" />History
        </button>
      </div>

      {/* ===== TIMER TAB ===== */}
      {activeTab === 'timer' && (
        <div className="flex-1 overflow-auto p-6 space-y-4">

          {/* WEEK NAVIGATOR */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <span className="font-semibold text-slate-800 text-sm">
                  {format(weekStart, 'EEE, MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-600">Total: {formatDuration(weekTotal)}</div>
            </div>

            <div className="grid grid-cols-8 border-b border-slate-100">
              {weekDays.map((day, i) => {
                const ds = format(day, 'yyyy-MM-dd');
                const isToday = ds === todayStr;
                const isSelected = ds === dateStr;
                const dayTotalSec = entries.filter(e => e.date === ds).reduce((s, e) => s + (e.duration_seconds || 0), 0);
                return (
                  <button key={i} onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center py-3 px-2 border-r border-slate-100 last:border-r-0 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                    <span className="text-xs text-slate-400 font-medium">{DAYS[i]}</span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center mt-1 text-sm font-bold ${isToday ? 'bg-primary text-white' : isSelected ? 'bg-primary/20 text-primary' : 'text-slate-700'}`}>
                      {format(day, 'd')}
                    </div>
                    <span className={`text-xs mt-1 ${dayTotalSec > 0 ? 'text-primary font-medium' : 'text-slate-300'}`}>
                      {dayTotalSec > 0 ? formatDuration(dayTotalSec) : '—'}
                    </span>
                  </button>
                );
              })}
              <div className="flex flex-col items-center justify-center py-3 px-2 bg-slate-50">
                <span className="text-xs text-slate-400 font-medium">Total</span>
                <span className="text-sm font-bold text-slate-700 mt-1">{formatDuration(weekTotal)}</span>
              </div>
            </div>

            <div className="grid px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100" style={{ gridTemplateColumns: '1fr 2fr auto' }}>
              <div>Team Member / Date</div>
              <div>Client / Project / Service</div>
              <div className="text-right">Time / Status</div>
            </div>

            <div className="divide-y divide-slate-50 min-h-[60px]">
              {loading ? (
                <div className="text-center py-6 text-slate-400 text-sm">Loading...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-6 text-slate-300 text-sm">No entries for this day</div>
              ) : null}
              {entries.map(entry => (
                <TimerEntryRow key={entry.id} entry={entry}
                  isRunning={runningEntry?.id === entry.id}
                  elapsed={runningEntry?.id === entry.id ? elapsed : null}
                  gpsActive={runningEntry?.id === entry.id ? gpsActive : false}
                  miles={runningEntry?.id === entry.id ? currentMiles : entry.miles_traveled}
                  onDelete={handleDelete} />
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-3">
              <button onClick={() => setShowNewEntry(true)}
                className="flex-1 flex items-center justify-center gap-2 text-sm text-primary border-2 border-dashed border-primary/30 rounded-lg py-2.5 hover:bg-primary/5 transition-colors font-medium">
                <Plus className="w-4 h-4" />New Entry
              </button>
              {runningEntry ? (
                <button onClick={handleStopTimer}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-w-[160px] justify-center">
                  <Square className="w-4 h-4 fill-white" />Stop — {formatDuration(elapsed)}
                </button>
              ) : (
                <button onClick={() => setShowNewEntry(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                  <Play className="w-4 h-4 fill-white" />Start Timer
                </button>
              )}
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <span className="text-sm font-semibold text-slate-600">
                Daily Total: {formatDuration(dayTotal + (runningEntry ? elapsed : 0))}
              </span>
            </div>
          </div>

          {/* GPS BANNER */}
          {runningEntry && (
            <div className={`rounded-xl border p-4 flex items-center gap-4 ${gpsActive ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${gpsActive ? 'bg-green-100' : 'bg-orange-100'}`}>
                {gpsActive ? <Navigation className="w-5 h-5 text-green-600" /> : <MapPin className="w-5 h-5 text-orange-500" />}
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${gpsActive ? 'text-green-800' : 'text-orange-700'}`}>
                  {gpsActive ? '📍 GPS Active — Tracking your route' : '⏳ Starting GPS...'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatDuration(elapsed)} elapsed · {currentMiles.toFixed(2)} mi tracked
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${gpsActive ? 'bg-green-500' : 'bg-orange-400'}`} />
                <span className="text-xs font-medium text-slate-600">{gpsActive ? 'Live' : 'Connecting'}</span>
              </div>
              <button onClick={handleStopTimer}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                <Square className="w-3.5 h-3.5 fill-white" />Stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-auto p-6 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Timer className="w-5 h-5 text-blue-600" /></div>
              <div><div className="text-xs text-slate-400 font-medium">Total Time</div><div className="text-lg font-bold text-slate-900">{formatDuration(histTotalSec)}</div></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><Car className="w-5 h-5 text-green-600" /></div>
              <div><div className="text-xs text-slate-400 font-medium">Total Miles</div><div className="text-lg font-bold text-slate-900">{histTotalMiles.toFixed(1)} mi</div></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-purple-600" /></div>
              <div><div className="text-xs text-slate-400 font-medium">Completed</div><div className="text-lg font-bold text-slate-900">{filteredHistory.filter(e => e.status === 'completed').length}</div></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-orange-600" /></div>
              <div><div className="text-xs text-slate-400 font-medium">Entries</div><div className="text-lg font-bold text-slate-900">{filteredHistory.length}</div></div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by client, tech, service..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-white" />
            </div>
            <select
              value={filterMember} onChange={e => setFilterMember(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {historyMembers.map(m => <option key={m} value={m}>{m === 'all' ? 'All Technicians' : m}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide"
              style={{ gridTemplateColumns: '1.4fr 1.4fr 0.9fr 1fr 0.8fr 0.8fr 36px' }}>
              <div>Technician</div>
              <div>Client / Project</div>
              <div>Date</div>
              <div>Start → End</div>
              <div className="text-center">Duration</div>
              <div className="text-center">Miles</div>
              <div></div>
            </div>

            {historyLoading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No time entries found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredHistory.map(entry => (
                  <HistoryRow key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {filteredHistory.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-6 text-sm">
                <span className="text-slate-500">{filteredHistory.length} entries</span>
                <span className="text-slate-500">Total: <span className="font-semibold text-slate-800">{formatDuration(histTotalSec)}</span></span>
                <span className="text-slate-500">Miles: <span className="font-semibold text-green-700">{histTotalMiles.toFixed(2)} mi</span></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />New Time Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Client</label>
              <select value={newForm.client_name} onChange={e => setNewForm(f => ({ ...f, client_name: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.full_name}>{c.full_name}</option>)}
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Project</label>
                <Input value={newForm.project} onChange={e => setNewForm(f => ({ ...f, project: e.target.value }))} placeholder="e.g. Flooring" className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Service</label>
                <Input value={newForm.service} onChange={e => setNewForm(f => ({ ...f, service: e.target.value }))} placeholder="e.g. Installation" className="text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Note</label>
              <Input value={newForm.note} onChange={e => setNewForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional note..." className="text-sm" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-xs text-blue-700">
              <Navigation className="w-4 h-4 flex-shrink-0" />
              Starting the timer will activate GPS to track your route and mileage automatically.
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowNewEntry(false)}>Cancel</Button>
            <Button variant="outline" className="flex-1" onClick={handleAddManualEntry}><Plus className="w-4 h-4 mr-1" />Add Entry</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleStartTimer}><Play className="w-4 h-4 mr-1 fill-white" />Start Timer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimerEntryRow({ entry, isRunning, elapsed, gpsActive, miles, onDelete }) {
  const duration = isRunning ? elapsed : (entry.duration_seconds || 0);
  return (
    <div className={`grid px-5 py-3 items-center gap-3 group transition-colors ${isRunning ? 'bg-primary/5' : 'hover:bg-slate-50/80'}`}
      style={{ gridTemplateColumns: '1fr 2fr auto' }}>
      <div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-sm font-medium text-slate-800">{entry.team_member}</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5 pl-7">{entry.date}</div>
      </div>
      <div>
        {entry.client_name && <span className="font-semibold text-slate-800 text-sm">{entry.client_name}</span>}
        {entry.project && <span className="text-slate-500 text-sm"> / {entry.project}</span>}
        {entry.service && <span className="text-slate-500 text-sm"> / {entry.service}</span>}
        {entry.note && <div className="text-xs text-slate-400 mt-0.5">{entry.note}</div>}
        {(miles > 0 || entry.miles_traveled > 0) && (
          <div className="flex items-center gap-1 mt-1">
            <Navigation className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600 font-medium">{(miles || entry.miles_traveled || 0).toFixed(2)} mi</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <div className="text-right">
          <div className={`text-sm font-bold tabular-nums ${isRunning ? 'text-primary' : 'text-slate-800'}`}>{formatDuration(duration)}</div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {isRunning ? (
              <><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-xs text-red-500 font-medium">Live</span>
                {gpsActive && <Navigation className="w-3 h-3 text-green-500 ml-1" />}</>
            ) : (
              <span className="text-xs text-slate-400 capitalize">{entry.status}</span>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function HistoryRow({ entry, onDelete }) {
  const isRunning = entry.status === 'running';
  const isOMW = entry.source === 'omw';
  return (
    <div className={`grid px-5 py-3 items-center gap-3 group hover:bg-slate-50 transition-colors ${isRunning ? 'bg-primary/5' : ''}`}
      style={{ gridTemplateColumns: '1.4fr 1.4fr 0.9fr 1fr 0.8fr 0.8fr 36px' }}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-800 truncate">{entry.team_member || '—'}</div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {isRunning && <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />Live</span>}
            {isOMW && <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200 px-1.5 py-0">OMW</Badge>}
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">{entry.client_name || '—'}</div>
        <div className="text-xs text-slate-400 truncate mt-0.5">{[entry.project, entry.service].filter(Boolean).join(' · ') || entry.note || ''}</div>
      </div>
      <div className="text-sm text-slate-600">{formatDate(entry.date)}</div>
      <div className="text-sm text-slate-600">
        <span>{formatTime(entry.start_time)}</span>
        {entry.end_time && <><span className="text-slate-300 mx-1">→</span><span>{formatTime(entry.end_time)}</span></>}
      </div>
      <div className="text-center">
        <span className={`text-sm font-bold tabular-nums ${isRunning ? 'text-primary' : 'text-slate-800'}`}>{formatDuration(entry.duration_seconds)}</span>
      </div>
      <div className="text-center">
        {entry.miles_traveled > 0 ? (
          <span className="flex items-center justify-center gap-1 text-sm font-medium text-green-700">
            <Navigation className="w-3.5 h-3.5" />{entry.miles_traveled.toFixed(2)}
          </span>
        ) : <span className="text-slate-300 text-sm">—</span>}
      </div>
      <div className="flex justify-end">
        <button onClick={() => onDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}