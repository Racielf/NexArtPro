/**
 * companySettings.js
 * Persists company settings on the current user's profile via nexartClient.auth.
 * Merges saved data with defaults from appConfig.
 */
import { nexartClient } from '@/api/nexartClient';
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
  app_logo_url: APP_CONFIG.app.logo_url || '',
  nexartsign_logo_url: APP_CONFIG.app.logo_url || '',
  payment_methods: '',
};

export async function loadCompanySettings() {
  const user = await nexartClient.auth.me();
  const saved = user?.[STORAGE_KEY];
  if (saved && typeof saved === 'object') {
    return { ...DEFAULTS, ...saved };
  }
  return { ...DEFAULTS };
}

export async function saveCompanySettings(settings) {
  await nexartClient.auth.updateMe({ [STORAGE_KEY]: settings });
  _cache = settings;
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
