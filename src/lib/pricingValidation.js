/**
 * pricingValidation.js — Centralized loss prevention validation
 *
 * Returns { canProceed, lossItems, zeroProfitItems, requiresConfirmation }
 * Used by all send/export/print actions in the estimate flow.
 */

/**
 * validateEstimatePricing(estimate)
 *
 * Scans all line items across all groups for pricing violations.
 *
 * @returns {{
 *   canProceed: boolean,          // true if no losses (zero-profit allowed with confirm)
 *   lossItems: Array,             // items where unit_price < unit_cost
 *   zeroProfitItems: Array,       // items where unit_price == unit_cost (within $0.01)
 *   requiresConfirmation: boolean // true if zero-profit items exist but no losses
 * }}
 */
export function validateEstimatePricing(estimate) {
  const lossItems = [];
  const zeroProfitItems = [];

  const groups = estimate?.groups || [];
  groups.forEach(group => {
    (group.items || []).forEach(item => {
      const price = parseFloat(item.unit_price) || 0;
      const cost  = parseFloat(item.unit_cost)  || 0;
      if (cost <= 0 || price <= 0) return; // no cost data or no price — skip

      if (price < cost) {
        lossItems.push({
          name: item.service_name || 'Unnamed',
          unit_price: price,
          unit_cost: cost,
          loss_per_unit: cost - price,
          quantity: parseFloat(item.quantity) || 1,
        });
      } else if (Math.abs(price - cost) < 0.01) {
        zeroProfitItems.push({
          name: item.service_name || 'Unnamed',
          unit_price: price,
          unit_cost: cost,
          quantity: parseFloat(item.quantity) || 1,
        });
      }
    });
  });

  return {
    canProceed: lossItems.length === 0,
    lossItems,
    zeroProfitItems,
    requiresConfirmation: lossItems.length === 0 && zeroProfitItems.length > 0,
  };
}