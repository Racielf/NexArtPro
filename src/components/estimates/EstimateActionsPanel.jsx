import React, { useState, useEffect } from 'react';
import {
  Calendar, Navigation2, CheckSquare, Send, ThumbsUp,
  CheckCircle, XCircle, AlertCircle, Zap, Trash2, ChevronDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logComm, logCommFailed } from '@/lib/commTracking';
import LossPreventionModal from '@/components/estimates/internal/LossPreventionModal';
import PricingOverrideModal from '@/components/estimates/internal/PricingOverrideModal';
import { validateEstimatePricing } from '@/lib/pricingValidation';
import { canSendDocument } from '@/lib/pricingPermissions';
import { logZeroProfitConfirmation } from '@/lib/pricingAuditService';
import { validateDocTypeFields } from '@/lib/documentTypeConfig';
import { normalizeUserRole } from '@/lib/utils';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── next best action logic ────────────────────────────────────────────────────
function getNextAction(estimate, omwActive) {
  const s = estimate?.status;
  if (!s || s === 'draft') return { text: 'Schedule a site visit to get started', icon: Calendar, color: 'blue' };
  if (s === 'scheduled') return { text: 'Head to the client site when ready', icon: Navigation2, color: 'orange' };
  if (s === 'on_my_way') return { text: 'Stop OMW when you arrive on site', icon: Navigation2, color: 'orange' };
  if (s === 'visit_completed') {
    if (!estimate.sent_at) return { text: 'Review & send the estimate to the client', icon: Send, color: 'blue' };
  }
  if (s === 'sent' || s === 'viewed' || s === 'changes_requested') {
    return { text: 'Follow up or manually approve', icon: ThumbsUp, color: 'purple' };
  }
  if (s === 'approved' || s === 'signed') return { text: 'Ready to convert to a Work Order', icon: Zap, color: 'green' };
  if (s === 'declined') return { text: 'Consider revising and re-sending the estimate', icon: AlertCircle, color: 'red' };
  if (s === 'converted') return { text: 'Work Order has been created', icon: CheckCircle, color: 'green' };
  return null;
}

