/**
 * pricingValidation.js — Centralized loss prevention validation
 *
 * Returns { canProceed, lossItems, zeroProfitItems, materialsWithoutCost, requiresConfirmation }
 * Used by all send/export/print actions in the estimate flow.
 */

/**
 * validateMaterialsCostCompleteness(estimate)
 *
 * Detects materials with quantity > 0 but missing or zero internal cost.
 * Returns array of problematic materials with useful display data.
 */
export function validateMaterialsCostCompleteness(estimate) {
  const materials = Array.isArray(estimate?.materials) ? estimate.materials : [];
  const result = [];

  materials.forEach(m => {
    const qty = parseFloat(m.quantity) || 0;
    const unitCost = parseFloat(m.unit_cost) || 0;
    if (qty > 0 && unitCost <= 0) {
      result.push({
        name: m.name || 'Unnamed material',
        quantity: qty,
        unit: m.unit || 'ea',
        unit_price: parseFloat(m.unit_price) || 0,
        unit_cost: unitCost,
      });
    }
  });

  return result;
}

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

  // Materials without internal cost
  const materialsWithoutCost = validateMaterialsCostCompleteness(estimate);

  return {
    canProceed: lossItems.length === 0,
    lossItems,
    zeroProfitItems,
    materialsWithoutCost,
    requiresConfirmation: lossItems.length === 0 && (zeroProfitItems.length > 0 || materialsWithoutCost.length > 0),
  };
}