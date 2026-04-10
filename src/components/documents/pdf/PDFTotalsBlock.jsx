import React from 'react';
import { COLORS, FONT, SPACE } from './PDFStyles';
import { t } from '@/lib/documentTranslations';

/**
 * PDFTotalsBlock — Financial summary block for PDF output.
 *
 * Supports two layouts:
 *   - compact: right-aligned summary rows (default for bid)
 *   - split:   two-column with deposit card (proposal w/ deposit)
 *
 * Never exposes cost, margin, or internal metrics.
 */
export default function PDFTotalsBlock({
  estimate,
  total = 0,
  depositPct = 0,
  depositAmount = 0,
  remaining = 0,
  showDeposit = false,
  accent = COLORS.bid.accent,
  lang = 'en',
  variant = 'proposal',
}) {
  if (!estimate) return null;

  const ts = (key) => t('shared', key, lang);

  const rows = [
    { label: ts('subtotal'), value: estimate.subtotal || 0, show: true },
    { label: `${ts('discount')}`, value: -(estimate.discount_amount || 0), show: (estimate.discount_amount || 0) > 0, color: '#dc2626' },
    { label: `${ts('tax')} (${estimate.tax_rate || 0}%)`, value: estimate.tax_amount || 0, show: (estimate.tax_rate || 0) > 0 },
    { label: ts('total').toUpperCase(), value: total, show: true, bold: true, big: true },
  ];

  const rowStyle = (row) => ({
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${row.big ? SPACE.md : SPACE.sm}px 0`,
    fontSize: row.big ? FONT.size.xl : FONT.size.base,
    fontWeight: row.bold ? FONT.weight.extrabold : FONT.weight.normal,
    color: row.color || (row.bold ? COLORS.text.primary : COLORS.text.muted),
    borderBottom: row.bold ? `2px solid ${COLORS.border.medium}` : `1px solid ${COLORS.border.light}`,
  });

  const fmtVal = (v) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Split layout when deposit present
  if (showDeposit) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.lg }}>
        {/* Left: totals */}
        <div style={{ background: COLORS.bg.card, borderRadius: 8, padding: `${SPACE.lg}px ${SPACE.xl}px`, border: `1px solid ${COLORS.border.medium}` }}>
          {rows.filter(r => r.show).map((row, i) => (
            <div key={i} style={rowStyle(row)}>
              <span>{row.label}</span>
              <span>{fmtVal(row.value)}</span>
            </div>
          ))}
        </div>
        {/* Right: deposit */}
        <div style={{
          background: `${accent}08`,
          borderRadius: 8,
          padding: `${SPACE.lg}px ${SPACE.xl}px`,
          border: `1.5px solid ${accent}30`,
        }}>
          <div style={{
            fontSize: FONT.size.xs,
            fontWeight: FONT.weight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: accent,
            marginBottom: SPACE.md,
          }}>
            {ts('paymentSchedule')}
          </div>
          <div style={{ marginBottom: SPACE.md, paddingBottom: SPACE.md, borderBottom: `1px solid ${accent}20` }}>
            <div style={{ fontSize: FONT.size.sm, color: accent, fontWeight: FONT.weight.semibold, marginBottom: 4 }}>
              {ts('depositToStart')}
            </div>
            <div style={{ fontSize: FONT.size['3xl'], fontWeight: FONT.weight.black, color: accent, lineHeight: 1 }}>
              ${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: FONT.size.xs, color: COLORS.text.muted, marginTop: 4 }}>
              {depositPct}% {ts('ofTotal')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, fontWeight: FONT.weight.semibold, marginBottom: 3 }}>
              {ts('remaining')}
            </div>
            <div style={{ fontSize: FONT.size['2xl'], fontWeight: FONT.weight.extrabold, color: COLORS.text.primary }}>
              ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact: right-aligned summary
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 280 }}>
        {rows.filter(r => r.show).map((row, i) => (
          <div key={i} style={rowStyle(row)}>
            <span>{row.label}</span>
            <span>{fmtVal(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}