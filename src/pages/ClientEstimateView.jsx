import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, Loader2, Printer, Download,
  Clock, Eye, AlertTriangle, FileSignature
} from 'lucide-react';
import { toast } from 'sonner';
import { logComm } from '@/lib/commTracking';

import FinalDocumentRenderer from '@/components/documents/FinalDocumentRenderer';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import { downloadEstimate, generateEstimatePdfBase64 } from '@/lib/estimatePrint';
import ClientAttachmentsSection from '@/components/estimates/ClientAttachmentsSection';
import { generateSignedPdfUrl, generateSignedAttachmentUrls } from '@/lib/estimateDocumentAccess';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { convertApprovedEstimateToWorkOrder } from '@/lib/estimateToWorkOrder';
import {
  notifyEstimateViewed,
  notifyEstimateApproved,
  notifyEstimateDeclined,
} from '@/lib/businessNotifications';
import {
  markEstimateViewed,
  approveEstimate,
  declineEstimate,
} from '@/lib/estimateSalesLifecycle';

function base64ToPdfBlob(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

async function sha256HexFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function collectLegalAudit() {
  return {
    user_agent: navigator.userAgent || '',
    language: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    screen: `${window.innerWidth}x${window.innerHeight}`,
    page_url: window.location.href,
  };
}

function buildSignatureCertificate({ estimate, signedAt, pdfHash, finalPdfUrl, finalPdfName, legalAudit }) {
  return {
    certificate_type: 'electronic_signature_certificate',
    generated_at: new Date().toISOString(),
    document_id: estimate.id,
    document_type: estimate.document_type || 'ESTIMATE',
    estimate_number: estimate.estimate_number,
    signer_name: estimate.signature_name || estimate.accepted_by || '',
    signer_email: estimate.client_email || '',
    signer_client_name: estimate.client_name || '',
    signed_at: signedAt || estimate.signed_at || '',
    terms_accepted: estimate.terms_accepted === true,
    signature_method: estimate.signature_method || 'typed_name',
    document_total: estimate.total || 0,
    final_signed_pdf_url: finalPdfUrl || '',
    final_signed_pdf_name: finalPdfName || '',
    document_hash_algorithm: 'SHA-256',
    document_hash: pdfHash || '',
    signed_pdf_hash_algorithm: 'SHA-256',
    signed_pdf_hash: pdfHash || '',
    audit: legalAudit || estimate.legal_audit || {},
    integrity_statement: 'This certificate records the SHA-256 hash of the frozen signed PDF generated at approval time. Any PDF modification after signing will produce a different hash.',
  };
}

async function sendFinalSignedCopyEmail(estimate) {
  if (!estimate?.client_email || !estimate?.final_signed_pdf_url) return;
  const signedUrl = await generateSignedPdfUrl(estimate.final_signed_pdf_url).catch(() => estimate.final_signed_pdf_url);
  const body = [
    `Hi ${estimate.client_name || ''},`,
    '',
    `Thank you for approving Estimate #${estimate.estimate_number}.`,
    '',
    'Your signed estimate has been saved and locked.',
    estimate.signed_pdf_hash ? `Document Hash (SHA-256): ${estimate.signed_pdf_hash}` : '',
    '',
    signedUrl ? `Signed document: ${signedUrl}` : '',
    '',
    `— ${appConfig.company.name}`,
  ].filter(Boolean).join('\n');

  await base44.integrations.Core.SendEmail({
    to: estimate.client_email,
    subject: `Signed Estimate #${estimate.estimate_number}`,
    body,
    from_name: appConfig.appName,
  });
}

export default function ClientEstimateView() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [signedAttachments, setSignedAttachments] = useState([]);
  const [signatureName, setSignatureName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await base44.functions.invoke('resolveEstimatePublicToken', { token });
        if (res.data?.estimate) {
          const est = res.data.estimate;
          setEstimate(est);
          setSignatureName(est.client_name || '');

          if (est.status === 'sent' || est.status === 'viewed') {
            try {
              const updates = await markEstimateViewed(est.id, est);
              setEstimate(e => ({ ...e, ...updates }));
            } catch (viewErr) {
              console.warn('[ClientEstimateView] markEstimateViewed failed:', viewErr?.message);
            }

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

          if (est.attachments && est.attachments.length > 0) {
            generateSignedAttachmentUrls(est.attachments)
              .then(setSignedAttachments)
              .catch(() => setSignedAttachments(est.attachments));
          }
        }
      } catch (err) {
        console.warn('[ClientEstimateView] load failed:', err?.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const captureServerAudit = async () => {
    try {
      const res = await base44.functions.invoke('captureEstimateSignatureAudit', {
        token,
        estimate_id: estimate.id,
      });
      return res.data?.audit || {};
    } catch (err) {
      console.warn('[captureServerAudit] failed:', err?.message);
      return {};
    }
  };

  const freezeSignedPdf = async (signedEstimate, legalAudit) => {
    try {
      const pdf = await generateEstimatePdfBase64(
        signedEstimate,
        signedEstimate?.document_config?.options,
        signedEstimate?.document_config?.template
      );

      const pdfHash = await sha256HexFromBase64(pdf.base64);
      const blob = base64ToPdfBlob(pdf.base64);
      const uploadRes = await base44.integrations.Core.UploadFile({ file: blob });
      const finalSignedAt = new Date().toISOString();
      const finalSignedPdfUrl = uploadRes?.file_url || '';
      const finalSignedPdfName = pdf.filename || `Signed-Estimate-${signedEstimate.estimate_number}.pdf`;
      const signatureCertificate = buildSignatureCertificate({
        estimate: signedEstimate,
        signedAt: finalSignedAt,
        pdfHash,
        finalPdfUrl: finalSignedPdfUrl,
        finalPdfName: finalSignedPdfName,
        legalAudit,
      });

      const finalFields = {
        final_signed_pdf_url: finalSignedPdfUrl,
        final_signed_pdf_name: finalSignedPdfName,
        final_signed_at: finalSignedAt,
        legal_package_locked: true,
        document_hash: pdfHash,
        document_hash_algorithm: 'SHA-256',
        signed_pdf_hash: pdfHash,
        signed_pdf_hash_algorithm: 'SHA-256',
        signature_certificate: signatureCertificate,
        certificate_generated_at: signatureCertificate.generated_at,
      };

      await base44.entities.Estimate.update(signedEstimate.id, finalFields);
      return finalFields;
    } catch (err) {
      console.warn('[freezeSignedPdf] failed:', err?.message);
      toast.warning('Estimate was approved, but final signed PDF could not be frozen automatically');
      return null;
    }
  };

  const handleApprove = async () => {
    const cleanSignature = signatureName.trim();

    if (!cleanSignature) {
      toast.error('Please type your full name to approve');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please accept the estimate terms before approving');
      return;
    }

    setActing(true);
    try {
      const clientAudit = collectLegalAudit();
      const serverAudit = await captureServerAudit();
      const legalAudit = { ...clientAudit, ...serverAudit, audit_version: 'legacy_client_approval_with_ip' };

      const updates = await approveEstimate(estimate.id, {
        approvedBy: cleanSignature,
        signatureName: cleanSignature,
        termsAccepted,
        legalAudit,
        estimate,
      });

      let signedEstimate = { ...estimate, ...updates };
      setEstimate(signedEstimate);

      const finalPdfFields = await freezeSignedPdf(signedEstimate, legalAudit);
      if (finalPdfFields) {
        signedEstimate = { ...signedEstimate, ...finalPdfFields };
        setEstimate(signedEstimate);
        sendFinalSignedCopyEmail(signedEstimate).catch(err => console.warn('[sendFinalSignedCopyEmail] failed:', err?.message));
      }

      try {
        const conversion = await convertApprovedEstimateToWorkOrder(signedEstimate, { actor: 'client_approval' });
        signedEstimate = { ...signedEstimate, status: 'converted', sales_stage: 'converted', converted_work_order_id: conversion?.workOrder?.id };
        setEstimate(signedEstimate);
      } catch (conversionErr) {
        console.warn('[convertApprovedEstimateToWorkOrder] failed:', conversionErr?.message);
        toast.warning('Estimate was signed, but the work order could not be created automatically');
      }

      notifyEstimateApproved(signedEstimate).catch(err => console.warn('[notify] approved failed:', err?.message));
      toast.success('Estimate approved, signed, locked, and converted to a work order.');
    } catch (err) {
      console.warn('[handleApprove] failed:', err?.message);
      toast.error('Could not approve. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    const cleanReason = declineReason.trim();
    if (!cleanReason) {
      toast.error('Please tell us why you are declining this estimate');
      return;
    }

    setActing(true);
    try {
      const updates = await declineEstimate(estimate.id, { declinedReason: cleanReason });
      const declinedEstimate = { ...estimate, ...updates, declined_reason: cleanReason };
      setEstimate(declinedEstimate);
      notifyEstimateDeclined(declinedEstimate).catch(err => console.warn('[notify] declined failed:', err?.message));
      toast.success('Estimate declined. Thank you for letting us know.');
    } catch (err) {
      console.warn('[handleDecline] failed:', err?.message);
      toast.error('Could not decline. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    const preferredPdfUrl = estimate.final_signed_pdf_url || estimate.pdf_file_url;
    const preferredPdfName = estimate.final_signed_pdf_name || estimate.pdf_file_name || `estimate-${estimate.estimate_number}.pdf`;

    if (preferredPdfUrl) {
      try {
        const signedUrl = await generateSignedPdfUrl(preferredPdfUrl);
        if (signedUrl) {
          const link = document.createElement('a');
          link.href = signedUrl;
          link.download = preferredPdfName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(estimate.final_signed_pdf_url ? 'Signed PDF downloaded' : 'PDF downloaded');
          return;
        }
      } catch (err) {
        console.warn('[handleDownload] signed URL generation failed:', err?.message);
      }
    }
    await downloadEstimate(estimate);
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

  const isFinal = ['approved', 'declined', 'converted'].includes(estimate.status);
  const canAct = !isFinal;
  const nexArtSignUrl = estimate.signing_package_token ? `${window.location.origin}/sign-document?token=${estimate.signing_package_token}` : '';
  const hasNexArtSign = Boolean(nexArtSignUrl) && !['signed', 'declined', 'expired', 'voided'].includes(estimate.signing_package_status);

  const dc = getDocTypeConfig(estimate?.document_type);
  const docLabel = dc.label;

  const statusBanner = {
    approved: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: `${docLabel} Approved`,
      body: estimate.final_signed_pdf_url ? `Signed by ${estimate.signature_name}. Final signed PDF is locked.` : estimate.signature_name ? `Signed by ${estimate.signature_name}. We will be in touch soon to schedule the work.` : "Thank you! We'll be in touch soon to schedule the work.",
    },
    converted: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: `${docLabel} Approved & Converted`,
      body: estimate.converted_work_order_id ? `Signed by ${estimate.signature_name}. Your approved estimate has been converted into a work order.` : `Signed by ${estimate.signature_name}. Your approved estimate is ready for scheduling.`,
    },
    declined: { bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" />, title: `${docLabel} Declined`, body: 'We appreciate your feedback. Contact us if you change your mind.' },
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
            {estimate.signed_pdf_hash && <p className="text-[11px] text-slate-500 mt-2 break-all">SHA-256: {estimate.signed_pdf_hash}</p>}
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
      <ClientAttachmentsSection
        attachments={signedAttachments.length > 0 ? signedAttachments : estimate.attachments}
        estimateId={estimate.id}
        token={token}
        useSignedUrl={true}
      />

      {canAct && hasNexArtSign && (
        <div className="px-8 py-7 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <FileSignature className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Ready for secure approval</p>
              <p className="text-sm text-emerald-700 mt-1">Continue to NexArtSign to approve this document with audit trail and certificate tracking.</p>
            </div>
          </div>
          <Button onClick={() => { window.location.href = nexArtSignUrl; }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 gap-2 text-sm font-semibold">
            <FileSignature className="w-4 h-4" />Review & Sign with NexArtSign
          </Button>
          <p className="text-[11px] text-emerald-700/80 mt-3 text-center">Use this option for the official signing flow.</p>
        </div>
      )}

      {canAct && (
        <div className="px-8 py-7 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-sm text-slate-500 mb-5 text-center">Backup approval option.</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Signature</label>
              <input
                type="text"
                placeholder="Type your full name"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                disabled={acting}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
              />
              <p className="text-[11px] text-slate-400">Typing your name confirms you are approving this estimate.</p>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-3">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} disabled={acting} className="mt-0.5" />
              <span>I have reviewed the estimate, included documents, pricing, scope, and terms, and I approve this work.</span>
            </label>

            <Button onClick={handleApprove} disabled={acting || !signatureName.trim() || !termsAccepted} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 gap-2 text-sm font-semibold disabled:opacity-50">
              <CheckCircle className="w-4 h-4" />Approve Without NexArtSign
            </Button>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <textarea placeholder="Tell us why you're declining (required)" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} disabled={acting} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:outline-none" rows="2" />
              <Button onClick={handleDecline} disabled={acting || !declineReason.trim()} variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 rounded-xl h-10 gap-2 text-sm disabled:opacity-50">
                <XCircle className="w-4 h-4" />Decline
              </Button>
            </div>
          </div>
        </div>
      )}
      <p className="text-center text-[10px] text-slate-400 py-2">This estimate was issued by {appConfig.appName}. Questions? Contact us at {appConfig.company.email}</p>
    </div>
  );

  return (
    <div className="h-screen bg-slate-100 print:bg-white print:h-auto">
      <DocumentViewerShell
        title={`${docLabel} #${estimate.estimate_number}`}
        actions={[
          <Button key="print" size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs print:hidden"><Printer className="w-3.5 h-3.5" />Print</Button>,
          <Button key="download" size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs print:hidden"><Download className="w-3.5 h-3.5" />{estimate.final_signed_pdf_url ? 'Download Signed PDF' : 'Download PDF'}</Button>,
        ]}
        banners={banners}
        documentContent={<FinalDocumentRenderer estimate={estimate} options={estimate?.document_config?.options} template={estimate?.document_config?.template} />}
        footer={footer}
      />
    </div>
  );
}
