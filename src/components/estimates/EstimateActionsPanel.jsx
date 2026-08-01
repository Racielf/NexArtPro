import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Calendar, Navigation2, Flag, Send, ThumbsUp,
  CheckCircle, XCircle, AlertCircle, Check, Copy, Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { nexartClient } from '@/api/nexartClient';
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
import ConvertToWorkOrderButton from '@/components/workorders/ConvertToWorkOrderButton';
import { ORGANIC, organicHeadingStyle } from '@/components/estimates/estimatePipelineTheme';
import { useLanguage } from '@/lib/i18n';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── next best action logic ────────────────────────────────────────────────────
function getNextAction(estimate, _omwActive, t) {
  const s = estimate?.status;
  if (!s || s === 'draft') return { text: t('estimate.pipeline.scheduleNext'), icon: Calendar, color: 'blue' };
  if (s === 'scheduled') return { text: t('estimate.pipeline.omwNext'), icon: Navigation2, color: 'orange' };
  if (s === 'on_my_way') return { text: t('estimate.pipeline.finishNext'), icon: Navigation2, color: 'orange' };
  if (s === 'visit_completed') {
    if (!estimate.sent_at) return { text: t('estimate.pipeline.sendNext'), icon: Send, color: 'blue' };
  }
  if (s === 'sent' || s === 'viewed' || s === 'changes_requested') {
    return { text: t('estimate.pipeline.approvalNext'), icon: ThumbsUp, color: 'purple' };
  }
  if (s === 'approved' || s === 'signed') return { text: t('estimate.pipeline.jobNext'), icon: Copy, color: 'green' };
  if (s === 'declined') return { text: t('estimate.pipeline.resendNext'), icon: AlertCircle, color: 'red' };
  if (s === 'converted') return { text: t('estimate.pipeline.convertedNext'), icon: CheckCircle, color: 'green' };
  return null;
}

// ── pipeline stage index (0..6) — drives the circular stepper ────────────────
const STAGES = [
  { key: 'schedule', label: 'Agendar', icon: Calendar },
  { key: 'omw', label: 'En camino', icon: Navigation2 },
  { key: 'finish', label: 'Finalizar', icon: Flag },
  { key: 'send', label: 'Enviar', icon: Send },
  { key: 'approval', label: 'Aprobación', icon: ThumbsUp },
  { key: 'job', label: 'Crear trabajo', icon: Copy },
];

function getStageIndex(estimate) {
  const s = estimate?.status;
  if (!s || s === 'draft') return 0;
  if (s === 'scheduled') return 1;
  if (s === 'on_my_way') return 2;
  if (s === 'visit_completed') return 3;
  if (s === 'sent' || s === 'viewed' || s === 'changes_requested' || s === 'declined') return 4;
  if (s === 'approved' || s === 'signed') return 5;
  if (s === 'converted') return 6;
  return 4;
}

