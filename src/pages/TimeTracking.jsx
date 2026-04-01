import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Calendar, Play, Square,
  Plus, MapPin, Navigation, Clock, Pause, Trash2, X, User
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function calcMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TimeTracking() {
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

  const watchIdRef = useRef(null);
  const startPosRef = useRef(null);
  const timerRef = useRef(null);
  const timerStartRef = useRef(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadEntries();
    base44.entities.Client.list('-created_date', 50).then(setClients);
  }, [dateStr, teamMember]);

  // Tick timer every second for running entry
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

    // Restore any running timer
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

  // --- GPS tracking ---
  const startGPS = useCallback((entryId) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      startPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGpsActive(true);
      setCurrentMiles(0);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (newPos) => {
          if (startPosRef.current) {
            const miles = calcMiles(
              startPosRef.current.lat, startPosRef.current.lng,
              newPos.coords.latitude, newPos.coords.longitude
            );
            setCurrentMiles(miles);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      // Save start coords
      base44.entities.TimeEntry.update(entryId, {
        start_lat: pos.coords.latitude,
        start_lng: pos.coords.longitude,
      });
    }, () => {
      toast.error('GPS not available — tracking without location');
    });
  }, []);

  const stopGPS = useCallback(async (entryId) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (!navigator.geolocation) {
      setGpsActive(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      await base44.entities.TimeEntry.update(entryId, {
        end_lat: pos.coords.latitude,
        end_lng: pos.coords.longitude,
        miles_traveled: parseFloat(currentMiles.toFixed(2)),
      });
      setGpsActive(false);
      setCurrentMiles(0);
    }, () => {
      setGpsActive(false);
    });
  }, [currentMiles]);

  // --- Start Timer ---
  const handleStartTimer = async () => {
    if (runningEntry) {
      toast.error('Stop the current timer first');
      return;
    }
    const entry = await base44.entities.TimeEntry.create({
      team_member: teamMember,
      date: dateStr,
      client_name: newForm.client_name || '',
      project: newForm.project || '',
      service: newForm.service || '',
      note: newForm.note || '',
      start_time: new Date().toISOString(),
      status: 'running',
      duration_seconds: 0,
      miles_traveled: 0,
    });

    setRunningEntry(entry);
    setElapsed(0);
    timerStartRef.current = Date.now();
    setShowNewEntry(false);
    setNewForm({ client_name: '', project: '', service: '', note: '' });

    // Start GPS
    startGPS(entry.id);
    toast.success('Timer started! GPS tracking active.');
    await loadEntries();
  };

  // --- Stop Timer ---
  const handleStopTimer = async () => {
    if (!runningEntry) return;
    clearInterval(timerRef.current);

    const finalSeconds = elapsed;
    await base44.entities.TimeEntry.update(runningEntry.id, {
      end_time: new Date().toISOString(),
      status: 'completed',
      duration_seconds: finalSeconds,
      miles_traveled: parseFloat(currentMiles.toFixed(2)),
    });

    await stopGPS(runningEntry.id);

    toast.success(`Timer stopped — ${formatDuration(finalSeconds)} logged, ${currentMiles.toFixed(2)} mi`);
    setRunningEntry(null);
    setElapsed(0);
    await loadEntries();
  };

  // --- New Entry (manual) ---
  const handleAddManualEntry = async () => {
    if (!newForm.client_name && !newForm.service) {
      toast.error('Add a client or service name');
      return;
    }
    await base44.entities.TimeEntry.create({
      team_member: teamMember,
      date: dateStr,
      client_name: newForm.client_name,
      project: newForm.project,
      service: newForm.service,
      note: newForm.note,
      status: 'completed',
      duration_seconds: 0,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
    });
    setShowNewEntry(false);
    setNewForm({ client_name: '', project: '', service: '', note: '' });
    toast.success('Entry added');
    loadEntries();
  };

  const handleDelete = async (id) => {
    if (runningEntry?.id === id) {
      clearInterval(timerRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      setRunningEntry(null);
      setElapsed(0);
      setGpsActive(false);
    }
    await base44.entities.TimeEntry.delete(id);
    toast.success('Entry deleted');
    loadEntries();
  };

  // Week totals
  const weekTotal = entries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  const dayTotal = entries.filter(e => e.date === dateStr).reduce((s, e) => s + (e.duration_seconds || 0), 0);

  const prevWeek = () => setWeekStart(w => subWeeks(w, 1));
  const nextWeek = () => setWeekStart(w => addWeeks(w, 1));

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">

      {/* PAGE HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Time Tracking</h1>
          <p className="text-sm text-slate-500">GPS-enabled time & mileage logging</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
            <User className="w-4 h-4" />
            <span className="text-xs text-slate-400">Hours Logged By</span>
          </div>
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
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* WEEK NAVIGATOR */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button onClick={prevWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={nextWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
              <span className="font-semibold text-slate-800 text-sm">
                {format(weekStart, 'EEE, MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
              </span>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg ml-1">
                <Calendar className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="text-sm font-semibold text-slate-600">
              Total: {formatDuration(weekTotal)}
            </div>
          </div>

          {/* Day columns */}
          <div className="grid grid-cols-8 border-b border-slate-100">
            {weekDays.map((day, i) => {
              const ds = format(day, 'yyyy-MM-dd');
              const isToday = ds === todayStr;
              const isSelected = ds === dateStr;
              const dayEntries = entries.filter(e => e.date === ds);
              const dayTotalSec = dayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center py-3 px-2 border-r border-slate-100 last:border-r-0 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-xs text-slate-400 font-medium">{DAYS[i]}</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mt-1 text-sm font-bold ${
                    isToday ? 'bg-primary text-white' : isSelected ? 'bg-primary/20 text-primary' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <span className={`text-xs mt-1 ${dayTotalSec > 0 ? 'text-primary font-medium' : 'text-slate-300'}`}>
                    {dayTotalSec > 0 ? formatDuration(dayTotalSec) : '—'}
                  </span>
                </button>
              );
            })}
            {/* Total column */}
            <div className="flex flex-col items-center justify-center py-3 px-2 bg-slate-50">
              <span className="text-xs text-slate-400 font-medium">Total</span>
              <span className="text-sm font-bold text-slate-700 mt-1">{formatDuration(weekTotal)}</span>
            </div>
          </div>

          {/* TEAM MEMBER / DATE header */}
          <div className="grid px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100" style={{ gridTemplateColumns: '1fr 2fr auto' }}>
            <div>Team Member / Date</div>
            <div>Client / Project / Service / Note</div>
            <div className="text-right">Time / Status</div>
          </div>

          {/* ENTRIES */}
          <div className="divide-y divide-slate-50 min-h-[60px]">
            {loading ? (
              <div className="text-center py-6 text-slate-400 text-sm">Loading...</div>
            ) : entries.length === 0 && !runningEntry ? (
              <div className="text-center py-6 text-slate-300 text-sm">No entries for this day</div>
            ) : null}

            {entries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isRunning={runningEntry?.id === entry.id}
                elapsed={runningEntry?.id === entry.id ? elapsed : null}
                gpsActive={runningEntry?.id === entry.id ? gpsActive : false}
                miles={runningEntry?.id === entry.id ? currentMiles : entry.miles_traveled}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* ACTIONS ROW */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={() => setShowNewEntry(true)}
              className="flex-1 flex items-center justify-center gap-2 text-sm text-primary border-2 border-dashed border-primary/30 rounded-lg py-2.5 hover:bg-primary/5 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />New Entry
            </button>

            {runningEntry ? (
              <button
                onClick={handleStopTimer}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-w-[160px] justify-center"
              >
                <Square className="w-4 h-4 fill-white" />
                Stop — {formatDuration(elapsed)}
              </button>
            ) : (
              <button
                onClick={() => setShowNewEntry(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Timer
              </button>
            )}
          </div>

          {/* DAILY TOTAL */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-end">
            <span className="text-sm font-semibold text-slate-600">
              Daily Total: {formatDuration(dayTotal + (runningEntry ? elapsed : 0))}
            </span>
          </div>
        </div>

        {/* GPS STATUS BANNER */}
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
                Timer running · {formatDuration(elapsed)} elapsed · {currentMiles.toFixed(2)} mi tracked
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${gpsActive ? 'bg-green-500' : 'bg-orange-400'}`} />
              <span className="text-xs font-medium text-slate-600">{gpsActive ? 'Live' : 'Connecting'}</span>
            </div>
            <button
              onClick={handleStopTimer}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-white" />Stop
            </button>
          </div>
        )}

      </div>

      {/* NEW ENTRY / START TIMER MODAL */}
      <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              New Time Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Client</label>
              <select
                value={newForm.client_name}
                onChange={e => setNewForm(f => ({ ...f, client_name: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
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
            <Button variant="outline" className="flex-1" onClick={handleAddManualEntry}>
              <Plus className="w-4 h-4 mr-1" />Add Entry
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleStartTimer}>
              <Play className="w-4 h-4 mr-1 fill-white" />Start Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryRow({ entry, isRunning, elapsed, gpsActive, miles, onDelete }) {
  const duration = isRunning ? elapsed : (entry.duration_seconds || 0);

  return (
    <div className={`grid px-5 py-3 items-center gap-3 group transition-colors ${isRunning ? 'bg-primary/5' : 'hover:bg-slate-50/80'}`}
      style={{ gridTemplateColumns: '1fr 2fr auto' }}>

      {/* Member / date */}
      <div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-sm font-medium text-slate-800">{entry.team_member}</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5 pl-7">{entry.date}</div>
      </div>

      {/* Client / Project / Service / Note */}
      <div>
        {entry.client_name && <span className="font-semibold text-slate-800 text-sm">{entry.client_name}</span>}
        {entry.project && <span className="text-slate-500 text-sm"> / {entry.project}</span>}
        {entry.service && <span className="text-slate-500 text-sm"> / {entry.service}</span>}
        {entry.note && <div className="text-xs text-slate-400 mt-0.5">{entry.note}</div>}
        {(miles > 0 || entry.miles_traveled > 0) && (
          <div className="flex items-center gap-1 mt-1">
            <Navigation className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600 font-medium">
              {(miles || entry.miles_traveled || 0).toFixed(2)} mi
            </span>
          </div>
        )}
      </div>

      {/* Time / Status */}
      <div className="flex items-center gap-2 justify-end">
        <div className="text-right">
          <div className={`text-sm font-bold tabular-nums ${isRunning ? 'text-primary' : 'text-slate-800'}`}>
            {formatDuration(duration)}
          </div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {isRunning ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-500 font-medium">Live</span>
                {gpsActive && <Navigation className="w-3 h-3 text-green-500 ml-1" />}
              </>
            ) : (
              <span className="text-xs text-slate-400 capitalize">{entry.status}</span>
            )}
          </div>
        </div>
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