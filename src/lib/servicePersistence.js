/**
 * servicePersistence.js — CRUD helpers for persistent Services + Price Book
 *
 * Uses Base44 entities as the source of truth:
 *   - Service entity for the service catalog
 *   - PriceBookEntry entity for price book items
 *
 * On first load, if no records exist, seeds from the static seed data.
 * After any write, invalidates the supabaseServiceCache so the picker
 * picks up changes immediately.
 */
import { base44 } from '@/api/base44Client';
import { SERVICES_SEED } from '@/components/settings/services/servicesSeed';
import { PRICE_BOOK_SEED } from '@/components/settings/pricebook/priceBookSeed';
import { invalidateServiceCache } from '@/lib/supabaseServiceCache';
import { autolinkServiceIds } from '@/lib/autolinkServiceIds';

// ── Services ───────────────────────────────────────────────────────────────

/**
 * Load all services. If empty, bulk-seed from SERVICES_SEED.
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
    // Bulk create in batches of 50
    for (let i = 0; i < seedData.length; i += 50) {
      await base44.entities.Service.bulkCreate(seedData.slice(i, i + 50));
    }
    records = await base44.entities.Service.list('-created_date', 500);
  }
  return records;
}

export async function createService(data) {
  const result = await base44.entities.Service.create(data);
  invalidateServiceCache();
  return result;
}

export async function updateService(id, data) {
  const result = await base44.entities.Service.update(id, data);
  invalidateServiceCache();
  return result;
}

// ── Price Book ─────────────────────────────────────────────────────────────

/**
 * Load all price book entries. If empty, bulk-seed from PRICE_BOOK_SEED
 * with autolinked service_ids.
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
  }
  return records;
}

export async function createPriceBookEntry(data, services = []) {
  // Resolve service_id if not already set
  const resolved = resolveServiceId(data, services);
  const result = await base44.entities.PriceBookEntry.create(resolved);
  invalidateServiceCache();
  return result;
}

export async function updatePriceBookEntry(id, data, services = []) {
  const resolved = resolveServiceId(data, services);
  const result = await base44.entities.PriceBookEntry.update(id, resolved);
  invalidateServiceCache();
  return result;
}

/**
 * Bulk import price book entries from CSV rows.
 * Resolves service_id for each via autolink.
 */
export async function importPriceBookEntries(rows, existingEntries, services) {
  const serviceMap = new Map();
  for (const svc of services) {
    const key = (svc.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (key && !serviceMap.has(key)) serviceMap.set(key, svc);
  }

  let added = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    const name = (row.service_name || '').trim();
    if (!name) { skipped++; continue; }

    // Check if existing entry with same name
    const existing = existingEntries.find(
      e => (e.display_name || '').toLowerCase() === name.toLowerCase()
    );

    // Resolve service_id
    const nameKey = name.toLowerCase().replace(/\s+/g, ' ').trim();
    const matchedSvc = serviceMap.get(nameKey);
    const service_id = existing?.service_id || (matchedSvc ? matchedSvc.id : '');

    if (existing) {
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
    }
  }

  invalidateServiceCache();
  return { added, updated, skipped };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveServiceId(data, services) {
  // Don't overwrite existing valid service_id
  if (data.service_id) return data;

  const name = (data.display_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!name) return data;

  for (const svc of services) {
    const svcName = (svc.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (svcName === name) {
      return { ...data, service_id: svc.id };
    }
  }
  return data;
}