import React, { useState } from 'react';
import { Printer, Download, Send, CheckCircle, Link } from 'lucide-react';
import DocumentTypeRenderer from '@/components/documents/DocumentTypeRenderer';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DocumentCloseButton from '@/components/shared/DocumentCloseButton';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { printEstimate, downloadEstimate, generateEstimatePdfBase64 } from '@/lib/estimatePrint';
import { logComm, logCommFailed } from '@/lib/commTracking';
import { logSend, logBelowCostOverride } from '@/lib/estimateAuditLog';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import LossPreventionModal from './internal/LossPreventionModal';
import AttachmentWarningModal from './internal/AttachmentWarningModal';
import { markEstimateSent } from '@/lib/estimateSalesLifecycle';
import { validateEstimatePricing, checkAttachmentCompleteness } from '@/lib/pricingValidation';
import { getDocTypeConfig, validateDocTypeFields } from '@/lib/documentTypeConfig';
import SendReviewSidePanel from './SendReviewSidePanel';
import SendReviewBanners from './SendReviewBanners';
import { Mail } from 'lucide-react';

const DEFAULT_VISIBILITY = {
  businessLogo: true,
  businessName: true,
  businessAddress: true,
  estimateNumber: true,
  estimateName: true,
  estimateMessage: true,
  customerName: true,
  estimateDate: true,
  expirationDate: true,
  serviceDate: true,
  technicianName: true,
  services: true,
  prices: true,
  materialsSection: true,
};

async function logDocument(estimateId, estimate, action, extra = {}) {
  await base44.entities.DocumentLog.create({
    estimate_id: estimateId,
    estimate_number: estimate?.estimate_number,
    client_name: estimate?.client_name || '',
    client_email: estimate?.client_email || '',
    action,
    total_amount: estimate?.total || 0,
    status_at_send: estimate?.status || 'draft',
    ...extra,
  });
}

