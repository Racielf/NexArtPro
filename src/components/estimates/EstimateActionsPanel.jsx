import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Navigation2,
  CheckSquare,
  Send,
  ThumbsUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Trash2,
  ChevronDown,
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
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── next best action logic ────────────────────────────────────────────────────
function getNextAction(estimate) {
  const s = estimate?.status;
  if (!s || s === 'draft') return { text: 'Schedule a site visit to get started', icon: Calendar, color: 'blue' };
  if (s === 'scheduled') return { text: 'Head to the client site when ready', icon: Navigation2, color: 'orange' };
  if (s === 'on_my_way') return { text: 'Stop OMW when you arrive on site', icon: Navigation2, color: 'orange' };
  if (s === 'visit_completed' && !estimate.sent_at) {
    return { text: 'Review & send the estimate to the client', icon: Send, color: 'blue' };
  }
  if (s === 'sent' || s === 'viewed' || s === 'changes_requested') {
    return { text: 'Follow up or manually approve', icon: ThumbsUp, color: 'purple' };
  }
  if (s === 'approved' || s === 'signed') {
    return { text: 'Ready to convert to a Work Order', icon: Zap, color: 'green' };
  }
  if (s === 'declined') {
    return { text: 'Consider revising and re-sending the estimate', icon: AlertCircle, color: 'red' };
  }
  if (s === 'converted') {
    return { text: 'Work Order has been created', icon: CheckCircle, color: 'green' };
  }
  return null;
}

// ── visual helpers ───────────────────────────────────────────────────────────
function getStatusPillClasses(status) {
  const map = {
    approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    signed: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    scheduled: 'bg-amber-500/10 text-amber-700 border-amber-200',
    on_my_way: 'bg-amber-500/10 text-amber-700 border-amber-200',
    visit_completed: 'bg-blue-500/10 text-blue-700 border-blue-200',
    sent: 'bg-violet-500/10 text-violet-700 border-violet-200',
    viewed: 'bg-violet-500/10 text-violet-700 border-violet-200',
    changes_requested: 'bg-orange-500/10 text-orange-700 border-orange-200',
    declined: 'bg-red-500/10 text-red-700 border-red-200',
    converted: 'bg-slate-500/10 text-slate-700 border-slate-200',
    draft: 'bg-slate-500/10 text-slate-700 border-slate-200',
  };
  return map[status] || map.draft;
}

function getDotClasses(variant) {
  const map = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-300',
    error: 'bg-red-500',
  };
  return map[variant] || map.neutral;
}

function getTextClasses(variant) {
  const map = {
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    info: 'text-blue-700',
    neutral: 'text-slate-700',
    error: 'text-red-700',
  };
  return map[variant] || map.neutral;
}

function getNextActionClasses(color) {
  const map = {
    green: {
      wrap: 'border-emerald-300 bg-emerald-50/70',
      line: 'border-emerald-500',
      icon: 'text-emerald-600',
      text: 'text-emerald-800',
    },
    orange: {
      wrap: 'border-amber-300 bg-amber-50/80',
      line: 'border-amber-500',
      icon: 'text-amber-600',
      text: 'text-amber-800',
    },
    red: {
      wrap: 'border-red-300 bg-red-50/80',
      line: 'border-red-500',
      icon: 'text-red-600',
      text: 'text-red-800',
    },
    purple: {
      wrap: 'border-violet-300 bg-violet-50/80',
      line: 'border-violet-500',
      icon: 'text-violet-600',
      text: 'text-violet-800',
    },
    blue: {
      wrap: 'border-blue-300 bg-blue-50/80',
      line: 'border-blue-500',
      icon: 'text-blue-600',
      text: 'text-blue-800',
    },
  };
  return map[color] || map.blue;
}

