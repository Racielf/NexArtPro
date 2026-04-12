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
import { loadServices, loadPriceBook, createService, createPriceBookEntry } from '@/lib/servicePersistence';
import { buildServiceIndex, findBestMatch } from '@/lib/serviceReconciler';

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
    const existingServices = await loadServices();
    const svcIndex = buildServiceIndex(existingServices.map(s => ({ id: s.id, name: s.name, aliases: [] })));
    const svcMatch = findBestMatch(name, svcIndex, { threshold: 0.60, ambiguityGap: 0.12 });

    let serviceId = null;

    if (svcMatch) {
      // Confident match found — reuse existing service, don't create duplicate
      serviceId = svcMatch.service.id;
    } else {
      // No match — create new Service record
      const safePrice = parseFloat(item.unit_price) || 0;
      const safeCost = parseFloat(item.unit_cost) || 0;

      const newService = await createService({
        name,
        category: item.category || 'Misc',
        unit: item.unit || 'ea',
        description: item.description || '',
        unit_price: safePrice,
        unit_cost: safeCost,
        type: 'service',
        is_active: true,
      });

      serviceId = newService.id;
    }

    // 2. Check PriceBookEntry — only create if no match exists
    const existingPB = await loadPriceBook();
    const pbAsServices = existingPB.map(pb => ({ id: pb.id, name: pb.display_name, aliases: [] }));
    const pbIndex = buildServiceIndex(pbAsServices);
    const pbMatch = findBestMatch(name, pbIndex, { threshold: 0.60, ambiguityGap: 0.12 });

    if (!pbMatch) {
      const safePrice = parseFloat(item.unit_price) || 0;
      const safeCost = parseFloat(item.unit_cost) || 0;

      await createPriceBookEntry({
        display_name: name,
        service_id: serviceId || '',
        type: 'service',
        category: item.category || 'Misc',
        unit: item.unit || 'ea',
        unit_price: safePrice,
        unit_cost: safeCost,
        book_price: safePrice,
        is_active: true,
        needs_review: true,
        source: 'manual',
      }, existingServices || []);
    }

    // Cache invalidation is handled inside createService / createPriceBookEntry
    // via invalidateAllCaches() in servicePersistence.js

    return { service_id: serviceId, created: !svcMatch };
  } catch (err) {
    console.warn('[persistNewService] Failed (non-blocking):', err?.message);
    return { service_id: null, created: false };
  } finally {
    _pendingNames.delete(nameKey);
  }
}