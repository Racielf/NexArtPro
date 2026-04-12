/**
 * AttachmentWarningModal — Pre-send quality control warning.
 *
 * Shown when an estimate likely needs supporting documents
 * but has no client-facing attachments included.
 *
 * The user decides: go back and add attachments, or send without.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Paperclip, AlertTriangle, ArrowLeft, Send } from 'lucide-react';

export default function AttachmentWarningModal({ open, onClose, onSendWithout, reasons = [] }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-amber-500" />
            No Client Attachments Included
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              This estimate may need supporting documents
            </p>
            <p className="text-xs text-amber-600">
              No files are currently marked for client delivery. The client will receive the estimate without any attached documents.
            </p>
          </div>

          {reasons.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Why this was flagged</p>
              {reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">{r}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400">
            You can go back to add files in the estimate editor sidebar, or proceed without attachments.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={onClose}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Add Attachments
          </Button>
          <Button
            className="flex-1 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onSendWithout}
          >
            <Send className="w-3.5 h-3.5" />
            Send Without
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}