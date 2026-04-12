/**
 * servicePersistence.js — CRUD helpers for persistent Services + Price Book
 *
 * Uses Base44 entities as the source of truth:
 *   - Service entity for the service catalog
 *   - PriceBookEntry entity for price book items
 *
 * On first load, if no records exist, seeds from the static seed data.
 * After load with existing data, merges any missing seed records.
 * After any write, invalidates all caches so the picker reflects changes.
 */
import { base44 } from '@/api/base44Client';
import { SERVICES_SEED } from '@/components/settings/services/servicesSeed';
import { PRICE_BOOK_SEED } from '@/components/settings/pricebook/priceBookSeed';
import { invalidateCatalogCache } from '@/lib/catalogCache';
import { invalidateBase44ServiceCache } from '@/components/shared/services/serviceSearchBase44';
import { autolinkServiceIds } from '@/lib/autolinkServiceIds';
import { buildServiceIndex, findBestMatch } from '@/lib/serviceReconciler';
import { ensureServicesComplete, ensurePriceBookComplete } from '@/lib/catalogMerge';

/**
 * Invalidate all caches after a write operation.
 * Awaits cache refresh so callers get fresh data.
 */
async function invalidateAllCaches() {
  invalidateBase44ServiceCache();
  await invalidateCatalogCache();
}

// ── Services ───────────────────────────────────────────────────────────────

/**
 * Load all services. If empty, bulk-seed from SERVICES_SEED.
 * If records exist, merge any missing seed services (e.g. Concrete).
 */
export async function loadServices() {
  let records = await base44.entities.Service.list('-created_date', 500);
  if (records.length === 0) {
    // First run — seed from static data
    const seedData = SERVICES_SEED.map(s => ({
      name: s.name,
      category: s.category,
      description: s.description || '',
      unit: s.default_unit || 'each',
      is_active: s.is_active !== false,
      type: 'service',
    }));
    for (let i = 0; i < seedData.length; i += 50) {
      await base44.entities.Service.bulkCreate(seedData.slice(i, i + 50));
    }
    records = await base44.entities.Service.list('-created_date', 500);
  } else {
    // Merge any missing seed services (e.g. Concrete category)
    const { added } = await ensureServicesComplete(records);
    if (added.length > 0) {
      records = await base44.entities.Service.list('-created_date', 500);
      invalidateAllCaches();
    }
  }
  return records;
}

export async function createService(data) {
  const result = await base44.entities.Service.create(data);
  await invalidateAllCaches();
  return result;
}

export async function updateService(id, data) {
  const result = await base44.entities.Service.update(id, data);
  await invalidateAllCaches();
  return result;
}

// ── Price Book ─────────────────────────────────────────────────────────────

/**
 * Load all price book entries. If empty, bulk-seed from PRICE_BOOK_SEED
 * with autolinked service_ids. If records exist, merge any missing seed entries.
 */
export async function loadPriceBook() {
  let records = await base44.entities.PriceBookEntry.list('-created_date', 500);
  if (records.length === 0) {
    // Load services for autolink
    const services = await loadServices();
    const { linked } = autolinkServiceIds(
      services.map(s => ({ id: s.id, name: s.name })),
      PRICE_BOOK_SEED
    );
    const seedData = linked.map(pb => ({
      display_name: pb.display_name || pb._service_name_ref || '',
      service_id: pb.service_id || '',
      type: pb.type || 'service',
      category: pb.category || 'Misc',
      unit: pb.unit || 'each',
      unit_price: pb.unit_price ?? 0,
      unit_cost: pb.unit_cost ?? 0,
      book_price: pb.book_price ?? 0,
      markup: pb.markup ?? 0,
      notes: pb.notes || '',
      is_active: pb.is_active !== false,
      needs_review: pb.needs_review || false,
      source: 'seed',
    }));
    for (let i = 0; i < seedData.length; i += 50) {
      await base44.entities.PriceBookEntry.bulkCreate(seedData.slice(i, i + 50));
    }
    records = await base44.entities.PriceBookEntry.list('-created_date', 500);
  } else {
    // Merge any missing seed PB entries (e.g. Concrete)
    const services = await base44.entities.Service.list('-created_date', 500);
    const { added } = await ensurePriceBookComplete(records, services);
    if (added > 0) {
      records = await base44.entities.PriceBookEntry.list('-created_date', 500);
      invalidateAllCaches();
    }
  }
  return records;
}

