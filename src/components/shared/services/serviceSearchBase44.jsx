/**
 * serviceSearchBase44.js — Searches the Base44 Service entity for matching services.
 * Returns results in the same shape as serviceSearch.js for easy merging.
 */
import { base44 } from '@/api/base44Client';

// Simple in-memory cache to avoid hammering the API on every keystroke
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 min

async function getAll() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;
  const data = await base44.entities.Service.filter({ is_active: true }, 'name', 500);
  _cache = data;
  _cacheTime = Date.now();
  return data;
}

const norm = (s) => (s || '').toLowerCase().trim();

/**
 * Search Base44 Service entity records.
 * Returns results compatible with SmartServicePicker.
 */
export async function searchBase44Services(query, limit = 8) {
  const q = norm(query);
  if (!q) return [];

  const all = await getAll();

  const scored = all.map(svc => {
    const name = norm(svc.name);
    const cat = norm(svc.category);
    const desc = norm(svc.description);

    let score = 0;
    if (name === q) score = 10;
    else if (name.startsWith(q)) score = 7;
    else if (name.includes(q)) score = 4;
    else if (cat.includes(q)) score = 2;
    else if (desc.includes(q)) score = 1;
    else {
      const words = q.split(' ');
      if (words.length > 1 && words.every(w => name.includes(w))) score = 3;
      else if (words.some(w => w.length > 2 && name.includes(w))) score = 1;
    }

    if (score === 0) return null;

    return {
      id: svc.id,
      name: svc.name,
      category: svc.category || '',
      unit: svc.unit || 'EA',
      description: svc.description || '',
      unit_price: svc.unit_price ?? null,
      unit_cost: svc.unit_cost ?? null,
      book_price: svc.book_price ?? null,
      type: svc.type || 'service',
      source: 'entity',
      _score: score,
    };
  }).filter(Boolean);

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limit);
}

/**
 * Invalidate the cache (call after creating/updating services).
 */
export function invalidateBase44ServiceCache() {
  _cache = null;
  _cacheTime = 0;
}