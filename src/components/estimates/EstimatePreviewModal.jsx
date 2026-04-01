import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import EstimateDocument from './EstimateDocument';
import { printEstimate } from '@/lib/estimatePrint';

export default function EstimatePreviewModal({ estimate, open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0 gap-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <span className="text-sm font-semibold text-slate-700">
            Estimate #{estimate?.estimate_number} — Document Preview
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => printEstimate(estimate)} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print / Download PDF
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
        {/* Document */}
        <div className="overflow-y-auto bg-slate-200 p-6">
          <div className="shadow-xl rounded-sm overflow-hidden">
            <EstimateDocument estimate={estimate} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}