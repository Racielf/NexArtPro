/**
 * Internal Job Cost Allocator
 *
 * Distributes the Internal Job Cost (Other Costs section) across service
 * line items so that the hidden overhead is recovered inside each unit price
 * the client sees. The client-facing document only ever shows the
 * `final_unit_price` and `final_line_total`.
 *
 * Allocation method (default): proportional by service value.
 *
 * Per-line stored fields:
 *   unit_cost           — true direct cost per unit (input)
 *   markup_pct          — desired markup over unit_cost (input)
 *   base_unit_price     — unit_cost * (1 + markup_pct/100)        (anchor)
 *   allocated_job_cost  — share of internal job cost for this line
 *   final_unit_price    — base_unit_price + allocated_job_cost / qty
 *   pricing_source      — 'manual' | 'cost_markup' | 'allocated'
 *
 * IMPORTANT — no compounding:
 *   Reapplying allocation always recomputes from `base_unit_price`,
 *   never from `final_unit_price`. If `base_unit_price` is missing on
 *   an existing line, we capture it from the current `unit_price` once
 *   and lock it as the anchor for future reapplications.
 */
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const D = (v) => {
  try { return new Decimal(v ?? 0); } catch { return new Decimal(0); }
};
const toMoney = (d) => d.toDecimalPlaces(2).toNumber();

/**
 * Compute the base unit price from cost + markup.
 *   base_unit_price = unit_cost * (1 + markup_pct / 100)
 */
export function computeBaseUnitPrice(unitCost, markupPct) {
  const cost = D(unitCost);
  const markup = D(markupPct);
  if (cost.lte(0)) return 0;
  return toMoney(cost.times(new Decimal(1).plus(markup.dividedBy(100))));
}

/**
 * Resolve the anchor `base_unit_price` for a line:
 *   1. If the line already has a stored `base_unit_price > 0`, use it.
 *   2. Else if `unit_cost > 0` and `markup_pct >= 0`, derive from cost+markup.
 *   3. Else fall back to the current `unit_price` (lock it once).
 *
 * This guarantees reapplying the allocation never compounds — we always
 * start from the same anchor.
 */
export function resolveAnchorBaseUnitPrice(item) {
  const stored = parseFloat(item.base_unit_price) || 0;
  if (stored > 0) return stored;

  const unitCost = parseFloat(item.unit_cost) || 0;
  const markupPct = parseFloat(item.markup_pct);
  if (unitCost > 0 && Number.isFinite(markupPct)) {
    return computeBaseUnitPrice(unitCost, markupPct);
  }

  return parseFloat(item.unit_price) || 0;
}

/**
 * Apply Internal Job Cost Allocation across all service line items.
 *
 *   1. base_line_total      = qty * base_unit_price
 *   2. services_base_total  = Σ base_line_total
 *   3. line_weight          = base_line_total / services_base_total
 *   4. allocated_job_cost   = internalJobCost * line_weight
 *   5. final_line_total     = base_line_total + allocated_job_cost
 *   6. final_unit_price     = final_line_total / qty
 *
 * Returns updated `groups` with the new fields stored on each line item.
 *
 * If `internalJobCost <= 0` or `services_base_total <= 0`, allocation is
 * cleared and `final_unit_price` falls back to `base_unit_price`.
 */
export function applyInternalJobCostAllocation(groups = [], internalJobCost = 0) {
  const jobCost = D(internalJobCost);

  // Pass 1: resolve anchor base_unit_price + base_line_total per line.
  const enriched = groups.map(group => ({
    ...group,
    items: (group.items || []).map(item => {
      const qty = D(item.quantity);
      const baseUnitPrice = D(resolveAnchorBaseUnitPrice(item));
      const baseLineTotal = qty.times(baseUnitPrice);
      return { item, qty, baseUnitPrice, baseLineTotal };
    }),
  }));

  // Total base value across all service lines.
  const servicesBaseTotal = enriched.reduce(
    (acc, g) => g.items.reduce((a, e) => a.plus(e.baseLineTotal), acc),
    new Decimal(0)
  );

  const canAllocate = jobCost.gt(0) && servicesBaseTotal.gt(0);
  let lineCount = 0;
  let appliedTotal = new Decimal(0);

  // Pass 2: write base + allocation back onto each line item.
  const updatedGroups = enriched.map(g => ({
    ...g,
    items: g.items.map(({ item, qty, baseUnitPrice, baseLineTotal }) => {
      lineCount += 1;
      const baseUnitPriceNum = toMoney(baseUnitPrice);
      const baseLineTotalNum = toMoney(baseLineTotal);

      let allocatedJobCost = 0;
      let finalUnitPrice = baseUnitPriceNum;
      let finalLineTotal = baseLineTotalNum;
      let pricingSource = 'cost_markup';

      if (canAllocate && baseLineTotal.gt(0)) {
        const weight = baseLineTotal.dividedBy(servicesBaseTotal);
        const allocated = jobCost.times(weight);
        allocatedJobCost = toMoney(allocated);
        appliedTotal = appliedTotal.plus(allocated);

        const finalLine = baseLineTotal.plus(allocated);
        finalLineTotal = toMoney(finalLine);
        finalUnitPrice = qty.gt(0) ? toMoney(finalLine.dividedBy(qty)) : baseUnitPriceNum;
        pricingSource = 'allocated';
      } else if (!canAllocate) {
        // Clear any previous allocation.
        allocatedJobCost = 0;
        finalUnitPrice = baseUnitPriceNum;
        finalLineTotal = baseLineTotalNum;
        pricingSource = baseUnitPriceNum > 0 ? 'cost_markup' : (item.pricing_source || 'manual');
      }

      return {
        ...item,
        base_unit_price: baseUnitPriceNum,
        allocated_job_cost: allocatedJobCost,
        final_unit_price: finalUnitPrice,
        // Sync the live unit_price/line_total used everywhere else in the engine.
        unit_price: finalUnitPrice,
        line_total: finalLineTotal,
        pricing_source: pricingSource,
        allocation_applied_at: pricingSource === 'allocated' ? (item.allocation_applied_at || new Date().toISOString()) : null,
      };
    }),
  }));

  return {
    groups: updatedGroups,
    summary: {
      lineCount,
      servicesBaseTotal: toMoney(servicesBaseTotal),
      internalJobCost: toMoney(jobCost),
      allocatedTotal: toMoney(appliedTotal),
      applied: canAllocate,
    },
  };
}

/**
 * Clear allocation from all lines and revert unit_price to base_unit_price.
 * Useful when Internal Job Cost is removed or the operator wants to undo.
 */
export function clearInternalJobCostAllocation(groups = []) {
  return applyInternalJobCostAllocation(groups, 0).groups;
}