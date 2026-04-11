/**
 * serviceSearchUnified.js — Unified async search across seed/local and Base44 Service entity.
 *
 * Shape contract (every result):
 * { id, name, category, unit, unit_price, unit_cost, description, type, source }
 *
 * Source values: 'seed' | 'base44'
 * Fault-tolerant: if either source fails, the other still returns results.
 */
import { searchServices } from './serviceSearch';
import { searchBase44Services } from './serviceSearchBase44';

// ─── Adapters ──────────────────────────────────────────────────────────────────

const safeNum = (v) => (v != null && !isNaN(parseFloat(v)) ? parseFloat(v) : null);
const safeStr = (v, fallback = '') => (typeof v === 'string' ? v : fallback);

/**
 * Normalize a seed/local result to the canonical shape.
 */
function normalizeSeed(r) {
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
    source: 'seed',
    _score: r._score || 0,
  };
}

/**
 * Normalize a Base44 entity result to the canonical shape.
 */
function normalizeBase44(r) {
  return {
    id: r.id,
    name: safeStr(r.name),
    category: safeStr(r.category, 'Misc'),
    unit: safeStr(r.unit, 'ea'),
    unit_price: safeNum(r.unit_price),
    unit_cost: safeNum(r.unit_cost),
    book_price: safeNum(r.book_price),
    description: safeStr(r.description),
    type: safeStr(r.type, 'service'),
    source: 'base44',
    _score: r._score || 0,
  };
}

// ─── Deduplication ─────────────────────────────────────────────────────────────

/**
 * Deduplicate by lowercase name. When duplicates exist, keep the one with the
 * higher score; if tied, prefer base44 (fresher data).
 */
function deduplicate(results) {
  const map = new Map();
  for (const r of results) {
    const key = r.name.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
    } else {
      // Prefer higher score; on tie prefer base44 over seed
      const existingPriority = existing.source === 'base44' ? 1 : 0;
      const newPriority = r.source === 'base44' ? 1 : 0;
      if (r._score > existing._score || (r._score === existing._score && newPriority > existingPriority)) {
        map.set(key, r);
      }
    }
  }
  return Array.from(map.values());
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Search all service sources, combine, deduplicate, and return normalized results.
 * Fault-tolerant: each source is wrapped in its own try/catch.
 */
export async function searchServicesUnified(query, limit = 15) {
  const q = (query || '').trim();
  if (!q) return [];

  // Run both searches concurrently — each independently fault-tolerant
  const [seedResults, base44Results] = await Promise.all([
    Promise.resolve().then(() => {
      try {
        return searchServices(q, limit).map(normalizeSeed);
      } catch (err) {
        console.warn('[serviceSearchUnified] seed search failed:', err?.message);
        return [];
      }
    }),
    searchBase44Services(q, limit).then(r => r.map(normalizeBase44)).catch(err => {
      console.warn('[serviceSearchUnified] base44 search failed:', err?.message);
      return [];
    }),
  ]);

  // Combine, deduplicate, sort by score descending
  const combined = [...seedResults, ...base44Results];
  const deduped = deduplicate(combined);
  deduped.sort((a, b) => b._score - a._score);

  return deduped.slice(0, limit);
}