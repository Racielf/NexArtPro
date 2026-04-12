import React from 'react';
import { Check, Star } from 'lucide-react';
import { getTemplateOptions } from '@/lib/estimateTemplates';

/**
 * TemplateSelectorPanel — Visual template selector with preview thumbnails.
 * Renders as a horizontal row of template cards with mini structural previews.
 *
 * Props:
 *   currentTemplate — active template key
 *   onSelect       — (templateKey) => void
 */

// Structural mini-previews (SVG-based) for each template
function CleanPreview() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Dark header */}
      <rect x="0" y="0" width="120" height="18" rx="2" fill="#0f172a" />
      <rect x="6" y="5" width="6" height="6" rx="1" fill="#3b82f6" opacity="0.6" />
      <rect x="15" y="5" width="30" height="3" rx="1" fill="white" opacity="0.8" />
      <rect x="15" y="10" width="20" height="2" rx="0.5" fill="white" opacity="0.3" />
      <rect x="85" y="4" width="28" height="4" rx="1" fill="white" opacity="0.5" />
      <rect x="95" y="10" width="18" height="2" rx="0.5" fill="white" opacity="0.3" />
      {/* 2-col client/project */}
      <rect x="6" y="22" width="50" height="12" rx="1" fill="#f1f5f9" />
      <rect x="60" y="22" width="54" height="12" rx="1" fill="#f1f5f9" />
      {/* Table */}
      <rect x="6" y="38" width="108" height="3" rx="0.5" fill="#e2e8f0" />
      <rect x="6" y="43" width="108" height="2" rx="0.5" fill="#f1f5f9" />
      <rect x="6" y="47" width="108" height="2" rx="0.5" fill="white" />
      <rect x="6" y="51" width="108" height="2" rx="0.5" fill="#f1f5f9" />
      <rect x="6" y="55" width="108" height="2" rx="0.5" fill="white" />
      {/* Totals right-aligned */}
      <rect x="74" y="62" width="40" height="8" rx="1" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
      {/* Footer */}
      <rect x="0" y="75" width="120" height="5" rx="1" fill="#f8fafc" />
    </svg>
  );
}

function PremiumPreview() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Centered logo + name */}
      <rect x="45" y="4" width="8" height="8" rx="2" fill="#b8860b" opacity="0.4" />
      <rect x="56" y="5" width="24" height="3" rx="1" fill="#1a1a1a" opacity="0.7" />
      <rect x="56" y="10" width="16" height="2" rx="0.5" fill="#7a7a7a" opacity="0.4" />
      {/* Gold divider */}
      <rect x="6" y="16" width="108" height="1.5" rx="0.5" fill="#b8860b" />
      {/* Meta bar */}
      <rect x="0" y="19" width="120" height="8" fill="#f5f0e6" />
      <rect x="6" y="21" width="20" height="2" rx="0.5" fill="#1a1a1a" opacity="0.5" />
      <rect x="90" y="21" width="24" height="2" rx="0.5" fill="#7a7a7a" opacity="0.4" />
      {/* 2-col formal blocks */}
      <rect x="6" y="30" width="52" height="14" rx="1" fill="white" stroke="#e5e0d5" strokeWidth="0.5" />
      <rect x="62" y="30" width="52" height="14" rx="1" fill="white" stroke="#e5e0d5" strokeWidth="0.5" />
      {/* Table with gold header border */}
      <rect x="6" y="48" width="108" height="2" rx="0.5" fill="#b8860b" opacity="0.3" />
      <rect x="6" y="52" width="108" height="2" rx="0.5" fill="#faf8f3" />
      <rect x="6" y="56" width="108" height="2" rx="0.5" fill="white" />
      <rect x="6" y="60" width="108" height="2" rx="0.5" fill="#faf8f3" />
      {/* Totals */}
      <rect x="74" y="66" width="40" height="6" rx="1" fill="white" stroke="#b8860b" strokeWidth="0.5" />
      {/* Footer */}
      <rect x="30" y="76" width="60" height="1.5" rx="0.5" fill="#b8860b" opacity="0.4" />
    </svg>
  );
}

function ModernCardPreview() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Slate background */}
      <rect x="0" y="0" width="120" height="80" rx="3" fill="#f1f5f9" />
      {/* Dark header card */}
      <rect x="6" y="4" width="108" height="14" rx="3" fill="#0f172a" />
      <rect x="10" y="7" width="5" height="5" rx="1" fill="#2563eb" opacity="0.5" />
      <rect x="18" y="7" width="24" height="2.5" rx="0.5" fill="white" opacity="0.7" />
      <rect x="18" y="11" width="16" height="1.5" rx="0.5" fill="white" opacity="0.3" />
      <rect x="88" y="7" width="22" height="3" rx="0.5" fill="white" opacity="0.4" />
      {/* 2 cards */}
      <rect x="6" y="22" width="52" height="10" rx="2" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="62" y="22" width="52" height="10" rx="2" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />
      {/* Services card */}
      <rect x="6" y="36" width="108" height="20" rx="2" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="6" y="36" width="108" height="4" rx="2" fill="#0f172a" />
      <rect x="10" y="43" width="100" height="1.5" rx="0.5" fill="#f1f5f9" />
      <rect x="10" y="47" width="100" height="1.5" rx="0.5" fill="white" />
      <rect x="10" y="51" width="100" height="1.5" rx="0.5" fill="#f1f5f9" />
      {/* Totals + deposit cards */}
      <rect x="6" y="60" width="52" height="10" rx="2" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />
      <rect x="62" y="60" width="52" height="10" rx="2" fill="#dbeafe" stroke="#2563eb" strokeWidth="0.5" />
      {/* Footer */}
      <rect x="40" y="74" width="40" height="1" rx="0.5" fill="#94a3b8" opacity="0.3" />
    </svg>
  );
}

const PREVIEW_MAP = {
  clean: CleanPreview,
  premium: PremiumPreview,
  modern_card: ModernCardPreview,
};

const BADGES = {
  clean: { label: 'Recommended', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function TemplateSelectorPanel({ currentTemplate = 'clean', onSelect }) {
  const templates = getTemplateOptions();

  return (
    <div className="flex gap-3">
      {templates.map(t => {
        const isSelected = currentTemplate === t.value;
        const PreviewComponent = PREVIEW_MAP[t.value];
        const badge = BADGES[t.value];

        return (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            className={`relative group flex flex-col w-[152px] rounded-xl border-2 transition-all duration-200 overflow-hidden text-left ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            {/* Preview thumbnail */}
            <div className={`relative p-2 pb-1 ${isSelected ? 'bg-primary/[0.03]' : 'bg-slate-50 group-hover:bg-slate-100/80'} transition-colors`}>
              <div className="w-full aspect-[3/2] rounded-md overflow-hidden bg-white border border-slate-100">
                {PreviewComponent && <PreviewComponent />}
              </div>
              {/* Selected check */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
              {/* Badge */}
              {badge && (
                <div className={`absolute top-3 left-3 px-1.5 py-0.5 rounded text-[9px] font-bold border ${badge.color} flex items-center gap-0.5`}>
                  <Star className="w-2.5 h-2.5" fill="currentColor" />
                  {badge.label}
                </div>
              )}
            </div>

            {/* Label + description */}
            <div className="px-3 py-2.5">
              <div className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                {t.label}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                {t.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}