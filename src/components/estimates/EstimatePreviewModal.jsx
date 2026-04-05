import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import FinalDocumentRenderer from '@/components/documents/FinalDocumentRenderer';
import { EstimateToDocumentMapper } from '@/lib/mappers/EstimateToDocumentMapper';
import { printEstimate } from '@/lib/estimatePrint';

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  const documentData = EstimateToDocumentMapper(estimate);

  const actions = [
    <Button key="print" size="sm" variant="outline" onClick={() => printEstimate(estimate)} className="gap-1.5">
      <Printer className="w-3.5 h-3.5" /> Print / PDF
    </Button>,
    onSend ? (
      <Button key="send" size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={() => { onClose(); onSend(); }}>
        <Send className="w-3.5 h-3.5" /> Send to Client
      </Button>
    ) : null,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DocumentViewerShell
        title={`Estimate #${estimate?.estimate_number} — Document Preview`}
        documentContent={<FinalDocumentRenderer documentData={documentData} />}
        actions={actions}
        onClose={onClose}
      />
    </Dialog>
  );
}