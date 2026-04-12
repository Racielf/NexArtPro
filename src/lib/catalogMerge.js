/**
 * catalogMerge.js — Ensures the live Base44 catalog is complete.
 *
 * After any import or initial load, checks for seed services/PB entries
 * that have no equivalent in the live database and inserts them.
 *
 * Uses the serviceReconciler for intelligent duplicate detection so that
 * "Concrete Slab Installation (4" Standard)" in the seed won't be inserted
 * if the live DB already has "Concrete Slab Install (4 inch)" etc.
 *
 * RULES:
 *   - Never overwrites existing live records
 *   - Only inserts truly missing seed entries
 *   - Respects deactivated records (won't re-insert if user deactivated)
 *   - Logs what it adds for auditability
 */
import { base44 } from '@/api/base44Client';
import { SERVICES_SEED } from '@/components/settings/services/servicesSeed';
import { PRICE_BOOK_SEED } from '@/components/settings/pricebook/priceBookSeed';
import { buildServiceIndex, findBestMatch } from '@/lib/serviceReconciler';

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Ensure all seed Services exist in the live Base44 Service entity.
 * Returns { added: string[], skipped: string[] }
 */
export async function ensureServicesComplete(liveServices) {
  // Build index from live data (includes all, even inactive)
  const index = buildServiceIndex(liveServices);
  const toInsert = [];

  for (const seed of SERVICES_SEED) {
    // Check: exact name, alias, or fuzzy match
    const match = findBestMatch(seed.name, index, { threshold: 0.50, ambiguityGap: 0.10 });
    if (!match) {
      toInsert.push({
        name: seed.name,
        category: seed.category,
        description: seed.description || '',
        unit: seed.default_unit || 'each',
        is_active: true,
        type: 'service',
      });
    }
  }

  if (toInsert.length === 0) {
    return { added: [], skipped: SERVICES_SEED.map(s => s.name) };
  }

  console.info(`[CatalogMerge] Adding ${toInsert.length} missing seed services:`, toInsert.map(s => s.name));

  // Bulk create in batches of 50
  for (let i = 0; i < toInsert.length; i += 50) {
    await base44.entities.Service.bulkCreate(toInsert.slice(i, i + 50));
  }

  return {
    added: toInsert.map(s => s.name),
    skipped: SERVICES_SEED.filter(s => !toInsert.some(t => t.name === s.name)).map(s => s.name),
  };
}

/**
 * Ensure all seed PriceBookEntry records exist in the live Base44 PriceBookEntry entity.
 * Uses display_name matching with reconciler for dedup.
 * Returns { added: number, skipped: number }
 */
export async function ensurePriceBookComplete(livePB, liveServices) {
  // Build a name index from live PB entries
  const liveNames = new Map();
  for (const pb of livePB) {
    const key = norm(pb.display_name);
    if (key) liveNames.set(key, pb);
  }

  // Also build a service index for linking
  const svcIndex = buildServiceIndex(liveServices);
  const toInsert = [];

  for (const seedPB of PRICE_BOOK_SEED) {
    const seedName = norm(seedPB.display_name || seedPB._service_name_ref);

    // Check exact name match in live PB
    if (liveNames.has(seedName)) continue;

    // Check fuzzy match against live PB names (avoid semantic dupes)
    const pbAsServices = livePB.map(pb => ({ id: pb.id, name: pb.display_name, aliases: [] }));
    const pbIndex = buildServiceIndex(pbAsServices);
    const pbMatch = findBestMatch(seedPB.display_name, pbIndex, { threshold: 0.55, ambiguityGap: 0.12 });
    if (pbMatch) continue;

    // Resolve service_id from live services
    const svcMatch = findBestMatch(seedPB.display_name || seedPB._service_name_ref, svcIndex);

    toInsert.push({
      display_name: seedPB.display_name || seedPB._service_name_ref,
      service_id: svcMatch ? svcMatch.service.id : '',
      type: seedPB.type || 'service',
      category: seedPB.category || 'Misc',
      unit: seedPB.unit || 'each',
      unit_price: seedPB.unit_price ?? 0,
      unit_cost: seedPB.unit_cost ?? 0,
      book_price: seedPB.book_price ?? 0,
      markup: seedPB.markup ?? 0,
      notes: seedPB.notes || '',
      is_active: true,
      needs_review: false,
      source: 'seed',
    });
  }

  if (toInsert.length === 0) {
    return { added: 0, skipped: PRICE_BOOK_SEED.length };
  }

  console.info(`[CatalogMerge] Adding ${toInsert.length} missing seed PB entries:`, toInsert.map(s => s.display_name));

  for (let i = 0; i < toInsert.length; i += 50) {
    await base44.entities.PriceBookEntry.bulkCreate(toInsert.slice(i, i + 50));
  }

  return { added: toInsert.length, skipped: PRICE_BOOK_SEED.length - toInsert.length };
}