/**
 * estimateCalculator.js
 *
 * LEGACY COMPATIBILITY WRAPPER.
 *
 * The official Estimate calculation engine is now estimateEngine.js.
 * Keep this file only so older imports do not break, but route all shared
 * formulas through the official engine to prevent formula drift.
 *
 * Do not add new formulas here. Add them to estimateEngine.js instead.
 */

import {
  calculateLineTotal,
  calculateVariance,
  calculateSubtotal,
  calculateTaxableBase,
  calculateTax as calculateTaxFromBase,
  calculateDiscount,
  calculateGrandTotal,
  calculateDeposit,
  runEstimateEngine,
} from './estimateEngine';

export {
  calculateLineTotal,
  calculateVariance,
  calculateSubtotal,
  calculateDiscount,
  calculateGrandTotal,
  calculateDeposit,
};

/**
 * Legacy signature: calculateTax(lineItems, taxRate)
 * Official engine signature: calculateTax(taxableBase, taxRate)
 */
export function calculateTax(lineItems, taxRate) {
  const taxableBase = calculateTaxableBase(lineItems || []);
  return calculateTaxFromBase(taxableBase, taxRate);
}

/**
 * Legacy helper: sum unit_cost * quantity for line items only.
 */
export function calculateTotalCost(lineItems) {
  const groups = [{ id: 'legacy', name: 'Legacy', items: lineItems || [] }];
  return runEstimateEngine(groups).serviceCost;
}

/**
 * Legacy helper: gross margin amount/percent.
 */
export function calculateGrossMargin(total, totalCost) {
  const t = Number(total || 0);
  const c = Number(totalCost || 0);
  const amount = Math.round((t - c) * 100) / 100;
  const percent = t === 0 ? 0 : Math.round(((t - c) / t) * 10000) / 100;
  return { amount, percent };
}

/**
 * Legacy helper: flatten grouped line items.
 */
export function flattenItems(groups) {
  return (groups || []).flatMap(g => g.items || []);
}

/**
 * Legacy master function.
 * Supports the original signature while delegating to runEstimateEngine().
 */
export function computeEstimateTotals(groups, taxRate, discountType, discountValue, depositPercent) {
  const result = runEstimateEngine(groups || [], {
    taxRate,
    discountType,
    discountValue,
    depositPercent,
  });

  return {
    subtotal: result.subtotal,
    discountAmount: result.discountAmount,
    taxAmount: result.taxAmount,
    total: result.total,
    depositAmount: result.depositAmount,
    totalCost: result.totalCost,
    grossMargin: result.grossMargin,
    grossMarginPct: result.grossMarginPct,
  };
}
