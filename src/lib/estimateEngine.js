import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const D = (v) => {
  try { return new Decimal(v ?? 0); } catch { return new Decimal(0); }
};

const toMoney = (d) => d.toDecimalPlaces(2).toNumber();

export function calculateLineTotal(qty, unit_price) {
  const q = D(qty);
  const p = D(unit_price);
  if (q.isZero() || p.isZero()) return 0;
  return toMoney(q.times(p));
}

export function calculateVariance(qty, unit_price, book_price) {
  const q = D(qty);
  const p = D(unit_price);
  const b = D(book_price);
  if (b.isZero()) return null;
  return toMoney(p.minus(b).times(q));
}

export function calculateSubtotal(lineItems = []) {
  return toMoney(
    lineItems.reduce((acc, item) => acc.plus(D(item.line_total)), new Decimal(0))
  );
}

export function calculateTaxableBase(lineItems = []) {
  return toMoney(
    lineItems.reduce((acc, item) => {
      return item.taxable !== false ? acc.plus(D(item.line_total)) : acc;
    }, new Decimal(0))
  );
}

export function calculateTax(taxableBase, taxRate) {
  const base = D(taxableBase);
  const rate = D(taxRate).dividedBy(100);
  if (base.isZero() || rate.isZero()) return 0;
  return toMoney(base.times(rate));
}

export function calculateDiscount(subtotal, discountType, discountValue) {
  const sub = D(subtotal);
  const val = D(discountValue);
  if (val.isZero()) return 0;
  if (discountType === 'percent') {
    return toMoney(sub.times(val.dividedBy(100)));
  }
  return toMoney(val);
}

export function calculateGrandTotal(subtotal, tax, discount) {
  const result = D(subtotal).plus(D(tax)).minus(D(discount));
  return toMoney(Decimal.max(result, 0));
}

export function calculateDeposit(grandTotal, depositPercent) {
  return toMoney(D(grandTotal).times(D(depositPercent).dividedBy(100)));
}

export function suggestPriceFromCost(unitCost, targetMargin = 0.30) {
  const cost = D(unitCost);
  const margin = D(targetMargin);
  if (cost.isZero() || cost.isNegative()) return 0;
  if (margin.gte(1) || margin.isNegative()) return 0;
  return toMoney(cost.dividedBy(new Decimal(1).minus(margin)));
}

export function getNegotiationMeta(unitCost, unitPrice) {
  const cost = D(unitCost);
  const price = D(unitPrice);

  if (cost.isZero() || cost.isNegative()) return { margin: null, suggested: 0, floor: 0, status: 'none' };

  const suggested = toMoney(cost.dividedBy(new Decimal(1).minus(D(0.30))));
  const floor = toMoney(cost.dividedBy(new Decimal(1).minus(D(0.20))));

  if (price.isZero() || price.lte(cost)) {
    return { margin: 0, suggested, floor, status: 'critical' };
  }

  const margin = toMoney(price.minus(cost).dividedBy(price).times(100));
  const status = margin >= 30 ? 'healthy' : margin >= 20 ? 'warning' : 'critical';

  return { margin, suggested, floor, status };
}

