/**
 * estimateEngine.js — Pure calculation engine for Estimate Line Items
 * Uses Decimal.js to eliminate floating-point errors in monetary calculations.
 *
 * All functions are pure (no side effects) and operate on plain JS objects.
 * Internal variance data (book_price delta) is NEVER surfaced to client documents.
 */
import Decimal from 'decimal.js';

// Configure Decimal precision for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── Primitive Helpers ─────────────────────────────────────────────────────────

/** Safely convert any value to a Decimal (returns Decimal(0) on invalid input) */
const D = (v) => {
  try { return new Decimal(v ?? 0); } catch { return new Decimal(0); }
};

/** Round to 2 decimal places and return as JS number */
const toMoney = (d) => d.toDecimalPlaces(2).toNumber();

// ─── Core Line Item Functions ──────────────────────────────────────────────────

/**
 * calculateLineTotal(qty, unit_price)
 * Returns qty * unit_price rounded to 2 decimal places.
 * If qty or unit_price is 0 / null / undefined → returns 0 safely.
 */
export function calculateLineTotal(qty, unit_price) {
  const q = D(qty);
  const p = D(unit_price);
  if (q.isZero() || p.isZero()) return 0;
  return toMoney(q.times(p));
}

/**
 * calculateVariance(qty, unit_price, book_price)
 * Returns (unit_price - book_price) * qty — INTERNAL USE ONLY.
 * Positive = selling above book (good). Negative = discount below book (risk).
 */
export function calculateVariance(qty, unit_price, book_price) {
  const q = D(qty);
  const p = D(unit_price);
  const b = D(book_price);
  if (b.isZero()) return null; // No book data — variance is undefined
  return toMoney(p.minus(b).times(q));
}

/**
 * calculateSubtotal(lineItems)
 * Sums all line_total values across a flat array of items.
 */
export function calculateSubtotal(lineItems = []) {
  return toMoney(
    lineItems.reduce((acc, item) => acc.plus(D(item.line_total)), new Decimal(0))
  );
}

/**
 * calculateTaxableBase(lineItems)
 * Sums line_total only for items where taxable !== false.
 */
export function calculateTaxableBase(lineItems = []) {
  return toMoney(
    lineItems.reduce((acc, item) => {
      return item.taxable !== false ? acc.plus(D(item.line_total)) : acc;
    }, new Decimal(0))
  );
}

/**
 * calculateTax(taxableBase, taxRate)
 * taxRate is a percentage (e.g. 8.5 → 8.5%).
 */
export function calculateTax(taxableBase, taxRate) {
  const base = D(taxableBase);
  const rate = D(taxRate).dividedBy(100);
  if (base.isZero() || rate.isZero()) return 0;
  return toMoney(base.times(rate));
}

/**
 * calculateDiscount(subtotal, discountType, discountValue)
 * discountType: 'percent' | 'fixed'
 */
export function calculateDiscount(subtotal, discountType, discountValue) {
  const sub = D(subtotal);
  const val = D(discountValue);
  if (val.isZero()) return 0;
  if (discountType === 'percent') {
    return toMoney(sub.times(val.dividedBy(100)));
  }
  return toMoney(val);
}

/**
 * calculateGrandTotal(subtotal, tax, discount)
 * Grand total = subtotal + tax - discount. Never returns negative.
 */
export function calculateGrandTotal(subtotal, tax, discount) {
  const result = D(subtotal).plus(D(tax)).minus(D(discount));
  return toMoney(Decimal.max(result, 0));
}

/**
 * calculateDeposit(grandTotal, depositPercent)
 */
export function calculateDeposit(grandTotal, depositPercent) {
  return toMoney(D(grandTotal).times(D(depositPercent).dividedBy(100)));
}

/**
 * suggestPriceFromCost(unitCost, targetMargin)
 * Returns the minimum sell price to achieve targetMargin (0–1).
 * Formula: price = cost / (1 - margin)
 * Guards against division by zero and invalid inputs.
 * @param {number} unitCost - Internal cost per unit
 * @param {number} targetMargin - Decimal margin (e.g. 0.30 for 30%)
 * @returns {number} Suggested sell price rounded to 2 decimals, or 0 if invalid
 */
export function suggestPriceFromCost(unitCost, targetMargin = 0.30) {
  const cost   = D(unitCost);
  const margin = D(targetMargin);
  if (cost.isZero() || cost.isNegative()) return 0;
  if (margin.gte(1) || margin.isNegative()) return 0;
  return toMoney(cost.dividedBy(new Decimal(1).minus(margin)));
}

/**
 * getNegotiationMeta(unitCost, unitPrice)
 * Central helper for the Negotiation Helper UI (internal only — never in PDF/client docs).
 * Returns margin %, suggested price (30%), floor price (20%), and health status.
 *
 * Formulas:
 *   margin      = (price - cost) / price  [gross margin %]
 *   suggested   = cost / (1 - 0.30)       [price at 30% margin]
 *   floor       = cost / (1 - 0.20)       [price at 20% margin]
 *   status:
 *     healthy  → margin >= 30%
 *     warning  → margin >= 20% && < 30%
 *     critical → margin < 20%
 *
 * @returns {{ margin: number, suggested: number, floor: number, status: 'healthy'|'warning'|'critical'|'none' }}
 */