export async function createPriceBookEntry(data, services = []) {
  // Resolve service_id if not already set
  const resolved = resolveServiceId(data, services);
  const result = await base44.entities.PriceBookEntry.create(resolved);
  await invalidateAllCaches();
  return result;
}

export async function updatePriceBookEntry(id, data, services = []) {
  const resolved = resolveServiceId(data, services);
  const result = await base44.entities.PriceBookEntry.update(id, resolved);
  await invalidateAllCaches();
  return result;
}

/**
 * Bulk import price book entries from CSV rows.
 * Uses the reconciler for intelligent duplicate detection and service linking.
 * Also creates missing Service records for truly new entries.
 */
export async function importPriceBookEntries(rows, existingEntries, services) {
  // Build reconciler index from services for linking
  const svcIndex = buildServiceIndex(services);

  // Build reconciler index from existing PB entries for dedup
  const pbAsServices = existingEntries.map(pb => ({
    id: pb.id,
    name: pb.display_name,
    aliases: [],
  }));
  const pbIndex = buildServiceIndex(pbAsServices);

  // Also keep an exact-name map for fast path
  const exactPBMap = new Map();
  for (const pb of existingEntries) {
    const key = (pb.display_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (key && !exactPBMap.has(key)) exactPBMap.set(key, pb);
  }

  let added = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    const name = (row.service_name || '').trim();
    if (!name) { skipped++; continue; }

    // 1. Check exact match in existing PB
    const nameKey = name.toLowerCase().replace(/\s+/g, ' ').trim();
    let existing = exactPBMap.get(nameKey);

    // 2. If no exact match, check fuzzy match via reconciler
    if (!existing) {
      const fuzzyMatch = findBestMatch(name, pbIndex, { threshold: 0.60, ambiguityGap: 0.12 });
      if (fuzzyMatch) {
        existing = existingEntries.find(e => e.id === fuzzyMatch.service.id);
      }
    }

    // Resolve service_id via reconciler
    const svcMatch = findBestMatch(name, svcIndex);
    const service_id = existing?.service_id || (svcMatch ? svcMatch.service.id : '');

    if (existing) {
      // Update existing record with new pricing data
      await base44.entities.PriceBookEntry.update(existing.id, {
        ...(row.unit_price != null && { unit_price: row.unit_price }),
        ...(row.unit_cost != null && { unit_cost: row.unit_cost }),
        ...(row.book_price != null && { book_price: row.book_price }),
        ...(row.category && { category: row.category }),
        ...(row.uom && { unit: row.uom }),
        ...(row.type && { type: row.type }),
        ...(row.notes && { notes: row.notes }),
        needs_review: false,
        service_id: existing.service_id || service_id,
      });
      updated++;
    } else {
      // Create new PB entry
      await base44.entities.PriceBookEntry.create({
        display_name: name,
        type: row.type || 'service',
        category: row.category || 'Misc',
        unit: row.uom || 'each',
        unit_price: row.unit_price ?? row.book_price ?? 0,
        unit_cost: row.unit_cost ?? 0,
        book_price: row.book_price ?? 0,
        notes: row.notes || '',
        is_active: true,
        needs_review: true,
        source: 'csv_import',
        service_id,
      });
      added++;

      // If no matching Service exists, create one
      if (!svcMatch) {
        await base44.entities.Service.create({
          name,
          category: row.category || 'Misc',
          unit: row.uom || 'each',
          type: row.type || 'service',
          is_active: true,
        });
      }
    }
  }

  await invalidateAllCaches();
  return { added, updated, skipped };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveServiceId(data, services) {
  // Don't overwrite existing valid service_id
  if (data.service_id) return data;

  const name = data.display_name;
  if (!name) return data;

  // Use reconciler for intelligent matching (exact → alias → fuzzy)
  const index = buildServiceIndex(services);
  const match = findBestMatch(name, index);
  if (match) {
    return { ...data, service_id: match.service.id };
  }
  return data;
}