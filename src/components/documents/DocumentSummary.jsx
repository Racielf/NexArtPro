import React from 'react';

/**
 * DocumentSummary — Resumen financiero reutilizable
 * 
 * Responsabilidad: Renderizar SOLO los números financieros
 * Lógica: Mínima — solo renderiza si showPrices=true y documentType!='workorder'
 * 
 * Props:
 *   estimate (object) - Datos del documento (para acceder a tax_rate, discount_amount, etc.)
 *   documentType (string) - 'estimate' | 'invoice' | 'workorder'
 *   showPrices (boolean) - Si false, retorna null
 *   total (number) - Total ya calculado
 *   subtotal (number) - Subtotal
 *   depositPct (number) - Porcentaje de depósito (solo si isEstimate)
 *   depositAmount (number) - Monto de depósito
 *   remaining (number) - Balance restante
 *   isEstimate (boolean) - Si es estimate, muestra deposit info
 *   variant (string) - 'minimal' | 'standard' | 'modern' | 'executive' | 'compact' | 'pro'
 *   style (object) - Estilos CSS custom
 *   className (string) - Classes custom
 */
export default function DocumentSummary({
  estimate,
  documentType = 'estimate',
  showPrices = true,
  showDeposit = true,
  total = 0,
  subtotal = 0,
  depositPct = 0,
  depositAmount = 0,
  remaining = 0,
  isEstimate = false,
  variant = 'standard',
  style = {},
  className = '',
  // New vm-based props (preferred over raw estimate reads)
  discountAmount,
  taxRate,
  taxAmount,
}) {
  // LÓGICA DE NEGOCIO: No renderiza si no aplica
  const isWorkOrder = documentType === 'workorder';

  // Resolve values: prefer explicit props, fallback to estimate for backward compat
  const resolvedDiscountAmount = discountAmount ?? estimate?.discount_amount ?? 0;
  const resolvedTaxRate = taxRate ?? estimate?.tax_rate ?? 0;
  const resolvedTaxAmount = taxAmount ?? estimate?.tax_amount ?? 0;

  if (isWorkOrder || !showPrices) {
    return null;
  }

  // Template-specific defaults (estilos de presentación)
  const variantDefaults = {
    minimal: {
      padding: '10px 0',
      fontSize: 11,
    },
    standard: {
      padding: '24px 52px',
      fontSize: 13,
      alignment: 'flex-end',
    },
    modern: {
      padding: '30px 0',
      fontSize: 11,
      alignment: 'flex-end',
    },
    executive: {
      padding: '0 0 40px',
      fontSize: 12,
      alignment: 'flex-end',
    },
    compact: {
      padding: '12px',
      fontSize: 11,
    },
    pro: {
      padding: '32px',
      fontSize: 13,
      alignment: 'flex-start',
    },
  };

  const defaults = variantDefaults[variant] || variantDefaults.standard;

  // Renderiza tabla de financials (cada template define su contenedor visual)
  const financialRows = [
    {
      label: 'Subtotal',
      value: subtotal,
      show: true,
    },
    {
      label: 'Discount',
      value: -resolvedDiscountAmount,
      show: resolvedDiscountAmount > 0,
      color: '#dc2626',
    },
    {
      label: `Tax (${resolvedTaxRate}%)`,
      value: resolvedTaxAmount,
      show: resolvedTaxRate > 0,
    },
    {
      label: 'TOTAL',
      value: total,
      show: true,
      isBold: true,
      fontSize: 15,
    },
    ...(isEstimate && depositPct > 0 && showDeposit
      ? [
        {
          label: `Deposit Due (${depositPct}%)`,
          value: depositAmount,
          show: true,
          isBold: true,
          color: '#0369a1',
        },
        {
          label: 'Remaining Balance',
          value: remaining,
          show: true,
        },
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