import React, { useState, useEffect } from 'react';
import {
  Calendar, Navigation2, CheckSquare, Send, ThumbsUp,
  CheckCircle, XCircle, AlertCircle, Zap, Trash2, ChevronDown,
  CalendarDays, MapPin, Mail, BadgeCheck
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
import { archiveWithSnapshot } from '@/lib/softDelete';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * updateEstimateCritical — Guarantees the status-bearing fields always persist.
 * Optional metadata (timestamps, notes, nullable clears) are applied best-effort.
 */
async function updateEstimateCritical(estimateId, criticalPatch, optionalPatch = {}) {
  await base44.entities.Estimate.update(estimateId, criticalPatch);
  if (Object.keys(optionalPatch).length > 0) {
    await base44.entities.Estimate.update(estimateId, optionalPatch)
      .catch(err => console.warn('[EstimateActionsPanel] optional workflow update failed:', err));
  }
}
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

// ── approval gate helpers ─────────────────────────────────────────────────────
function isApprovalTerminalStatus(status) {
  return ['approved', 'signed', 'converted', 'declined'].includes(status);
}
// eslint-disable-next-line unused-imports/no-unused-vars
function canApproveOrDecline(estimate) {
  return ['sent', 'viewed', 'changes_requested', 'visit_completed'].includes(estimate?.status);
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
  if (s === 'approved' || s === 'signed') return { text: 'Ready for invoicing', icon: Zap, color: 'green' };
  if (s === 'declined') return { text: 'Consider revising and re-sending the estimate', icon: AlertCircle, color: 'red' };
  if (s === 'converted') return { text: 'Invoice / Work Order created', icon: CheckCircle, color: 'green' };
  return null;
}

// ── pipeline row ─────────────────────────────────────────────────────────────
const STEP_ICONS = {
  Appointment: CalendarDays,
  Visit:       MapPin,
  Sent:        Mail,
  Approval:    BadgeCheck,
  'Signed by': CheckCircle,
  Changes:     AlertCircle,
};

const VARIANT_DOT = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-400',
  info:    'bg-blue-500',
  neutral: 'bg-slate-300',
  error:   'bg-red-500',
};
const VARIANT_VALUE = {
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  info:    'text-blue-700 bg-blue-50 border-blue-200',
  neutral: 'text-slate-400 bg-slate-50 border-slate-200',
  error:   'text-red-600 bg-red-50 border-red-200',
};
const VARIANT_ICON = {
  success: 'text-emerald-500 bg-emerald-50',
  warning: 'text-amber-500 bg-amber-50',
  info:    'text-blue-500 bg-blue-50',
  neutral: 'text-slate-300 bg-slate-50',
  error:   'text-red-400 bg-red-50',
};