// ── status summary chip ───────────────────────────────────────────────────────
function SummaryChip({ label, value, variant }) {
  const variants = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
    neutral: 'bg-slate-100 border-slate-200 text-slate-500',
    error:   'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] font-medium ${variants[variant] || variants.neutral}`}>
      <span className="text-[10px] text-current opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// ── EstimateSummaryBlock ──────────────────────────────────────────────────────
function EstimateSummaryBlock({ estimate }) {
  const s = estimate?.status;
  return (
    <div className="px-3 pt-4 pb-3 border-b border-slate-200">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
          <span className="text-lg font-bold text-slate-900">${(estimate?.total || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
          <span className="text-xs font-semibold text-slate-700 capitalize">{s || 'Draft'}</span>
        </div>
      </div>
    </div>
  );
}

// ── StatusOverviewBlock ───────────────────────────────────────────────────────
function StatusOverviewBlock({ estimate }) {
  const s = estimate?.status;
  const hasAppointment = !!estimate?.appointment_id;
  const visitDone = ['visit_completed', 'sent', 'viewed', 'changes_requested', 'approved', 'signed', 'declined', 'converted'].includes(s);
  const isSent    = !!estimate?.sent_at || ['sent', 'viewed', 'changes_requested', 'approved', 'signed', 'declined', 'converted'].includes(s);
  const isViewed  = !!estimate?.viewed_at || ['viewed', 'changes_requested', 'approved', 'signed', 'declined', 'converted'].includes(s);
  const isApproved = ['approved', 'signed', 'converted'].includes(s);
  const isDeclined = s === 'declined';
  const isSigned = s === 'signed';
  const isChangesReq = s === 'changes_requested';

  const apptSummaryVariant = hasAppointment ? (visitDone ? 'success' : 'info') : 'neutral';
  const apptSummaryValue   = hasAppointment
    ? (visitDone ? 'Completed' : (estimate?.scheduled_date ? fmtDate(estimate.scheduled_date) : 'Scheduled'))
    : 'Not scheduled';

  const sentVariant = isSent ? (isViewed ? 'info' : 'success') : 'neutral';
  const sentValue   = isSent ? (isViewed ? 'Viewed' : 'Sent') : 'Not sent';

  const approvalVariant = isSigned ? 'success' : isApproved ? 'success' : isDeclined ? 'error' : isChangesReq ? 'warning' : isSent ? 'warning' : 'neutral';
  const approvalValue   = isSigned ? 'Signed' : isApproved ? 'Approved' : isDeclined ? 'Declined' : isChangesReq ? 'Changes Req.' : isSent ? 'Pending' : '—';

  return (
    <div className="px-3 pt-3 pb-2 space-y-1.5 border-b border-slate-200">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Status Overview</p>
      <SummaryChip label="Appointment" value={apptSummaryValue} variant={apptSummaryVariant} />
      <SummaryChip label="Visit"       value={visitDone ? 'Completed' : (s === 'on_my_way' ? 'In transit' : 'Pending')} variant={visitDone ? 'success' : s === 'on_my_way' ? 'warning' : 'neutral'} />
      <SummaryChip label="Sent"        value={sentValue}    variant={sentVariant} />
      <SummaryChip label="Approval"    value={approvalValue} variant={approvalVariant} />
      {isSigned && estimate?.signer_name && (
        <SummaryChip label="Signed by" value={estimate.signer_name} variant="success" />
      )}
      {isChangesReq && estimate?.changes_requested_at && (
        <SummaryChip label="Changes" value={fmt(estimate.changes_requested_at)} variant="warning" />
      )}
    </div>
  );
}

// ── NextActionBlock ───────────────────────────────────────────────────────────
function NextActionBlock({ estimate, omwActive }) {
  const next = getNextAction(estimate, omwActive);
  if (!next) return null;
  return (
    <div className="mx-3 mt-3 mb-2 rounded-xl bg-white border border-slate-200 shadow-sm px-3 py-2.5 flex items-start gap-2.5">
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        next.color === 'green'  ? 'bg-emerald-50' :
        next.color === 'orange' ? 'bg-amber-50' :
        next.color === 'red'    ? 'bg-red-50' :
        next.color === 'purple' ? 'bg-violet-50' :
        'bg-blue-50'
      }`}>
        <next.icon className={`w-3.5 h-3.5 ${
          next.color === 'green'  ? 'text-emerald-500' :
          next.color === 'orange' ? 'text-amber-500' :
          next.color === 'red'    ? 'text-red-500' :
          next.color === 'purple' ? 'text-violet-500' :
          'text-blue-500'
        }`} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Next step</p>
        <p className="text-[10px] font-medium text-slate-700 leading-snug">{next.text}</p>
      </div>
    </div>
  );
}

// ── ActionButtonsBlock ────────────────────────────────────────────────────────
function ActionButtonsBlock({ estimate, omwActive, onSchedule, onOMW, onStopOMW, onFinishVisit, onSend, onApproveDecline }) {
  return (
    <div className="px-2.5 pb-2 space-y-1 flex-1 flex flex-col">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 pt-2 pb-1">Actions</p>

      <button onClick={onSchedule}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors">
        <Calendar className="w-3.5 h-3.5 text-blue-500" />
        Schedule
      </button>

      <button onClick={omwActive ? onStopOMW : onOMW}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          omwActive ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 text-orange-700' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
        }`}>
        <Navigation2 className="w-3.5 h-3.5 text-amber-500" />
        {omwActive ? 'Stop OMW' : 'On My Way'}
      </button>

      <button onClick={onFinishVisit}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors">
        <CheckSquare className="w-3.5 h-3.5 text-green-500" />
        Finish Visit
      </button>

      <button onClick={onSend}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-black text-white border border-slate-900 transition-colors">
        <Send className="w-3.5 h-3.5" />
        Review &amp; Send
      </button>

      <button onClick={onApproveDecline}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors">
        <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
        Approve/Decline
      </button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function EstimateActionsPanel({ estimate, onStatusChange, onOpenSendReview }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [finishOpen,   setFinishOpen]   = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossValidation, setLossValidation] = useState({ lossItems: [], zeroProfitItems: [] });
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideAction, setOverrideAction] = useState('send');
  const [currentUser,  setCurrentUser]  = useState(null);
  const [omwActive,    setOmwActive]    = useState(false);
  const [omwMiles,     setOmwMiles]     = useState(estimate?.miles_traveled || 0);
  const [omwInterval,  setOmwInterval]  = useState(null);
  const [omwStarted,   setOmwStarted]   = useState(null);

  const [schedDate,     setSchedDate]     = useState(estimate?.scheduled_date || '');
  const [schedTime,     setSchedTime]     = useState(estimate?.scheduled_time || '09:00');
  const [schedNotes,    setSchedNotes]    = useState('');
  const [finishNotes,   setFinishNotes]   = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, loading: false, error: null });

  const s = estimate?.status;

  // ── Load current user for role check ─────────────────────────────────────
  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  // ── Stop OMW if backend status changed away ──
  useEffect(() => {
    if (s !== 'on_my_way' && omwActive) {
      if (omwInterval) clearInterval(omwInterval);
      setOmwInterval(null);
      setOmwActive(false);
      setOmwStarted(null);
    }
  }, [s, omwActive, omwInterval]);

  // ── derived context ──────────────────────────────────────────────────────
  const role = normalizeUserRole(currentUser?.role);
  const hasAppointment = !!estimate?.appointment_id;

  // ── SCHEDULE ─────────────────────────────────────────────────────────────
  const handleSchedule = async () => {
    if (!schedDate) { toast.error('Select a date'); return; }
    let apptId = estimate.appointment_id;
    if (apptId) {
      await base44.entities.Appointment.update(apptId, {
        appointment_date: schedDate,
        start_time: schedTime,
        description: schedNotes || estimate.title || '',
        status: 'scheduled',
      });
    } else {
      const appt = await base44.entities.Appointment.create({
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
      });
      apptId = appt.id;
    }
    await base44.entities.Estimate.update(estimate.id, {
      status: 'scheduled',
      appointment_id: apptId,
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
        await logComm({ event_type: 'appointment_created', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email, appointment_id: apptId, estimate_id: estimate.id, subject: 'Appointment Scheduled', preview: `${schedDate} at ${schedTime}` });
      } catch {
        await logCommFailed({ event_type: 'appointment_created', client_name: estimate.client_name, client_email: estimate.client_email, appointment_id: apptId, estimate_id: estimate.id, subject: 'Appointment Scheduled' });
      }
    }
    toast.success(`Appointment ${estimate.appointment_id ? 'updated' : 'scheduled'}`);
    setScheduleOpen(false);
    onStatusChange('scheduled');
  };

  // ── OMW ──────────────────────────────────────────────────────────────────
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
    setOmwStarted(Date.now());
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
    const entry = running.find(e => e.client_name === estimate.client_name && e.project?.includes(String(estimate.estimate_number)));
    if (entry) {
      await base44.entities.TimeEntry.update(entry.id, {
        end_time: new Date().toISOString(),
        status: 'completed',
        duration_seconds: Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000),
        miles_traveled: omwMiles,
      });
    }
    await base44.entities.Estimate.update(estimate.id, { miles_traveled: omwMiles });
    toast.success(`OMW stopped — ${omwMiles} mi tracked`);
  };

  // ── FINISH ───────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    const now = new Date().toISOString();
    await base44.entities.Estimate.update(estimate.id, {
      status: 'visit_completed',
      completed_time: now,
      notes: finishNotes ? (estimate.notes ? estimate.notes + '\n\n' + finishNotes : finishNotes) : estimate.notes,
    });
    if (estimate.appointment_id) {
      await base44.entities.Appointment.update(estimate.appointment_id, {
        status: 'visit_completed',
        completed_at: now,
        notes: finishNotes,
      });
    }
    toast.success('Visit marked as completed');
    setFinishOpen(false);
    onStatusChange('visit_completed');
  };

  // ── APPROVAL ─────────────────────────────────────────────────────────────
  const handleApproveConfirm = async () => {
    await base44.entities.Estimate.update(estimate.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: currentUser?.email || null,
      approval_note: declineReason.trim() || null,
      declined_at: null,
      declined_reason: null,
    });
    await logComm({ event_type: 'estimate_approved', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email || '', estimate_id: estimate.id, subject: `Estimate #${estimate.estimate_number} Approved`, status: 'delivered' });
    setApprovalOpen(false);
    setDeclineReason('');
    toast.success('Estimate approved!');
    onStatusChange('approved');
  };

  const handleDeclineConfirm = async () => {
    if (!declineReason.trim()) { toast.error('Please enter a reason for declining'); return; }
    await base44.entities.Estimate.update(estimate.id, {
      status: 'declined',
      declined_at: new Date().toISOString(),
      declined_reason: declineReason.trim(),
      approved_at: null,
      approved_by: null,
      approval_note: null,
      signed_at: null,
    });
    await logComm({ event_type: 'estimate_declined', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email || '', estimate_id: estimate.id, subject: `Estimate #${estimate.estimate_number} Declined`, status: 'delivered' });
    setApprovalOpen(false);
    setDeclineReason('');
    toast.success('Estimate declined');
    onStatusChange('declined');
  };

  // ── DELETE ────────────────────────────────────────────────────────────────
  const canDelete = () => !['approved', 'signed', 'converted'].includes(s);

  const getDeleteBlockReason = () => {
    if (s === 'approved') return 'Cannot delete approved estimates';
    if (s === 'signed') return 'Cannot delete signed estimates';
    if (s === 'converted') return 'Cannot delete converted estimates. Delete the Work Order instead.';
    return null;
  };

  const handleDelete = () => {
    const blockReason = getDeleteBlockReason();
    if (blockReason) { toast.error(blockReason); return; }
    setDeleteModal({ open: true, loading: false, error: null });
  };

  const handleConfirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      await base44.entities.Estimate.delete(estimate.id);
      toast.success(`Estimate #${estimate.estimate_number} deleted`);
      setTimeout(() => { window.location.href = '/estimates'; }, 500);
    } catch (err) {
      setDeleteModal(prev => ({ ...prev, loading: false, error: err.message || 'Failed to delete estimate' }));
    }
  };

  // ── Send handler (with pricing gate) ─────────────────────────────────────
  const handleSendClick = () => {
    if (!estimate.client_email) { toast.error('Client email is required to send'); return; }
    const dtv = validateDocTypeFields(estimate);
    if (!dtv.valid) { dtv.errors.forEach(e => toast.error(e)); return; }
    const pv = validateEstimatePricing(estimate);
    if (pv.lossItems.length > 0 || pv.zeroProfitItems.length > 0) {
      const gate = canSendDocument(role, pv);
      if (!gate.allowed) { toast.error(gate.blockedReason); return; }
      if (gate.requiresOverride) {
        setLossValidation(pv);
        setOverrideAction('send');
        setOverrideModalOpen(true);
        return;
      }
      if (gate.requiresConfirm) {
        setLossValidation(pv);
        setLossModalOpen(true);
        return;
      }
    }
    onOpenSendReview?.();
  };

  return (
    <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto min-h-0">

      <EstimateSummaryBlock estimate={estimate} />

      <StatusOverviewBlock estimate={estimate} />

      <NextActionBlock estimate={estimate} omwActive={omwActive} />

      <div className="border-t border-slate-200 mx-3 mt-1" />

      <ActionButtonsBlock
        estimate={estimate}
        omwActive={omwActive}
        onSchedule={() => { setSchedDate(estimate?.scheduled_date || ''); setSchedTime(estimate?.scheduled_time || '09:00'); setScheduleOpen(true); }}
        onOMW={handleOMW}
        onStopOMW={handleStopOMW}
        onFinishVisit={() => setFinishOpen(true)}
        onSend={handleSendClick}
        onApproveDecline={() => setApprovalOpen(true)}
      />

      {/* ── SCHEDULE MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              {hasAppointment ? 'Reschedule Appointment' : 'Schedule Appointment'}
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
            <div className="text-xs text-slate-500 bg-white rounded p-2 border border-slate-100">
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

      {/* ── APPROVAL MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-green-500" />Approve or Decline
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-medium">Estimate #{estimate?.estimate_number}</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{estimate?.client_name}</p>
              <p className="text-xs text-slate-500 mt-1">Total: ${(estimate?.total || 0).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Note (required to decline)</label>
              <Textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Optional for approval, required to decline..." rows={2} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeclineConfirm}>
              <XCircle className="w-3.5 h-3.5 mr-1 text-red-500" />Decline
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApproveConfirm}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── FINISH MODAL ───────────────────────────────────────────────────── */}
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />Finish Visit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-500">Mark the visit as completed and add any field notes.</p>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Visit Notes</label>
              <Textarea value={finishNotes} onChange={e => setFinishNotes(e.target.value)} placeholder="What was done on site..." rows={3} />
            </div>
            {omwMiles > 0 && (
              <div className="text-xs text-emerald-700 bg-emerald-50 rounded p-2 flex items-center gap-1.5">
                <Navigation2 className="w-3.5 h-3.5 text-amber-500" />{omwMiles} miles tracked on this visit
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setFinishOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleFinish}>Mark as Finished</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-slate-900 mb-2">Delete Estimate?</h2>
            <p className="text-sm text-slate-500 mb-4">
              Are you sure you want to delete Estimate #{estimate?.estimate_number}? This action cannot be undone.
            </p>
            {s === 'sent' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700"><strong>Warning:</strong> This estimate has been sent to the client.</p>
              </div>
            )}
            {deleteModal.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{deleteModal.error}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, loading: false, error: null })} disabled={deleteModal.loading}>Cancel</Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleConfirmDelete} disabled={deleteModal.loading}>
                {deleteModal.loading ? 'Deleting...' : 'Delete Estimate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOSS PREVENTION MODAL ── */}
      <LossPreventionModal
        open={lossModalOpen}
        onClose={() => setLossModalOpen(false)}
        onProceed={() => {
          setLossModalOpen(false);
          if (estimate?.id && lossValidation.zeroProfitItems?.length > 0) {
            logZeroProfitConfirmation({
              documentId: estimate.id,
              documentKind: estimate.document_type === 'BID' ? 'bid' : 'estimate',
              userEmail: currentUser?.email,
              userRole: role,
              metadata: {
                margin_at_event: parseFloat(estimate.gross_margin_pct) || null,
                total_at_event: parseFloat(estimate.total) || null,
              },
            });
          }
          onOpenSendReview?.();
        }}
        lossItems={lossValidation.lossItems}
        zeroProfitItems={lossValidation.zeroProfitItems}
      />

      {/* ── PRICING OVERRIDE MODAL ── */}
      <PricingOverrideModal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        onApproved={() => { setOverrideModalOpen(false); onOpenSendReview?.(); }}
        action={overrideAction}
        role={role}
        currentUser={currentUser}
        document={estimate}
        documentType="estimate"
        pricingResult={lossValidation}
        lossItems={lossValidation.lossItems}
        zeroProfitItems={lossValidation.zeroProfitItems}
      />

      {/* ── MORE ACTIONS ──────────────────────────────────────────────────── */}
      <div className="mx-3 mt-2 pt-2 border-t border-slate-200 mb-3">
        <Collapsible open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">More Actions</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${moreActionsOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-3 space-y-1.5">
            <button
              onClick={handleDelete}
              disabled={!canDelete()}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                canDelete()
                  ? 'bg-white border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700'
                  : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={!canDelete() ? getDeleteBlockReason() : 'Delete this estimate'}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              Delete Estimate
            </button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}