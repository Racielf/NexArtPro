/**
 * catalogCache.js — Base44-first catalog cache for Services + Price Book.
 *
 * Strategy: Fetch once on first access, cache in memory with a 5-minute TTL.
 * Exposes getServices() and getPriceBook() which return arrays synchronously
 * after the initial load, or trigger a background refresh if stale.
 *
 * Data priority:
 *   1. Base44 entities (Service, PriceBookEntry) — primary source of truth
 *   2. Supabase tables — legacy fallback
 *   3. Static seed data — cold-start fallback so the editor never breaks
 */
import { supabase } from '@/lib/supabaseClient';
import { nexartClient } from '@/api/nexartClient';
import { SERVICES_SEED } from '@/components/settings/services/servicesSeed';
import { PRICE_BOOK_SEED } from '@/components/settings/pricebook/priceBookSeed';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let _servicesCache = null;
let _priceBookCache = null;
let _servicesFetchedAt = 0;
let _priceBookFetchedAt = 0;
let _servicesFetching = null;
let _priceBookFetching = null;
let _initPromise = null;
let _initResolved = false;

// ── Data fetchers ──────────────────────────────────────────────────────────

async function fetchServices() {
  // NexArt entity — primary source of truth
  try {
    const b44Data = await nexartClient.entities.Service.filter({ is_active: true }, 'name', 500);
    if (b44Data && b44Data.length > 0) {
      // Check for missing seed categories (e.g. Concrete) and merge in background
      _checkSeedGaps(b44Data);
      return b44Data;
    }
  } catch (e) {
    // Fall through to Supabase
  }
  // Supabase — legacy fallback
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

// Background seed-gap check — runs at most once per session
let _seedGapChecked = false;
let _seedGapPromise = null;
async function _checkSeedGaps(liveServices) {
  if (_seedGapChecked) return;
  _seedGapPromise = _doSeedGapCheck(liveServices);
  return _seedGapPromise;
}

async function _doSeedGapCheck(liveServices) {
  _seedGapChecked = true;
  try {
    // Quick category check: do we have all seed categories?
    const liveCats = new Set(liveServices.map(s => (s.category || '').toLowerCase()));
    const seedCats = new Set(SERVICES_SEED.map(s => (s.category || '').toLowerCase()));
    let missing = false;
    for (const sc of seedCats) {
      if (!liveCats.has(sc)) { missing = true; break; }
    }
    if (!missing) return; // All seed categories present, skip heavy merge

    // Dynamic import to avoid circular dependency on first load
    const { ensureServicesComplete, ensurePriceBookComplete } = await import('@/lib/catalogMerge');
    const { added } = await ensureServicesComplete(liveServices);
    if (added.length > 0) {
      // Refresh the cache with the new data
      const refreshed = await nexartClient.entities.Service.filter({ is_active: true }, 'name', 500);
      _servicesCache = refreshed;
      _servicesFetchedAt = Date.now();

      // Also merge PB gaps
      const livePB = await nexartClient.entities.PriceBookEntry.filter({ is_active: true }, 'display_name', 500);
      const pbResult = await ensurePriceBookComplete(livePB, refreshed);
      if (pbResult.added > 0) {
        const refreshedPB = await nexartClient.entities.PriceBookEntry.filter({ is_active: true }, 'display_name', 500);
        _priceBookCache = refreshedPB.map(row => ({
          ...row,
          type: row.type || 'service',
          unit_price: row.unit_price ?? 0,
          unit_cost: row.unit_cost ?? 0,
        }));
        _priceBookFetchedAt = Date.now();
      }
      console.info(`[CatalogCache] Seed gap merge: ${added.length} services, ${pbResult.added} PB entries added`);
    }
  } catch (err) {
    console.warn('[CatalogCache] Seed gap check failed (non-blocking):', err?.message);
  } finally {
    _seedGapPromise = null;
  }
}

async function fetchPriceBook() {
  // NexArt entity — primary source of truth
  try {
    const b44Data = await nexartClient.entities.PriceBookEntry.filter({ is_active: true }, 'display_name', 500);
    if (b44Data && b44Data.length > 0) {
      return b44Data.map(row => ({
        ...row,
        type: row.type || 'service',
        unit_price: row.unit_price ?? 0,
        unit_cost: row.unit_cost ?? 0,
      }));
    }
  } catch (e) {
    // Fall through to Supabase
  }
  // Supabase — legacy fallback
  const { data, error } = await supabase
    .from('price_book')
    .select('*')
    .eq('is_active', true)
    .order('display_name');

  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    type: row.type || 'service',
    unit_price: row.unit_price ?? row.base_price ?? null,
    unit_cost: row.unit_cost ?? row.estimated_cost ?? null,
  }));
}