function PipelineRow({ label, value, variant }) {
  const Icon = STEP_ICONS[label] || CalendarDays;
  const iconCls  = VARIANT_ICON[variant]  || VARIANT_ICON.neutral;
  const valueCls = VARIANT_VALUE[variant] || VARIANT_VALUE.neutral;
  const dotCls   = VARIANT_DOT[variant]   || VARIANT_DOT.neutral;
  return (
    <div className="flex items-center gap-2.5">
      {/* Step icon */}
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconCls}`}>
        <Icon className="w-3 h-3" />
      </div>
      {/* Label */}
      <span className="flex-1 text-[11px] font-medium text-slate-600 truncate">{label}</span>
      {/* Status badge */}
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border leading-none ${valueCls}`}>
        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${dotCls}`} />
        {value}
      </span>
    </div>
  );
}

// kept for backward compat if used elsewhere — delegates to PipelineRow
function SummaryChip({ label, value, variant }) {
  return <PipelineRow label={label} value={value} variant={variant} />;
}

// ── EstimateSummaryBlock ──────────────────────────────────────────────────────
function EstimateSummaryBlock({ estimate }) {
  const s = estimate?.status;
  return (
    <div className="px-4 pt-5 pb-4 border-b border-slate-100 text-center">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Estimate Total</p>
      <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none mb-3">
        ${(estimate?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
      <div className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-slate-400 capitalize">{s?.replace(/_/g, ' ') || 'Draft'}</span>
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
    <div className="px-3 pt-3 pb-3 border-b border-slate-100">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Pipeline</p>
      <div className="space-y-2">
        <PipelineRow label="Appointment" value={apptSummaryValue} variant={apptSummaryVariant} />
        <PipelineRow label="Visit"       value={visitDone ? 'Completed' : (s === 'on_my_way' ? 'In transit' : 'Pending')} variant={visitDone ? 'success' : s === 'on_my_way' ? 'warning' : 'neutral'} />
        <PipelineRow label="Sent"        value={sentValue}   variant={sentVariant} />
        <PipelineRow label="Approval"    value={approvalValue} variant={approvalVariant} />
        {isSigned && estimate?.signer_name && (
          <PipelineRow label="Signed by" value={estimate.signer_name} variant="success" />
        )}
        {isChangesReq && estimate?.changes_requested_at && (
          <PipelineRow label="Changes" value={fmt(estimate.changes_requested_at)} variant="warning" />
        )}
      </div>
    </div>
  );
}

// ── NextActionBlock ───────────────────────────────────────────────────────────
function NextActionBlock({ estimate, omwActive }) {
  const next = getNextAction(estimate, omwActive);
  if (!next) return null;
  const iconBg = {
    green:  'bg-emerald-100', orange: 'bg-amber-100',
    red:    'bg-red-100',     purple: 'bg-violet-100', blue: 'bg-blue-100',
  };
  const iconColor = {
    green:  'text-emerald-600', orange: 'text-amber-600',
    red:    'text-red-600',     purple: 'text-violet-600', blue: 'text-blue-600',
  };
  const borderColor = {
    green:  'border-emerald-200', orange: 'border-amber-200',
    red:    'border-red-200',     purple: 'border-violet-200', blue: 'border-blue-200',
  };
  const bgColor = {
    green:  'bg-emerald-50/70',
    orange: 'bg-amber-50/70',
    red:    'bg-red-50/70',
    purple: 'bg-violet-50/70',
    blue:   'bg-blue-50/70',
  };
  return (
    <div className={`mx-3 mt-3 mb-1 rounded-xl border px-3 py-3 flex items-start gap-2.5 ${borderColor[next.color] || 'border-blue-200'} ${bgColor[next.color] || 'bg-blue-50/70'}`}>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg[next.color] || 'bg-blue-100'}`}>
      <next.icon className={`w-3.5 h-3.5 ${iconColor[next.color] || 'text-blue-600'}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Next Step</p>
      <p className="text-[11px] font-semibold text-slate-800 leading-snug">{next.text}</p>
    </div>
    </div>
  );
}

// ── ActionButtonsBlock ────────────────────────────────────────────────────────
// Determines which button is the "primary" action based on estimate status
function getPrimaryAction(estimate, omwActive) {
  const s = estimate?.status;

  if (!s || s === 'draft') return 'schedule';
  if (s === 'scheduled') return omwActive ? 'stopOmw' : 'omw';
  if (s === 'on_my_way') return 'finishVisit';
  if (s === 'visit_completed') return 'send';
  if (s === 'sent' || s === 'viewed' || s === 'changes_requested') return 'approveDecline';
  if (s === 'approved' || s === 'signed') return 'send';
  if (s === 'declined') return 'send';

  return 'send';
}

const PRIMARY_BTN =
  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors';

const SECONDARY_BTN =
  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-colors';

const ACTIVE_OMW_BTN =
  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors';

function ActionButtonsBlock({
  estimate,
  omwActive,
  onSchedule,
  onOMW,
  onStopOMW,
  onFinishVisit,
  onSend,
  onApproveDecline
}) {
  const primary = getPrimaryAction(estimate, omwActive);

  const actions = [
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      onClick: onSchedule,
    },
    {
      id: omwActive ? 'stopOmw' : 'omw',
      label: omwActive ? 'Stop OMW' : 'On My Way',
      icon: Navigation2,
      onClick: omwActive ? onStopOMW : onOMW,
      active: omwActive,
    },
    {
      id: 'finishVisit',
      label: 'Finish Visit',
      icon: CheckSquare,
      onClick: onFinishVisit,
    },
    {
      id: 'send',
      label: 'Review & Send',
      icon: Send,
      onClick: onSend,
    },
    {
      id: 'approveDecline',
      label: 'Approve / Decline',
      icon: ThumbsUp,
      onClick: onApproveDecline,
      hidden: isApprovalTerminalStatus(estimate?.status),
    },
  ];

  const sortedActions = [
    ...actions.filter(action => action.id === primary && !action.hidden),
    ...actions.filter(action => action.id !== primary && !action.hidden),
  ];

  return (
    <div className="px-3 pb-3 pt-2.5 space-y-1.5 flex-1 flex flex-col">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-0.5 pb-1">
        Actions
      </p>

      {sortedActions.map((action, index) => {
        const Icon = action.icon;
        const isPrimary = action.id === primary;

        const className = isPrimary
          ? PRIMARY_BTN
          : action.active
            ? ACTIVE_OMW_BTN
            : SECONDARY_BTN;

        return (
          <React.Fragment key={action.id}>
            {index === 1 && (
              <div className="h-px bg-slate-100 my-0.5" />
            )}

            <button onClick={action.onClick} className={className}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
              <span className="truncate">{action.label}</span>

              {action.active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              )}
            </button>
          </React.Fragment>
        );
      })}
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
  const [approvalSaving, setApprovalSaving] = useState(false);
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
    try {
      let apptId = estimate.appointment_id;
      if (apptId) {
        // Critical: appointment update must succeed before marking estimate scheduled
        await base44.entities.Appointment.update(apptId, {
          appointment_date: schedDate,
          start_time: schedTime,
          description: schedNotes || estimate.title || '',
          status: 'scheduled',
        });
      } else {
        // Critical: appointment create must succeed before marking estimate scheduled
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
      // Critical: status + appointment_id must succeed
      await updateEstimateCritical(
        estimate.id,
        { status: 'scheduled', appointment_id: apptId },
        { scheduled_date: schedDate, scheduled_time: schedTime }
      );
      // Best-effort email
      if (estimate.client_email) {
        base44.integrations.Core.SendEmail({
          to: estimate.client_email,
          subject: 'Appointment Scheduled',
          body: `Hi ${estimate.client_name},\n\nYour appointment has been scheduled for ${schedDate} at ${schedTime}.\n\nThank you!`,
        }).then(() => logComm({ event_type: 'appointment_created', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email, appointment_id: apptId, estimate_id: estimate.id, subject: 'Appointment Scheduled', preview: `${schedDate} at ${schedTime}` }))
          .catch(() => logCommFailed({ event_type: 'appointment_created', client_name: estimate.client_name, client_email: estimate.client_email, appointment_id: apptId, estimate_id: estimate.id, subject: 'Appointment Scheduled' }).catch(() => {}));
      }
      toast.success(`Appointment ${estimate.appointment_id ? 'updated' : 'scheduled'}`);
      setScheduleOpen(false);
      onStatusChange?.({
        status: 'scheduled',
        appointment_id: apptId,
        scheduled_date: schedDate,
        scheduled_time: schedTime,
      });
    } catch (err) {
      console.error('[EstimateActionsPanel] schedule failed:', err);
      toast.error(err?.message || 'Failed to schedule appointment');
    }
  };

  // ── OMW ──────────────────────────────────────────────────────────────────
  const handleOMW = async () => {
    const now = new Date().toISOString();
    try {
      // Critical: status must succeed
      await updateEstimateCritical(
        estimate.id,
        { status: 'on_my_way' },
        { omw_start_time: now }
      );
      // Best-effort time entry
      base44.entities.TimeEntry.create({
        team_member: estimate.assigned_to || 'Technician',
        date: now.split('T')[0],
        client_name: estimate.client_name,
        project: estimate.title || `Estimate #${estimate.estimate_number}`,
        service: 'On My Way',
        start_time: now,
        status: 'running',
        duration_seconds: 0,
        miles_traveled: 0,
      }).catch(err => console.warn('[EstimateActionsPanel] TimeEntry create failed:', err));
      setOmwActive(true);
      setOmwMiles(0);
      setOmwStarted(Date.now());
      const interval = setInterval(() => setOmwMiles(m => parseFloat((m + 0.1).toFixed(1))), 3000);
      setOmwInterval(interval);
      toast.success('OMW started — tracking mileage');
      onStatusChange?.({ status: 'on_my_way' });
    } catch (err) {
      console.error('[EstimateActionsPanel] OMW failed:', err);
      toast.error(err?.message || 'Failed to start OMW');
    }
  };

  const handleStopOMW = async () => {
    if (omwInterval) clearInterval(omwInterval);
    setOmwInterval(null);
    setOmwActive(false);
    // Best-effort time entry close + mileage — do not block UI
    base44.entities.TimeEntry.filter({ status: 'running' })
      .then(running => {
        const entry = running.find(e => e.client_name === estimate.client_name && e.project?.includes(String(estimate.estimate_number)));
        if (entry) {
          return base44.entities.TimeEntry.update(entry.id, {
            end_time: new Date().toISOString(),
            status: 'completed',
            duration_seconds: Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000),
            miles_traveled: omwMiles,
          });
        }
      })
      .catch(err => console.warn('[EstimateActionsPanel] TimeEntry stop failed:', err));
    base44.entities.Estimate.update(estimate.id, { miles_traveled: omwMiles })
      .catch(err => console.warn('[EstimateActionsPanel] mileage update failed:', err));
    toast.success(`OMW stopped — ${omwMiles} mi tracked`);
  };

  // ── FINISH ───────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    const now = new Date().toISOString();
    try {
      const mergedNotes = finishNotes
        ? (estimate.notes ? `${estimate.notes}\n\n${finishNotes}` : finishNotes)
        : undefined;
      // Critical: status must succeed
      await updateEstimateCritical(
        estimate.id,
        { status: 'visit_completed' },
        {
          completed_time: now,
          ...(mergedNotes !== undefined ? { notes: mergedNotes } : {}),
        }
      );
      // Best-effort appointment update
      if (estimate.appointment_id) {
        base44.entities.Appointment.update(estimate.appointment_id, {
          status: 'visit_completed',
          completed_at: now,
          notes: finishNotes || '',
        }).catch(err => console.warn('[EstimateActionsPanel] appointment finish update failed:', err));
      }
      toast.success('Visit marked as completed');
      setFinishOpen(false);
      onStatusChange?.({ status: 'visit_completed' });
    } catch (err) {
      console.error('[EstimateActionsPanel] finish visit failed:', err);
      toast.error(err?.message || 'Failed to finish visit');
    }
  };

  // ── APPROVAL ─────────────────────────────────────────────────────────────
  const handleApproveConfirm = async () => {
    if (!estimate?.id) { toast.error('Estimate is missing. Cannot approve.'); return; }
    if (isApprovalTerminalStatus(s)) {
      toast.error(`Estimate is already ${s}. Cannot re-approve.`);
      setApprovalOpen(false);
      return;
    }
    setApprovalSaving(true);
    try {
      const now = new Date().toISOString();
      const approvedBy = currentUser?.email || currentUser?.full_name || 'Admin';
      // Critical: status + sales_stage must succeed
      await updateEstimateCritical(
        estimate.id,
        { status: 'approved', sales_stage: 'won' },
        {
          approved_at: now,
          approved_by: approvedBy,
          approval_note: declineReason.trim() || null,
          declined_at: null,
          declined_reason: null,
          signed_at: null,
        }
      );
      logComm({
        event_type: 'estimate_approved',
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        estimate_id: estimate.id,
        subject: `Estimate #${estimate.estimate_number} Approved`,
        status: 'sent',
      }).catch(err => console.warn('[EstimateActionsPanel] approval comm log failed:', err?.message || err));
      setApprovalOpen(false);
      setDeclineReason('');
      toast.success('Estimate approved!');
      onStatusChange?.({ status: 'approved', sales_stage: 'won', approved_at: now, approved_by: approvedBy });
    } catch (err) {
      console.error('[EstimateActionsPanel] approve failed:', err);
      toast.error(err?.message || 'Failed to approve estimate');
    } finally {
      setApprovalSaving(false);
    }
  };

  const handleDeclineConfirm = async () => {
    if (!declineReason.trim()) { toast.error('Please enter a reason for declining'); return; }
    if (!estimate?.id) { toast.error('Estimate is missing. Cannot decline.'); return; }
    if (isApprovalTerminalStatus(s)) {
      toast.error(`Estimate is already ${s}. Cannot re-decline.`);
      setApprovalOpen(false);
      return;
    }
    setApprovalSaving(true);
    try {
      const now = new Date().toISOString();
      // Critical: status + sales_stage must succeed
      await updateEstimateCritical(
        estimate.id,
        { status: 'declined', sales_stage: 'lost' },
        {
          declined_at: now,
          declined_reason: declineReason.trim(),
          approved_at: null,
          approved_by: null,
          approval_note: null,
          signed_at: null,
        }
      );
      logComm({
        event_type: 'estimate_declined',
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        estimate_id: estimate.id,
        subject: `Estimate #${estimate.estimate_number} Declined`,
        status: 'sent',
      }).catch(err => console.warn('[EstimateActionsPanel] decline comm log failed:', err?.message || err));
      setApprovalOpen(false);
      setDeclineReason('');
      toast.success('Estimate declined');
      onStatusChange?.({ status: 'declined', sales_stage: 'lost', declined_at: now, declined_reason: declineReason.trim() });
    } catch (err) {
      console.error('[EstimateActionsPanel] decline failed:', err);
      toast.error(err?.message || 'Failed to decline estimate');
    } finally {
      setApprovalSaving(false);
    }
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
      const actor = currentUser?.email || currentUser?.id || 'unknown';
      await archiveWithSnapshot(base44.entities.Estimate, 'Estimate', estimate.id, actor, 'Deleted from Estimate Editor');
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
    <div className="w-56 xl:w-60 flex-shrink-0 flex flex-col overflow-y-auto min-h-0 bg-white rounded-xl border border-slate-100 mx-0" style={{ boxShadow: '0 6px 20px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)' }}>

      <EstimateSummaryBlock estimate={estimate} />

      <StatusOverviewBlock estimate={estimate} />

      <NextActionBlock estimate={estimate} omwActive={omwActive} />

      <ActionButtonsBlock
        estimate={estimate}
        omwActive={omwActive}
        onSchedule={() => { setSchedDate(estimate?.scheduled_date || ''); setSchedTime(estimate?.scheduled_time || '09:00'); setScheduleOpen(true); }}
        onOMW={handleOMW}
        onStopOMW={handleStopOMW}
        onFinishVisit={() => setFinishOpen(true)}
        onSend={handleSendClick}
        onApproveDecline={() => {
          if (isApprovalTerminalStatus(s)) {
            toast.error(`Cannot change approval: estimate is already ${s}`);
            return;
          }
          setApprovalOpen(true);
        }}
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
            <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeclineConfirm} disabled={approvalSaving}>
              <XCircle className="w-3.5 h-3.5 mr-1 text-red-500" />{approvalSaving ? 'Saving...' : 'Decline'}
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApproveConfirm} disabled={approvalSaving}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />{approvalSaving ? 'Approving...' : 'Approve'}
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
      <div className="px-4 pt-2 pb-4 border-t border-slate-100 mt-auto">
        <Collapsible open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">More</span>
              <ChevronDown className={`w-3 h-3 text-slate-300 transition-transform ${moreActionsOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 space-y-1">
            <button
              onClick={handleDelete}
              disabled={!canDelete()}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-xs font-semibold border ${
                canDelete()
                  ? 'bg-white border-red-100 hover:bg-red-50 hover:border-red-200 text-red-500'
                  : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
              }`}
              title={!canDelete() ? getDeleteBlockReason() : 'Delete this estimate'}
            >
              <Trash2 className={`w-3.5 h-3.5 ${canDelete() ? 'text-red-400' : 'text-slate-300'}`} />
              Delete Estimate
            </button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}