import React, { useState } from 'react';
import { Printer, Download, Send, Eye, EyeOff, ChevronDown, ChevronUp, Paperclip, CheckCircle, AlertCircle, Copy, Link, Mail, Lock, FileText } from 'lucide-react';
import { getTemplateOptions } from '@/lib/estimateTemplates';
import DocumentTypeRenderer from '@/components/documents/DocumentTypeRenderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DocumentCloseButton from '@/components/shared/DocumentCloseButton';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { printEstimate, downloadEstimate } from '@/lib/estimatePrint';
import { logComm, logCommFailed } from '@/lib/commTracking';
import { logSend, logBelowCostOverride } from '@/lib/estimateAuditLog';
import EstimateTemplateRenderer from './EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import LossPreventionModal from './internal/LossPreventionModal';
import AttachmentWarningModal from './internal/AttachmentWarningModal';
import { markEstimateSent } from '@/lib/estimateSalesLifecycle';
import { validateEstimatePricing, checkAttachmentCompleteness } from '@/lib/pricingValidation';
import { getDocTypeConfig, validateDocTypeFields } from '@/lib/documentTypeConfig';

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

const VISIBILITY_LABELS = {
  businessLogo: 'Business logo',
  businessName: 'Business name',
  businessAddress: 'Business address',
  estimateNumber: 'Estimate #',
  estimateName: 'Estimate name',
  estimateMessage: 'Estimate summary / message',
  customerName: 'Customer display name',
  estimateDate: 'Estimate date',
  expirationDate: 'Expiration date',
  serviceDate: 'Service date',
  technicianName: 'Technician name',
  services: 'Services',
  prices: 'Prices & totals',
  materialsSection: 'Materials section',
};

