import { getServices, getPriceBook } from '@/lib/catalogCache';
import { autolinkServiceIds } from '@/lib/autolinkServiceIds';

// Normalize text for comparison
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Resolve price book → service_id links.
 * Uses autolinkServiceIds for normalized name matching.
 * Re-resolves on every call since the underlying cache can refresh.
 */
let _lastAutolinkLogged = 0;

function getResolved() {
  const services = getServices();
  const priceBook = getPriceBook();
  const { linked, stats, unmatched, duplicates } = autolinkServiceIds(services, priceBook);

  // Log stats at most once per minute to avoid console spam
  const now = Date.now();
  if (now - _lastAutolinkLogged > 60_000) {
    _lastAutolinkLogged = now;
    if (stats.newlyLinked > 0 || stats.unmatched > 0 || stats.duplicateServices > 0) {
      console.info('[Autolink]', `${stats.newlyLinked} linked, ${stats.alreadyLinked} existing, ${stats.unmatched} unmatched, ${stats.duplicateServices} duplicate services`);
      if (unmatched.length > 0) {
        console.warn('[Autolink] Unmatched PB entries:', unmatched.map(u => u.name));
      }
      if (duplicates.length > 0) {
        console.warn('[Autolink] Duplicate service names:', duplicates.map(d => d.name));
      }
    }
  }

  return linked;
}

/**
 * Search services + price book entries.
 * Returns ranked results ready for the picker UI.
 * Each result: { id, name, category, unit, base_price, estimated_cost, source, pbEntry, svcEntry }
 */
export function searchServices(query, limit = 12) {
  const q = norm(query);
  if (!q) return [];

  const priceBook = getResolved();

  // Build a map: service_id → pb entry (active preferred)
  const pbByServiceId = {};
  priceBook.forEach(pb => {
    if (!pb.service_id) return;
    if (!pbByServiceId[pb.service_id] || pb.is_active) {
      pbByServiceId[pb.service_id] = pb;
    }
  });

  // Score a text field match (0 = no match, higher = better)
  const score = (text) => {
    const t = norm(text);
    if (!t) return 0;
    if (t === q) return 10;
    if (t.startsWith(q)) return 7;
    if (t.includes(q)) return 4;
    // Partial word match
    const words = q.split(' ');
    if (words.length > 1 && words.every(w => t.includes(w))) return 3;
    if (words.some(w => w.length > 2 && t.includes(w))) return 1;
    return 0;
  };

  const results = [];

  const SERVICES = getServices();

  SERVICES.forEach(svc => {
    if (!svc.is_active) return;

    const nameScore  = score(svc.name);
    const catScore   = score(svc.category) * 0.6;
    const descScore  = score(svc.description) * 0.4;
    const aliases = svc.aliases || [];
    const aliasScore = aliases.length > 0 ? Math.max(0, ...aliases.map(a => score(a) * 0.8)) : 0;

    const pb = pbByServiceId[svc.id];
    const pbNameScore  = pb ? score(pb.display_name) : 0;
    const pbNotesScore = pb ? score(pb.notes) * 0.3 : 0;

    const totalScore = Math.max(nameScore, pbNameScore) + catScore + descScore + aliasScore + pbNotesScore;
    if (totalScore === 0) return;

    // Tier for ranking:
    // 1 = active service + active pb with price
    // 2 = active service + pb without price
    // 3 = active service, no pb
    let tier = 3;
    const hasPrice = (pb?.unit_price ?? pb?.base_price) != null && (pb?.unit_price ?? pb?.base_price) !== '';
    if (pb && pb.is_active && hasPrice) tier = 1;
    else if (pb && pb.is_active) tier = 2;

    results.push({
      id: svc.id,
      name: svc.name,
      category: svc.category,
      unit: pb?.unit || svc.unit || svc.default_unit || 'each',
      // New fields: unit_price/unit_cost from PB (preferred), fallback to legacy base_price/estimated_cost
      unit_price: pb?.unit_price ?? pb?.base_price ?? null,
      unit_cost: pb?.unit_cost ?? pb?.estimated_cost ?? null,
      // Keep legacy aliases for backward compat
      base_price: pb?.unit_price ?? pb?.base_price ?? null,
      estimated_cost: pb?.unit_cost ?? pb?.estimated_cost ?? null,
      type: pb?.type || 'service',
      source: pb ? 'pricebook' : 'catalog',
      svcEntry: svc,
      pbEntry: pb || null,
      _score: totalScore,
      _tier: tier,
    });
  });

  // Sort: tier ASC, then score DESC
  results.sort((a, b) => a._tier - b._tier || b._score - a._score);

  return results.slice(0, limit);
}

/**
 * Build a temporary "new service" entry (not persisted yet).
 */
export function buildTempService(name) {
  return {
    id: `temp-${Date.now()}`,
    name,
    category: 'Misc',
    description: '',
    default_unit: 'each',
    aliases: [],
    is_active: true,
    needs_review: true,
    created_from: 'estimate',
    _isTemp: true,
  };
}