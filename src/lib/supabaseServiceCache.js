/**
 * supabaseServiceCache.js — Preloads and caches services + price book from Supabase.
 *
 * Strategy: Fetch once on first access, cache in memory with a 5-minute TTL.
 * Exposes getServices() and getPriceBook() which return arrays synchronously
 * after the initial load, or trigger a background refresh if stale.
 *
 * Fallback: If Supabase fetch fails, falls back to static seed data so the
 * editor never breaks (degraded mode with console warning).
 */
import { supabase } from '@/lib/supabaseClient';
import { base44 } from '@/api/base44Client';
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

// ── Supabase fetchers ──────────────────────────────────────────────────────

async function fetchServicesFromSupabase() {
  // Try Base44 entity first (persistent admin source of truth)
  try {
    const b44Data = await base44.entities.Service.filter({ is_active: true }, 'name', 500);
    if (b44Data && b44Data.length > 0) return b44Data;
  } catch (e) {
    // Fallback to Supabase direct
  }
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

async function fetchPriceBookFromSupabase() {
  // Try Base44 PriceBookEntry entity first (persistent admin source of truth)
  try {
    const b44Data = await base44.entities.PriceBookEntry.filter({ is_active: true }, 'display_name', 500);
    if (b44Data && b44Data.length > 0) {
      return b44Data.map(row => ({
        ...row,
        type: row.type || 'service',
        unit_price: row.unit_price ?? 0,
        unit_cost: row.unit_cost ?? 0,
      }));
    }
  } catch (e) {
    // Fallback to Supabase direct
  }
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
  _servicesFetching = fetchServicesFromSupabase()
    .then(data => {
      _servicesCache = data;
      _servicesFetchedAt = Date.now();
      _servicesFetching = null;
      return data;
    })
    .catch(err => {
      console.warn('[ServiceCache] Supabase services fetch failed, using seed fallback:', err?.message);
      _servicesFetching = null;
      if (!_servicesCache) _servicesCache = SERVICES_SEED;
      return _servicesCache;
    });
  return _servicesFetching;
}

async function refreshPriceBook() {
  if (_priceBookFetching) return _priceBookFetching;
  _priceBookFetching = fetchPriceBookFromSupabase()
    .then(data => {
      _priceBookCache = data;
      _priceBookFetchedAt = Date.now();
      _priceBookFetching = null;
      return data;
    })
    .catch(err => {
      console.warn('[ServiceCache] Supabase price_book fetch failed, using seed fallback:', err?.message);
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
 */
export async function initServiceCache() {
  if (_initPromise) return _initPromise;
  _initPromise = Promise.all([refreshServices(), refreshPriceBook()]);
  return _initPromise;
}

/**
 * Get cached services array (synchronous after init).
 * If cache is stale, triggers background refresh and returns current cache.
 * If cache is empty (first call before init), returns seed as fallback.
 */
export function getServices() {
  if (!_servicesCache) {
    // Cold start — return seed immediately, trigger async load
    _servicesCache = SERVICES_SEED;
    refreshServices();
  } else if (isStale(_servicesFetchedAt)) {
    // Stale — return current cache, refresh in background
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
 * Force-refresh both caches immediately (e.g., after admin edits price book).
 */
export async function invalidateServiceCache() {
  _servicesFetchedAt = 0;
  _priceBookFetchedAt = 0;
  return Promise.all([refreshServices(), refreshPriceBook()]);
}