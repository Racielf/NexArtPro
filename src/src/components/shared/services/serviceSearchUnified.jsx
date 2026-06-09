/**
 * serviceSearchUnified.js — Unified search layer.
 *
 * Now that supabaseServiceCache reads from Base44 entities first,
 * the cache-backed searchServices() is the single authoritative source.
 * No need for a separate Base44 entity search — that would duplicate results.
 *
 * Shape contract (every result):
 * { id, name, category, unit, unit_price, unit_cost, description, type, source }
 */
import { searchServices } from './serviceSearch';
import { ensureCatalogReady } from '@/lib/catalogCache';

// ─── Adapters ──────────────────────────────────────────────────────────────────

const safeNum = (v) => (v != null && !isNaN(parseFloat(v)) ? parseFloat(v) : null);
const safeStr = (v, fallback = '') => (typeof v === 'string' ? v : fallback);

/**
 * Normalize a cache-backed result to the canonical shape.
 */
function normalizeResult(r) {
  return {
    id: r.id,
    name: safeStr(r.name),
    category: safeStr(r.category, 'Misc'),
    unit: safeStr(r.unit, 'ea'),
    unit_price: safeNum(r.unit_price) ?? safeNum(r.base_price),
    unit_cost: safeNum(r.unit_cost) ?? safeNum(r.estimated_cost),
    book_price: safeNum(r.book_price) ?? safeNum(r.base_price),
    description: safeStr(r.svcEntry?.description || r.description),
    type: safeStr(r.type, 'service'),
    source: r.source || 'seed',
    _score: r._score || 0,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Search services via the single authoritative cache (backed by Base44 entities).
 * The cache reads from Base44 Service + PriceBookEntry entities,
 * falling back to Supabase tables, then static seeds.
 */
export async function searchServicesUnified(query, limit = 15) {
  const q = (query || '').trim();
  if (!q) return [];

  // Ensure live Base44 data (incl. seed-gap merge) is loaded before searching
  await ensureCatalogReady();

  // Single authoritative search — cache is backed by Base44 entities
  try {
    const results = searchServices(q, limit).map(normalizeResult);
    results.sort((a, b) => b._score - a._score);
    return results.slice(0, limit);
  } catch (err) {
    console.warn('[serviceSearchUnified] search failed:', err?.message);
    return [];
  }
}