/**
 * companySettings.js
 * Company settings are company-wide configuration, not per-agent profile data.
 * Source of truth for the current single-company SaaS phase: app_users row username='admin'.
 * Fallbacks are kept only for legacy/local-preview safety.
 */
import { base44 } from '@/api/base44Client';
import { APP_CONFIG } from '@/lib/appConfig';
import { emitCompanyConfigChange } from '@/lib/companyConfigEvents';
import { supabase } from '@/lib/supabaseClient';

const STORAGE_KEY = 'company_settings';
const COMPANY_SETTINGS_OWNER_USERNAME = 'admin';

const DEFAULTS = {
  name: APP_CONFIG.company.name,
  email: APP_CONFIG.company.email,
  phone: APP_CONFIG.company.phone || '',
  address: APP_CONFIG.company.address || '',
  license: '',
  logo_url: '',
  app_logo_url: APP_CONFIG.app.logo_url || '',
  nexartsign_logo_url: APP_CONFIG.app.logo_url || '',
  payment_methods: '',
};

function normalizeSettings(settings) {
  if (!settings || typeof settings !== 'object') return { ...DEFAULTS };
  return { ...DEFAULTS, ...settings };
}

async function loadCompanySettingsFromSupabase() {
  const { data, error } = await supabase
    .from('app_users')
    .select('company_settings')
    .eq('username', COMPANY_SETTINGS_OWNER_USERNAME)
    .maybeSingle();

  if (error) throw error;
  return normalizeSettings(data?.company_settings);
}

async function saveCompanySettingsToSupabase(settings) {
  const payload = {
    company_settings: normalizeSettings(settings),
    last_company_settings_update_at: new Date().toISOString(),
  };

  const { data: owner, error: lookupError } = await supabase
    .from('app_users')
    .select('id')
    .eq('username', COMPANY_SETTINGS_OWNER_USERNAME)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!owner?.id) throw new Error('Admin company settings owner not found');

  const { error } = await supabase
    .from('app_users')
    .update(payload)
    .eq('id', owner.id);

  if (error) throw error;
  return payload.company_settings;
}

// LOCKED AREA: Company Settings persistence
// Company settings are stored in app_users.username='admin'.company_settings (Supabase).
// Do not move this back to localStorage-only storage.
// See: docs/agent/LOCKED_AREAS.md
export async function loadCompanySettings() {
  try {
    const settings = await loadCompanySettingsFromSupabase();
    _cache = settings;
    return settings;
  } catch (err) {
    console.warn('[companySettings] Supabase load failed; using auth fallback:', err?.message || err);
  }

  const user = await base44.auth.me();
  const saved = user?.[STORAGE_KEY];
  const settings = normalizeSettings(saved);
  _cache = settings;
  return settings;
}

export async function saveCompanySettings(settings) {
  const normalized = normalizeSettings(settings);

  try {
    await saveCompanySettingsToSupabase(normalized);
  } catch (err) {
    console.warn('[companySettings] Supabase save failed; using auth fallback:', err?.message || err);
    await base44.auth.updateMe({ [STORAGE_KEY]: normalized });
  }

  _cache = normalized;
  emitCompanyConfigChange();
}

let _cache = null;

export async function refreshCompanyConfig() {
  const settings = await loadCompanySettings();
  _cache = settings;
  return settings;
}

export function getCachedCompanyConfig() {
  if (_cache) return _cache;
  return DEFAULTS;
}
