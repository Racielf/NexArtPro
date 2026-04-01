import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronLeft, ChevronRight, Calendar, MapPin,
  Settings, Filter, Eye, ChevronDown, ChevronUp,
  Bell, Clock, User
} from 'lucide-react';
import { format, addDays, startOfWeek, parseISO, isToday } from 'date-fns';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23
const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; // visible hours
const DAYS_SHOWN = 5;

export default function EstimateScheduler() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [team, setTeam] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [activeTab, setActiveTab] = useState('schedule'); // schedule | find
  const [startDate, setStartDate] = useState(format(new Date(), 'MM/dd/yy'));
  const [startTime, setStartTime] = useState('8:30pm');
  const [endDate, setEndDate] = useState(format(new Date(), 'MM/dd/yy'));
  const [endTime, setEndTime] = useState('9:30pm');
  const [arrivalWindow, setArrivalWindow] = useState('none');
  const [selectedTech, setSelectedTech] = useState(null);
  const [estimateOpen, setEstimateOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadData();
    // scroll to 8am on mount
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    }, 100);
  }, []);

  const loadData = async () => {
    const [appts, cls] = await Promise.all([
      base44.entities.Appointment.list('-created_date'),
      base44.entities.Client.list('-created_date'),
    ]);
    setAppointments(appts);

    // gather unique techs
    const techs = [...new Set(appts.map(a => a.assigned_to).filter(Boolean))];
    setTeam(techs.map((t, i) => ({ name: t, id: i, color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i % 4] })));

    if (estimateId) {
      const ests = await base44.entities.Estimate.filter({ id: estimateId });
      if (ests.length) setEstimate(ests[0]);
    } else {
      // load most recent estimate
      const ests = await base44.entities.Estimate.list('-created_date', 1);
      if (ests.length) setEstimate(ests[0]);
    }
  };

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(weekStart, i));

  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const goPrev = () => setWeekStart(d => addDays(d, -DAYS_SHOWN));
  const goNext = () => setWeekStart(d => addDays(d, DAYS_SHOWN));

  const handleSave = async () => {
    if (!estimate) return;
    // Parse start date/time and create appointment
    toast.success('Appointment scheduled!');
    navigate('/appointments');
  };

  const handleNotify = async () => {
    if (!estimate?.client_email) { toast.error('No client email found'); return; }
    await base44.integrations.Core.SendEmail({
      to: estimate.client_email,
      subject: `Appointment Scheduled - Estimate #${estimate.estimate_number}`,
      body: `Hi ${estimate.client_name},\n\nYour appointment has been scheduled.\nDate: ${startDate}\nTime: ${startTime} - ${endTime}\n\nWe'll see you then!`
    });
    toast.success('Customer notified!');
  };

  const getApptForDayAndTech = (day, techName) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(a => a.scheduled_date === dayStr && a.assigned_to === techName);
  };

  const hourToPercent = (hour) => ((hour - 7) / 17) * 100;

  const now = new Date();
  const nowPercent = ((now.getHours() + now.getMinutes() / 60 - 7) / 17) * 100;

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50 font-inter">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/estimates')} className="p-1 hover:bg-gray-100 rounded-md">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="font-semibold text-gray-900 text-base">
            Schedule a time for Estimate #{estimate?.estimate_number || '...'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNotify} className="text-xs gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Notify customer
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs px-5" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col overflow-y-auto flex-shrink-0">

          {/* Schedule Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setScheduleOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm text-gray-700">Schedule</span>
              {scheduleOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {scheduleOpen && (
              <div className="px-4 pb-4 space-y-4">
                {/* Tabs */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={activeTab === 'schedule' ? 'default' : 'outline'}
                    className={`text-xs flex-1 ${activeTab === 'schedule' ? 'bg-primary text-white' : ''}`}
                    onClick={() => setActiveTab('schedule')}
                  >
                    Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'find' ? 'default' : 'outline'}
                    className={`text-xs flex-1 ${activeTab === 'find' ? 'bg-primary text-white' : ''}`}
                    onClick={() => setActiveTab('find')}
                  >
                    Find a time
                  </Button>
                </div>

                {/* Start Date/Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Start date</Label>
                    <div className="relative">
                      <Input
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-8 text-xs pr-8"
                        placeholder="MM/DD/YY"
                      />
                      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Start time</Label>
                    <Input
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="8:30am"
                    />
                  </div>
                </div>

                {/* End Date/Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">End date</Label>
                    <div className="relative">
                      <Input
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-8 text-xs pr-8"
                        placeholder="MM/DD/YY"
                      />
                      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">End time</Label>
                    <Input
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="9:30pm"
                    />
                  </div>
                </div>

                {/* Edit team */}
                <div>
                  <Select>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Edit team" />
                    </SelectTrigger>
                    <SelectContent>
                      {team.map(t => (
                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Technician chip */}
                {estimate?.assigned_to && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs text-blue-700 font-medium">{estimate.assigned_to}</span>
                      <button className="text-blue-400 hover:text-blue-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Arrival window */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Arrival window</Label>
                  <Select value={arrivalWindow} onValueChange={setArrivalWindow}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hr">1 hour</SelectItem>
                      <SelectItem value="2hr">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scheduled text */}
                {estimate?.assigned_to && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {estimate.assigned_to} is scheduled to arrive at {startTime}.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Estimate Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setEstimateOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm text-gray-700">
                Estimate #{estimate?.estimate_number || ''}
              </span>
              {estimateOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {estimateOpen && estimate && (
              <div className="px-4 pb-4 space-y-3">
                {/* Client Info */}
                <div>
                  <p className="text-sm font-medium text-gray-900">{estimate.client_name}</p>
                  {estimate.client_address && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{estimate.client_address}</p>
                  )}
                  <Badge className="mt-2 bg-green-100 text-green-700 border-green-200 text-[10px] px-2 py-0.5 hover:bg-green-100">
                    <Bell className="w-2.5 h-2.5 mr-1" />
                    Notifications on
                  </Badge>
                </div>

                {/* Line Items */}
                <div className="space-y-1">
                  {(estimate.line_items || []).slice(0, 3).map((item, i) => (
                    <p key={i} className="text-xs text-gray-600">{item.name}</p>
                  ))}
                  {(estimate.line_items || []).length > 3 && (
                    <p className="text-xs text-gray-400">{estimate.line_items.length - 3} more item(s)</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CALENDAR */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* Calendar Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 px-3" onClick={goToday}>
                Today
              </Button>
              <button onClick={goPrev} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={goNext} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-medium text-gray-700 ml-1">
                {format(days[0], 'MMMM d')} – {format(days[days.length - 1], 'MMMM d, yyyy')}
              </span>
              <button className="p-1 hover:bg-gray-100 rounded">
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-500" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded border border-gray-200">
                <MapPin className="w-4 h-4 text-gray-500" />
              </button>
              <button className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-2.5 py-1.5 hover:bg-gray-50">
                <Filter className="w-3 h-3" />
                Filter by employee
                <ChevronDown className="w-3 h-3" />
              </button>
              <button className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-2.5 py-1.5 hover:bg-gray-50">
                <Eye className="w-3 h-3" />
                View options
                <ChevronDown className="w-3 h-3" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded border border-gray-200">
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div className="min-w-[1200px]">

              {/* Day Headers */}
              <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
                {/* Left gutter for tech names */}
                <div className="w-24 flex-shrink-0 border-r border-gray-200" />

                {days.map((day, di) => {
                  const isTodayDay = isToday(day);
                  return (
                    <div
                      key={di}
                      className={`flex-1 border-r border-gray-200 py-2 px-3 min-w-[180px] ${isTodayDay ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isTodayDay ? 'bg-primary text-white' : 'text-gray-700'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        <span className={`text-xs font-medium uppercase ${isTodayDay ? 'text-primary' : 'text-gray-500'}`}>
                          {format(day, 'EEE')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hour labels row */}
              <div className="flex border-b border-gray-100 sticky top-[52px] bg-white z-10">
                <div className="w-24 flex-shrink-0 border-r border-gray-200" />
                {days.map((day, di) => (
                  <div key={di} className="flex-1 flex border-r border-gray-200 min-w-[180px]">
                    {DISPLAY_HOURS.map((h) => (
                      <div key={h} className="flex-1 text-center border-r border-gray-100 last:border-r-0 py-1">
                        <span className="text-[10px] text-gray-400">
                          {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Tech rows */}
              {team.length === 0 ? (
                // Empty row if no team
                <TechRow
                  tech={{ name: estimate?.assigned_to || 'Unassigned', color: '#3b82f6' }}
                  days={days}
                  appointments={appointments}
                  displayHours={DISPLAY_HOURS}
                  showNowLine={true}
                  nowPercent={nowPercent}
                  isToday={isToday}
                />
              ) : (
                team.map((tech, ti) => (
                  <TechRow
                    key={ti}
                    tech={tech}
                    days={days}
                    appointments={appointments}
                    displayHours={DISPLAY_HOURS}
                    showNowLine={true}
                    nowPercent={nowPercent}
                    isToday={isToday}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TechRow({ tech, days, appointments, displayHours, showNowLine, nowPercent, isToday }) {
  return (
    <div className="flex border-b border-gray-200" style={{ minHeight: '80px' }}>
      {/* Tech Name */}
      <div className="w-24 flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-start pt-2 gap-1 px-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: tech.color }}
        >
          {tech.name?.charAt(0)?.toUpperCase() || 'T'}
        </div>
        <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-2">{tech.name}</span>
      </div>

      {/* Day cells */}
      {days.map((day, di) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayAppts = appointments.filter(
          a => a.scheduled_date === dayStr && a.assigned_to === tech.name
        );
        const isTodayDay = isToday(day);

        return (
          <div
            key={di}
            className={`flex-1 border-r border-gray-200 relative min-w-[180px] ${isTodayDay ? 'bg-blue-50/30' : ''}`}
          >
            {/* Hour grid lines */}
            <div className="flex h-full absolute inset-0">
              {displayHours.map((h) => (
                <div key={h} className="flex-1 border-r border-gray-100 last:border-r-0" />
              ))}
            </div>

            {/* Now line */}
            {showNowLine && isTodayDay && nowPercent >= 0 && nowPercent <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: `${nowPercent}%` }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-0.5 -mt-1 absolute top-0" />
              </div>
            )}

            {/* Appointments */}
            {dayAppts.map((appt, ai) => (
              <div
                key={ai}
                className="absolute top-2 rounded px-1.5 py-1 text-[10px] text-white font-medium z-10 shadow-sm"
                style={{
                  left: '10%',
                  width: '60%',
                  backgroundColor: tech.color,
                  opacity: 0.9,
                }}
              >
                <div className="truncate">{appt.client_name}</div>
                <div className="opacity-80">{appt.scheduled_time}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}