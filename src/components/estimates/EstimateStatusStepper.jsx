import React, { useState } from 'react';
import { Calendar, Navigation2, CheckSquare, Send, ThumbsUp, Copy, Square, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logComm, logCommFailed } from '@/lib/commTracking';

const steps = [
  { id: 'schedule',  label: 'Schedule',    icon: Calendar },
  { id: 'omw',       label: 'OMW',         icon: Navigation2 },
  { id: 'finish',    label: 'Finish',      icon: CheckSquare },
  { id: 'sent',      label: 'Send',        icon: Send },
  { id: 'approved',  label: 'Approval',    icon: ThumbsUp },
  { id: 'converted', label: 'Copy to Job', icon: Copy },
];

const statusToIdx = {
  draft: 0,
  scheduled: 1,
  on_my_way: 2,
  omw: 2,
  finished: 3,
  completed: 3,
  sent: 4,
  approved: 5,
  declined: 5,
  converted: 6,
};

export default function EstimateStatusStepper({ status, estimate, onStatusChange, onOpenSendReview }) {
  const navigate = useNavigate();
  const currentIdx = statusToIdx[status] ?? 0;

  // --- Modal states ---
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [omwActive, setOmwActive] = useState(status === 'omw');
  const [omwMiles, setOmwMiles] = useState(estimate?.miles_traveled || 0);
  const [omwInterval, setOmwInterval] = useState(null);

  // Schedule form
  const [schedDate, setSchedDate] = useState(estimate?.scheduled_date || '');
  const [schedTime, setSchedTime] = useState(estimate?.scheduled_time || '09:00');
  const [schedNotes, setSchedNotes] = useState('');

  // Finish form
  const [finishNotes, setFinishNotes] = useState('');

  // --- 1. SCHEDULE ---
  const handleSchedule = async () => {
    if (!schedDate) { toast.error('Select a date'); return; }
    // Create or update appointment linked to this estimate
    const apptData = {
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      client_phone: estimate.client_phone || '',
      client_address: estimate.client_address || '',
      client_id: estimate.client_id || '',
      scheduled_date: schedDate,
      scheduled_time: schedTime,
      description: schedNotes || estimate.title || '',
      status: 'scheduled',
      assigned_to: estimate.assigned_to || '',
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

  // --- 2. OMW ---
  const handleOMW = async () => {
    const now = new Date().toISOString();
    await base44.entities.Estimate.update(estimate.id, {
      status: 'on_my_way',
      omw_start_time: now,
    });
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
    const interval = setInterval(() => {
      setOmwMiles(m => parseFloat((m + 0.1).toFixed(1)));
    }, 3000);
    setOmwInterval(interval);
    toast.success('OMW started — tracking mileage');
    onStatusChange('on_my_way');
  };

  // --- OMW Stop → moves to "finished" step so Finish is now active ---
  const handleStopOMW = async () => {
    if (omwInterval) clearInterval(omwInterval);
    setOmwInterval(null);
    setOmwActive(false);
    const running = await base44.entities.TimeEntry.filter({ status: 'running' });
    const entry = running.find(e => e.client_name === estimate.client_name);
    if (entry) {
      const durationSec = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000);
      await base44.entities.TimeEntry.update(entry.id, {
        end_time: new Date().toISOString(),
        status: 'completed',
        duration_seconds: durationSec,
        miles_traveled: omwMiles,
      });
    }
    await base44.entities.Estimate.update(estimate.id, { status: 'on_my_way', miles_traveled: omwMiles });
    toast.success(`OMW stopped — ${omwMiles} miles tracked`);
    // Don't change status — stay at on_my_way so Finish is still clickable
  };

  // --- 3. FINISH ---
  const handleFinish = async () => {
    const now = new Date().toISOString();
    await base44.entities.Estimate.update(estimate.id, {
      status: 'finished',
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
    onStatusChange('finished');
  };

  // --- 4. SEND --- (note: this just validates, actual send happens in EstimateSendReview review screen)
  const handleSend = () => {
    // Stepper click just needs to validate and trigger the review modal in parent
    // The parent component handles opening EstimateSendReview
    if (!estimate.client_email) { toast.error('Client email is required'); return; }
    // Signal parent to open review screen
    return 'open-review';
  };

  // --- 5. APPROVAL --- opens modal with Approve/Decline
  const [approvalOpen, setApprovalOpen] = useState(false);

  const handleApproveConfirm = async () => {
    await base44.entities.Estimate.update(estimate.id, { status: 'approved', approved_at: new Date().toISOString() });
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

  // --- 6. COPY TO JOB ---
  const handleCopyToJob = async () => {
    if (estimate.status !== 'approved') { toast.error('Copy to Job only available when Approved'); return; }
    const existing = await base44.entities.WorkOrder.filter({ estimate_id: estimate.id });
    if (existing.length > 0) { toast.error('Already converted to Work Order'); return; }
    const woNum = Math.floor(Math.random() * 9000) + 1000;
    const wo = await base44.entities.WorkOrder.create({
      work_order_number: woNum,
      estimate_id: estimate.id,
      client_id: estimate.client_id,
      client_name: estimate.client_name,
      client_address: estimate.client_address,
      client_phone: estimate.client_phone,
      title: estimate.title || `Job from Estimate #${estimate.estimate_number}`,
      line_items: estimate.line_items,
      subtotal: estimate.subtotal,
      total: estimate.total,
      assigned_to: estimate.assigned_to || '',
      status: 'pending',
      notes: estimate.notes || ''
    });
    await base44.entities.Estimate.update(estimate.id, { status: 'converted' });
    toast.success(`Work Order #${woNum} created!`);
    onStatusChange('converted');
    // Redirect to work order detail (handled by parent)
    if (window.location.pathname.includes('estimate-editor')) {
      setTimeout(() => window.location.href = `/work-order-detail?id=${wo.id}`, 1200);
    }
  };

  const handleStepClick = (stepId, idx) => {
    if (idx > currentIdx + 1) return; // can't skip steps
    if (stepId === 'schedule') { setScheduleOpen(true); return; }
    if (stepId === 'omw') { if (omwActive) handleStopOMW(); else handleOMW(); return; }
    if (stepId === 'finish') { setFinishOpen(true); return; }
    if (stepId === 'sent') { 
      if (!estimate.client_email) { toast.error('Client email is required'); return; }
      onOpenSendReview?.(); return; 
    }
    if (stepId === 'approved') {
      if (status === 'approved') return;
      setApprovalOpen(true); return;
    }
    if (stepId === 'converted') { handleCopyToJob(); return; }
  };

  return (
    <>
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isClickable = idx <= currentIdx + 1;

          let subLabel = null;
          if (step.id === 'omw' && omwActive) subLabel = `${omwMiles} mi`;
          if (step.id === 'finish' && (status === 'finished' || status === 'completed')) subLabel = 'Done';
          if (step.id === 'sent' && status === 'sent') subLabel = 'Sent to customer';
          if (step.id === 'approved' && status === 'approved') subLabel = 'Approved';
          if (step.id === 'approved' && status === 'sent') subLabel = 'Awaiting';
          if (step.id === 'approved' && status === 'declined') subLabel = 'Declined';

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => isClickable && handleStepClick(step.id, idx)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-1 transition-opacity ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-40'}`}
                style={{ minWidth: 70 }}
                title={isClickable ? `Click to: ${step.label}` : step.label}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
                  isDone ? 'bg-primary border-primary' :
                  isActive ? 'bg-primary border-primary' :
                  'bg-white border-slate-300'
                }`}>
                  {step.id === 'omw' && omwActive ? (
                    <Square className="text-white" style={{ width: 18, height: 18 }} />
                  ) : (
                    <Icon className={isDone || isActive ? 'text-white' : 'text-slate-400'} style={{ width: 18, height: 18 }} />
                  )}
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${
                  isActive ? 'text-primary' : isDone ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {step.id === 'omw' && omwActive ? 'Stop' : step.label}
                </span>
                {subLabel && (
                  <span className="text-xs text-slate-400 -mt-0.5 whitespace-nowrap" style={{ fontSize: 10 }}>
                    {subLabel}
                  </span>
                )}
                {step.id === 'approved' && status === 'sent' && !subLabel && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDecline(); }}
                    className="text-[10px] text-red-400 hover:text-red-600 -mt-0.5 leading-none"
                  >
                    Decline
                  </button>
                )}
              </button>
              {idx < steps.length - 1 && (
                <div className="h-0.5 mb-5 transition-colors" style={{ width: 32, background: idx < currentIdx ? 'hsl(var(--primary))' : '#e2e8f0' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* OMW live banner */}
      {omwActive && (
        <div className="flex items-center gap-2 ml-4 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <MapPin className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs text-orange-700 font-medium">Tracking: {omwMiles} mi</span>
          <button onClick={handleStopOMW} className="text-xs text-red-500 hover:text-red-700 font-semibold ml-1">
            Stop
          </button>
        </div>
      )}

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
    </>
  );
}