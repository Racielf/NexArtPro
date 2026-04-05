import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import EstimateTemplateRenderer from './EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { printEstimate } from '@/lib/estimatePrint';

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0 gap-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <span className="text-sm font-semibold text-slate-700">
            Estimate #{estimate?.estimate_number} — Document Preview
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => printEstimate(estimate)} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            {onSend && (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={() => { onClose(); onSend(); }}>
                <Send className="w-3.5 h-3.5" /> Send to Client
              </Button>
            )}
          </div>
        </div>
        {/* Document Scrolleable Container */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-6 min-h-0">
          <div className="shadow-xl rounded-sm overflow-hidden">
            <EstimateTemplateRenderer
              estimate={estimate}
              template={estimate?.document_config?.template || 'professional'}
              options={{ ...DEFAULT_OPTIONS, ...estimate?.document_config?.options }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}