import { supabase } from './supabaseClient';

/**
 * Quick connectivity test — safe to call from browser console:
 *   import('/src/lib/supabaseTest.js').then(m => m.testConnection())
 *
 * Returns { ok, latencyMs, error? }
 */
export async function testConnection() {
  if (!supabase) {
    console.warn('[Supabase] Client not initialized — check env variables');
    return { ok: false, error: 'Client not initialized' };
  }

  const start = performance.now();
  // A zero-cost RPC that hits the PostgREST health endpoint
  const { error } = await supabase.from('_test_ping').select('*').limit(0);
  const latencyMs = Math.round(performance.now() - start);

  // "relation does not exist" means connection works, table just doesn't exist — that's fine
  if (!error || error.code === '42P01') {
    console.log(`[Supabase] Connected ✓  (${latencyMs}ms)`);
    return { ok: true, latencyMs };
  }

  console.error('[Supabase] Connection failed:', error.message);
  return { ok: false, latencyMs, error: error.message };
}
