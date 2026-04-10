import React from 'react';
import PDFTotalsBlock from './pdf/PDFTotalsBlock';

/**
 * SharedFinancialSummary — Thin wrapper that delegates to PDFTotalsBlock.
 * Maintains backward compatibility for all existing consumers.
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
  variant = 'proposal',
}) {
  return (
    <PDFTotalsBlock
      estimate={estimate}
      total={total}
      depositPct={depositPct}
      depositAmount={depositAmount}
      remaining={remaining}
      showDeposit={showDeposit}
      accent={accent}
      lang={lang}
      variant={variant}
    />
  );
}