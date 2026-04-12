/**
 * persistNewService.js — Background persistence for manually created services.
 *
 * When a user creates a new service from the SmartServicePicker inside the
 * estimate editor, this module persists it to the Service + PriceBookEntry
 * catalogs so it becomes searchable in future estimates.
 *
 * Behavior:
 *   1. Checks for duplicates using the serviceReconciler (exact → alias → fuzzy)
 *   2. If a confident match exists, reuses the existing service_id (no new record)
 *   3. If no match, creates a new Service and a linked PriceBookEntry
 *   4. Invalidates all catalog caches after writes
 *   5. Returns the resolved service_id (new or existing)
 *
 * This is designed to be called fire-and-forget from the line item flow.
 * It never blocks the estimate editor UX.
 */
import { base44 } from '@/api/base44Client';
import { buildServiceIndex, findBestMatch } from '@/lib/serviceReconciler';
import { invalidateCatalogCache } from '@/lib/catalogCache';
import { invalidateBase44ServiceCache } from '@/components/shared/services/serviceSearchBase44';

// Prevent duplicate concurrent persists for the same name
const _pendingNames = new Set();

/**
 * Persist a manually created service to the catalog.
 *
 * @param {object} item — Line item data with at least: service_name, unit, unit_price, unit_cost, category, description
 * @returns {Promise<{ service_id: string|null, created: boolean }>}
 */
export async function persistNewServiceToCatalog(item) {
  const name = (item.service_name || '').trim();
  if (!name) return { service_id: null, created: false };

  // De-bounce: skip if already persisting same name
  const nameKey = name.toLowerCase();
  if (_pendingNames.has(nameKey)) return { service_id: null, created: false };
  _pendingNames.add(nameKey);

  try {
    // 1. Load existing services for duplicate check
    const existingServices = await base44.entities.Service.list('name', 500);
    const index = buildServiceIndex(existingServices.map(s => ({ id: s.id, name: s.name, aliases: [] })));
    const match = findBestMatch(name, index, { threshold: 0.60, ambiguityGap: 0.12 });

    if (match) {
      // Confident match found — reuse existing, don't create duplicate
      return { service_id: match.service.id, created: false };
    }

    // 2. No match — create new Service record
    const newService = await base44.entities.Service.create({
      name,
      category: item.category || 'Misc',
      unit: item.unit || 'ea',
      description: item.description || '',
      unit_price: item.unit_price ?? 0,
      unit_cost: item.unit_cost ?? 0,
      type: 'service',
      is_active: true,
    });

    // 3. Create linked PriceBookEntry
    await base44.entities.PriceBookEntry.create({
      display_name: name,
      service_id: newService.id,
      type: 'service',
      category: item.category || 'Misc',
      unit: item.unit || 'ea',
      unit_price: item.unit_price ?? 0,
      unit_cost: item.unit_cost ?? 0,
      book_price: item.unit_price ?? 0,
      is_active: true,
      needs_review: true,
      source: 'manual',
    });

    // 4. Invalidate caches so the new service is immediately searchable
    invalidateBase44ServiceCache();
    await invalidateCatalogCache();

    return { service_id: newService.id, created: true };
  } catch (err) {
    console.warn('[persistNewService] Failed (non-blocking):', err?.message);
    return { service_id: null, created: false };
  } finally {
    _pendingNames.delete(nameKey);
  }
}