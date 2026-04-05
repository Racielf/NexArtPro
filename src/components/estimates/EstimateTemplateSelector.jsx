import React, { useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTemplateOptions } from '@/lib/estimateTemplates';

/**
 * Template selector for Estimate Editor top bar
 * Compact, inline selector + options toggle
 */
export default function EstimateTemplateSelector({
  currentTemplate = 'professional',
  onTemplateChange,
  onShowOptions,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const templates = getTemplateOptions();
  const current = templates.find(t => t.value === currentTemplate);

  return (
    <div className="flex items-center gap-2">
      {/* Template selector dropdown */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
        >
          <span>Template:</span>
          <span className="font-semibold text-slate-800">{current?.label || 'Professional'}</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {menuOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
            {templates.map(t => (
              <button
                key={t.value}
                onClick={() => {
                  onTemplateChange(t.value);
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors ${
                  currentTemplate === t.value ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-700'
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className="text-[10px] text-slate-400">{t.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Options toggle */}
      <Button
        size="sm"
        variant="outline"
        onClick={onShowOptions}
        className="gap-1.5 text-xs h-8"
      >
        <Settings className="w-3.5 h-3.5" />
        Options
      </Button>
    </div>
  );
}