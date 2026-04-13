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
import FinalDocumentRenderer from '@/components/documents/FinalDocumentRenderer';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import ClientAttachmentsSection from '@/components/estimates/ClientAttachmentsSection';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import {
  notifyEstimateViewed,
  notifyEstimateApproved,
  notifyEstimateSigned,
  notifyEstimateDeclined,
  notifyEstimateChangesRequested,
} from '@/lib/businessNotifications';
import {
  markEstimateViewed,
  approveEstimate,
  signEstimate,
  declineEstimate,
  requestEstimateChanges,
} from '@/lib/estimateSalesLifecycle';

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
      try {
        const list = await base44.entities.Estimate.filter({ id: estimateId });
        if (list.length) {
          const est = list[0];
          setEstimate(est);
          // Mark as viewed — lifecycle handles view_count, timestamps, stage
          if (est.status === 'sent' || est.status === 'viewed') {
            try {
              const updates = await markEstimateViewed(estimateId, est);
              setEstimate(e => ({ ...e, ...updates }));
            } catch (viewErr) {
              console.warn('[ClientEstimateView] markEstimateViewed failed:', viewErr?.message);
            }
            // Log internal comm event (only on first view transition)
            if (est.status === 'sent') {
              logComm({
                event_type: 'estimate_viewed',
                channel: 'system',
                client_id: est.client_id || '',
                client_name: est.client_name,
                client_email: est.client_email || '',
                estimate_id: est.id,
                subject: `Estimate #${est.estimate_number} Viewed by Client`,
                status: 'delivered',
              }).catch(() => {});
              notifyEstimateViewed(est).catch(err => console.warn('[notify] viewed failed:', err?.message));
            }
          }
        }
      } catch (err) {
        console.warn('[ClientEstimateView] load failed:', err?.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [estimateId]);

  const handleApprove = async () => {
    setActing(true);
    try {
      const updates = await approveEstimate(estimateId, { approvedBy: estimate.client_name, estimate });
      setEstimate(e => ({ ...e, ...updates }));
      notifyEstimateApproved(estimate).catch(err => console.warn('[notify] approved failed:', err?.message));
      toast.success('Estimate approved! We will be in touch soon.');
    } catch (err) {
      console.warn('[handleApprove] failed:', err?.message);
      toast.error('Could not approve. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    setActing(true);
    try {
      const updates = await declineEstimate(estimateId);
      setEstimate(e => ({ ...e, ...updates }));
      notifyEstimateDeclined(estimate).catch(err => console.warn('[notify] declined failed:', err?.message));
      toast.success('Estimate declined. Thank you for letting us know.');
    } catch (err) {
      console.warn('[handleDecline] failed:', err?.message);
      toast.error('Could not decline. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const handleSign = async ({ base64, signerName, signerEmail }) => {
    setShowSignPad(false);
    setActing(true);
    try {
      const updates = await signEstimate(estimateId, { signerName, signerEmail, signatureBase64: base64, estimate });
      setEstimate(e => ({ ...e, ...updates }));
      notifyEstimateSigned(estimate, { signerName, signerEmail }).catch(err => console.warn('[notify] signed failed:', err?.message));
      toast.success('Estimate signed successfully!');
    } catch (err) {
      console.warn('[handleSign] failed:', err?.message);
      toast.error('Could not save signature. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const handleChangesRequest = async (note) => {
    setShowChanges(false);
    setActing(true);
    try {
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
      const updates = await requestEstimateChanges(estimateId, { note, currentVersion: estimate.version });
      setEstimate(e => ({ ...e, ...updates }));
      notifyEstimateChangesRequested(estimate, note).catch(err => console.warn('[notify] changes failed:', err?.message));
      toast.success('Change request sent! We\'ll review and send a revised estimate.');
    } catch (err) {
      console.warn('[handleChangesRequest] failed:', err?.message);
      toast.error('Could not send request. Please try again.');
    } finally {
      setActing(false);
    }
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

  const banners = (statusBanner || (estimate.version || 1) > 1) ? (
    <div className="space-y-2 print:hidden">
      {statusBanner && (
        <div className={`flex items-start gap-3 border rounded-xl px-5 py-4 ${statusBanner.bg}`}>
          <div className="flex-shrink-0 mt-0.5">{statusBanner.icon}</div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{statusBanner.title}</p>
            <p className="text-sm text-slate-600 mt-0.5">{statusBanner.body}</p>
          </div>
        </div>
      )}
      {(estimate.version || 1) > 1 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
          <Clock className="w-3.5 h-3.5" />
          <span>This is version <strong>{estimate.version}</strong> of this estimate.</span>
        </div>
      )}
    </div>
  ) : null;

  const footer = (
    <div className="print:hidden space-y-4">
      <ClientAttachmentsSection attachments={estimate.attachments} />
      {canAct && (
        <div className="px-8 py-7 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-sm text-slate-500 mb-5 text-center">Please review this estimate and choose an action below.</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setShowSignPad(true)}
              disabled={acting}
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 gap-2 text-sm font-semibold"
            >
              <PenLine className="w-4 h-4" />Sign &amp; Accept Estimate
            </Button>
            <Button
              onClick={handleApprove}
              disabled={acting}
              variant="outline"
              className="w-full border-green-300 text-green-700 hover:bg-green-50 rounded-xl h-10 gap-2 text-sm"
            >
              <CheckCircle className="w-4 h-4" />Approve without Signature
            </Button>
            <Button
              onClick={() => setShowChanges(true)}
              disabled={acting}
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl h-10 gap-2 text-sm"
            >
              <MessageSquare className="w-4 h-4" />Request Changes
            </Button>
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
      <p className="text-center text-[10px] text-slate-400 py-2">
        This estimate was issued by {appConfig.appName}. Questions? Contact us at {appConfig.company.email}
      </p>
    </div>
  );

  return (
    <>
      <div className="h-screen bg-slate-100 print:bg-white print:h-auto">
        <DocumentViewerShell
          title={`${docLabel} #${estimate.estimate_number}`}
          actions={[
            <Button key="print" size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs print:hidden">
              <Printer className="w-3.5 h-3.5" />Print
            </Button>,
            <Button key="download" size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs print:hidden">
              <Download className="w-3.5 h-3.5" />Download PDF
            </Button>,
          ]}
          banners={banners}
          documentContent={<FinalDocumentRenderer estimate={estimate} />}
          footer={footer}
        />
      </div>

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
    </>
  );
}