/**
 * companySettings.js
 * Persists company settings on the current user's profile via base44.auth.
 * Merges saved data with defaults from appConfig.
 */
import { base44 } from '@/api/base44Client';
import { APP_CONFIG } from '@/lib/appConfig';
import { emitCompanyConfigChange } from '@/lib/companyConfigEvents';

const STORAGE_KEY = 'company_settings';

const DEFAULTS = {
  name: APP_CONFIG.company.name,
  email: APP_CONFIG.company.email,
  phone: APP_CONFIG.company.phone || '',
  address: APP_CONFIG.company.address || '',
  license: '',
  logo_url: '',
};

export async function loadCompanySettings() {
  const user = await base44.auth.me();
  const saved = user?.[STORAGE_KEY];
  if (saved && typeof saved === 'object') {
    return { ...DEFAULTS, ...saved };
  }
  return { ...DEFAULTS };
}

export async function saveCompanySettings(settings) {
  await base44.auth.updateMe({ [STORAGE_KEY]: settings });
  _cache = settings;
  emitCompanyConfigChange();
}

/**
 * getCompanyConfig — returns merged company config for document renderers.
 * Synchronous fallback using cached value; async for fresh data.
 */
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