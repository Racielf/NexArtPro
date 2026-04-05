import React, { useState } from 'react';
import { Calendar, Navigation2, CheckSquare, Send, ThumbsUp, Square, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logComm, logCommFailed } from '@/lib/commTracking';

const statusToIdx = {
  draft: 0,
  scheduled: 1,
  on_my_way: 2,
  omw: 2,
  visit_completed: 3,
  finished: 3,
  completed: 3,
  sent: 4,
  viewed: 4,
  changes_requested: 4,
  approved: 5,
  signed: 5,
  declined: 5,
  converted: 5,
};

const actions = [
  { id: 'schedule', label: 'Schedule', description: 'Set appointment date & time', icon: Calendar, color: 'blue' },
  { id: 'omw',      label: 'On My Way', description: 'Start travel tracking', icon: Navigation2, color: 'orange' },
  { id: 'finish',   label: 'Finish Visit', description: 'Mark visit as complete', icon: CheckSquare, color: 'green' },
  { id: 'send',     label: 'Send Estimate', description: 'Email to client for review', icon: Send, color: 'primary' },
  { id: 'approval', label: 'Approval', description: 'Approve or decline', icon: ThumbsUp, color: 'purple' },
];

const colorMap = {
  blue:    { dot: 'bg-blue-500',   text: 'text-blue-600',   bg: 'hover:bg-blue-50',   activeBg: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  orange:  { dot: 'bg-orange-500', text: 'text-orange-600', bg: 'hover:bg-orange-50', activeBg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  green:   { dot: 'bg-green-500',  text: 'text-green-600',  bg: 'hover:bg-green-50',  activeBg: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700' },
  primary: { dot: 'bg-primary',    text: 'text-primary',    bg: 'hover:bg-blue-50',   activeBg: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  purple:  { dot: 'bg-purple-500', text: 'text-purple-600', bg: 'hover:bg-purple-50', activeBg: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
};

export default function EstimateActionsPanel({ estimate, onStatusChange, onOpenSendReview }) {
  const currentIdx = statusToIdx[estimate?.status] ?? 0;

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [omwActive, setOmwActive] = useState(estimate?.status === 'omw' || estimate?.status === 'on_my_way');
  const [omwMiles, setOmwMiles] = useState(estimate?.miles_traveled || 0);
  const [omwInterval, setOmwInterval] = useState(null);

  const [schedDate, setSchedDate] = useState(estimate?.scheduled_date || '');
  const [schedTime, setSchedTime] = useState(estimate?.scheduled_time || '09:00');
  const [schedNotes, setSchedNotes] = useState('');
  const [finishNotes, setFinishNotes] = useState('');

  // --- SCHEDULE ---
  const handleSchedule = async () => {
    if (!schedDate) { toast.error('Select a date'); return; }
    const apptData = {
      customer_display_name: estimate.client_name,
      customer_email: estimate.client_email || '',
      customer_phone: estimate.client_phone || '',
      service_address: estimate.client_address || '',
      customer_id: estimate.client_id || '',
      appointment_date: schedDate,
      start_time: schedTime,
      description: schedNotes || estimate.title || '',
      status: 'scheduled',
      estimate_id: estimate.id,
    };
    const appt = await base44.entities.Appointment.create(apptData);
    await base44.entities.Estimate.update(estimate.id, {
      status: 'scheduled',
      appointment_id: appt.id,
      scheduled_date: schedDate,
      scheduled_time: schedTime,
    });
    if (estimate.client_email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: estimate.client_email,
          subject: 'Appointment Scheduled',
          body: `Hi ${estimate.client_name},\n\nYour appointment has been scheduled for ${schedDate} at ${schedTime}.\n\nThank you!`,
        });
        await logComm({ event_type: 'appointment_created', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email, appointment_id: appt.id, estimate_id: estimate.id, subject: 'Appointment Scheduled', preview: `${schedDate} at ${schedTime}` });
      } catch {
        await logCommFailed({ event_type: 'appointment_created', client_name: estimate.client_name, client_email: estimate.client_email, appointment_id: appt.id, estimate_id: estimate.id, subject: 'Appointment Scheduled' });
      }
    }
    toast.success(`Appointment scheduled for ${schedDate} at ${schedTime}`);
    setScheduleOpen(false);
    onStatusChange('scheduled');
  };

  // --- OMW ---
  const handleOMW = async () => {
    const now = new Date().toISOString();
    await base44.entities.Estimate.update(estimate.id, { status: 'on_my_way', omw_start_time: now });
    await base44.entities.TimeEntry.create({
      team_member: estimate.assigned_to || 'Technician',
      date: now.split('T')[0],
      client_name: estimate.client_name,
      project: estimate.title || `Estimate #${estimate.estimate_number}`,
      service: 'On My Way',
      start_time: now,
      status: 'running',
      duration_seconds: 0,
      miles_traveled: 0,
    });
    setOmwActive(true);
    setOmwMiles(0);
    const interval = setInterval(() => setOmwMiles(m => parseFloat((m + 0.1).toFixed(1))), 3000);
    setOmwInterval(interval);
    toast.success('OMW started — tracking mileage');
    onStatusChange('on_my_way');
  };

  const handleStopOMW = async () => {
    if (omwInterval) clearInterval(omwInterval);
    setOmwInterval(null);
    setOmwActive(false);
    const running = await base44.entities.TimeEntry.filter({ status: 'running' });
    const entry = running.find(e => e.client_name === estimate.client_name);
    if (entry) {
      await base44.entities.TimeEntry.update(entry.id, {
        end_time: new Date().toISOString(),
        status: 'completed',
        duration_seconds: Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000),
        miles_traveled: omwMiles,
      });
    }
    await base44.entities.Estimate.update(estimate.id, { status: 'on_my_way', miles_traveled: omwMiles });
    toast.success(`OMW stopped — ${omwMiles} miles tracked`);
  };

  // --- FINISH ---
  const handleFinish = async () => {
    const now = new Date().toISOString();
    await base44.entities.Estimate.update(estimate.id, {
      status: 'visit_completed',
      completed_time: now,
      notes: finishNotes ? (estimate.notes ? estimate.notes + '\n\n' + finishNotes : finishNotes) : estimate.notes,
    });
    if (estimate.appointment_id) {
      await base44.entities.Appointment.update(estimate.appointment_id, {
        status: 'completed',
        completed_time: now,
        notes: finishNotes,
        miles_traveled: omwMiles || estimate.miles_traveled || 0,
      });
    }
    toast.success('Visit marked as completed');
    setFinishOpen(false);
    onStatusChange('visit_completed');
  };

  // --- APPROVAL ---
  const handleApproveConfirm = async () => {
    await base44.entities.Estimate.update(estimate.id, { status: 'approved', approved_at: new Date().toISOString(), approval_type: 'manual' });
    await logComm({ event_type: 'estimate_approved', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email || '', estimate_id: estimate.id, subject: `Estimate #${estimate.estimate_number} Approved`, status: 'delivered' });
    setApprovalOpen(false);
    toast.success('Estimate approved!');
    onStatusChange('approved');
  };

  const handleDeclineConfirm = async () => {
    await base44.entities.Estimate.update(estimate.id, { status: 'declined' });
    await logComm({ event_type: 'estimate_declined', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email || '', estimate_id: estimate.id, subject: `Estimate #${estimate.estimate_number} Declined`, status: 'delivered' });
    setApprovalOpen(false);
    toast.success('Estimate declined');
    onStatusChange('declined');
  };

  const handleActionClick = (actionId) => {
    if (actionId === 'schedule') { setScheduleOpen(true); return; }
    if (actionId === 'omw') { if (omwActive) handleStopOMW(); else handleOMW(); return; }
    if (actionId === 'finish') { setFinishOpen(true); return; }
    if (actionId === 'send') {
      if (!estimate.client_email) { toast.error('Client email is required to send'); return; }
      onOpenSendReview?.(); return;
    }
    if (actionId === 'approval') { setApprovalOpen(true); return; }
  };

  const getActionState = (actionId) => {
    const idx = actions.findIndex(a => a.id === actionId);
    const actionIdx = idx + 1;
    if (actionId === 'approval' && ['approved', 'signed', 'converted'].includes(estimate?.status)) return 'done';
    if (actionId === 'approval' && estimate?.status === 'declined') return 'declined';
    if (actionIdx < currentIdx) return 'done';
    if (actionIdx === currentIdx) return 'active';
    return 'idle';
  };

  return (
    <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</p>
      </div>

      <div className="px-3 pb-4 space-y-1.5 flex-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const c = colorMap[action.color];
          const state = getActionState(action.id);
          const isOmwRunning = action.id === 'omw' && omwActive;

          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                state === 'done'
                  ? 'bg-white border-slate-200 opacity-60'
                  : state === 'declined'
                  ? 'bg-red-50 border-red-200'
                  : isOmwRunning
                  ? 'bg-orange-50 border-orange-300 shadow-sm'
                  : state === 'active'
                  ? `${c.activeBg} shadow-sm`
                  : `bg-white border-slate-200 ${c.bg}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  state === 'done' ? 'bg-slate-100' :
                  isOmwRunning ? 'bg-orange-100' :
                  state === 'active' ? `bg-white shadow-sm` :
                  'bg-slate-100'
                }`}>
                  {isOmwRunning
                    ? <Square className="w-3.5 h-3.5 text-orange-600" />
                    : state === 'done'
                    ? <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                    : <Icon className={`w-3.5 h-3.5 ${state === 'active' ? c.text : 'text-slate-400 group-hover:' + c.text.replace('text-', 'text-')}`} />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-tight ${
                    state === 'done' ? 'text-slate-400 line-through' :
                    isOmwRunning ? 'text-orange-700' :
                    state === 'active' ? c.text :
                    'text-slate-600'
                  }`}>
                    {isOmwRunning ? 'Stop OMW' : action.label}
                  </p>
                  {isOmwRunning ? (
                    <p className="text-[10px] text-orange-500 font-medium">{omwMiles} mi tracked</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 leading-tight">{action.description}</p>
                  )}
                </div>
                {state === 'done' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                )}
                {state === 'declined' && action.id === 'approval' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Current status badge */}
      <div className="px-3 pb-4">
        <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
          <p className="text-xs font-semibold text-slate-700 capitalize">{estimate?.status?.replace(/_/g, ' ') || 'Draft'}</p>
        </div>
      </div>

      {/* SCHEDULE MODAL */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />Schedule Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Date *</label>
              <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Time</label>
              <Input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Notes</label>
              <Textarea value={schedNotes} onChange={e => setSchedNotes(e.target.value)} placeholder="Description of work..." rows={2} />
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded p-2">
              Client: <span className="font-semibold text-slate-700">{estimate?.client_name}</span>
              {estimate?.client_address && <><br />{estimate.client_address}</>}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSchedule}>Save & Notify Client</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* APPROVAL MODAL */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-primary" />Approve or Decline?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-600">Set the status of this estimate.</p>
            <div className="bg-slate-50 rounded p-3">
              <p className="text-xs text-slate-500 font-medium">Estimate #{estimate?.estimate_number}</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{estimate?.client_name}</p>
              <p className="text-xs text-slate-500 mt-1">Total: ${(estimate?.total || 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeclineConfirm}>
              <XCircle className="w-3.5 h-3.5 mr-1" />Decline
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveConfirm}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FINISH MODAL */}
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-600" />Finish Visit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-500">Mark the visit as completed and add any field notes.</p>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Visit Notes</label>
              <Textarea value={finishNotes} onChange={e => setFinishNotes(e.target.value)} placeholder="What was done on site..." rows={3} />
            </div>
            {omwMiles > 0 && (
              <div className="text-xs text-green-700 bg-green-50 rounded p-2 flex items-center gap-1.5">
                <Navigation2 className="w-3.5 h-3.5" />{omwMiles} miles tracked on this visit
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setFinishOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleFinish}>Mark as Finished</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}