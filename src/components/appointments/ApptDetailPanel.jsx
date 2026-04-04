import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone, Mail, MapPin, User, Clock, Wrench, FileText,
  CheckCircle, Navigation, UserCheck, RefreshCw, X, Pencil,
  ThumbsDown, Send, Timer, AlertCircle, Receipt, Loader2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ApptStatusBadge from './ApptStatusBadge';
import CommTimeline from '@/components/shared/CommTimeline';
import { base44 } from '@/api/base44Client';
import { createEstimateFromContext } from '@/lib/createEstimateFromContext';
import {
  actionOMW,
  actionArrived,
  actionFinishVisit,
  sendAppointmentConfirmation,
} from '@/lib/apptActions';

export default function ApptDetailPanel({ appt, onClose, onEdit, onStatusChange, onRefresh }) {
  const navigate = useNavigate();
  const [finishOpen, setFinishOpen] = useState(false);
  const [visitNotes, setVisitNotes] = useState('');
  const [loading, setLoading] = useState(null);
  const [relatedDocs, setRelatedDocs] = useState({ estimate: null, workOrder: null, invoice: null });
  const [creatingEstimate, setCreatingEstimate] = useState(false);

  useEffect(() => {
    if (appt) loadRelated();
  }, [appt?.id]);

  const loadRelated = async () => {
    // Fetch estimates: try by direct estimate_id first, then by customer_id
    let estResults = [];
    if (appt.estimate_id) {
      estResults = await base44.entities.Estimate.filter({ id: appt.estimate_id }, '-created_date', 1);
    }
    if (estResults.length === 0 && appt.customer_id) {
      estResults = await base44.entities.Estimate.filter({ client_id: appt.customer_id }, '-created_date', 1);
    }

    const [wos, invs] = await Promise.all([
      appt.customer_id
        ? base44.entities.WorkOrder.filter({ client_id: appt.customer_id }, '-created_date', 1)
        : Promise.resolve([]),
      appt.customer_id
        ? base44.entities.Invoice.filter({ client_id: appt.customer_id }, '-created_date', 1)
        : Promise.resolve([]),
    ]);

    setRelatedDocs({
      estimate: estResults[0] || null,
      workOrder: wos[0] || null,
      invoice: invs[0] || null,
    });
  };

  const handleCreateEstimate = async () => {
    setCreatingEstimate(true);
    // Build client-like object from appointment data
    const clientLike = {
      id: appt.customer_id || '',
      full_name: appt.customer_display_name || '',
      email: appt.customer_email || '',
      phone: appt.customer_phone || '',
      address: appt.service_address || '',
    };
    await createEstimateFromContext({ client: clientLike, appointment: appt, navigate });
    setCreatingEstimate(false);
  };

  if (!appt) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500">Select an appointment</p>
        <p className="text-xs text-slate-400 mt-1">Click any row to view details</p>
      </div>
    );
  }

  const timeDisplay = [appt.start_time, appt.end_time].filter(Boolean).join(' – ');

  const runAction = async (key, fn) => {
    setLoading(key);
    try {
      await fn();
      onRefresh?.();
      toast.success(`${key} recorded`);
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleConfirm = () => runAction('confirm', async () => {
    await sendAppointmentConfirmation(appt);
    onStatusChange(appt.id, 'confirmed');
  });

  const handleOMW = () => runAction('omw', async () => {
    await actionOMW(appt);
    onRefresh?.();
  });

  const handleArrived = () => runAction('arrived', async () => {
    await actionArrived(appt);
    onRefresh?.();
  });

  const handleFinish = async () => {
    setLoading('finish');
    try {
      await actionFinishVisit(appt, visitNotes);
      setFinishOpen(false);
      setVisitNotes('');
      onRefresh?.();
      toast.success('Visit completed & follow-up email sent');
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleSimpleStatus = (status) => runAction(status, () => onStatusChange(appt.id, status));

  const s = appt.status;
  const actionBtnClass = "flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all disabled:opacity-50";
  const primaryBtn = `${actionBtnClass} bg-primary border-primary text-white hover:bg-primary/90`;
  const secondaryBtn = `${actionBtnClass} border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50`;
  const dangerBtn = `${actionBtnClass} border-red-200 text-red-600 hover:bg-red-50`;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-2 bg-slate-50">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Appointment</p>
          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{appt.customer_display_name}</p>
          <div className="mt-1.5">
            <ApptStatusBadge status={appt.status} />
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

        {/* Date / Time / Service */}
        <div className="px-4 py-3 space-y-2">
          {appt.title && <p className="text-sm font-semibold text-slate-800">{appt.title}</p>}
          <div className="space-y-1.5 text-xs text-slate-600">
            {appt.appointment_date && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.appointment_date}{timeDisplay ? ` · ${timeDisplay}` : ''}</span>
              </div>
            )}
            {appt.arrival_window && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500">Arrival window: {appt.arrival_window}</span>
              </div>
            )}
            {appt.service_type && (
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.service_type}</span>
              </div>
            )}
            {appt.assigned_worker_name && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{appt.assigned_worker_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
          <div className="space-y-1.5 text-xs">
            {appt.customer_phone && (
              <a href={`tel:${appt.customer_phone}`} className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{appt.customer_phone}
              </a>
            )}
            {appt.customer_email && (
              <a href={`mailto:${appt.customer_email}`} className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{appt.customer_email}
              </a>
            )}
            {appt.service_address && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />{appt.service_address}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {(appt.description || appt.notes || appt.internal_notes) && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</p>
            {appt.description && <p className="text-xs text-slate-600 leading-relaxed">{appt.description}</p>}
            {appt.notes && <p className="text-xs text-slate-500 leading-relaxed">{appt.notes}</p>}
            {appt.internal_notes && (
              <div className="bg-amber-50 border border-amber-100 rounded p-2">
                <p className="text-[10px] font-bold text-amber-600 mb-0.5 uppercase tracking-wide">Internal</p>
                <p className="text-xs text-amber-800 leading-relaxed">{appt.internal_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── LIFECYCLE ACTIONS ── */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</p>
          <div className="flex flex-col gap-1.5">

            {/* Confirm */}
            {['new', 'scheduled'].includes(s) && (
              <button onClick={handleConfirm} disabled={!!loading} className={primaryBtn}>
                <UserCheck className="w-3.5 h-3.5" />
                {loading === 'confirm' ? 'Confirming…' : 'Confirm & Notify Customer'}
              </button>
            )}

            {/* OMW */}
            {['confirmed', 'scheduled', 'new'].includes(s) && (
              <button onClick={handleOMW} disabled={!!loading} className={`${secondaryBtn} border-orange-200 text-orange-700 hover:bg-orange-50`}>
                <Navigation className="w-3.5 h-3.5" />
                {loading === 'omw' ? 'Starting…' : 'On My Way (OMW)'}
              </button>
            )}

            {/* Arrived */}
            {['on_the_way', 'confirmed', 'scheduled'].includes(s) && (
              <button onClick={handleArrived} disabled={!!loading} className={`${secondaryBtn} border-blue-200 text-blue-700 hover:bg-blue-50`}>
                <MapPin className="w-3.5 h-3.5" />
                {loading === 'arrived' ? 'Registering…' : 'Mark Arrived'}
              </button>
            )}

            {/* Finish Visit */}
            {['arrived', 'on_the_way', 'confirmed', 'scheduled'].includes(s) && (
              <button onClick={() => setFinishOpen(true)} disabled={!!loading} className={`${secondaryBtn} border-green-200 text-green-700 hover:bg-green-50`}>
                <CheckCircle className="w-3.5 h-3.5" />
                Finish Visit
              </button>
            )}

            {/* Follow-up */}
            {s === 'visit_completed' && (
              <button onClick={() => handleSimpleStatus('follow_up_needed')} disabled={!!loading} className={`${secondaryBtn} border-yellow-200 text-yellow-700 hover:bg-yellow-50`}>
                <RefreshCw className="w-3.5 h-3.5" />Mark Follow-up Needed
              </button>
            )}

            {/* Create / View Estimate CTA — always shown */}
            {relatedDocs.estimate ? (
              <button
                onClick={() => navigate(`/estimate-editor?id=${relatedDocs.estimate.id}`)}
                className={`${secondaryBtn} justify-center border-primary/30 text-primary hover:bg-primary/5`}
              >
                <FileText className="w-3.5 h-3.5" />
                View Estimate #{relatedDocs.estimate.estimate_number}
                <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded capitalize
                  ${relatedDocs.estimate.status === 'approved' ? 'bg-green-100 text-green-700' :
                    relatedDocs.estimate.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'}`}>
                  {relatedDocs.estimate.status}
                </span>
              </button>
            ) : (
              <button
                onClick={handleCreateEstimate}
                disabled={creatingEstimate}
                className={`${secondaryBtn} justify-center border-primary/30 text-primary hover:bg-primary/5`}
              >
                {creatingEstimate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                {creatingEstimate ? 'Creating...' : 'Create Estimate'}
              </button>
            )}

            {/* View Work Order */}
            {relatedDocs.workOrder && (
              <button
                onClick={() => navigate(`/work-order-detail?id=${relatedDocs.workOrder.id}`)}
                className={`${secondaryBtn} justify-center border-slate-200 text-slate-600 hover:bg-slate-50`}
              >
                <Wrench className="w-3.5 h-3.5" />
                View Work Order #{relatedDocs.workOrder.work_order_number}
              </button>
            )}

            {/* View Invoice */}
            {relatedDocs.invoice && (
              <button
                onClick={() => navigate(`/invoice-detail?id=${relatedDocs.invoice.id}`)}
                className={`${secondaryBtn} justify-center border-slate-200 text-slate-600 hover:bg-slate-50`}
              >
                <Receipt className="w-3.5 h-3.5" />
                View Invoice #{relatedDocs.invoice.invoice_number}
              </button>
            )}

            {/* Reschedule */}
            <button onClick={onEdit} className={`${secondaryBtn} border-indigo-200 text-indigo-600 hover:bg-indigo-50`}>
              <Calendar className="w-3.5 h-3.5" />Reschedule / Edit
            </button>

            {/* Cancel / No-Show */}
            {!['visit_completed', 'cancelled', 'no_show'].includes(s) && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button onClick={() => handleSimpleStatus('no_show')} disabled={!!loading} className={dangerBtn}>
                  <ThumbsDown className="w-3 h-3" />No Show
                </button>
                <button onClick={() => handleSimpleStatus('cancelled')} disabled={!!loading} className={dangerBtn}>
                  <X className="w-3 h-3" />Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Time Tracking shortcut */}
        <div className="px-4 py-3">
          <Link
            to="/appt-time-tracking"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            <Timer className="w-3.5 h-3.5" />View Time Tracking Logs →
          </Link>
        </div>

        {/* Timestamps */}
        {(appt.omw_started_at || appt.arrived_at || appt.completed_at) && (
          <div className="px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeline</p>
            {appt.omw_started_at && <p className="text-xs text-slate-500">🚗 OMW: {new Date(appt.omw_started_at).toLocaleTimeString()}</p>}
            {appt.arrived_at && <p className="text-xs text-slate-500">📍 Arrived: {new Date(appt.arrived_at).toLocaleTimeString()}</p>}
            {appt.completed_at && <p className="text-xs text-slate-500">✅ Completed: {new Date(appt.completed_at).toLocaleTimeString()}</p>}
          </div>
        )}

        {/* Communications */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Communications</p>
          <CommTimeline appointmentId={appt.id} limit={8} />
        </div>
      </div>

      {/* Finish Visit Modal */}
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-green-600" />Finish Visit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-500">
              This will mark the visit as completed, close any open time tracking logs, and send a follow-up email to the customer.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Visit Notes (optional)</label>
              <Textarea
                value={visitNotes}
                onChange={e => setVisitNotes(e.target.value)}
                placeholder="What was done on site, items to follow up on..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            {appt.customer_email && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                <Send className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  A follow-up email will be sent to <span className="font-semibold">{appt.customer_email}</span> confirming we have the info needed to start the estimate.
                </p>
              </div>
            )}
            {!appt.customer_email && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">No customer email — follow-up notification will be skipped.</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setFinishOpen(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleFinish} disabled={loading === 'finish'}>
              {loading === 'finish' ? 'Finishing…' : 'Complete Visit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}