/**
 * companyConfigEvents.js — Tiny pub/sub for company config changes.
 * Allows CompanyPanel (or any writer) to notify consumers (Sidebar, hooks)
 * that company settings have been updated, without coupling them directly.
 */
const listeners = new Set();

export function onCompanyConfigChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitCompanyConfigChange() {
  listeners.forEach(fn => fn());
}