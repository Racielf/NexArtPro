import React, { useState, useEffect } from 'react';
import { Printer, Download, Send, CheckCircle, Link, Mail, BrainCircuit, AlertTriangle } from 'lucide-react';
import DocumentTypeRenderer from '@/components/documents/DocumentTypeRenderer';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { printEstimate, downloadEstimate } from '@/lib/estimatePrint';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import LossPreventionModal from './internal/LossPreventionModal';
import AttachmentWarningModal from './internal/AttachmentWarningModal';
import { validateEstimatePricing } from '@/lib/pricingValidation';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';
import { validateBeforeSend, executeSend, logPricingOverride, logSendFailure } from '@/lib/estimateSendOrchestrator';
import { generatePublicShareToken } from '@/lib/estimateSalesLifecycle';
import SendReviewSidePanel from './SendReviewSidePanel';
import SendReviewBanners from './SendReviewBanners';
import { loadPriceBook, loadServices } from '@/lib/servicePersistence';
import estimateCatalogPricingBrain from '@/brain/modules/estimateCatalogPricingBrain';

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

function visibilityFromDocumentOptions(options = {}) {
  return {
    businessLogo: options.showBusinessLogo !== false,
    businessName: options.showBusinessName !== false,
    businessAddress: options.showBusinessAddress !== false,
    estimateNumber: options.showEstimateNumber !== false,
    estimateName: options.showEstimateName !== false,
    estimateMessage: options.showNotes !== false,
    customerName: options.showCustomerName !== false,
    estimateDate: options.showDocumentDate !== false,
    expirationDate: options.showExpirationDate !== false,
    serviceDate: options.showProjectStartDate !== false && options.showProjectEndDate !== false && options.showProjectDates !== false,
    technicianName: options.showTechnicianName !== false,
    services: options.showBreakdown !== false,
    prices: options.showPrices !== false,
    materialsSection: options.showMaterials !== false,
  };
}

function documentOptionsFromVisibility(visibility = DEFAULT_VISIBILITY, existingOptions = {}) {
  return {
    ...existingOptions,
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
    showProjectDates: visibility.serviceDate !== false,
    showTechnicianName: visibility.technicianName !== false,
    showTerms: existingOptions.showTerms !== false,
    showSignatures: existingOptions.showSignatures !== false,
    hideInternalNotes: true,
  };
}

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

function buildDefaultClientMessage(estimate) {
  const firstName = estimate?.client_name?.split(' ')[0] || 'there';
  return `Hi ${firstName},\n\nWe prepared a detailed estimate for your project. Please review the full scope of work, included services, labor, materials, notes, and project details before making a decision.\n\nThank you!`;
}