export default function EstimateSendReview({ estimate, open, onClose, onSent }) {
   const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
   const [currentTemplate, setCurrentTemplate] = useState(estimate?.document_config?.template || 'clean');
   const [recipientEmail, setRecipientEmail] = useState(estimate?.client_email || '');
   const [subject, setSubject] = useState(`Estimate #${estimate?.estimate_number} from ${appConfig.appName}`);
   const [message, setMessage] = useState(
     `Hi ${estimate?.client_name?.split(' ')[0] || 'there'},\n\nPlease review your estimate and click the link below to approve or decline.\n\nThank you!`
   );
   const [sending, setSending] = useState(false);
   const [sentSuccess, setSentSuccess] = useState(false);
   const [sentError, setSentError] = useState(null);
   const [confirmOpen, setConfirmOpen] = useState(false);
   const [lossModalOpen, setLossModalOpen] = useState(false);
   const [lossValidation, setLossValidation] = useState({ lossItems: [], zeroProfitItems: [], materialsWithoutCost: [] });
   const [attachWarningOpen, setAttachWarningOpen] = useState(false);
    const [attachWarningReasons, setAttachWarningReasons] = useState([]);
    const [includedAttachmentIds, setIncludedAttachmentIds] = useState(
      (estimate?.attachments || []).filter(a => a.intent === 'send_to_client').map(a => a.id) || []
    );

  if (!open) return null;

  const clientLink = `${window.location.origin}/client-estimate?id=${estimate?.id}`;

  const currentOptions = {
    showPrices: visibility.prices !== false,
    showBreakdown: visibility.services !== false,
    showBusinessLogo: visibility.businessLogo !== false,
    showBusinessName: visibility.businessName !== false,
    showBusinessAddress: visibility.businessAddress !== false,
    showEstimateNumber: visibility.estimateNumber !== false,
    showEstimateName: visibility.estimateName !== false,
    showNotes: visibility.estimateMessage !== false,
    showMaterials: visibility.materialsSection !== false,
    showCustomerName: visibility.customerName !== false,
    showDocumentDate: visibility.estimateDate !== false,
    showExpirationDate: visibility.expirationDate !== false,
    showProjectStartDate: visibility.serviceDate !== false,
    showProjectEndDate: visibility.serviceDate !== false,
    showTechnicianName: visibility.technicianName !== false,
    showTerms: true,
    showSignatures: true,
    hideInternalNotes: true,
  };

  const handlePrint = () => {
    printEstimate(estimate, currentOptions, currentTemplate);
    logDocument(estimate.id, estimate, 'printed');
  };

  const handleDownload = () => {
    downloadEstimate(estimate, currentOptions, currentTemplate);
    logDocument(estimate.id, estimate, 'downloaded');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientLink);
    toast.success('Secure link copied!');
    logDocument(estimate.id, estimate, 'sent_link', { secure_link: clientLink });
  };

  const docConfig = estimate?.document_type === 'BID' ? getDocTypeConfig('BID') : getDocTypeConfig('ESTIMATE');

  // --- Loss prevention / pricing validation handlers ---

  const handleProceedAfterPricingWarning = async () => {
    setLossModalOpen(false);
    const lossItems = Array.isArray(lossValidation?.lossItems) ? lossValidation.lossItems : [];
    if (lossItems.length > 0) {
      const totalLoss = lossItems.reduce(
        (sum, item) => sum + ((Number(item.loss_per_unit) || 0) * (Number(item.quantity) || 0)),
        0
      );
      const currentUser = await base44.auth.me().catch(() => null);
      if (currentUser) {
        await logBelowCostOverride({
          estimate_id: estimate.id,
          estimate_number: estimate.estimate_number,
          user: currentUser,
          totalLoss,
          lossItemsCount: lossItems.length,
          metadata: {
            client_email: recipientEmail,
            client_name: estimate?.client_name || '',
          },
        }).catch(err => console.warn('[audit] below-cost override log failed:', err?.message));
      }
    }
    setConfirmOpen(true);
  };

  const proceedToPricingValidation = () => {
    const pv = validateEstimatePricing(estimate);
    if (!pv.canProceed || pv.requiresConfirmation) {
      setLossValidation(pv);
      setLossModalOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSend = () => {
    if (!recipientEmail) { toast.error('Recipient email is required'); return; }
    const dtv = validateDocTypeFields(estimate);
    if (!dtv.valid) {
      dtv.errors.forEach(e => toast.error(e));
      return;
    }
    const ac = checkAttachmentCompleteness(estimate);
    if (ac.needsWarning) {
      setAttachWarningReasons(ac.reasons);
      setAttachWarningOpen(true);
      return;
    }
    proceedToPricingValidation();
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    if (!recipientEmail) { toast.error('Recipient email is required'); return; }
    setSending(true);
    setSentError(null);
    try {
      const documentConfig = { template: currentTemplate, options: currentOptions };
      const clientAttachments = Array.isArray(estimate?.attachments)
        ? estimate.attachments.filter(a => a.intent === 'send_to_client' && includedAttachmentIds.includes(a.id))
        : [];

      // Generate Estimate PDF as base64 for email attachment
      const { filename: estimatePdfFilename, base64: estimatePdfBase64 } = await generateEstimatePdfBase64(
        estimate,
        currentOptions,
        currentTemplate
      );

      // Smart delivery: calculate total payload size to decide attachment strategy
      const MAX_PAYLOAD_SIZE = 25 * 1024 * 1024; // 25MB limit for most email providers
      const estimatePdfSize = (estimatePdfBase64.length * 3) / 4; // base64 to bytes approximation
      const extraAttachmentsSize = clientAttachments.reduce((sum, a) => sum + (a.file_size || 0), 0);
      const totalSize = estimatePdfSize + extraAttachmentsSize;
      
      // Build attachment objects: Estimate PDF + client attachments (with smart fallback)
      const emailAttachments = [
        {
          filename: estimatePdfFilename,
          content: estimatePdfBase64,
          contentType: 'application/pdf',
        },
      ];
      
      // Add client attachments: inline if under limit, else as URL references
      if (totalSize < MAX_PAYLOAD_SIZE) {
        // All fits: send as actual attachments
        emailAttachments.push(...clientAttachments.map(a => ({
          filename: a.file_name,
          url: a.file_url,
        })));
      } else {
        // Over limit: send only URLs (fallback to download links)
        emailAttachments.push(...clientAttachments.map(a => ({
          filename: a.file_name,
          url: a.file_url,
          fallback_link: true, // Signal backend to treat as link, not inline attachment
        })));
      }

      const emailRes = await base44.functions.invoke('sendEstimateEmail', {
        to: recipientEmail,
        subject,
        message,
        client_link: clientLink,
        client_name: estimate?.client_name || '',
        estimate_number: estimate?.estimate_number || '',
        total: estimate?.total || 0,
        from_name: appConfig.appName || 'RC Art Construction',
        estimate_pdf_filename: estimatePdfFilename,
        attachments: emailAttachments,
      });
      if (emailRes.data?.error) throw new Error(emailRes.data.error);

      await markEstimateSent(estimate.id, { documentConfig });

      await logDocument(estimate.id, estimate, 'sent_email', { recipient_email: recipientEmail, subject, secure_link: clientLink });
      const currentUser = await base44.auth.me().catch(() => null);
      if (currentUser) {
        await logSend({
          estimate_id: estimate.id,
          estimate_number: estimate.estimate_number,
          user: currentUser,
          client_email: recipientEmail,
        }).catch(err => console.warn('[audit] send log failed:', err?.message));
      }
      await logComm({
        event_type: 'estimate_sent',
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: recipientEmail,
        estimate_id: estimate.id,
        appointment_id: estimate.appointment_id || '',
        subject,
        preview: `Total: $${(estimate.total || 0).toFixed(2)}`,
      });

      setSentSuccess(true);
      toast.success('Estimate sent successfully!');
    } catch (error) {
      await logCommFailed({
        event_type: 'estimate_sent',
        client_name: estimate.client_name,
        client_email: recipientEmail,
        estimate_id: estimate.id,
        subject,
      }).catch(() => {});
      const errMsg = error?.message || 'Failed to send email';
      setSentError(errMsg);
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  // --- Shell props ---

  const titleContent = (
    <div className="flex items-center gap-3">
      <div>
        <p className="text-sm font-bold text-slate-800">Review &amp; Send</p>
        <p className="text-xs text-slate-400">{docConfig.label} #{estimate?.estimate_number} · {estimate?.client_name}</p>
      </div>
    </div>
  );

  const toolbarActions = [
    <Button key="print" size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
      <Printer className="w-3.5 h-3.5" /> Print
    </Button>,
    <Button key="pdf" size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
      <Download className="w-3.5 h-3.5" /> PDF
    </Button>,
    <Button key="link" size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5">
      <Link className="w-3.5 h-3.5" /> Copy Link
    </Button>,
    <Button
      key="send"
      size="sm"
      className={`text-white gap-1.5 ${sentSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`}
      onClick={sentSuccess ? undefined : handleConfirmSend}
      disabled={sending || sentSuccess}
    >
      {sentSuccess ? (
        <><CheckCircle className="w-3.5 h-3.5" /> Sent</>
      ) : (
        <><Send className="w-3.5 h-3.5" /> {sending ? 'Sending...' : 'Confirm & Send'}</>
      )}
    </Button>,
  ];

  const banners = (
    <SendReviewBanners
      sentSuccess={sentSuccess}
      sentError={sentError}
      recipientEmail={recipientEmail}
      clientLink={clientLink}
      docLabel={docConfig.label}
    />
  );

  const handleAttachmentsDelete = async (updatedAttachments) => {
    // Persist deletion to estimate record
    try {
      await base44.entities.Estimate.update(estimate.id, { attachments: updatedAttachments });
      // Update local state to reflect deletion
      onClose(); // Close and reopen to refresh, or notify parent to update
      toast.success('Attachment removed');
    } catch (err) {
      toast.error('Failed to remove attachment');
    }
  };

  const sidePanel = (
    <SendReviewSidePanel
      currentTemplate={currentTemplate}
      onTemplateChange={setCurrentTemplate}
      recipientEmail={recipientEmail}
      onRecipientEmailChange={setRecipientEmail}
      subject={subject}
      onSubjectChange={setSubject}
      message={message}
      onMessageChange={setMessage}
      visibility={visibility}
      onVisibilityChange={setVisibility}
      attachments={estimate?.attachments}
      estimateNumber={estimate?.estimate_number}
      estimate={estimate}
      includedAttachmentIds={includedAttachmentIds}
      onIncludedAttachmentsChange={setIncludedAttachmentIds}
      onAttachmentsChange={handleAttachmentsDelete}
    />
  );

  const documentContent = (
    <div className="shadow-xl rounded-sm bg-white">
      <DocumentTypeRenderer
        estimate={estimate}
        template={currentTemplate}
        options={currentOptions}
      />
    </div>
  );

  return (
    <>
      <DocumentViewerShell
        variant="fullscreen"
        title={titleContent}
        actions={toolbarActions}
        onClose={onClose}
        banners={banners}
        sidePanel={sidePanel}
        documentContent={documentContent}
      />

      {/* Modals — rendered outside shell to ensure proper z-index layering */}
      <AttachmentWarningModal
        open={attachWarningOpen}
        onClose={() => setAttachWarningOpen(false)}
        onSendWithout={() => { setAttachWarningOpen(false); proceedToPricingValidation(); }}
        reasons={attachWarningReasons}
      />

      <LossPreventionModal
        open={lossModalOpen}
        onClose={() => setLossModalOpen(false)}
        onProceed={handleProceedAfterPricingWarning}
        lossItems={lossValidation.lossItems}
        zeroProfitItems={lossValidation.zeroProfitItems}
        materialsWithoutCost={lossValidation.materialsWithoutCost}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />Confirm & Send {docConfig.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-600">
              You're about to send <span className="font-semibold text-slate-800">{docConfig.label} #{estimate?.estimate_number}</span> to:
            </p>
            <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-slate-800">{recipientEmail}</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Client</span>
                <span className="font-medium text-slate-700">{estimate?.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-medium text-slate-700">${(estimate?.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Status after send</span>
                <span className="font-medium text-primary">Sent</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              The client will receive a link to view, approve, or decline the {docConfig.label.toLowerCase()}.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={handleSend}>
              <Send className="w-3.5 h-3.5" /> Send Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}