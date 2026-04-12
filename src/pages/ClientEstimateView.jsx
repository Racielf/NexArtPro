import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, Loader2, Printer, Download,
  PenLine, MessageSquare, Clock, Eye, AlertTriangle, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { logComm } from '@/lib/commTracking';
import ClientSignaturePad from '@/components/estimates/ClientSignaturePad';
import ClientChangesRequest from '@/components/estimates/ClientChangesRequest';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import BidDocumentRenderer from '@/components/documents/BidDocumentRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import {
  notifyEstimateViewed,
  notifyEstimateApproved,
  notifyEstimateSigned,
  notifyEstimateDeclined,
  notifyEstimateChangesRequested,
} from '@/lib/businessNotifications';

export default function ClientEstimateView() {
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!estimateId) { setLoading(false); return; }
      const list = await base44.entities.Estimate.filter({ id: estimateId });
      if (list.length) {
        const est = list[0];
        setEstimate(est);
        // Mark as viewed if sent
        if (est.status === 'sent') {
          await base44.entities.Estimate.update(estimateId, {
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          });
          setEstimate(e => ({ ...e, status: 'viewed', viewed_at: new Date().toISOString() }));
          // Notify business
          notifyEstimateViewed(est).catch(err => console.warn('[notify] viewed failed:', err?.message));
        }
      }
      setLoading(false);
    };
    load();
  }, [estimateId]);

  const handleApprove = async () => {
    setActing(true);
    await base44.entities.Estimate.update(estimateId, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: estimate.client_name,
    });
    await logComm({
      event_type: 'estimate_approved',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Approved by Client`,
      status: 'delivered',
    });
    setEstimate(e => ({ ...e, status: 'approved', approved_at: new Date().toISOString() }));
    // Notify business
    notifyEstimateApproved(estimate).catch(err => console.warn('[notify] approved failed:', err?.message));
    setActing(false);
    toast.success('Estimate approved! We will be in touch soon.');
  };

  const handleDecline = async () => {
    setActing(true);
    await base44.entities.Estimate.update(estimateId, { status: 'declined' });
    await logComm({
      event_type: 'estimate_declined',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Declined by Client`,
      status: 'delivered',
    });
    setEstimate(e => ({ ...e, status: 'declined' }));
    // Notify business
    notifyEstimateDeclined(estimate).catch(err => console.warn('[notify] declined failed:', err?.message));
    setActing(false);
    toast.success('Estimate declined. Thank you for letting us know.');
  };

  const handleSign = async ({ base64, signerName, signerEmail }) => {
    setShowSignPad(false);
    setActing(true);
    await base44.entities.Estimate.update(estimateId, {
      status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name: signerName,
      signer_email: signerEmail,
      signature_image_base64: base64,
    });
    await logComm({
      event_type: 'estimate_approved',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: signerEmail || estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Signed by ${signerName}`,
      status: 'delivered',
    });
    setEstimate(e => ({ ...e, status: 'signed', signed_at: new Date().toISOString(), signer_name: signerName }));
    // Notify business with signed document link
    notifyEstimateSigned(estimate, { signerName, signerEmail }).catch(err => console.warn('[notify] signed failed:', err?.message));
    setActing(false);
    toast.success('Estimate signed successfully!');
  };

  const handleChangesRequest = async (note) => {
    setShowChanges(false);
    setActing(true);
    // Archive current version
    await base44.entities.EstimateVersionHistory.create({
      estimate_id: estimate.id,
      estimate_number: estimate.estimate_number,
      version: estimate.version || 1,
      client_name: estimate.client_name,
      status_at_archive: estimate.status,
      archived_reason: 'changes_requested',
      changes_note: note,
      snapshot: estimate,
      total_at_archive: estimate.total || 0,
    });
    await base44.entities.Estimate.update(estimateId, {
      status: 'changes_requested',
      changes_requested_at: new Date().toISOString(),
      changes_requested_note: note,
      version: (estimate.version || 1) + 1,
    });
    await logComm({
      event_type: 'estimate_declined',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Changes requested for Estimate #${estimate.estimate_number}`,
      status: 'delivered',
      preview: note.substring(0, 80),
    });
    setEstimate(e => ({ ...e, status: 'changes_requested', changes_requested_note: note }));
    // Notify business
    notifyEstimateChangesRequested(estimate, note).catch(err => console.warn('[notify] changes failed:', err?.message));
    setActing(false);
    toast.success('Change request sent! We\'ll review and send a revised estimate.');
  };

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    // Simple print-to-PDF trigger
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  if (!estimate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-slate-700 font-semibold text-lg">Estimate not found</p>
        <p className="text-slate-400 text-sm mt-1">This link may have expired or is invalid.</p>
      </div>
    </div>
  );

  const groups = estimate.groups?.length
    ? estimate.groups
    : estimate.line_items?.length
      ? [{ id: 'legacy', name: null, items: estimate.line_items.map(li => ({
          id: li.id, service_name: li.name || '', description: li.description,
          quantity: li.quantity || 1, unit_price: li.unit_price || 0,
          line_total: li.total_price || li.line_total || 0,
        })) }]
      : [];

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isFinal = ['approved', 'signed', 'declined', 'converted'].includes(estimate.status);
  const canAct = !isFinal && estimate.status !== 'changes_requested';

  const dc = getDocTypeConfig(estimate?.document_type);
  const docLabel = dc.label;

  const statusBanner = {
    approved: { bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-5 h-5 text-green-600" />, title: `${docLabel} Approved`, body: "Thank you! We'll be in touch soon to schedule the work." },
    signed: { bg: 'bg-green-50 border-green-200', icon: <PenLine className="w-5 h-5 text-green-600" />, title: `Signed by ${estimate.signer_name || 'you'}`, body: `Signed on ${estimate.signed_at ? new Date(estimate.signed_at).toLocaleString() : ''}` },
    declined: { bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" />, title: `${docLabel} Declined`, body: 'We appreciate your feedback. Contact us if you change your mind.' },
    changes_requested: { bg: 'bg-amber-50 border-amber-200', icon: <MessageSquare className="w-5 h-5 text-amber-500" />, title: 'Changes Requested', body: `We received your request and will send a revised ${docLabel.toLowerCase()} soon.` },
    viewed: { bg: 'bg-blue-50 border-blue-200', icon: <Eye className="w-5 h-5 text-blue-500" />, title: `${docLabel} Viewed`, body: 'Please review below and take action when ready.' },
  }[estimate.status];

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0">

      {/* Print/Download bar */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-4 h-4" fill="none">
              <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-700">{appConfig.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />Download PDF
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Status Banner */}
        {statusBanner && (
          <div className={`flex items-start gap-3 border rounded-xl px-5 py-4 print:hidden ${statusBanner.bg}`}>
            <div className="flex-shrink-0 mt-0.5">{statusBanner.icon}</div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{statusBanner.title}</p>
              <p className="text-sm text-slate-600 mt-0.5">{statusBanner.body}</p>
            </div>
          </div>
        )}

        {/* Version indicator */}
        {(estimate.version || 1) > 1 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 print:hidden">
            <Clock className="w-3.5 h-3.5" />
            <span>This is version <strong>{estimate.version}</strong> of this estimate.</span>
          </div>
        )}

        {/* Main document card */}
        <div className="bg-slate-200 flex-1 overflow-auto p-8 flex justify-center">
          <div className="w-full max-w-4xl shadow-xl rounded-sm bg-white">

            {estimate?.document_type === 'BID' ? (
              <BidDocumentRenderer
                estimate={estimate}
                options={{
                  ...DEFAULT_OPTIONS,
                  ...(estimate?.document_config?.options || {}),
                  hideInternalNotes: true,
                }}
              />
            ) : (
              <EstimateTemplateRenderer
                estimate={estimate}
                template={estimate?.document_config?.template || 'clean'}
                options={{
                  ...DEFAULT_OPTIONS,
                  ...(estimate?.document_config?.options || {}),
                  hideInternalNotes: true,
                }}
                documentType="estimate"
              />
            )}

          </div>
        </div>

        {/* CTA */}
        {canAct && (
            <div className="px-8 py-7 bg-slate-50 print:hidden">
              <p className="text-sm text-slate-500 mb-5 text-center">Please review this estimate and choose an action below.</p>
              <div className="flex flex-col gap-3">
                {/* Primary: Sign */}
                <Button
                  onClick={() => setShowSignPad(true)}
                  disabled={acting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 gap-2 text-sm font-semibold"
                >
                  <PenLine className="w-4 h-4" />Sign &amp; Accept Estimate
                </Button>

                {/* Secondary: approve without sig */}
                <Button
                  onClick={handleApprove}
                  disabled={acting}
                  variant="outline"
                  className="w-full border-green-300 text-green-700 hover:bg-green-50 rounded-xl h-10 gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />Approve without Signature
                </Button>

                {/* Request changes */}
                <Button
                  onClick={() => setShowChanges(true)}
                  disabled={acting}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl h-10 gap-2 text-sm"
                >
                  <MessageSquare className="w-4 h-4" />Request Changes
                </Button>

                {/* Decline */}
                <Button
                  onClick={handleDecline}
                  disabled={acting}
                  variant="ghost"
                  className="w-full text-red-500 hover:bg-red-50 rounded-xl h-9 gap-2 text-sm"
                >
                  <XCircle className="w-4 h-4" />Decline
                </Button>
              </div>
            </div>
          )}

        <p className="text-center text-[10px] text-slate-400 pb-6 print:hidden">
          This estimate was issued by {appConfig.appName}. Questions? Contact us at {appConfig.company.email}
        </p>
      </div>

      {/* Modals */}
      {showSignPad && (
        <ClientSignaturePad
          onSign={handleSign}
          onCancel={() => setShowSignPad(false)}
        />
      )}
      {showChanges && (
        <ClientChangesRequest
          onSubmit={handleChangesRequest}
          onCancel={() => setShowChanges(false)}
        />
      )}
    </div>
  );
}