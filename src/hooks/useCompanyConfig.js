/**
 * useCompanyConfig — React hook for document renderers.
 * Loads saved company settings and merges with APP_CONFIG defaults.
 * Returns a config object usable by all template renderers.
 */
import { useState, useEffect, useCallback } from 'react';
import { APP_CONFIG } from '@/lib/appConfig';
import { loadCompanySettings } from '@/lib/companySettings';
import { onCompanyConfigChange } from '@/lib/companyConfigEvents';

const DEFAULTS = {
  name: APP_CONFIG.company.name,
  displayName: APP_CONFIG.company.displayName,
  email: APP_CONFIG.company.email,
  phone: APP_CONFIG.company.phone || '',
  address: APP_CONFIG.company.address || '',
  city: APP_CONFIG.company.city || '',
  license: APP_CONFIG.company.license || '',
  logo_url: APP_CONFIG.company.logo_url || '',
  app_logo_url: APP_CONFIG.app.logo_url || '',
  tagline: APP_CONFIG.company.tagline || '',
  payment_methods: '',
};

export default function useCompanyConfig() {
  const [config, setConfig] = useState(DEFAULTS);

  const refresh = useCallback(() => {
    loadCompanySettings()
      .then(saved => {
        setConfig({
          ...DEFAULTS,
          name: saved.name || DEFAULTS.name,
          email: saved.email || DEFAULTS.email,
          phone: saved.phone || DEFAULTS.phone,
          address: saved.address || DEFAULTS.address,
          license: saved.license || DEFAULTS.license,
          logo_url: saved.logo_url || DEFAULTS.logo_url,
          app_logo_url: saved.app_logo_url || DEFAULTS.app_logo_url,
          payment_methods: saved.payment_methods || DEFAULTS.payment_methods,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // Re-fetch whenever company settings are saved anywhere
    const unsub = onCompanyConfigChange(refresh);
    return unsub;
  }, [refresh]);

  return config;
}