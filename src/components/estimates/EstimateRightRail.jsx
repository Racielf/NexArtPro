import React from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import PricingAuditHistory from '@/components/estimates/internal/PricingAuditHistory';
import TransmissionPanel from '@/components/estimates/TransmissionPanel';
import { ORGANIC, organicHeadingStyle } from '@/components/estimates/estimatePipelineTheme';
import { useLanguage } from '@/lib/i18n';

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ORGANIC.ink500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  border: `1px solid ${ORGANIC.divider}`, background: '#fff', color: ORGANIC.ink900, borderRadius: '10px',
};

/**
 * EstimateRightRail — Pricing, Validity & Terms, and a real pricing-brain
 * insight card (reads estimateCatalogPricingBrain's actual output). Reskinned
 * to the owner-approved "Pipeline para estimate editor" mockup palette.
 */
export default function EstimateRightRail({
  settings, onSettingsChange, expirationDate, onExpirationDateChange,
  pricingInsight, onOpenBrainPanel, estimateId, showHistory, onToggleHistory,
}) {
  const { t } = useLanguage();
  const set = (key) => (e) => onSettingsChange({ ...settings, [key]: key === 'discountType' ? e.target.value : (parseFloat(e.target.value) || 0) });

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: ORGANIC.surface, borderRadius: ORGANIC.radiusLg, boxShadow: ORGANIC.shadowSm }}>
      <div className="p-5 space-y-5">

        {/* Pricing */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>{t('estimate.pricing.title')}</h3>
          <Field label={t('estimate.pricing.discount')}>
            <div className="grid grid-cols-[70px_1fr] gap-1.5">
              <select value={settings.discountType} onChange={set('discountType')} className="h-9 text-xs px-2" style={inputStyle}>
                <option value="percent">%</option>
                <option value="fixed">$</option>
              </select>
              <input type="number" min={0} value={settings.discountValue} onChange={set('discountValue')} className="h-9 text-xs px-2" style={inputStyle} />
            </div>
          </Field>
          <Field label={t('estimate.pricing.taxRate')}>
            <input type="number" min={0} max={100} value={settings.taxRate} onChange={set('taxRate')} className="h-9 w-full text-xs px-2" style={inputStyle} />
          </Field>
          <Field label={t('estimate.pricing.deposit')}>
            <input type="number" min={0} max={100} value={settings.depositPercent} onChange={set('depositPercent')} className="h-9 w-full text-xs px-2" style={inputStyle} />
          </Field>
        </div>

        {/* Validity */}
        <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${ORGANIC.divider}` }}>
          <h3 className="text-[15px] font-bold" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>{t('estimate.pricing.validity')}</h3>
          <Field label={t('estimate.pricing.validUntil')}>
            <input type="date" value={expirationDate} onChange={e => onExpirationDateChange(e.target.value)} className="h-9 w-full text-xs px-2" style={inputStyle} />
          </Field>
        </div>

        {/* Pricing brain insight — real data, not a mock */}
        <div className="pt-4" style={{ borderTop: `1px solid ${ORGANIC.divider}` }}>
          <button
            onClick={onOpenBrainPanel}
            className="w-full text-left rounded-2xl p-3.5 flex items-start gap-2.5 transition-colors"
            style={{
              background: pricingInsight?.flaggedItems?.length ? ORGANIC.accent100 : ORGANIC.olive100,
              border: `1px solid ${pricingInsight?.flaggedItems?.length ? ORGANIC.accent200 : ORGANIC.olive200}`,
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff', color: ORGANIC.accent700 }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold" style={{ color: ORGANIC.ink900 }}>{t('estimate.pricing.brain')}</p>
              <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: ORGANIC.ink500 }}>
                {pricingInsight?.summary || t('estimate.pricing.analyzing')}
              </p>
            </div>
          </button>
        </div>

        {/* History — Pricing Audit + Transmissions, collapsed by default */}
        {estimateId && (
          <div className="pt-4" style={{ borderTop: `1px solid ${ORGANIC.divider}` }}>
            <button onClick={onToggleHistory} className="w-full flex items-center justify-between text-[13px] font-bold" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>
              {t('estimate.pricing.history')}
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showHistory && (
              <div className="mt-3 space-y-3">
                <TransmissionPanel estimateId={estimateId} />
                <PricingAuditHistory documentId={estimateId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
