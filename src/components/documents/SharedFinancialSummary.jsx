import React from 'react';
import { t } from '@/lib/documentTranslations';

/**
 * SharedFinancialSummary — Shared totals renderer for BID & PROPOSAL
 *
 * Shows ONLY client-safe financial data: subtotal, discount, tax, total, deposit.
 * Never exposes cost, margin, or internal metrics.
 *
 * Uses the same calculated values from the shared estimate engine.
 */
export default function SharedFinancialSummary({
  estimate,
  total = 0,
  depositPct = 0,
  depositAmount = 0,
  remaining = 0,
  showDeposit = false,
  accent = '#0f172a',
  lang = 'en',
}) {
  if (!estimate) return null;

  const ts = (key) => t('shared', key, lang);

  const rows = [
    { label: ts('subtotal'), value: estimate.subtotal || 0, show: true },
    { label: ts('discount'), value: -(estimate.discount_amount || 0), show: (estimate.discount_amount || 0) > 0, color: '#dc2626' },
    { label: `${ts('tax')} (${estimate.tax_rate || 0}%)`, value: estimate.tax_amount || 0, show: (estimate.tax_rate || 0) > 0 },
    { label: ts('total').toUpperCase(), value: total, show: true, bold: true, big: true },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: showDeposit ? '100%' : 280 }}>
        {showDeposit ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Totals */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
              {rows.filter(r => r.show).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: row.big ? 16 : 12, fontWeight: row.bold ? 800 : 400, color: row.color || (row.bold ? '#0f172a' : '#475569'), borderBottom: row.bold ? '2px solid #e2e8f0' : '1px solid #f1f5f9' }}>
                  <span>{row.label}</span>
                  <span>{row.value < 0 ? '-' : ''}${Math.abs(row.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            {/* Deposit */}
            <div style={{ background: `${accent}08`, borderRadius: 8, padding: '16px 20px', border: `1.5px solid ${accent}30` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 10 }}>{ts('paymentSchedule')}</div>
              <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${accent}20` }}>
                <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 4 }}>{ts('depositToStart')}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{depositPct}% {ts('ofTotal')}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, marginBottom: 3 }}>{ts('remaining')}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        ) : (
          rows.filter(r => r.show).map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: row.big ? 15 : 12, fontWeight: row.bold ? 800 : 400, color: row.color || (row.bold ? '#0f172a' : '#475569'), borderBottom: row.bold ? '2px solid #e2e8f0' : '1px solid #f1f5f9' }}>
              <span>{row.label}</span>
              <span>{row.value < 0 ? '-' : ''}${Math.abs(row.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}