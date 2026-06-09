/**
 * downstreamItemMapper.js — Shared mapper for Estimate → downstream documents.
 *
 * Used by Invoice, Work Order, and any other document conversion that
 * derives structured line items from Estimate groups.
 *
 * Ensures:
 * - Every item passes through normalizeLineItem (handles legacy aliases)
 * - Transient UI fields are stripped
 * - All canonical fields are preserved
 * - No NaN values
 * - Round-trip safe
 */
import { normalizeLineItem, normalizeGroups, sanitizeForPersistence } from './lineItemNormalizer';

/**
 * CANONICAL_FIELDS — the exact set of fields persisted on downstream items.
 * Any extra fields from normalizeLineItem (spread from raw) are excluded.
 */
const CANONICAL_FIELDS = [
  'id',
  'service_id',
  'service_name',
  'category',
  'description',
  'quantity',
  'unit',
  'unit_price',
  'unit_cost',
  'book_price',
  'line_total',
  'taxable',
];

/**
 * Pick only canonical fields from a normalized item.
 */
function pickCanonical(item) {
  const out = {};
  for (const key of CANONICAL_FIELDS) {
    if (key in item) out[key] = item[key];
  }
  return out;
}

/**
 * mapGroupsToCanonicalItems(groups)
 *
 * Flattens groups[] into a flat array of canonical line items.
 * Each item is normalized, sanitized, and reduced to only canonical fields.
 *
 * @param {Array} groups — estimate-style groups array
 * @returns {Array} flat array of canonical persisted items
 */
export function mapGroupsToCanonicalItems(groups = []) {
  const normalized = normalizeGroups(groups);
  return normalized.flatMap(group =>
    (group.items || []).map(item => pickCanonical(sanitizeForPersistence(item)))
  );
}

/**
 * prepareDownstreamDocument(estimateGroups)
 *
 * Returns both `groups` (normalized) and `line_items` (flat canonical)
 * for downstream document persistence, eliminating ambiguity.
 *
 * @param {Array} estimateGroups — raw or normalized groups from estimate
 * @returns {{ groups: Array, line_items: Array }}
 */
export function prepareDownstreamDocument(estimateGroups = []) {
  const groups = normalizeGroups(estimateGroups);
  const line_items = mapGroupsToCanonicalItems(estimateGroups);
  return { groups, line_items };
}