// ── Cache management ───────────────────────────────────────────────────────

function isStale(fetchedAt) {
  return Date.now() - fetchedAt > CACHE_TTL_MS;
}

async function refreshServices() {
  if (_servicesFetching) return _servicesFetching;
  _servicesFetching = fetchServices()
    .then(data => {
      _servicesCache = data;
      _servicesFetchedAt = Date.now();
      _servicesFetching = null;
      return data;
    })
    .catch(err => {
      console.warn('[CatalogCache] Services fetch failed, using seed fallback:', err?.message);
      _servicesFetching = null;
      if (!_servicesCache) _servicesCache = SERVICES_SEED;
      return _servicesCache;
    });
  return _servicesFetching;
}

async function refreshPriceBook() {
  if (_priceBookFetching) return _priceBookFetching;
  _priceBookFetching = fetchPriceBook()
    .then(data => {
      _priceBookCache = data;
      _priceBookFetchedAt = Date.now();
      _priceBookFetching = null;
      return data;
    })
    .catch(err => {
      console.warn('[CatalogCache] Price book fetch failed, using seed fallback:', err?.message);
      _priceBookFetching = null;
      if (!_priceBookCache) _priceBookCache = PRICE_BOOK_SEED;
      return _priceBookCache;
    });
  return _priceBookFetching;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Initialize cache — call once at app startup or before first search.
 * Returns a promise that resolves when both datasets are loaded.
 * After resolving, seed-gap merge is also guaranteed complete.
 */
export async function initCatalogCache() {
  if (_initPromise) return _initPromise;
  _initPromise = Promise.all([refreshServices(), refreshPriceBook()]).then(async () => {
    // Wait for seed-gap merge to complete before marking init done
    if (_seedGapPromise) await _seedGapPromise;
    _initResolved = true;
  });
  return _initPromise;
}

/**
 * Returns true only after initCatalogCache has fully resolved
 * (including seed-gap merge). Use to gate picker readiness.
 */
export function isCatalogReady() {
  return _initResolved;
}

/**
 * Await catalog readiness. If init was already called, returns that promise.
 * If not, triggers init. Suitable for calling before first search.
 */
export async function ensureCatalogReady() {
  if (_initResolved) return;
  return initCatalogCache();
}

// Re-export under old name for backward compat (avoid breaking any missed references)
export const initServiceCache = initCatalogCache;

/**
 * Get cached services array (synchronous after init).
 * If cache is stale, triggers background refresh and returns current cache.
 * If cache is empty (first call before init), triggers init and returns seed as fallback.
 */
export function getServices() {
  if (!_servicesCache) {
    _servicesCache = SERVICES_SEED;
    // Trigger full init (not just services) so seed-gap merge also runs
    if (!_initPromise) initCatalogCache();
    else refreshServices();
  } else if (isStale(_servicesFetchedAt)) {
    refreshServices();
  }
  return _servicesCache;
}

/**
 * Get cached price book array (synchronous after init).
 * Same stale/fallback logic as getServices.
 */
export function getPriceBook() {
  if (!_priceBookCache) {
    _priceBookCache = PRICE_BOOK_SEED;
    refreshPriceBook();
  } else if (isStale(_priceBookFetchedAt)) {
    refreshPriceBook();
  }
  return _priceBookCache;
}

/**
 * Force-refresh both caches immediately (e.g., after admin edits).
 * Returns a promise that resolves when fresh data is loaded.
 */
export async function invalidateCatalogCache() {
  _servicesFetchedAt = 0;
  _priceBookFetchedAt = 0;
  _seedGapChecked = false; // Allow re-check after import
  const result = await Promise.all([refreshServices(), refreshPriceBook()]);
  // Wait for any triggered seed-gap merge
  if (_seedGapPromise) await _seedGapPromise;
  return result;
}

// Re-export under old name for backward compat
export const invalidateServiceCache = invalidateCatalogCache;