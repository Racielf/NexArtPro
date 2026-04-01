import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import EstimatePreview from './EstimatePreview';

export default function EstimatePreviewModal({ estimate, open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <EstimatePreview estimate={estimate} />
      </DialogContent>
    </Dialog>
  );
}