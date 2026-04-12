/**
 * autolinkServiceIds.js — Resolves service_id on price book entries
 * by normalized name matching against the services catalog.
 *
 * RULES:
 * - Never overwrites an existing truthy service_id
 * - Normalizes names for comparison (lowercase, trimmed, collapsed whitespace)
 * - Detects duplicate service names
 * - Reports unmatched price book entries
 * - Never throws — returns stats for safe logging
 */

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * @param {Array} services  — Service catalog entries (each must have .id and .name)
 * @param {Array} priceBook — Price book entries (each may have .service_id, ._service_name_ref, .display_name)
 * @returns {{ linked: Array, stats: { totalPB, alreadyLinked, newlyLinked, unmatched, duplicateServices }, unmatched: Array, duplicates: Array }}
 */
export function autolinkServiceIds(services = [], priceBook = []) {
  // Build name → service map, detect duplicates
  const nameMap = new Map();
  const duplicates = [];

  for (const svc of services) {
    const key = normalize(svc.name);
    if (!key) continue;
    if (nameMap.has(key)) {
      duplicates.push({ name: svc.name, ids: [nameMap.get(key).id, svc.id] });
    } else {
      nameMap.set(key, svc);
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

    // Resolve by normalized name
    const refName = normalize(pb._service_name_ref || pb.display_name);
    const match = nameMap.get(refName);

    if (match) {
      newlyLinked++;
      return { ...pb, service_id: match.id };
    }

    unmatchedEntries.push({
      name: pb._service_name_ref || pb.display_name,
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