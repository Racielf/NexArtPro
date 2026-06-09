import React, { useState } from 'react';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { getTemplateOptions } from '@/lib/estimateTemplates';
import TemplateSelectorPanel from './TemplateSelectorPanel';

/**
 * EstimateTemplateSelector — Top bar control with expandable visual selector.
 * Document visibility/options live only inside Review & Send.
 */
export default function EstimateTemplateSelector({
  currentTemplate = 'clean',
  onTemplateChange,
}) {
  const [expanded, setExpanded] = useState(false);
  const templates = getTemplateOptions();
  const current = templates.find((t) => t.value === currentTemplate) || templates[0];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            expanded
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Template:</span>
          <span className="font-bold">{current.label}</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setExpanded(false)} />
          <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Choose Template</h3>
                <p className="text-[11px] text-slate-400">Select a layout style for your estimate</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
            <TemplateSelectorPanel
              currentTemplate={currentTemplate}
              onSelect={(key) => {
                onTemplateChange(key);
                setExpanded(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
