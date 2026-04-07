/**
 * estimateCalculator.js
 * Pure calculation engine for Estimate documents.
 * Uses Decimal.js to avoid floating-point errors in monetary calculations.
 *
 * Role: Financial calculation engine — no UI, no side effects.
 */
import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── Pure Functions ────────────────────────────────────────────────────────────

/**
 * calculateLineTotal(qty, unit_price)
 * Returns qty * unit_price, safe for decimals and nulls.
 */
export function calculateLineTotal(qty, unit_price) {
  const q = new Decimal(qty || 0);
  const p = new Decimal(unit_price || 0);
  if (q.isZero() || p.isZero()) return 0;
  return q.times(p).toDecimalPlaces(2).toNumber();
}

/**
 * calculateVariance(qty, unit_price, book_price)
 * Returns (unit_price - book_price) * qty — INTERNAL USE ONLY, never shown to client.
 * Positive = above book (good margin), Negative = below book (discount alert).
 */
export function calculateVariance(qty, unit_price, book_price) {
  if (!book_price) return null; // No book reference — variance undefined
  const q = new Decimal(qty || 0);
  const p = new Decimal(unit_price || 0);
  const b = new Decimal(book_price || 0);
  return p.minus(b).times(q).toDecimalPlaces(2).toNumber();
}

/**
 * calculateSubtotal(lineItems)
 * Sums all line_total values from a flat array of items.
 * Items with qty=0 or price=0 contribute 0, never break execution.
 */
export function calculateSubtotal(lineItems) {
  if (!lineItems?.length) return 0;
  return lineItems
    .reduce((acc, item) => acc.plus(new Decimal(item.line_total || 0)), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
}

/**
 * calculateTax(lineItems, taxRate)
 * Applies taxRate only to items where taxable === true.
 * taxRate is a percentage (e.g. 8.5 means 8.5%).
 */
export function calculateTax(lineItems, taxRate) {
  if (!lineItems?.length || !taxRate) return 0;
  const rate = new Decimal(taxRate || 0).dividedBy(100);
  const taxableBase = lineItems
    .filter(item => item.taxable !== false)
    .reduce((acc, item) => acc.plus(new Decimal(item.line_total || 0)), new Decimal(0));
  return taxableBase.times(rate).toDecimalPlaces(2).toNumber();
}

/**
 * calculateDiscount(subtotal, discountType, discountValue)
 * Returns the discount amount.
 * discountType: 'percent' | 'fixed'
 */
export function calculateDiscount(subtotal, discountType, discountValue) {
  if (!discountValue) return 0;
  const s = new Decimal(subtotal || 0);
  const v = new Decimal(discountValue || 0);
  if (discountType === 'percent') {
    return s.times(v.dividedBy(100)).toDecimalPlaces(2).toNumber();
  }
  return v.toDecimalPlaces(2).toNumber();
}

/**
 * calculateGrandTotal(subtotal, tax, discount)
 * subtotal + tax - discount
 */
export function calculateGrandTotal(subtotal, tax, discount) {
  return new Decimal(subtotal || 0)
    .plus(new Decimal(tax || 0))
    .minus(new Decimal(discount || 0))
    .toDecimalPlaces(2)
    .toNumber();
}

/**
 * calculateDeposit(total, depositPercent)
 * Returns the deposit amount due.
 */
export function calculateDeposit(total, depositPercent) {
  if (!depositPercent) return 0;
  return new Decimal(total || 0)
    .times(new Decimal(depositPercent || 0).dividedBy(100))
    .toDecimalPlaces(2)
    .toNumber();
}

/**
 * calculateTotalCost(lineItems)
 * Internal: sum of unit_cost * quantity across all items.
 */
export function calculateTotalCost(lineItems) {
  if (!lineItems?.length) return 0;
  return lineItems
    .reduce((acc, item) => {
      const cost = new Decimal(item.unit_cost || 0).times(new Decimal(item.quantity || 0));
      return acc.plus(cost);
    }, new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
}

/**
 * calculateGrossMargin(total, totalCost)
 * Returns { amount, percent } — internal use only.
 */
export function calculateGrossMargin(total, totalCost) {
  const t = new Decimal(total || 0);
  const c = new Decimal(totalCost || 0);
  const amount = t.minus(c).toDecimalPlaces(2).toNumber();
  const percent = t.isZero() ? 0 : t.minus(c).dividedBy(t).times(100).toDecimalPlaces(2).toNumber();
  return { amount, percent };
}

/**
 * flattenItems(groups)
 * Extracts all line items from all groups into a single array.
 */
export function flattenItems(groups) {
  return (groups || []).flatMap(g => g.items || []);
}

/**
 * computeEstimateTotals(groups, taxRate, discountType, discountValue, depositPercent)
 * Master function: computes all financial fields for an estimate.
 * Returns a plain object ready to be saved to the entity.
 */
export function computeEstimateTotals(groups, taxRate, discountType, discountValue, depositPercent) {
  const items = flattenItems(groups);
  const subtotal = calculateSubtotal(items);
  const discountAmount = calculateDiscount(subtotal, discountType, discountValue);
  const taxAmount = calculateTax(items, taxRate);
  const total = calculateGrandTotal(subtotal, taxAmount, discountAmount);
  const depositAmount = calculateDeposit(total, depositPercent);
  const totalCost = calculateTotalCost(items);
  const { amount: grossMargin, percent: grossMarginPct } = calculateGrossMargin(total, totalCost);

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    depositAmount,
    totalCost,
    grossMargin,
    grossMarginPct,
  };
}