export default function EstimateSendReview({ estimate, open, onClose, onSent, onFixAllPricing }) {
  const [visibility, setVisibility] = useState(() => visibilityFromDocumentOptions(estimate?.document_config?.options));
  const [currentTemplate, setCurrentTemplate] = useState(estimate?.document_config?.template || 'clean');
  const [recipientEmail, setRecipientEmail] = useState(estimate?.client_email || '');
  const [subject, setSubject] = useState(`Estimate #${estimate?.estimate_number} from ${appConfig.company.name}`);
  const [message, setMessage] = useState(() => buildDefaultClientMessage(estimate));
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
  const [publicToken, setPublicToken] = useState(null);
  const [moneyBrainResult, setMoneyBrainResult] = useState(null);
  const [moneyBrainChecking, setMoneyBrainChecking] = useState(false);

  useEffect(() => {
    if (!open || !estimate?.id) return;
    setVisibility(visibilityFromDocumentOptions(estimate?.document_config?.options));
    setCurrentTemplate(estimate?.document_config?.template || 'clean');
    setRecipientEmail(estimate?.client_email || '');
    setSubject(`Estimate #${estimate?.estimate_number} from ${appConfig.company.name}`);
    setMessage(buildDefaultClientMessage(estimate));
    setIncludedAttachmentIds((estimate?.attachments || []).filter(a => a.intent === 'send_to_client').map(a => a.id) || []);
  }, [open, estimate?.id]);

  useEffect(() => {
    if (estimate?.id && estimate?.client_email && !publicToken) {
      generatePublicShareToken(estimate).then(setPublicToken);
    }
  }, [estimate?.id, estimate?.client_email, publicToken]);

  if (!open) return null;

  const clientLink = publicToken
    ? `${window.location.origin}/client-estimate?token=${publicToken}`
    : `${window.location.origin}/client-estimate?token=generating`;

  const currentOptions = documentOptionsFromVisibility(visibility, estimate?.document_config?.options || {});

  const persistVisibilityOptions = async (nextVisibility) => {
    setVisibility(nextVisibility);
    if (!estimate?.id) return;

    const updatedOptions = documentOptionsFromVisibility(nextVisibility, estimate?.document_config?.options || {});
    const updatedConfig = {
      ...(estimate.document_config || {}),
      options: updatedOptions,
    };

    try {
      await base44.entities.Estimate.update(estimate.id, {
        document_config: updatedConfig,
        updated_by: 'Admin',
      });
    } catch (err) {
      console.error('[EstimateSendReview] Failed to save visibility options:', err);
      toast.error('Document visibility was changed locally but could not be saved');
    }
  };

  const docConfig = estimate?.document_type === 'BID' ? getDocTypeConfig('BID') : getDocTypeConfig('ESTIMATE');

  const runMoneyBrainBeforeSend = async () => {
    if (!estimate?.groups || estimate.groups.length === 0) return true;

    setMoneyBrainChecking(true);
    try {
      const [priceBookEntries, services] = await Promise.all([
        loadPriceBook().catch(() => []),
        loadServices().catch(() => []),
      ]);

      const result = await estimateCatalogPricingBrain({
        groups: estimate.groups,
        priceBookEntries,
        services,
      });
      setMoneyBrainResult(result);

      const flaggedCount = result?.flaggedItems?.length || 0;
      if (result?.level === 'critical') {
        toast.error(`Money Brain blocked send: ${flaggedCount} pricing issue(s) need review`);
        return false;
      }

      if (result?.level === 'warning') {
        const ok = window.confirm([
          'Money Brain recommends reviewing this estimate before sending.',
          '',
          `Score: ${result.score}`,
          `Issues: ${flaggedCount}`,
          `Reason: ${result.summary}`,
          '',
          'Continue sending anyway?',
        ].join('\n'));

        if (!ok) {
          toast.message('Send cancelled. Review pricing before sending.');
          return false;
        }
      }

      return true;
    } catch (err) {
      console.warn('[Money Brain Send Guard] failed:', err?.message || err);
      return true;
    } finally {
      setMoneyBrainChecking(false);
    }
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

  const handleProceedAfterPricingWarning = async () => {
    setLossModalOpen(false);
    await logPricingOverride(estimate, lossValidation, recipientEmail);
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

  const handleConfirmSend = async () => {
    const moneyOk = await runMoneyBrainBeforeSend();
    if (!moneyOk) return;

    const validation = await validateBeforeSend(estimate, recipientEmail);
    if (!validation.valid) {
      (validation.errors || []).forEach(e => toast.error(e));
      return;
    }
    if (validation.attachmentWarning?.needsWarning) {
      setAttachWarningReasons(validation.attachmentWarning.reasons);
      setAttachWarningOpen(true);
      return;
    }
    if (validation.pricingWarning?.requiresConfirmation) {
      setLossValidation(validation.pricingWarning);
      setLossModalOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setSentError(null);
    try {
      const result = await executeSend({
        estimate,
        recipientEmail,
        subject,
        message,
        currentTemplate,
        currentOptions,
        includedAttachmentIds,
        appConfig,
      });

      await logDocument(estimate.id, estimate, 'sent_email', {
        recipient_email: recipientEmail,
        subject,
        secure_link: result.secureLink,
      });

      setSentSuccess(true);
      toast.success('Estimate sent successfully!');
      onSent?.();
    } catch (error) {
      await logSendFailure(estimate, recipientEmail, subject, error);
      const errMsg = error?.message || 'Failed to send email';
      setSentError(errMsg);
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

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
      disabled={sending || sentSuccess || moneyBrainChecking}
    >
      {sentSuccess ? (
        <><CheckCircle className="w-3.5 h-3.5" /> Sent</>
      ) : moneyBrainChecking ? (
        <><BrainCircuit className="w-3.5 h-3.5" /> Checking...</>
      ) : (
        <><Send className="w-3.5 h-3.5" /> Confirm & Send</>
      )}
    </Button>,
  ];

  const moneyBrainBanner = moneyBrainResult?.level === 'critical' ? (
    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-red-800">Money Brain blocked sending</p>
        <p className="text-xs text-red-700 mt-0.5">{moneyBrainResult.summary}</p>
        <p className="text-xs text-red-600 mt-1">{moneyBrainResult.nextAction}</p>
        {onFixAllPricing && (
          <button onClick={onFixAllPricing} className="mt-2 text-xs font-bold text-red-700 underline">
            Fix pricing automatically
          </button>
        )}
      </div>
    </div>
  ) : null;

  const banners = (
    <>
      {moneyBrainBanner}
      <SendReviewBanners
        sentSuccess={sentSuccess}
        sentError={sentError}
        recipientEmail={recipientEmail}
        clientLink={clientLink}
        docLabel={docConfig.label}
      />
    </>
  );

  const handleAttachmentsDelete = async (updatedAttachments) => {
    try {
      await base44.entities.Estimate.update(estimate.id, { attachments: updatedAttachments });
      onClose();
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
      onVisibilityChange={persistVisibilityOptions}
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
      <DocumentTypeRenderer estimate={estimate} template={currentTemplate} options={currentOptions} />
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
        onFixAllPricing={onFixAllPricing}
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
