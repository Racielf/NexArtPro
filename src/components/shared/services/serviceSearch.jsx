import { SERVICES_SEED } from '@/components/settings/services/servicesSeed';
import { PRICE_BOOK_SEED } from '@/components/settings/pricebook/priceBookSeed';

// Normalize text for comparison
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Resolve price book service_ids on first call (lazy, cached)
let _resolved = null;
function getResolved() {
  if (_resolved) return _resolved;
  _resolved = PRICE_BOOK_SEED.map(pb => {
    if (pb.service_id) return pb;
    const match = SERVICES_SEED.find(s => s.name === pb._service_name_ref);
    return { ...pb, service_id: match?.id || null };
  });
  return _resolved;
}

/**
 * Search services + price book entries.
 * Returns ranked results ready for the picker UI.
 * Each result: { id, name, category, unit, base_price, source, pbEntry, svcEntry }
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

  SERVICES_SEED.forEach(svc => {
    if (!svc.is_active) return;

    const nameScore  = score(svc.name);
    const catScore   = score(svc.category) * 0.6;
    const descScore  = score(svc.description) * 0.4;
    const aliasScore = Math.max(0, ...((svc.aliases || []).map(a => score(a) * 0.8)));

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
    if (pb && pb.is_active && pb.base_price !== null && pb.base_price !== undefined && pb.base_price !== '') tier = 1;
    else if (pb && pb.is_active) tier = 2;

    results.push({
      id: svc.id,
      name: svc.name,
      category: svc.category,
      unit: pb?.unit || svc.default_unit || 'each',
      base_price: (pb?.base_price !== null && pb?.base_price !== undefined && pb?.base_price !== '') ? pb.base_price : null,
      estimated_cost: pb?.estimated_cost ?? null,
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