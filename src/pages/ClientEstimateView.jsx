import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, Loader2, Printer, Download,
  Clock, Eye, AlertTriangle, FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';
import { logComm } from '@/lib/commTracking';

import FinalDocumentRenderer from '@/components/documents/FinalDocumentRenderer';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import { downloadEstimate } from '@/lib/estimatePrint';
import ClientAttachmentsSection from '@/components/estimates/ClientAttachmentsSection';
import { generateSignedPdfUrl, generateSignedAttachmentUrls } from '@/lib/estimateDocumentAccess';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import {
  notifyEstimateViewed,
} from '@/lib/businessNotifications';
import {
  markEstimateViewed,
} from '@/lib/estimateSalesLifecycle';

function SignatureBrandCredit({ logoUrl }) {
  if (!logoUrl) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Signature Credits</p>
      <div className="mt-3 flex items-center justify-center">
        <img src={logoUrl} alt="Signature brand" className="max-h-10 w-auto object-contain" />
      </div>
      <p className="mt-3 text-xs text-slate-500">This mark appears at the end of the shared signing document and inside the secure signing experience.</p>
    </div>
  );
}

export default function ClientEstimateView() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signedAttachments, setSignedAttachments] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await base44.functions.invoke('resolveEstimatePublicToken', { token });
        if (res.data?.estimate) {
          const est = res.data.estimate;
          setEstimate(est);

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

  const isFinal = ['approved', 'declined', 'converted', 'signed'].includes(estimate.status);
  const canAct = !isFinal;
  const nexArtSignUrl = estimate.signing_package_token ? `${window.location.origin}/sign-document?token=${estimate.signing_package_token}` : '';
  const hasNexArtSign = Boolean(nexArtSignUrl) && !['signed', 'declined', 'expired', 'voided'].includes(estimate.signing_package_status);

  const dc = getDocTypeConfig(estimate?.document_type);
  const docLabel = dc.label;

  const statusBanner = {
    signed: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: `${docLabel} Signed`,
      body: estimate.final_signed_pdf_url ? `Signed by ${estimate.signature_name}. Final signed PDF is locked.` : `Signed by ${estimate.signature_name}.`,
    },
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
    declined: { bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" />, title: `${docLabel} Declined`, body: 'This document was declined.' },
    viewed: { bg: 'bg-blue-50 border-blue-200', icon: <Eye className="w-5 h-5 text-blue-500" />, title: `${docLabel} Viewed`, body: 'Please review below and continue to secure signing when ready.' },
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
              <p className="text-sm text-emerald-700 mt-1">Review is complete. Continue to NexArtSign for the official approval, signature, audit trail, and final locked PDF.</p>
            </div>
          </div>
          <Button onClick={() => { window.location.href = nexArtSignUrl; }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 gap-2 text-sm font-semibold">
            <FileSignature className="w-4 h-4" />Review & Sign with NexArtSign
          </Button>
          <p className="text-[11px] text-emerald-700/80 mt-3 text-center">Approval now happens only inside the secure signing flow.</p>
        </div>
      )}

      {canAct && !hasNexArtSign && (
        <div className="px-8 py-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-sm font-semibold text-amber-900">Secure signing link not ready</p>
          <p className="text-xs text-amber-700 mt-2">This estimate was shared without an active NexArtSign package. Please contact the office to resend it through the secure signing flow.</p>
        </div>
      )}

      <SignatureBrandCredit logoUrl={estimate.signature_brand_logo_url} />

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