export function getNegotiationMeta(unitCost, unitPrice) {
  const cost  = D(unitCost);
  const price = D(unitPrice);

  // No cost data → nothing to show
  if (cost.isZero() || cost.isNegative()) return { margin: null, suggested: 0, floor: 0, status: 'none' };

  const suggested = toMoney(cost.dividedBy(new Decimal(1).minus(D(0.30))));
  const floor     = toMoney(cost.dividedBy(new Decimal(1).minus(D(0.20))));

  // If price is 0 or below cost, treat as critical
  if (price.isZero() || price.lte(cost)) {
    return { margin: 0, suggested, floor, status: 'critical' };
  }

  const margin = toMoney(price.minus(cost).dividedBy(price).times(100)); // percentage
  const status =
    margin >= 30 ? 'healthy' :
    margin >= 20 ? 'warning' : 'critical';

  return { margin, suggested, floor, status };
}

// ─── Aggregate Engine (full estimate) ─────────────────────────────────────────

/**
 * runEstimateEngine(groups, { taxRate, discountType, discountValue, depositPercent })
 *
 * Processes all groups → runs all calculations → returns a complete financial snapshot.
 * Also computes internal margin data (totalCost, grossMargin, totalVariance).
 */
export function runEstimateEngine(groups = [], {
  taxRate = 0,
  discountType = 'percent',
  discountValue = 0,
  depositPercent = 0,
  materials = [],
} = {}) {
  // Flatten all items across groups and recalculate each line_total
  const allItems = [];
  const processedGroups = groups.map(group => ({
    ...group,
    items: (group.items || []).map(item => {
      const line_total = calculateLineTotal(item.quantity, item.unit_price);
      const processed = { ...item, line_total };
      allItems.push(processed);
      return processed;
    }),
  }));

  // Process materials items
  const processedMaterials = (materials || []).map(item => {
    const line_total = calculateLineTotal(item.quantity, item.unit_price);
    return { ...item, line_total };
  });
  const materialsSubtotal = toMoney(
    processedMaterials.reduce((acc, item) => acc.plus(D(item.line_total)), new Decimal(0))
  );

  const servicesSubtotal = calculateSubtotal(allItems);
  const subtotal     = toMoney(D(servicesSubtotal).plus(D(materialsSubtotal)));
  const taxableBase  = calculateTaxableBase(allItems);
  const discountAmt  = calculateDiscount(subtotal, discountType, discountValue);
  const taxAmount    = calculateTax(toMoney(D(taxableBase).minus(D(discountAmt))), taxRate);
  const grandTotal   = calculateGrandTotal(subtotal, taxAmount, discountAmt);
  const depositAmt   = calculateDeposit(grandTotal, depositPercent);

  // ── Internal / Audit data (never sent to client) ──
  const materialsCost = toMoney(
    processedMaterials.reduce((acc, item) => acc.plus(D(item.unit_cost).times(D(item.quantity))), new Decimal(0))
  );
  const servicesCost = toMoney(
    allItems.reduce((acc, item) => acc.plus(D(item.unit_cost).times(D(item.quantity))), new Decimal(0))
  );
  const totalCost = toMoney(D(servicesCost).plus(D(materialsCost)));

  const totalVariance = toMoney(
    allItems.reduce((acc, item) => {
      const v = calculateVariance(item.quantity, item.unit_price, item.book_price);
      return v !== null ? acc.plus(D(v)) : acc;
    }, new Decimal(0))
  );

  // Total book value = sum of (book_price * qty) for items that have book data
  const totalBookValue = toMoney(
    allItems.reduce((acc, item) => {
      const b = D(item.book_price);
      return b.isZero() ? acc : acc.plus(b.times(D(item.quantity)));
    }, new Decimal(0))
  );

  const grossMargin    = toMoney(D(grandTotal).minus(D(totalCost)));
  const grossMarginPct = grandTotal > 0
    ? toMoney(D(grossMargin).dividedBy(D(grandTotal)).times(100))
    : 0;

  // marginPercentage: variance vs book (how much above/below book price we're selling)
  const marginPercentage = totalBookValue > 0
    ? toMoney(D(totalVariance).dividedBy(D(totalBookValue)).times(100))
    : 0;

  return {
    // Processed data
    groups: processedGroups,
    materials: processedMaterials,
    materialsSubtotal,
    // Customer-facing financials
    subtotal,
    discountAmount: discountAmt,
    taxAmount,
    total: grandTotal,
    depositAmount: depositAmt,
    // Internal audit (admin only)
    totalCost,
    totalBookValue,
    totalVariance,
    marginPercentage,
    grossMargin,
    grossMarginPct,
  };
}