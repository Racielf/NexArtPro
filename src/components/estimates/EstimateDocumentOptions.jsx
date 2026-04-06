import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';

/**
 * Document options modal
 * Configures what shows in the rendered document
 */
export default function EstimateDocumentOptions({
  open,
  onClose,
  options = DEFAULT_OPTIONS,
  onSave,
}) {
  const [localOptions, setLocalOptions] = useState(options);

  const toggleOption = (key) => {
    setLocalOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(localOptions);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Document Options</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <p className="text-xs text-slate-500">Choose what appears in the document sent to clients.</p>

          {[
            { key: 'showPrices', label: 'Show prices & totals', desc: 'Display line totals and amount' },
            { key: 'showBreakdown', label: 'Show service breakdown', desc: 'Display itemized services' },
            { key: 'showDeposit', label: 'Show deposit & balance', desc: 'Show deposit required and remaining balance' },
            { key: 'showProjectDates', label: 'Show project dates', desc: 'Show start and end dates on the document' },
            { key: 'showTerms', label: 'Show terms & conditions', desc: 'Include payment, warranty, legal terms' },
            { key: 'showSignatures', label: 'Show signature blocks', desc: 'Include signature lines for approval' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 p-2.5 rounded hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={localOptions[key] !== false}
                  onChange={() => toggleOption(key)}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
            </label>
          ))}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-amber-900 font-medium mb-1">🔒 Always hidden from clients</p>
            <p className="text-xs text-amber-700">Internal notes and cost data never appear in client documents.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90 gap-1.5" onClick={handleSave}>
            <Check className="w-3.5 h-3.5" /> Save Options
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}