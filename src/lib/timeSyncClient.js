import { createClient } from '@supabase/supabase-js';

const TIME_TRACKING_URL = 'https://heopcvrxotzfqqveekxj.supabase.co';
const TIME_TRACKING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlb3BjdnJ4b3R6ZnFxdmVla3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzUxOTksImV4cCI6MjA5ODgxMTE5OX0.UKknrp6HwNT2Zvf1GATlrKG4OPq9crZZ3EF8PiWo6Ig';

export const timeSupabase = createClient(TIME_TRACKING_URL, TIME_TRACKING_KEY);

/**
 * Syncs worker profile and their assigned work order to NexArtTime database.
 */
export async function syncAssignmentToTimeTracking(wo, worker) {
  try {
    // 1. Sync Worker (if specified)
    if (worker) {
      const { error: workerErr } = await timeSupabase.from('workers').upsert({
        id: worker.id,
        name: worker.full_name || worker.name || 'Worker',
        email: worker.email || '',
        phone: worker.phone || '',
        role: worker.role || 'field',
        hourly_rate: parseFloat(worker.hourly_rate) || 0,
        pin: worker.pin || '1234', // default pin
        status: worker.active !== false ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (workerErr) {
        console.warn('[Sync] Worker upsert warning:', workerErr.message);
      }
    }

    // 2. Sync Work Order
    if (wo) {
      const { error: woErr } = await timeSupabase.from('work_orders').upsert({
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
      }, { onConflict: 'id' });

      if (woErr) {
        console.warn('[Sync] WorkOrder upsert warning:', woErr.message);
      }
    }
    console.log('[Sync] Successfully synchronized assignment details with NexArtTime.');
  } catch (err) {
    console.error('[Sync] Error syncing assignment to time-tracking database:', err);
  }
}
