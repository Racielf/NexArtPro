import React, { useRef } from 'react';
import { X, Printer, Send, Download } from 'lucide-react';
import { toast } from 'sonner';
import DocumentTypeRenderer from '@/components/documents/DocumentTypeRenderer';
import { mapProposalToEstimate } from '@/lib/proposalDocumentMapper';
import { printEstimate, downloadEstimate } from '@/lib/estimatePrint';

export default function ProposalPreviewModal({ proposal, proposalDetails = {}, open, onClose, onSend, language }) {
  if (!open || !proposal) return null;

  // Map proposal → estimate shape for document renderers (passes resolved language)
  const estimateData = mapProposalToEstimate(proposal, proposalDetails, language);

  const canSend = !['sent', 'approved', 'accepted', 'converted_to_invoice', 'converted_to_work_order'].includes(proposal.status);

  const handlePrint = () => {
    printEstimate(estimateData);
  };

  const handleDownload = async () => {
    try {
      await downloadEstimate(estimateData);
      toast.success('PDF downloaded');
    } catch {
      toast.error('PDF generation failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            Proposal Preview — #{proposal.proposal_number}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            {canSend && onSend && (
              <button onClick={() => { onClose(); onSend(); }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                <Send className="w-3.5 h-3.5" /> Send to Client
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document preview — uses real renderer */}
        <div className="overflow-auto flex-1 p-6 bg-slate-100">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-[820px] mx-auto overflow-hidden">
            <DocumentTypeRenderer
              estimate={estimateData}
              options={estimateData.document_config?.options}
              lang={estimateData.document_language}
            />
          </div>
        </div>
      </div>
    </div>
  );
}