export function runEstimateEngine(groups = [], {
  taxRate = 0,
  discountType = 'percent',
  discountValue = 0,
  depositPercent = 0,
  materials = [],
  otherCosts = [],
  billMaterialsToClient = true,
  billOtherCostsToClient = false,
} = {}) {
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

  const processedMaterials = (materials || []).map(item => {
    const line_total = calculateLineTotal(item.quantity, item.unit_price);
    return { ...item, line_total };
  });

  const materialsSubtotal = toMoney(
    processedMaterials.reduce((acc, item) => acc.plus(D(item.line_total)), new Decimal(0))
  );

  const servicesSubtotal = calculateSubtotal(allItems);
  const materialsRevenue = billMaterialsToClient ? materialsSubtotal : 0;

  // Other Costs total — always computed for internal cost accounting.
  const otherCostsTotalEarly = toMoney(
    (otherCosts || []).reduce((acc, c) => acc.plus(D(c.amount)), new Decimal(0))
  );
  // Anti-double-charge guard: if Internal Job Cost is already allocated into
  // service Unit Prices, it must NOT also be added as a separate client line.
  const allItems_flat = groups.flatMap(g => g.items || []);
  const allocationIsApplied = allItems_flat.some(i => i.pricing_source === 'allocated');
  // Other Costs revenue — only contributes to client-facing subtotal when explicitly billed
  // AND when not already recovered through allocation (prevents double-charging).
  const otherCostsRevenue = (billOtherCostsToClient && !allocationIsApplied) ? otherCostsTotalEarly : 0;

  // CLIENT-FACING SUBTOTAL — single source of truth.
  // Formula: services + (materials if billed) + (other costs if billed).
  const subtotal = toMoney(D(servicesSubtotal).plus(D(materialsRevenue)).plus(D(otherCostsRevenue)));
  const taxableBase = toMoney(D(calculateTaxableBase(allItems)).plus(D(materialsRevenue)).plus(D(otherCostsRevenue)));
  const discountAmt = calculateDiscount(subtotal, discountType, discountValue);
  const taxAmount = calculateTax(toMoney(D(taxableBase).minus(D(discountAmt))), taxRate);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount, discountAmt);
  const depositAmt = calculateDeposit(grandTotal, depositPercent);

  // serviceCost (sum of service unit_cost × qty) is kept as REFERENCE ONLY.
  // It is NOT included in totalCost. Per the official profit model, only
  // Internal Job Cost (otherCostsTotal) counts as expense against profit.
  // Service unit_cost remains visible in the editor purely as a catalog reference.
  const serviceCostReference = toMoney(
    allItems.reduce((acc, item) => acc.plus(D(item.unit_cost).times(D(item.quantity))), new Decimal(0))
  );

  // materialsCostReference is kept for backwards-compatible field output but
  // does NOT contribute to totalCost. Materials only count as expense if
  // entered manually under Internal Job Cost.
  const materialsCostReference = toMoney(
    processedMaterials.reduce((acc, item) => {
      const cost = D(item.unit_cost);
      return acc.plus(cost.times(D(item.quantity)));
    }, new Decimal(0))
  );

  const otherCostsTotal = otherCostsTotalEarly;

  // Official profit model:
  //   Internal Job Cost = otherCostsTotal (the only expense bucket)
  //   Net Profit        = Estimate Total − Internal Job Cost
  // Service & material unit_cost values are catalog reference only.
  const totalCost = otherCostsTotal;
  const serviceCost = serviceCostReference;
  const materialsCost = materialsCostReference;

  const totalVariance = toMoney(
    allItems.reduce((acc, item) => {
      const v = calculateVariance(item.quantity, item.unit_price, item.book_price);
      return v !== null ? acc.plus(D(v)) : acc;
    }, new Decimal(0))
  );

  const totalBookValue = toMoney(
    allItems.reduce((acc, item) => {
      const b = D(item.book_price);
      return b.isZero() ? acc : acc.plus(b.times(D(item.quantity)));
    }, new Decimal(0))
  );

  // Revenue = Subtotal (before discount/tax) — used for internal panel reference.
  const revenue = subtotal;

  // Official profit formulas:
  //   Net Profit   = Estimate Total (grandTotal) − Internal Job Cost (totalCost)
  //   Net Margin % = Net Profit / Estimate Total × 100
  const netProfit = toMoney(D(grandTotal).minus(D(totalCost)));
  const netProfitPct = grandTotal > 0
    ? toMoney(D(netProfit).dividedBy(D(grandTotal)).times(100))
    : 0;

  // grossMargin / grossMarginPct kept for backwards compatibility with
  // downstream consumers (estimate fields, reports). Aligned with Net Profit.
  const grossMargin = netProfit;
  const grossMarginPct = netProfitPct;
  const markupPercentage = totalCost > 0
    ? toMoney(D(netProfit).dividedBy(D(totalCost)).times(100))
    : 0;

  const marginPercentage = totalBookValue > 0
    ? toMoney(D(totalVariance).dividedBy(D(totalBookValue)).times(100))
    : 0;

  return {
    groups: processedGroups,
    materials: processedMaterials,
    materialsSubtotal,
    materialsRevenue,
    servicesSubtotal,
    subtotal,
    discountAmount: discountAmt,
    taxAmount,
    total: grandTotal,
    depositAmount: depositAmt,
    totalCost,
    serviceCost,
    materialsCost,
    totalBookValue,
    totalVariance,
    marginPercentage,
    grossMargin,
    grossMarginPct,
    markupPercentage,
    otherCostsTotal,
    revenue,
    netProfit,
    netProfitPct,
  };
}