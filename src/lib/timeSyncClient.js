import { createClient } from '@supabase/supabase-js';

// Falls back to the existing NexArtTime project so current deployments
// (including Vercel previews without the VITE_TIMETRACKING_* env vars set)
// keep working unchanged. Set the env vars to point Assignments sync at a
// different NexArtTime environment without editing source.
const TIME_TRACKING_URL =
  import.meta.env.VITE_TIMETRACKING_SUPABASE_URL || 'https://heopcvrxotzfqqveekxj.supabase.co';
const TIME_TRACKING_KEY =
  import.meta.env.VITE_TIMETRACKING_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlb3BjdnJ4b3R6ZnFxdmVla3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzUxOTksImV4cCI6MjA5ODgxMTE5OX0.UKknrp6HwNT2Zvf1GATlrKG4OPq9crZZ3EF8PiWo6Ig';

export const timeSupabase = createClient(TIME_TRACKING_URL, TIME_TRACKING_KEY);

// A down or slow NexArtTime endpoint must never hang the CRM's assignment
// flow. Every request gets its own hard timeout.
const SYNC_TIMEOUT_MS = 6000;

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function logSyncIssue(scope, error) {
  if (error?.name === 'AbortError') {
    console.warn(`[TimeSync] ${scope} timed out after ${SYNC_TIMEOUT_MS}ms — NexArtTime may be unreachable. CRM flow is unaffected.`);
    return;
  }
  const status = error?.status || error?.code || 'unknown';
  console.warn(`[TimeSync] ${scope} failed (status: ${status}): ${error?.message || error}`);
}

/**
 * Syncs worker profile and their assigned work order to NexArtTime database.
 *
 * Never throws and never blocks the caller for long: each upsert has its own
 * timeout and its own try/catch, so a failure in one does not skip the other,
 * and an unreachable/slow NexArtTime never delays or breaks the CRM's own
 * save flow. Call this without awaiting it from CRM action handlers.
 */
export async function syncAssignmentToTimeTracking(wo, worker) {
  if (worker) {
    const { signal, clear } = timeoutSignal(SYNC_TIMEOUT_MS);
    try {
      const { error } = await timeSupabase.from('workers').upsert({
        id: worker.id,
        name: worker.full_name || worker.name || 'Worker',
        email: worker.email || '',
        phone: worker.phone || '',
        role: worker.role || 'field',
        hourly_rate: parseFloat(worker.hourly_rate) || 0,
        pin: worker.pin || '1234', // default pin
        status: worker.active !== false ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).abortSignal(signal);

      if (error) logSyncIssue('Worker upsert', error);
    } catch (err) {
      logSyncIssue('Worker upsert', err);
    } finally {
      clear();
    }
  }

  if (wo) {
    const { signal, clear } = timeoutSignal(SYNC_TIMEOUT_MS);
    try {
      const { error } = await timeSupabase.from('work_orders').upsert({
        id: wo.id,
        work_order_number: wo.work_order_number,
        title: wo.title || 'Untitled',
        client_name: wo.client_name || 'Client',
        status: wo.status || 'draft',
        assigned_worker_id: worker ? worker.id : null,
        site_lat: parseFloat(wo.site_lat) || null,
        site_lng: parseFloat(wo.site_lng) || null,
        geofence_radius_ft: parseInt(wo.geofence_radius_ft) || 800,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).abortSignal(signal);

      if (error) logSyncIssue('WorkOrder upsert', error);
    } catch (err) {
      logSyncIssue('WorkOrder upsert', err);
    } finally {
      clear();
    }
  }

  console.log('[TimeSync] Assignment sync attempt finished.');
}
