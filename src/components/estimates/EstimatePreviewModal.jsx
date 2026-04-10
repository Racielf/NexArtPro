import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import DocumentCloseButton from '@/components/shared/DocumentCloseButton';
import EstimateTemplateRenderer from './EstimateTemplateRenderer';
import { printEstimate, downloadEstimate } from '@/lib/estimatePrint';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import LossPreventionModal from './internal/LossPreventionModal';
import { validateEstimatePricing } from '@/lib/pricingValidation';
import { getDocTypeConfig } from '@/lib/documentTypeConfig';

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  const [lossModalOpen, setLossModalOpen] = React.useState(false);
  const [lossValidation, setLossValidation] = React.useState({ lossItems: [], zeroProfitItems: [] });

  if (!estimate || !open) return null;

  const handlePrint = () => {
    printEstimate(estimate);
    onClose();
  };

  const handleDownload = () => {
    downloadEstimate(estimate);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col" showCloseButton={false}>
        
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 flex-shrink-0">
          <DialogTitle className="text-sm font-semibold">
            {getDocTypeConfig(estimate?.document_type).label} #{estimate?.estimate_number} — Preview
          </DialogTitle>
          <div className="flex items-center gap-3 pr-1">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            {onSend && (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={handleSend}>
                <Send className="w-3.5 h-3.5" /> Send to Client
              </Button>
            )}
            <DocumentCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Loss Prevention Modal */}
        <LossPreventionModal
          open={lossModalOpen}
          onClose={() => setLossModalOpen(false)}
          onProceed={handleLossConfirmed}
          lossItems={lossValidation.lossItems}
          zeroProfitItems={lossValidation.zeroProfitItems}
        />

        {/* Document Preview */}
        <div className="flex-1 overflow-auto bg-slate-200 p-6 flex justify-center min-h-0">
          <div className="w-full max-w-4xl">
            <EstimateTemplateRenderer
              estimate={estimate}
              template={estimate?.document_config?.template || 'pro'}
              options={{
                ...DEFAULT_OPTIONS,
                showPrices: true,
                showBreakdown: true,
                showTerms: true,
                showSignatures: true,
                hideInternalNotes: true,
              }}
              documentType="estimate"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}