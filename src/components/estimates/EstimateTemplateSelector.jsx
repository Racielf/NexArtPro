import React, { useState } from 'react';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { getTemplateOptions } from '@/lib/estimateTemplates';
import TemplateSelectorPanel from './TemplateSelectorPanel';
import { useLanguage } from '@/lib/i18n';

/**
 * EstimateTemplateSelector — Top bar control with expandable visual selector.
 * Document visibility/options live only inside Review & Send.
 */
export default function EstimateTemplateSelector({
  currentTemplate = 'clean',
  onTemplateChange,
  compact = false,
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const templates = getTemplateOptions();
  const current = templates.find((t) => t.value === currentTemplate) || templates[0];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          title={`${t('estimate.header.template')}: ${current.label}`}
          className={`flex h-9 items-center gap-2 px-3 text-xs font-semibold rounded-full border transition-all ${
            expanded
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-transparent hover:bg-black/[0.035] text-slate-700 border-black/10'
          }`}
        >
          <Palette className="w-4 h-4" />
          {!compact && <span>{t('estimate.header.template')}:</span>}
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
                <h3 className="text-sm font-bold text-slate-900">{t('estimate.header.template')}</h3>
                <p className="text-[11px] text-slate-400">{t('estimate.header.templateDescription')}</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {t('common.close')}
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
