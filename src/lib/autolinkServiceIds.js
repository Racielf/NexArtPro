/**
 * autolinkServiceIds.js — Resolves service_id on price book entries
 * by matching against the services catalog.
 *
 * Matching cascade (per PB entry):
 *   1. Existing truthy service_id → keep
 *   2. Exact normalized name match (name or _service_name_ref)
 *   3. Alias match from Service.aliases
 *   4. Fuzzy token-overlap match (unambiguous, score ≥ 0.55)
 *
 * RULES:
 * - Never overwrites an existing truthy service_id
 * - Detects duplicate service names
 * - Reports unmatched price book entries
 * - Never throws — returns stats for safe logging
 */
import { buildServiceIndex, findBestMatch } from './serviceReconciler';

/**
 * @param {Array} services  — Service catalog entries (each must have .id and .name)
 * @param {Array} priceBook — Price book entries (each may have .service_id, ._service_name_ref, .display_name)
 * @returns {{ linked: Array, stats: { totalPB, alreadyLinked, newlyLinked, unmatched, duplicateServices }, unmatched: Array, duplicates: Array }}
 */
export function autolinkServiceIds(services = [], priceBook = []) {
  // Build index with exact + alias + fuzzy support
  const index = buildServiceIndex(services);

  // Detect duplicate service names
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const seenNames = new Map();
  const duplicates = [];
  for (const svc of services) {
    const key = norm(svc.name);
    if (!key) continue;
    if (seenNames.has(key)) {
      duplicates.push({ name: svc.name, ids: [seenNames.get(key), svc.id] });
    } else {
      seenNames.set(key, svc.id);
    }
  }

  let alreadyLinked = 0;
  let newlyLinked = 0;
  const unmatchedEntries = [];

  const linked = priceBook.map(pb => {
    // Already has a valid service_id — keep it
    if (pb.service_id) {
      alreadyLinked++;
      return pb;
    }

    // Try matching using the reconciler (exact → alias → fuzzy)
    const refName = pb._service_name_ref || pb.display_name;
    const match = findBestMatch(refName, index);

    if (match) {
      newlyLinked++;
      return { ...pb, service_id: match.service.id };
    }

    unmatchedEntries.push({
      name: refName,
      category: pb.category,
      id: pb.id,
    });
    return pb;
  });

  const stats = {
    totalPB: priceBook.length,
    alreadyLinked,
    newlyLinked,
    unmatched: unmatchedEntries.length,
    duplicateServices: duplicates.length,
  };

  return { linked, stats, unmatched: unmatchedEntries, duplicates };
}