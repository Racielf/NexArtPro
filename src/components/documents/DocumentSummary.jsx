import React from 'react';

/**
 * DocumentSummary — Reusable financial summary (Phase 11: fully vm-driven)
 *
 * Props (all explicit — no raw estimate object):
 *   documentType (string)
 *   showPrices (boolean)
 *   showDeposit (boolean)
 *   total (number)
 *   subtotal (number)
 *   discountAmount (number)
 *   taxRate (number)
 *   taxAmount (number)
 *   depositPct (number)
 *   depositAmount (number)
 *   remaining (number)
 *   isEstimate (boolean)
 *   variant (string)
 *   style (object)
 *   className (string)
 */
export default function DocumentSummary({
  documentType = 'estimate',
  showPrices = true,
  showDeposit = true,
  total = 0,
  subtotal = 0,
  discountAmount = 0,
  taxRate = 0,
  taxAmount = 0,
  depositPct = 0,
  depositAmount = 0,
  remaining = 0,
  isEstimate = false,
  variant = 'standard',
  style = {},
  className = '',
}) {
  const isWorkOrder = documentType === 'workorder';

  if (isWorkOrder || !showPrices) {
    return null;
  }

  const variantDefaults = {
    minimal: { padding: '10px 0', fontSize: 11 },
    standard: { padding: '24px 52px', fontSize: 13, alignment: 'flex-end' },
    modern: { padding: '30px 0', fontSize: 11, alignment: 'flex-end' },
    executive: { padding: '0 0 40px', fontSize: 12, alignment: 'flex-end' },
    compact: { padding: '12px', fontSize: 11 },
    pro: { padding: '32px', fontSize: 13, alignment: 'flex-start' },
  };

  const defaults = variantDefaults[variant] || variantDefaults.standard;

  const financialRows = [
    { label: 'Subtotal', value: subtotal, show: true },
    { label: 'Discount', value: -discountAmount, show: discountAmount > 0, color: '#dc2626' },
    { label: `Tax (${taxRate}%)`, value: taxAmount, show: taxRate > 0 },
    { label: 'TOTAL', value: total, show: true, isBold: true, fontSize: 15 },
    ...(isEstimate && depositPct > 0 && showDeposit
      ? [
          { label: `Deposit Due (${depositPct}%)`, value: depositAmount, show: true, isBold: true, color: '#0369a1' },
          { label: 'Remaining Balance', value: remaining, show: true },
        ]
      : []),
  ];

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: defaults.alignment || 'flex-end',
        ...defaults,
        ...style,
      }}
    >
      <div style={{ width: variant === 'compact' ? '100%' : 280 }}>
        {financialRows
          .filter(row => row.show)
          .map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 0',
                fontSize: row.fontSize || defaults.fontSize,
                fontWeight: row.isBold ? 'bold' : 'normal',
                color: row.color || '#666',
                borderBottom: row.isBold ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
              }}
            >
              <span>{row.label}</span>
              <span>${Math.abs(row.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
      </div>
    </div>
  );
}