// ── subcomponents ────────────────────────────────────────────────────────────
function EstimateSummaryBlock({ estimate, status }) {
  return (
    <div className="mx-3 mt-3 rounded-3xl border border-slate-800 bg-slate-900 px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Estimate Total
          </p>
          <p className="mt-1 text-[26px] font-black leading-none tracking-tight text-white">
            ${(estimate?.total || 0).toFixed(2)}
          </p>
          {estimate?.client_name && (
            <p className="mt-2 truncate text-[11px] font-medium text-slate-400">
              {estimate.client_name}
            </p>
          )}
        </div>

        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusPillClasses(status)}`}
        >
          {(status || 'draft').replaceAll('_', ' ')}
        </span>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, variant }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getDotClasses(variant)}`} />
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
      </div>
      <span className={`truncate text-[11px] font-semibold ${getTextClasses(variant)}`}>
        {value}
      </span>
    </div>
  );
}

function StatusOverviewBlock({
  apptSummaryValue,
  apptSummaryVariant,
  visitDone,
  status,
  sentValue,
  sentVariant,
  approvalValue,
  approvalVariant,
  isSigned,
  signerName,
  isChangesReq,
  changesRequestedAt,
}) {
  return (
    <div className="mx-3 mt-3 rounded-3xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Status Overview
      </p>

      <div className="divide-y divide-slate-50">
        <SummaryChip label="Appointment" value={apptSummaryValue} variant={apptSummaryVariant} />
        <SummaryChip
          label="Visit"
          value={visitDone ? 'Completed' : status === 'on_my_way' ? 'In transit' : 'Pending'}
          variant={visitDone ? 'success' : status === 'on_my_way' ? 'warning' : 'neutral'}
        />
        <SummaryChip label="Sent" value={sentValue} variant={sentVariant} />
        <SummaryChip label="Approval" value={approvalValue} variant={approvalVariant} />

        {isSigned && signerName && (
          <SummaryChip label="Signed by" value={signerName} variant="success" />
        )}

        {isChangesReq && changesRequestedAt && (
          <SummaryChip label="Changes" value={fmt(changesRequestedAt)} variant="warning" />
        )}
      </div>
    </div>
  );
}

