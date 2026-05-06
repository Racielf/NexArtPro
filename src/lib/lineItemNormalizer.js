/**
 * lineItemNormalizer.js — Single source of truth for line item shape.
 *
 * CANONICAL SHAPE:
 * { id, service_id, service_name, category, description,
 *   quantity, unit, unit_price, unit_cost, markup_pct, book_price, line_total, taxable }
 *
 * Use `normalizeLineItem` on every line item entering the system
 * (legacy load, group init, picker result, import).
 *
 * RULES:
 *   - Never mutates the original object
 *   - NaN-safe: every numeric field falls back to a safe default
 *   - Backward-compatible: preserves any extra fields on the object
 *   - Reconciles service_name → service_id when possible
 */
import { getServices } from '@/lib/catalogCache';
import { buildServiceIndex, findBestMatch } from '@/lib/serviceReconciler';

// Lazy-built index, refreshed when services cache changes
let _indexCache = null;
let _indexServicesRef = null;

function getServiceIndex() {
  const services = getServices();
  // Rebuild if the services array reference changed
  if (services !== _indexServicesRef) {
    _indexServicesRef = services;
    _indexCache = buildServiceIndex(services);
  }
  return _indexCache;
}

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
  const markup_pct = raw.markup_pct !== undefined
    ? safeNonNeg(raw.markup_pct, 0)
    : (unit_cost > 0 && unit_price > 0 ? ((unit_price - unit_cost) / unit_cost) * 100 : 0);
  const book_price = safeNonNeg(raw.book_price, 0);
  // line_total: ALWAYS recalculate from quantity * unit_price to enforce contract.
  // Only fall back to stored value when unit_price is 0 (legacy items with no price set).
  const computed = quantity * unit_price;
  const line_total = computed > 0
    ? computed
    : (safeNonNeg(raw.line_total) || safeNonNeg(raw.total_price) || 0);

  // service_name: resolve legacy alias 'name', guard empty
  const resolvedName = safeStr(raw.service_name || raw.name);

  // service_id: preserve string IDs, reject non-string truthy garbage
  const rawSid = raw.service_id;
  let service_id = (typeof rawSid === 'string' && rawSid.length > 0) ? rawSid : null;

  // Reconcile: if no service_id but we have a name, try matching against canonical Services
  if (!service_id && resolvedName && resolvedName !== '(unnamed)') {
    const index = getServiceIndex();
    const match = findBestMatch(resolvedName, index);
    if (match) {
      service_id = match.service.id;
    }
  }

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
    markup_pct: raw.markup_pct !== undefined ? markup_pct : undefined,
    markup_override: raw.markup_override === true,
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

/** Canonical material fields — the only keys that should exist on a material item. */
const CANONICAL_MATERIAL_FIELDS = new Set([
  'id', 'name', 'description', 'quantity', 'unit',
  'unit_price', 'unit_cost', 'line_total',
]);

/** Legacy aliases that may appear on old materials data. */
const MATERIAL_LEGACY_ALIASES = new Set([
  'cost', 'price', 'total', 'material_name',
]);

/**
 * Normalize a single material item to canonical shape.
 * Resolves legacy aliases: cost → unit_cost, price → unit_price, total → line_total, material_name → name.
 * Always recalculates line_total from quantity * unit_price.
 * Strips legacy alias fields from the output to prevent re-persistence of bad shapes.
 */
export function normalizeMaterial(raw = {}) {
  const quantity   = safeNonNeg(raw.quantity, 1);
  const unit_price = safeNonNeg(raw.unit_price ?? raw.price, 0);
  const unit_cost  = safeNonNeg(raw.unit_cost ?? raw.cost, 0);
  const computed   = quantity * unit_price;
  const line_total = computed > 0
    ? computed
    : (safeNonNeg(raw.line_total) || safeNonNeg(raw.total) || 0);

  // Dev warning for non-canonical fields (only in development)
  if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    const legacyKeys = Object.keys(raw).filter(k => MATERIAL_LEGACY_ALIASES.has(k));
    if (legacyKeys.length > 0) {
      console.warn(`[normalizeMaterial] Legacy fields detected: ${legacyKeys.join(', ')} — auto-resolved to canonical shape`);
    }
  }

  return {
    id:          raw.id || Math.random().toString(36).slice(2, 10),
    name:        safeStr(raw.name || raw.material_name),
    description: safeStr(raw.description),
    quantity,
    unit:        safeStr(raw.unit, 'ea'),
    unit_price,
    unit_cost,
    line_total:  safeNonNeg(line_total, 0),
  };
}

/**
 * Normalize an entire materials array.
 * Safe to call on already-normalized data (idempotent).
 */
export function normalizeMaterials(materials = []) {
  return (materials || []).map(normalizeMaterial);
}

/**
 * Strip any non-canonical fields from a material before persistence.
 * Use this at save boundaries to guarantee clean data.
 */
export function sanitizeMaterialForPersistence(item) {
  const out = {};
  for (const key of CANONICAL_MATERIAL_FIELDS) {
    if (key in item) out[key] = item[key];
  }
  return out;
}

/**
 * Check if a material object uses only canonical fields.
 * Returns true if clean, false if legacy/extra fields are present.
 */
export function isCanonicalMaterialShape(item) {
  return Object.keys(item).every(k => CANONICAL_MATERIAL_FIELDS.has(k));
}

/**
 * Strip transient UI-only fields before persistence.
 * Keeps all canonical fields intact.
 */
export function sanitizeForPersistence(item) {
  const { _from_picker, _is_new, _score, ...clean } = item;
  return clean;
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