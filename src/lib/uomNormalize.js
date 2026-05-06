/**
 * uomNormalize — Single source of truth for UOM canonicalization.
 *
 * Why: Catalog data, seed data, and legacy line items use inconsistent UOM labels
 * ("sqft" vs "sq ft", "each" vs "ea", "linear_ft" vs "ln ft"). The estimate
 * editor's <select> options use a fixed set of canonical labels, so when a
 * non-matching value comes in, the dropdown silently keeps the previous unit.
 *
 * This module guarantees every UOM is mapped to its canonical label before
 * being assigned to a line item.
 */

// Canonical UOM labels accepted by the estimate editor select options.
// Keep this in sync with the UNITS array in EstimateGroups.jsx.
export const CANONICAL_UNITS = [
  'ea', 'hr', 'sq ft', 'ln ft', 'day', 'lump sum',
  'ton', 'gal', 'room', 'window', 'door', 'bag', 'box',
  'cu yd', 'pallet', 'roll',
];

// All known aliases → canonical form.
// Lookups are case-insensitive and ignore inner whitespace/underscores.
const ALIAS_MAP = {
  // each
  'ea': 'ea',
  'each': 'ea',
  'unit': 'ea',
  'piece': 'ea',
  'pc': 'ea',

  // square foot
  'sqft': 'sq ft',
  'sq ft': 'sq ft',
  'sf': 'sq ft',
  'square foot': 'sq ft',
  'square feet': 'sq ft',
  'squarefoot': 'sq ft',

  // linear foot
  'lnft': 'ln ft',
  'ln ft': 'ln ft',
  'lf': 'ln ft',
  'linear ft': 'ln ft',
  'linear foot': 'ln ft',
  'linear feet': 'ln ft',
  'linearft': 'ln ft',
  'linear_ft': 'ln ft',

  // cubic yard
  'cuyd': 'cu yd',
  'cu yd': 'cu yd',
  'cy': 'cu yd',
  'cubic yard': 'cu yd',
  'cubic yards': 'cu yd',

  // hour
  'hr': 'hr',
  'hour': 'hr',
  'hours': 'hr',
  'hrs': 'hr',

  // day
  'day': 'day',
  'days': 'day',

  // gallon
  'gal': 'gal',
  'gallon': 'gal',
  'gallons': 'gal',

  // ton
  'ton': 'ton',
  'tons': 'ton',

  // bag / box / room / window / door / pallet / roll
  'bag': 'bag', 'bags': 'bag',
  'box': 'box', 'boxes': 'box',
  'room': 'room', 'rooms': 'room',
  'window': 'window', 'windows': 'window', 'win': 'window',
  'door': 'door', 'doors': 'door',
  'pallet': 'pallet', 'pallets': 'pallet',
  'roll': 'roll', 'rolls': 'roll',

  // lump sum
  'lumpsum': 'lump sum',
  'lump sum': 'lump sum',
  'ls': 'lump sum',
  'project': 'lump sum',
  'proj': 'lump sum',

  // wall (legacy → ea, since wall is not in canonical units)
  'wall': 'ea',
  'walls': 'ea',
};

/**
 * Normalize a UOM string to its canonical form.
 *
 * @param {string|null|undefined} raw — incoming UOM value
 * @param {string} fallback — used when raw is missing/empty/unrecognized (default 'ea')
 * @returns {string} canonical UOM
 */
export function normalizeUOM(raw, fallback = 'ea') {
  if (raw === null || raw === undefined) return fallback;
  const cleaned = String(raw).trim().toLowerCase().replace(/_/g, ' ');
  if (!cleaned) return fallback;
  return ALIAS_MAP[cleaned] || (CANONICAL_UNITS.includes(cleaned) ? cleaned : fallback);
}

/**
 * Resolve the unit for a line item given a picker selection.
 * Rule: prefer the catalog-provided unit when valid, otherwise keep previous.
 */
export function resolvePickedUnit(pickedUnit, previousUnit, fallback = 'ea') {
  if (pickedUnit !== null && pickedUnit !== undefined && String(pickedUnit).trim() !== '') {
    return normalizeUOM(pickedUnit, fallback);
  }
  if (previousUnit) return normalizeUOM(previousUnit, fallback);
  return fallback;
}