function SectionAccordion({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer group">
      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
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

  if (!open) return null;

  const setVis = (key, val) => setVisibility(v => ({ ...v, [key]: val }));

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

  // In Estimate flow, always use Estimate label — only BID overrides
  const docConfig = estimate?.document_type === 'BID' ? getDocTypeConfig('BID') : getDocTypeConfig('ESTIMATE');

  // Handler when user confirms override of below-cost pricing warning
  const handleProceedAfterPricingWarning = async () => {
    setLossModalOpen(false);

    const lossItems = Array.isArray(lossValidation?.lossItems) ? lossValidation.lossItems : [];

    if (lossItems.length > 0) {
      const totalLoss = lossItems.reduce(
        (sum, item) =>
          sum + ((Number(item.loss_per_unit) || 0) * (Number(item.quantity) || 0)),
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

  // Proceeds past attachment check to pricing validation
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
    // Document type validation — BID requires job_number or plan_reference
    const dtv = validateDocTypeFields(estimate);
    if (!dtv.valid) {
      dtv.errors.forEach(e => toast.error(e));
      return;
    }
    // Attachment completeness check — warn if likely needed but missing
    const ac = checkAttachmentCompleteness(estimate);
    if (ac.needsWarning) {
      setAttachWarningReasons(ac.reasons);
      setAttachWarningOpen(true);
      return;
    }
    // Loss prevention gate — block losses, warn zero-profit
    proceedToPricingValidation();
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    if (!recipientEmail) { toast.error('Recipient email is required'); return; }
    setSending(true);
    setSentError(null);
    try {
      // 1. Build payload
      const documentConfig = {
        template: currentTemplate,
        options: currentOptions,
      };
      const clientAttachments = Array.isArray(estimate?.attachments)
        ? estimate.attachments.filter(a => a.intent === 'send_to_client')
        : [];
      let attachmentSection = '';
      if (clientAttachments.length > 0) {
        attachmentSection = '\n\n📎 Attached documents:\n' +
          clientAttachments.map(a => `• ${a.file_name || 'Document'}: ${a.file_url}`).join('\n');
      }
      const fullMessage = `${message}\n\nView & approve your estimate here:\n${clientLink}${attachmentSection}`;

      // 2. Send email first — must succeed before marking as sent
      const emailRes = await base44.functions.invoke('sendEstimateEmail', {
        to: recipientEmail,
        subject,
        body: fullMessage,
        from_name: appConfig.appName || 'RC Art Construction',
      });
      if (emailRes.data?.error) throw new Error(emailRes.data.error);

      // 3. Email confirmed — now mark estimate as sent
      await markEstimateSent(estimate.id, { documentConfig });

      // 4. Write logs
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

      // 5. Success UI
      setSentSuccess(true);
      toast.success('Estimate sent successfully!');
    } catch (error) {
      // On failure: do NOT mark as sent, log failed comm, show real error
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

  return (
    <div className="fixed inset-0 z-[60] bg-[#f0f2f5] flex flex-col overflow-hidden">

      {/* CONFIRMATION BANNER */}
      {sentSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-3 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-900">{docConfig.label} sent successfully!</p>
            <p className="text-xs text-green-700 mt-1">Sent to: <span className="font-medium">{recipientEmail}</span></p>
            <div className="mt-2 flex items-center gap-2 bg-white rounded-md border border-green-200 px-3 py-1.5">
              <span className="text-xs text-slate-600 truncate">Client link: {clientLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(clientLink); toast.success('Link copied!'); }}
                className="p-1 hover:bg-green-50 rounded text-green-600 flex-shrink-0"
                title="Copy link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {sentError && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Send failed</p>
            <p className="text-xs text-red-700 mt-0.5">{sentError}</p>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 flex items-center justify-between px-5 py-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Review &amp; Send</p>
            <p className="text-xs text-slate-400">{docConfig.label} #{estimate?.estimate_number} · {estimate?.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pr-1">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5">
            <Link className="w-3.5 h-3.5" /> Copy Link
          </Button>
          <Button
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
          </Button>
          <DocumentCloseButton onClick={onClose} />
          </div>
          </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT PANEL */}
        <div className="w-[300px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">

          {/* LAYOUT - TEMPLATE SELECTOR */}
          <SectionAccordion title="Layout" icon={<Eye className="w-3.5 h-3.5" />}>
            <p className="text-xs text-slate-400 mb-3">Select document template</p>
            <div className="space-y-2">
              {getTemplateOptions().map(template => (
                <button
                   key={template.value}
                   onClick={() => setCurrentTemplate(template.value)}
                   className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                     currentTemplate === template.value
                       ? 'border-primary bg-primary/5'
                       : 'border-slate-200 hover:border-slate-300 bg-white'
                   }`}
                 >
                   <div className="text-left flex-1 min-w-0">
                     <p className={`text-xs font-semibold ${currentTemplate === template.value ? 'text-primary' : 'text-slate-800'}`}>
                       {template.label}
                     </p>
                     <p className="text-[11px] text-slate-400">{template.description}</p>
                   </div>
                   {currentTemplate === template.value && (
                     <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                       <div className="w-1.5 h-1.5 rounded-full bg-white" />
                     </div>
                   )}
                 </button>
              ))}
            </div>
          </SectionAccordion>

          {/* DETAILS (email) */}
          <SectionAccordion title="Details" icon={<Send className="w-3.5 h-3.5" />}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">To</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          </SectionAccordion>

          {/* ATTACHMENTS */}
          <SectionAccordion title="Attachments" icon={<Paperclip className="w-3.5 h-3.5" />} defaultOpen={true}>
            {/* Auto-generated PDF — always included via secure link */}
            <div className="flex items-center gap-2 py-1 mb-2">
              <div className="w-7 h-7 bg-red-50 border border-red-200 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-red-500">PDF</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700">estimate-{estimate?.estimate_number}.pdf</p>
                <p className="text-[10px] text-slate-400">Auto-generated · via secure link</p>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[9px] font-semibold text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Client
              </span>
            </div>

            {/* Client-sendable attachments */}
            {(() => {
              const allAtts = Array.isArray(estimate?.attachments) ? estimate.attachments : [];
              const clientAtts = allAtts.filter(a => a.intent === 'send_to_client');
              const internalAtts = allAtts.filter(a => a.intent !== 'send_to_client');
              return (
                <>
                  {clientAtts.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Included with email ({clientAtts.length})</p>
                      {clientAtts.map(att => (
                        <div key={att.id} className="flex items-center gap-2 py-1">
                          <div className="w-7 h-7 bg-blue-50 border border-blue-200 rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{att.file_name || 'file'}</p>
                            <p className="text-[10px] text-slate-400">Download link in email</p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[9px] font-semibold text-blue-700">
                            <Send className="w-2.5 h-2.5" />Client
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {internalAtts.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Internal only ({internalAtts.length}) — not sent</p>
                      {internalAtts.map(att => (
                        <div key={att.id} className="flex items-center gap-2 py-1 opacity-60">
                          <div className="w-7 h-7 bg-slate-50 border border-slate-200 rounded flex items-center justify-center flex-shrink-0">
                            <Lock className="w-3 h-3 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-500 truncate flex-1">{att.file_name || 'file'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {allAtts.length === 0 && (
                    <p className="text-[11px] text-slate-400 py-1">No extra attachments. Upload files in the editor sidebar.</p>
                  )}
                </>
              );
            })()}
          </SectionAccordion>

          {/* VISIBILITY */}
          <SectionAccordion title="Visibility" icon={<EyeOff className="w-3.5 h-3.5" />} defaultOpen={true}>
            <p className="text-[11px] text-slate-400 mb-2">Choose what appears in the document</p>
            <div className="space-y-0.5">
              {Object.entries(VISIBILITY_LABELS).map(([key, label]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  checked={visibility[key]}
                  onChange={val => setVis(key, val)}
                />
              ))}
            </div>
          </SectionAccordion>

        </div>

        {/* RIGHT — LIVE PREVIEW */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center min-h-0">
          <div className="w-full max-w-3xl shadow-xl rounded-sm bg-white">
            <DocumentTypeRenderer
              estimate={estimate}
              template={currentTemplate}
              options={currentOptions}
            />
          </div>
        </div>

      </div>

      {/* LOSS PREVENTION MODAL */}
      {/* ATTACHMENT WARNING MODAL */}
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

      {/* CONFIRM & SEND MODAL */}
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

    </div>
  );
}