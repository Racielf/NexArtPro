import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import EstimateTemplateRenderer from './EstimateTemplateRenderer';
import BidDocumentRenderer from '@/components/documents/BidDocumentRenderer';
import { printEstimate, downloadEstimate } from '@/lib/estimatePrint';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import LossPreventionModal from './internal/LossPreventionModal';
import { validateEstimatePricing } from '@/lib/pricingValidation';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  const [lossModalOpen, setLossModalOpen] = React.useState(false);
  const [lossValidation, setLossValidation] = React.useState({ lossItems: [], zeroProfitItems: [] });

  if (!estimate || !open) return null;

  const previewOptions = {
    ...DEFAULT_OPTIONS,
    ...(estimate?.document_config?.options || {}),
    hideInternalNotes: true,
  };
  const previewTemplate = estimate?.document_config?.template || 'clean';

  const handlePrint = () => {
    printEstimate(estimate, previewOptions, previewTemplate);
    onClose();
  };

  const handleDownload = () => {
    downloadEstimate(estimate, previewOptions, previewTemplate);
  };

  const handleSend = () => {
    // Loss prevention gate before opening send flow
    const pv = validateEstimatePricing(estimate);
    if (!pv.canProceed || pv.requiresConfirmation) {
      setLossValidation(pv);
      setLossModalOpen(true);
      return;
    }
    onClose();
    if (onSend) onSend();
  };

  const handleLossConfirmed = () => {
    setLossModalOpen(false);
    onClose();
    if (onSend) onSend();
  };

  // --- Shell integration ---

  const docLabel = (estimate?.document_type === 'BID' ? getDocTypeConfig('BID') : getDocTypeConfig('ESTIMATE')).label;
  const title = `${docLabel} #${estimate?.estimate_number} — Preview`;

  const documentContent = estimate?.document_type === 'BID' ? (
    <BidDocumentRenderer
      estimate={estimate}
      options={previewOptions}
    />
  ) : (
    <EstimateTemplateRenderer
      estimate={estimate}
      template={previewTemplate}
      options={previewOptions}
      documentType="estimate"
    />
  );

  const actions = [
    <Button key="print" size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
      <Printer className="w-3.5 h-3.5" /> Print / PDF
    </Button>,
    onSend && (
      <Button key="send" size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={handleSend}>
        <Send className="w-3.5 h-3.5" /> Send to Client
      </Button>
    ),
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col" showCloseButton={false}>

        <DocumentViewerShell
          title={title}
          actions={actions}
          onClose={onClose}
          documentContent={documentContent}
        />

        {/* Loss Prevention Modal */}
        <LossPreventionModal
          open={lossModalOpen}
          onClose={() => setLossModalOpen(false)}
          onProceed={handleLossConfirmed}
          lossItems={lossValidation.lossItems}
          zeroProfitItems={lossValidation.zeroProfitItems}
        />

      </DialogContent>
    </Dialog>
  );
}