/**
 * concreteCalculator.js — Derived quantity calculations for concrete services.
 *
 * Business rule:
 *   Customer-facing UOM remains sqft (or whatever the business chooses).
 *   Internal calculations derive volume and material quantities from sqft + thickness.
 *
 * DOES NOT change estimate pricing. quantity × unit_price still drives totals.
 * This is an internal intelligence layer only.
 */

const INCHES_PER_FOOT = 12;
const CUBIC_FEET_PER_YARD = 27;
const CUBIC_FEET_PER_80LB_BAG = 0.6; // ~0.6 ft³ per 80 lb bag of concrete mix

/**
 * Detect if a line item is a concrete-type service.
 * Uses category and/or service name heuristics.
 */
export function isConcreteService(item) {
  if (!item) return false;
  const cat = (item.category || '').toLowerCase();
  const name = (item.service_name || '').toLowerCase();
  if (cat === 'concrete') return true;
  if (/\bconcrete\b/.test(name)) return true;
  if (/\bslab\b/.test(name) && /\binstall/.test(name)) return true;
  return false;
}

/**
 * Extract thickness in inches from the service name or description.
 * Looks for patterns like "4in", "4\"", "4-inch", "6 inch", "(4in)" etc.
 * Returns null if not found.
 */
export function extractThicknessFromName(item) {
  const text = `${item.service_name || ''} ${item.description || ''}`.toLowerCase();
  // Match: 4in, 4", 4-inch, 4 inch, 4-in, (4")
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:"|in(?:ch(?:es)?)?|-in)\b/);
  if (match) return parseFloat(match[1]);
  return null;
}

/**
 * Derive concrete quantities from a line item.
 *
 * @param {Object} item — normalized line item
 * @param {Object} [overrides] — optional manual overrides
 * @param {number} [overrides.thickness_inches] — override auto-detected thickness
 * @param {number} [overrides.waste_percent] — waste factor (default 10%)
 * @returns {Object|null} derived metrics, or null if not a concrete item or insufficient data
 */
export function deriveConcreteMetrics(item, overrides = {}) {
  if (!isConcreteService(item)) return null;

  const sqft = parseFloat(item.quantity) || 0;
  if (sqft <= 0) return null;

  // Resolve thickness: override > extracted from name > default 4"
  const thickness_inches = overrides.thickness_inches
    ?? extractThicknessFromName(item)
    ?? 4;

  const waste_percent = overrides.waste_percent ?? 10;

  // Core volume calculation
  const thickness_feet = thickness_inches / INCHES_PER_FOOT;
  const cubic_feet_raw = sqft * thickness_feet;
  const waste_factor = 1 + (waste_percent / 100);
  const cubic_feet = cubic_feet_raw * waste_factor;
  const cubic_yards = cubic_feet / CUBIC_FEET_PER_YARD;
  const bag_count_80lb = Math.ceil(cubic_feet / CUBIC_FEET_PER_80LB_BAG);

  return {
    calculation_type: 'concrete',
    input_sqft: sqft,
    thickness_inches,
    waste_percent,
    // Raw (before waste)
    cubic_feet_raw: round2(cubic_feet_raw),
    // With waste
    cubic_feet: round2(cubic_feet),
    cubic_yards: round2(cubic_yards),
    bag_count_80lb,
    // Formatted for display
    summary: `${round2(cubic_yards)} yd³ (${thickness_inches}" thick, ${waste_percent}% waste)`,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}