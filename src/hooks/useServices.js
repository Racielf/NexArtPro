/**
 * useServices — Fetches active services from NexArt Service entity.
 * Returns { services, loading, error, refetch }.
 * Used by SmartServicePicker and any component that needs the service catalog.
 */
import { useState, useEffect, useCallback } from 'react';
import { nexartClient } from '@/api/nexartClient';

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export default function useServices() {
  const [services, setServices] = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    // Use cache if fresh
    if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
      setServices(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await nexartClient.entities.Service.filter({ is_active: true }, 'name', 500);
      _cache = data;
      _cacheTime = Date.now();
      setServices(data);
    } catch (err) {
      console.warn('[useServices] failed:', err?.message);
      setError(err);
      // Fall back to stale cache if available
      if (_cache) setServices(_cache);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { services, loading, error, refetch: fetch };
}