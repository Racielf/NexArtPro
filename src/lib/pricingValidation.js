/**
 * pricingValidation.js — Centralized pre-send validation
 *
 * Returns { canProceed, lossItems, zeroProfitItems, materialsWithoutCost, requiresConfirmation }
 * Also exports attachment completeness heuristic.
 * Used by all send/export/print actions in the estimate flow.
 */

// ─── Keywords that suggest supporting documents are expected ─────────────────
const ATTACHMENT_KEYWORDS = [
  'plan', 'plans', 'drawing', 'drawings', 'blueprint', 'blueprints',
  'permit', 'permits', 'spec', 'specs', 'specification', 'specifications',
  'photo', 'photos', 'picture', 'pictures', 'image', 'images',
  'material list', 'scope of work', 'sow', 'diagram', 'diagrams',
  'survey', 'inspection', 'certificate', 'attachment', 'document',
  'floor plan', 'site plan', 'elevation', 'schematic',
];

/**
 * checkAttachmentCompleteness(estimate)
 *
 * Lightweight heuristic: detects if an estimate likely needs
 * supporting documents but has none marked for client delivery.
 *
 * Returns { needsWarning: boolean, reasons: string[] }
 */
export function checkAttachmentCompleteness(estimate) {
  if (!estimate) return { needsWarning: false, reasons: [] };

  // Count client-facing attachments
  const clientAtts = (Array.isArray(estimate.attachments) ? estimate.attachments : [])
    .filter(a => a.intent === 'send_to_client');

  // If attachments already exist, no warning needed
  if (clientAtts.length > 0) return { needsWarning: false, reasons: [] };

  const reasons = [];

  // Signal 1: BID document type (commercial bids typically require plans/specs)
  if (estimate.document_type === 'BID') {
    reasons.push('This is a BID document — plans or specifications are typically expected');
  }

  // Signal 2: Plan reference or job number present
  if (estimate.plan_reference?.trim()) {
    reasons.push(`Plan reference "${estimate.plan_reference}" is set — the referenced plans may need to be attached`);
  }
  if (estimate.job_number?.trim()) {
    reasons.push(`Job number "${estimate.job_number}" is set — project documents may be expected`);
  }

  // Signal 3: Keyword scan in title, notes, exclusions
  const textToScan = [
    estimate.title || '',
    estimate.notes || '',
    estimate.exclusions || '',
  ].join(' ').toLowerCase();

  const found = ATTACHMENT_KEYWORDS.filter(kw => textToScan.includes(kw));
  if (found.length > 0) {
    const unique = [...new Set(found)].slice(0, 3);
    reasons.push(`Estimate text mentions: ${unique.join(', ')}`);
  }

  return {
    needsWarning: reasons.length > 0,
    reasons,
  };
}

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