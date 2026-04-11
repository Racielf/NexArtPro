/**
 * lineItemNormalizer.js — Single source of truth for line item shape.
 *
 * CANONICAL SHAPE:
 * { id, service_id, service_name, category, description,
 *   quantity, unit, unit_price, unit_cost, book_price, line_total, taxable }
 *
 * Use `normalizeLineItem` on every line item entering the system
 * (legacy load, group init, picker result, import).
 *
 * RULES:
 *   - Never mutates the original object
 *   - NaN-safe: every numeric field falls back to a safe default
 *   - Backward-compatible: preserves any extra fields on the object
 */

const safeNum = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};

/** Like safeNum but clamps to >= 0 (prices, quantities must never be negative) */
const safeNonNeg = (v, fallback = 0) => Math.max(0, safeNum(v, fallback));

const safeStr = (v, fallback = '') =>
  typeof v === 'string' ? v : (v != null ? String(v) : fallback);

/**
 * Normalize a single line item to the canonical shape.
 * Legacy aliases (e.g. `name`, `total_price`) are resolved automatically.
 */
export function normalizeLineItem(raw = {}) {
  const quantity   = safeNonNeg(raw.quantity, 1);
  const unit_price = safeNonNeg(raw.unit_price, 0);
  const unit_cost  = safeNonNeg(raw.unit_cost, 0);
  const book_price = safeNonNeg(raw.book_price, 0);
  // line_total: use stored value if valid, otherwise recalculate
  const storedTotal = safeNonNeg(raw.line_total) || safeNonNeg(raw.total_price);
  const line_total  = storedTotal || (quantity * unit_price);

  // service_name: resolve legacy alias 'name', guard empty
  const resolvedName = safeStr(raw.service_name || raw.name);

  // service_id: preserve string IDs, reject non-string truthy garbage
  const rawSid = raw.service_id;
  const service_id = (typeof rawSid === 'string' && rawSid.length > 0) ? rawSid : null;

  return {
    ...raw,
    id:           raw.id || Math.random().toString(36).slice(2, 10),
    service_id,
    service_name: resolvedName || '(unnamed)',
    category:     safeStr(raw.category) || 'Misc',
    description:  safeStr(raw.description),
    quantity,
    unit:         safeStr(raw.unit, 'ea'),
    unit_price,
    unit_cost,
    book_price,
    line_total:   safeNonNeg(line_total, 0),
    taxable:      raw.taxable !== false,
  };
}

/**
 * Normalize an entire groups array (including legacy line_items fallback).
 * Safe to call on already-normalized data (idempotent).
 */
export function normalizeGroups(groups = []) {
  return groups.map(g => ({
    ...g,
    items: (g.items || []).map(normalizeLineItem),
  }));
}

/**
 * Build normalized groups from an estimate that may have groups[] or legacy line_items[].
 */
export function resolveAndNormalizeGroups(estimate) {
  if (estimate?.groups?.length) {
    return normalizeGroups(estimate.groups);
  }
  if (estimate?.line_items?.length) {
    return [{
      id: Math.random().toString(36).slice(2, 10),
      name: 'General',
      collapsed: false,
      items: estimate.line_items.map(normalizeLineItem),
    }];
  }
  return [];
}