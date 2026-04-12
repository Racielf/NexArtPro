import React, { useState } from 'react';
import { X, Check, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { LANGUAGE_OPTIONS } from '@/lib/documentTranslations';

/**
 * Document options modal
 * Configures what shows in the rendered document
 */
export default function EstimateDocumentOptions({
  open,
  onClose,
  options = DEFAULT_OPTIONS,
  onSave,
  language = 'en',
  onLanguageChange,
}) {
  const [localOptions, setLocalOptions] = useState({ ...DEFAULT_OPTIONS, ...options });
  const [localLang, setLocalLang] = useState(language || 'en');

  const toggleOption = (key) => {
    setLocalOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(localOptions);
    if (onLanguageChange) onLanguageChange(localLang);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Document Options</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-3 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs text-slate-500">Choose what appears in the document sent to clients.</p>

          {[
            { key: 'showPrices', label: 'Show prices & totals', desc: 'Display line totals and amount' },
            { key: 'showBreakdown', label: 'Show service breakdown', desc: 'Display itemized services' },
            { key: 'showDeposit', label: 'Show deposit & balance', desc: 'Show deposit required and remaining balance' },
            { key: 'showDocumentDate', label: 'Show document date', desc: 'Display the document creation date' },
            { key: 'showProjectStartDate', label: 'Show project start date', desc: 'Display when the project is expected to start' },
            { key: 'showProjectEndDate', label: 'Show project end date', desc: 'Display when the project is expected to complete' },
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

          {/* Language selector */}
          <div className="border-t border-slate-200 pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Document Language</span>
            </div>
            <div className="flex gap-2">
              {LANGUAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLocalLang(opt.value)}
                  className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg border-2 transition-all ${
                    localLang === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Controls section titles and default copy in the PDF.
              {language && language !== 'en' && (
                <span className="block mt-1 text-primary font-medium">Auto-detected from client preference.</span>
              )}
            </p>
          </div>

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