function NextActionBlock({ next }) {
  if (!next) return null;

  const ui = getNextActionClasses(next.color);
  const Icon = next.icon;

  return (
    <div className={`mx-3 mt-3 rounded-2xl border px-3 py-3 shadow-sm ${ui.wrap}`}>
      <div className={`flex items-start gap-2.5 border-l-4 pl-3 ${ui.line}`}>
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ui.icon}`} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Next Step
          </p>
          <p className={`mt-1 text-[11px] font-semibold leading-snug ${ui.text}`}>
            {next.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionButtonsBlock({
  estimate,
  omwActive,
  setSchedDate,
  setSchedTime,
  setScheduleOpen,
  handleStopOMW,
  handleOMW,
  setFinishOpen,
  setApprovalOpen,
  role,
  setLossValidation,
  setOverrideAction,
  setOverrideModalOpen,
  setLossModalOpen,
  onOpenSendReview,
}) {
  const baseSecondary =
    'flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50';

  return (
    <div className="mx-3 mt-3 flex flex-1 flex-col gap-2">
      <button
        onClick={() => {
          if (!estimate.client_email) {
            toast.error('Client email is required to send');
            return;
          }

          const dtv = validateDocTypeFields(estimate);
          if (!dtv.valid) {
            dtv.errors.forEach((e) => toast.error(e));
            return;
          }

          const pv = validateEstimatePricing(estimate);
          if (pv.lossItems.length > 0 || pv.zeroProfitItems.length > 0) {
            const gate = canSendDocument(role, pv);

            if (!gate.allowed) {
              toast.error(gate.blockedReason);
              return;
            }

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
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-black"
      >
        <Send className="h-3.5 w-3.5 text-indigo-300" />
        Review & Send
      </button>

      <button
        onClick={() => {
          setSchedDate(estimate?.scheduled_date || '');
          setSchedTime(estimate?.scheduled_time || '09:00');
          setScheduleOpen(true);
        }}
        className={baseSecondary}
      >
        <Calendar className="h-3.5 w-3.5 text-blue-500" />
        Schedule
      </button>

      <button
        onClick={omwActive ? handleStopOMW : handleOMW}
        className={
          omwActive
            ? 'flex w-full items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-xs font-semibold text-amber-800 shadow-sm transition-all hover:bg-amber-100'
            : baseSecondary
        }
      >
        <Navigation2 className="h-3.5 w-3.5 text-amber-500" />
        {omwActive ? 'Stop OMW' : 'On My Way'}
      </button>

      <button onClick={() => setFinishOpen(true)} className={baseSecondary}>
        <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
        Finish Visit
      </button>

      <button onClick={() => setApprovalOpen(true)} className={baseSecondary}>
        <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
        Approve / Decline
      </button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function EstimateActionsPanel({ estimate, onStatusChange, onOpenSendReview }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossValidation, setLossValidation] = useState({ lossItems: [], zeroProfitItems: [] });
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideAction, setOverrideAction] = useState('send');
  const [currentUser, setCurrentUser] = useState(null);
  const [omwActive, setOmwActive] = useState(false);
  const [omwMiles, setOmwMiles] = useState(estimate?.miles_traveled || 0);
  const [omwInterval, setOmwInterval] = useState(null);
  const [omwStarted, setOmwStarted] = useState(null);

  const [schedDate, setSchedDate] = useState(estimate?.scheduled_date || '');
  const [schedTime, setSchedTime] = useState(estimate?.scheduled_time || '09:00');
  const [schedNotes, setSchedNotes] = useState('');
  const [finishNotes, setFinishNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, loading: false, error: null });

  const s = estimate?.status;

  useEffect(() => {
    base44.auth.me().then((u) => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (s !== 'on_my_way' && omwActive) {
      if (omwInterval) clearInterval(omwInterval);
      setOmwInterval(null);
      setOmwActive(false);
      setOmwStarted(null);
    }
  }, [s, omwActive, omwInterval]);

  const role = normalizeUserRole(currentUser?.role);
  const hasAppointment = !!estimate?.appointment_id;
  const visitDone = ['visit_completed', 'sent', 'viewed', 'changes_requested', 'approved', 'signed', 'declined', 'converted'].includes(s);
  const isSent = !!estimate?.sent_at || ['sent', 'viewed', 'changes_requested', 'approved', 'signed', 'declined', 'converted'].includes(s);
  const isViewed = !!estimate?.viewed_at || ['viewed', 'changes_requested', 'approved', 'signed', 'declined', 'converted'].includes(s);
  const isApproved = ['approved', 'signed', 'converted'].includes(s);
  const isDeclined = s === 'declined';

  const handleSchedule = async () => {
    if (!schedDate) {
      toast.error('Select a date');
      return;
    }

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

        await logComm({
          event_type: 'appointment_created',
          client_id: estimate.client_id || '',
          client_name: estimate.client_name,
          client_email: estimate.client_email,
          appointment_id: apptId,
          estimate_id: estimate.id,
          subject: 'Appointment Scheduled',
          preview: `${schedDate} at ${schedTime}`,
        });
      } catch {
        await logCommFailed({
          event_type: 'appointment_created',
          client_name: estimate.client_name,
          client_email: estimate.client_email,
          appointment_id: apptId,
          estimate_id: estimate.id,
          subject: 'Appointment Scheduled',
        });
      }
    }

    toast.success(`Appointment ${estimate.appointment_id ? 'updated' : 'scheduled'}`);
    setScheduleOpen(false);
    onStatusChange('scheduled');
  };

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
    setOmwStarted(Date.now());

    const interval = setInterval(() => {
      setOmwMiles((m) => parseFloat((m + 0.1).toFixed(1)));
    }, 3000);

    setOmwInterval(interval);
    toast.success('OMW started — tracking mileage');
    onStatusChange('on_my_way');
  };

  const handleStopOMW = async () => {
    if (omwInterval) clearInterval(omwInterval);
    setOmwInterval(null);
    setOmwActive(false);

    const running = await base44.entities.TimeEntry.filter({ status: 'running' });
    const entry = running.find(
      (e) =>
        e.client_name === estimate.client_name &&
        e.project?.includes(String(estimate.estimate_number))
    );

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

  const handleFinish = async () => {
    const now = new Date().toISOString();

    await base44.entities.Estimate.update(estimate.id, {
      status: 'visit_completed',
      completed_time: now,
      notes: finishNotes
        ? estimate.notes
          ? `${estimate.notes}\n\n${finishNotes}`
          : finishNotes
        : estimate.notes,
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

  const handleApproveConfirm = async () => {
    await base44.entities.Estimate.update(estimate.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: currentUser?.email || null,
      approval_note: declineReason.trim() || null,
      declined_at: null,
      declined_reason: null,
    });

    await logComm({
      event_type: 'estimate_approved',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Approved`,
      status: 'delivered',
    });

    setApprovalOpen(false);
    setDeclineReason('');
    toast.success('Estimate approved!');
    onStatusChange('approved');
  };

  const handleDeclineConfirm = async () => {
    if (!declineReason.trim()) {
      toast.error('Please enter a reason for declining');
      return;
    }

    await base44.entities.Estimate.update(estimate.id, {
      status: 'declined',
      declined_at: new Date().toISOString(),
      declined_reason: declineReason.trim(),
      approved_at: null,
      approved_by: null,
      approval_note: null,
      signed_at: null,
    });

    await logComm({
      event_type: 'estimate_declined',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Declined`,
      status: 'delivered',
    });

    setApprovalOpen(false);
    setDeclineReason('');
    toast.success('Estimate declined');
    onStatusChange('declined');
  };

  const canDelete = () => {
    if (['approved', 'signed', 'converted'].includes(s)) return false;
    return true;
  };

  const getDeleteBlockReason = () => {
    if (s === 'approved') return 'Cannot delete approved estimates';
    if (s === 'signed') return 'Cannot delete signed estimates';
    if (s === 'converted') return 'Cannot delete converted estimates. Delete the Work Order instead.';
    return null;
  };

  const handleDelete = () => {
    const blockReason = getDeleteBlockReason();
    if (blockReason) {
      toast.error(blockReason);
      return;
    }
    setDeleteModal({ open: true, loading: false, error: null });
  };

  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await base44.entities.Estimate.delete(estimate.id);
      toast.success(`Estimate #${estimate.estimate_number} deleted`);
      setTimeout(() => {
        window.location.href = '/estimates';
      }, 500);
    } catch (err) {
      setDeleteModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to delete estimate',
      }));
    }
  };

  const next = getNextAction(estimate);

  const apptSummaryVariant = hasAppointment ? (visitDone ? 'success' : 'info') : 'neutral';
  const apptSummaryValue = hasAppointment
    ? visitDone
      ? 'Completed'
      : estimate?.scheduled_date
        ? fmtDate(estimate.scheduled_date)
        : 'Scheduled'
    : 'Not scheduled';

  const sentVariant = isSent ? (isViewed ? 'info' : 'success') : 'neutral';
  const sentValue = isSent ? (isViewed ? 'Viewed' : 'Sent') : 'Not sent';

  const isSigned = s === 'signed';
  const isChangesReq = s === 'changes_requested';
  const approvalVariant = isSigned
    ? 'success'
    : isApproved
      ? 'success'
      : isDeclined
        ? 'error'
        : isChangesReq
          ? 'warning'
          : isSent
            ? 'warning'
            : 'neutral';

  const approvalValue = isSigned
    ? 'Signed'
    : isApproved
      ? 'Approved'
      : isDeclined
        ? 'Declined'
        : isChangesReq
          ? 'Changes Req.'
          : isSent
            ? 'Pending'
            : '—';

  return (
    <div className="w-52 min-h-0 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50">
      <EstimateSummaryBlock estimate={estimate} status={s} />

      <StatusOverviewBlock
        apptSummaryValue={apptSummaryValue}
        apptSummaryVariant={apptSummaryVariant}
        visitDone={visitDone}
        status={s}
        sentValue={sentValue}
        sentVariant={sentVariant}
        approvalValue={approvalValue}
        approvalVariant={approvalVariant}
        isSigned={isSigned}
        signerName={estimate?.signer_name}
        isChangesReq={isChangesReq}
        changesRequestedAt={estimate?.changes_requested_at}
      />

      <NextActionBlock next={next} />

      <ActionButtonsBlock
        estimate={estimate}
        omwActive={omwActive}
        setSchedDate={setSchedDate}
        setSchedTime={setSchedTime}
        setScheduleOpen={setScheduleOpen}
        handleStopOMW={handleStopOMW}
        handleOMW={handleOMW}
        setFinishOpen={setFinishOpen}
        setApprovalOpen={setApprovalOpen}
        role={role}
        setLossValidation={setLossValidation}
        setOverrideAction={setOverrideAction}
        setOverrideModalOpen={setOverrideModalOpen}
        setLossModalOpen={setLossModalOpen}
        onOpenSendReview={onOpenSendReview}
      />

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              {hasAppointment ? 'Reschedule Appointment' : 'Schedule Appointment'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Date *</label>
              <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Time</label>
              <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Notes</label>
              <Textarea
                value={schedNotes}
                onChange={(e) => setSchedNotes(e.target.value)}
                placeholder="Description of work..."
                rows={2}
              />
            </div>
            <div className="rounded p-2 text-xs text-slate-500 bg-slate-50">
              Client: <span className="font-semibold text-slate-700">{estimate?.client_name}</span>
              {estimate?.client_address && (
                <>
                  <br />
                  {estimate.client_address}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSchedule}>
              Save & Notify Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              Approve or Decline
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">
                Estimate #{estimate?.estimate_number}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{estimate?.client_name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Total: ${(estimate?.total || 0).toFixed(2)}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Note (required to decline)
              </label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Optional for approval, required to decline..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleDeclineConfirm}
            >
              <XCircle className="mr-1 h-3.5 w-3.5 text-red-500" />
              Decline
            </Button>
            <Button
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleApproveConfirm}
            >
              <CheckCircle className="mr-1 h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-600" />
              Finish Visit
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-500">
              Mark the visit as completed and add any field notes.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Visit Notes</label>
              <Textarea
                value={finishNotes}
                onChange={(e) => setFinishNotes(e.target.value)}
                placeholder="What was done on site..."
                rows={3}
              />
            </div>

            {omwMiles > 0 && (
              <div className="flex items-center gap-1.5 rounded bg-emerald-50 p-2 text-xs text-emerald-700">
                <Navigation2 className="h-3.5 w-3.5 text-amber-500" />
                {omwMiles} miles tracked on this visit
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setFinishOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleFinish}
            >
              Mark as Finished
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-slate-900">Delete Estimate?</h2>
            <p className="mb-4 text-sm text-slate-500">
              Are you sure you want to delete Estimate #{estimate?.estimate_number}? This action
              cannot be undone.
            </p>

            {s === 'sent' && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  <strong>Warning:</strong> This estimate has been sent to the client.
                </p>
              </div>
            )}

            {deleteModal.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-700">{deleteModal.error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModal({ open: false, loading: false, error: null })}
                disabled={deleteModal.loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={handleConfirmDelete}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? 'Deleting...' : 'Delete Estimate'}
              </Button>
            </div>
          </div>
        </div>
      )}

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

      <PricingOverrideModal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        onApproved={() => {
          setOverrideModalOpen(false);
          onOpenSendReview?.();
        }}
        action={overrideAction}
        role={role}
        currentUser={currentUser}
        document={estimate}
        documentType="estimate"
        pricingResult={lossValidation}
        lossItems={lossValidation.lossItems}
        zeroProfitItems={lossValidation.zeroProfitItems}
      />

      <div className="mx-3 mt-3 border-t border-slate-200 pt-3">
        <Collapsible open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
          <CollapsibleTrigger asChild>
            <button className="group flex w-full items-center justify-between px-1 py-1.5 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                More Actions
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                  moreActionsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-1.5 pb-3 pt-2">
            <button
              onClick={handleDelete}
              disabled={!canDelete()}
              className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
                canDelete()
                  ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                  : 'cursor-not-allowed text-slate-400'
              }`}
              title={!canDelete() ? getDeleteBlockReason() : 'Delete this estimate'}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              Delete Estimate
            </button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