function PipelineStepper({ estimate, onStageClick, t }) {
  const isDeclined = estimate?.status === 'declined';
  const idx = getStageIndex(estimate);
  const last = STAGES.length - 1;
  const clampedIdx = Math.min(idx, last);
  const progressPct = last > 0 ? (clampedIdx / last) * 100 : 0;

  const doneDates = [
    estimate?.scheduled_date ? fmtDate(estimate.scheduled_date) : null,
    estimate?.omw_start_time ? fmt(estimate.omw_start_time) : null,
    estimate?.completed_time ? fmt(estimate.completed_time) : null,
    estimate?.sent_at ? fmt(estimate.sent_at) : null,
    estimate?.approved_at ? fmt(estimate.approved_at) : null,
    estimate?.converted_at ? fmt(estimate.converted_at) : null,
  ];

  return (
    <div className="relative pb-1">
      <div className="absolute rounded-full" style={{ left: '8.34%', right: '8.34%', top: '25px', height: '5px', background: ORGANIC.neutral300 }} />
      <div
        className="absolute rounded-full transition-all duration-300"
        style={{ left: '8.34%', top: '25px', height: '5px', width: `calc((100% - 16.68%) * ${progressPct / 100})`, background: isDeclined ? ORGANIC.danger : ORGANIC.olive500 }}
      />
      <div className="relative grid grid-cols-6">
        {STAGES.map((stage, i) => {
          const declinedHere = isDeclined && i === 4;
          const done = i < idx && !declinedHere;
          const current = i === idx;
          const Icon = done ? Check : stage.icon;
          const bg = declinedHere ? ORGANIC.danger : done ? ORGANIC.olive500 : current ? ORGANIC.accent : ORGANIC.neutral200;
          const fg = done || current || declinedHere ? '#fff' : ORGANIC.ink400;
          const borderColor = declinedHere ? ORGANIC.danger : done ? ORGANIC.olive500 : current ? ORGANIC.accent : ORGANIC.neutral300;
          const sub = declinedHere ? t('estimate.pipeline.rejected') : done ? (doneDates[i] || t('estimate.pipeline.done')) : current ? t('estimate.pipeline.now') : t('estimate.pipeline.pending');
          const label = t(`estimate.pipeline.${stage.key}`);
          const clickable = stage.key !== 'job';
          return (
            <button
              key={stage.key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStageClick(stage.key)}
              className={`flex flex-col items-center gap-1.5 px-1 text-center bg-transparent border-0 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all"
                style={{ background: bg, color: fg, border: `2px solid ${borderColor}`, boxShadow: current ? `0 0 0 6px ${ORGANIC.accent200}` : 'none' }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: current ? ORGANIC.accent700 : done ? ORGANIC.ink700 : ORGANIC.ink400 }}>{label}</span>
              <span className="text-[10.5px] min-h-[13px]" style={{ color: ORGANIC.ink400 }}>{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── pill action buttons — primary action first ─────────────────────────────
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

const PILL_PRIMARY = 'inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold text-white shadow-sm transition-colors flex-shrink-0';
const PILL_SECONDARY = 'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors flex-shrink-0';

function ActionPills({ estimate, omwActive, onSchedule, onOMW, onStopOMW, onFinishVisit, onSend, onApproveDecline, onConverted, t }) {
  const primary = getPrimaryAction(estimate, omwActive);
  const canConvert = ['approved', 'signed'].includes(estimate?.status);

  const actions = [
    { id: 'schedule', label: t('estimate.pipeline.schedule'), icon: Calendar, onClick: onSchedule },
    { id: omwActive ? 'stopOmw' : 'omw', label: omwActive ? t('estimate.pipeline.stopOmw') : t('estimate.pipeline.omw'), icon: Navigation2, onClick: omwActive ? onStopOMW : onOMW, active: omwActive },
    { id: 'finishVisit', label: t('estimate.pipeline.finishVisit'), icon: Flag, onClick: onFinishVisit },
    { id: 'send', label: t('estimate.header.reviewSend'), icon: Send, onClick: onSend },
    { id: 'approveDecline', label: t('estimate.pipeline.approveDecline'), icon: ThumbsUp, onClick: onApproveDecline },
  ];

  const sorted = [...actions.filter(a => a.id === primary), ...actions.filter(a => a.id !== primary)];

  return (
    <div className="flex items-center flex-wrap gap-2">
      {sorted.map(action => {
        const Icon = action.icon;
        const isPrimary = action.id === primary && !canConvert;
        const style = isPrimary
          ? { background: ORGANIC.accent, color: '#fff' }
          : action.active
            ? { background: ORGANIC.accent100, color: ORGANIC.accent800, border: `2px solid ${ORGANIC.accent300}` }
            : { background: 'transparent', color: ORGANIC.ink700, border: `2px solid ${ORGANIC.divider}` };
        return (
          <button key={action.id} type="button" onClick={action.onClick} className={isPrimary ? PILL_PRIMARY : PILL_SECONDARY} style={style}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-90" />
            <span className="whitespace-nowrap">{action.label}</span>
            {action.active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: ORGANIC.accent600 }} />}
          </button>
        );
      })}
      {canConvert && (
        <ConvertToWorkOrderButton
          estimate={estimate}
          onConverted={onConverted}
          className="rounded-full border-0 h-10 px-5"
          style={{ background: ORGANIC.olive500, color: '#fff' }}
        />
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const EstimateActionsPanel = forwardRef(function EstimateActionsPanel({ estimate, onStatusChange, onOpenSendReview }, ref) {
  const { t } = useLanguage();
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
  const [, setOmwStarted] = useState(null);

  const [schedDate,     setSchedDate]     = useState(estimate?.scheduled_date || '');
  const [schedTime,     setSchedTime]     = useState(estimate?.scheduled_time || '09:00');
  const [schedNotes,    setSchedNotes]    = useState('');
  const [finishNotes,   setFinishNotes]   = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, loading: false, error: null });

  const s = estimate?.status;

  // ── Load current user for role check ─────────────────────────────────────
  useEffect(() => {
    nexartClient.auth.me().then(u => setCurrentUser(u)).catch(() => {});
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
      await nexartClient.entities.Appointment.update(apptId, {
        appointment_date: schedDate,
        start_time: schedTime,
        description: schedNotes || estimate.title || '',
        status: 'scheduled',
      });
    } else {
      const appt = await nexartClient.entities.Appointment.create({
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
    await nexartClient.entities.Estimate.update(estimate.id, {
      status: 'scheduled',
      appointment_id: apptId,
      scheduled_date: schedDate,
      scheduled_time: schedTime,
    });
    if (estimate.client_email) {
      try {
        await nexartClient.integrations.Core.SendEmail({
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
    await nexartClient.entities.Estimate.update(estimate.id, { status: 'on_my_way', omw_start_time: now });
    await nexartClient.entities.TimeEntry.create({
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
    const running = await nexartClient.entities.TimeEntry.filter({ status: 'running' });
    const entry = running.find(e => e.client_name === estimate.client_name && e.project?.includes(String(estimate.estimate_number)));
    if (entry) {
      await nexartClient.entities.TimeEntry.update(entry.id, {
        end_time: new Date().toISOString(),
        status: 'completed',
        duration_seconds: Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000),
        miles_traveled: omwMiles,
      });
    }
    await nexartClient.entities.Estimate.update(estimate.id, { miles_traveled: omwMiles });
    toast.success(`OMW stopped — ${omwMiles} mi tracked`);
  };

  // ── FINISH ───────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    const now = new Date().toISOString();
    await nexartClient.entities.Estimate.update(estimate.id, {
      status: 'visit_completed',
      completed_time: now,
      notes: finishNotes ? (estimate.notes ? estimate.notes + '\n\n' + finishNotes : finishNotes) : estimate.notes,
    });
    if (estimate.appointment_id) {
      await nexartClient.entities.Appointment.update(estimate.appointment_id, {
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
    if (!estimate?.id) { toast.error('Estimate is missing. Cannot approve.'); return; }
    setApprovalSaving(true);
    try {
      const now = new Date().toISOString();
      await nexartClient.entities.Estimate.update(estimate.id, {
        status: 'approved',
        approved_at: now,
        approved_by: currentUser?.email || currentUser?.full_name || 'Admin',
        approval_note: declineReason.trim() || null,
        declined_at: null,
        declined_reason: null,
        signed_at: null,
      });
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
      onStatusChange?.('approved');
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
    setApprovalSaving(true);
    try {
      await nexartClient.entities.Estimate.update(estimate.id, {
        status: 'declined',
        declined_at: new Date().toISOString(),
        declined_reason: declineReason.trim(),
        approved_at: null,
        approved_by: null,
        approval_note: null,
        signed_at: null,
      });
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
      onStatusChange?.('declined');
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
      await archiveWithSnapshot(nexartClient.entities.Estimate, 'Estimate', estimate.id, actor, 'Deleted from Estimate Editor');
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

  useImperativeHandle(ref, () => ({ triggerSend: handleSendClick }));

  const handleStageClick = (stageKey) => {
    if (stageKey === 'schedule') { setSchedDate(estimate?.scheduled_date || ''); setSchedTime(estimate?.scheduled_time || '09:00'); setScheduleOpen(true); return; }
    if (stageKey === 'omw') { omwActive ? handleStopOMW() : handleOMW(); return; }
    if (stageKey === 'finish') { setFinishOpen(true); return; }
    if (stageKey === 'send') { handleSendClick(); return; }
    if (stageKey === 'approval') { setApprovalOpen(true); return; }
  };

  const next = getNextAction(estimate, omwActive, t);

  return (
    <div
      className="w-full flex flex-col px-5 py-5 gap-4"
      style={{ background: ORGANIC.surface, borderRadius: ORGANIC.radiusLg, boxShadow: ORGANIC.shadowSm }}
    >
      <PipelineStepper estimate={estimate} onStageClick={handleStageClick} t={t} />

      <div className="flex items-center justify-between gap-4 flex-wrap pt-3" style={{ borderTop: `1px solid ${ORGANIC.divider}` }}>
        <div className="min-w-[200px]">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: ORGANIC.ink400 }}>{t('estimate.pipeline.next')}</p>
          <p className="text-[19px] mt-0.5" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>{next?.text || t('estimate.pipeline.allDone')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <ActionPills
            estimate={estimate}
            omwActive={omwActive}
            onSchedule={() => { setSchedDate(estimate?.scheduled_date || ''); setSchedTime(estimate?.scheduled_time || '09:00'); setScheduleOpen(true); }}
            onOMW={handleOMW}
            onStopOMW={handleStopOMW}
            onFinishVisit={() => setFinishOpen(true)}
            onSend={handleSendClick}
            onApproveDecline={() => setApprovalOpen(true)}
            onConverted={() => onStatusChange?.('converted')}
            t={t}
          />

          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors flex-shrink-0"
            style={canDelete()
              ? { background: 'transparent', border: `2px solid ${ORGANIC.divider}`, color: ORGANIC.ink400 }
              : { background: ORGANIC.neutral100, border: `2px solid ${ORGANIC.neutral200}`, color: ORGANIC.neutral300, cursor: 'not-allowed' }}
            title={!canDelete() ? getDeleteBlockReason() : 'Delete this estimate'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

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
            <Button className="flex-1" style={{ background: ORGANIC.accent }} onClick={handleSchedule}>Save & Notify Client</Button>
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
            <Button className="flex-1 text-white" style={{ background: ORGANIC.olive500 }} onClick={handleApproveConfirm} disabled={approvalSaving}>
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
              <Flag className="w-5 h-5 text-emerald-600" />Finish Visit
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
            <Button className="flex-1 text-white" style={{ background: ORGANIC.olive500 }} onClick={handleFinish}>Mark as Finished</Button>
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

    </div>
  );
});

export default EstimateActionsPanel;
