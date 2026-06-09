import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import DocumentTypeRenderer from '@/components/documents/DocumentTypeRenderer';
import { printEstimate, downloadEstimate } from '@/lib/estimatePrint';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import LossPreventionModal from './internal/LossPreventionModal';
import { validateEstimatePricing } from '@/lib/pricingValidation';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  const [lossModalOpen, setLossModalOpen] = React.useState(false);
  const [lossValidation, setLossValidation] = React.useState({ lossItems: [], zeroProfitItems: [], materialsWithoutCost: [] });

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
    const pv = validateEstimatePricing(estimate);
    if (!pv.canProceed || pv.requiresConfirmation) {
      setLossValidation(pv);
      setLossModalOpen(true);
      return;
    }
    onClose();
    onSend?.();
  };

  const handleLossConfirmed = () => {
    setLossModalOpen(false);
    onClose();
    onSend?.();
  };

  const docType = estimate?.document_type === 'BID' ? 'BID' : 'ESTIMATE';
  const docLabel = getDocTypeConfig(docType).label;
  const title = `${docLabel} #${estimate?.estimate_number} — Preview`;

  const documentContent = (
    <DocumentTypeRenderer
      estimate={estimate}
      template={previewTemplate}
      options={previewOptions}
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
      <DialogContent
        className="max-w-5xl max-h-[90vh] p-0 flex flex-col"
        style={{ maxWidth: 'min(64rem, calc(100vw - 2rem))' }}
        showCloseButton={false}
      >
        <DocumentViewerShell
          title={title}
          actions={actions}
          onClose={onClose}
          documentContent={documentContent}
        />

        <LossPreventionModal
          open={lossModalOpen}
          onClose={() => setLossModalOpen(false)}
          onProceed={handleLossConfirmed}
          lossItems={lossValidation.lossItems}
          zeroProfitItems={lossValidation.zeroProfitItems}
          materialsWithoutCost={lossValidation.materialsWithoutCost}
        />
      </DialogContent>
    </Dialog>
  );
}
