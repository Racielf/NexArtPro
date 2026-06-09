/**
 * invoiceCompanySnapshot.js
 *
 * Pure helpers for invoice company snapshot lifecycle.
 * Source of truth: useCompanyConfig() → loadCompanySettings() → Supabase app_users.company_settings
 *
 * buildInvoiceCompanySnapshot  — captures a snapshot of the current company config into an invoice.
 * resolveInvoiceCompany        — returns the company to display: snapshot (priority) or live config.
 *
 * See: docs/agent/LOCKED_AREAS.md — Company Settings / Sidebar Branding (read-only reference)
 */

/**
 * Captures all company fields into a frozen snapshot stored on the invoice record.
 * Call this when creating a new invoice or refreshing a draft's snapshot.
 *
 * @param {object} company — result of useCompanyConfig() or equivalent
 * @returns {object} snapshot object
 */
export function buildInvoiceCompanySnapshot(company = {}) {
  return {
    name:            company.name            || '',
    displayName:     company.displayName     || company.name || '',
    email:           company.email           || '',
    phone:           company.phone           || '',
    address:         company.address         || '',
    license:         company.license         || '',
    logo_url:        company.logo_url        || '',
    app_logo_url:    company.app_logo_url    || '',
    payment_methods: company.payment_methods || '',
    captured_at:     new Date().toISOString(),
  };
}

/**
 * Resolves the company object to use when rendering an invoice.
 *
 * Priority:
 *   1. invoice.company_snapshot  — captured at send/create time (immutable for sent invoices)
 *   2. liveCompany               — current Settings → Company (fallback for old/snapshot-less invoices)
 *
 * The merge (liveCompany first, then snapshot on top) means the snapshot wins for every key it has,
 * while liveCompany fills in any missing fields.
 *
 * @param {object} invoice     — full invoice record from DB
 * @param {object} liveCompany — result of useCompanyConfig()
 * @returns {object} resolved company object
 */
export function resolveInvoiceCompany(invoice, liveCompany) {
  const snap = invoice?.company_snapshot;
  if (snap && typeof snap === 'object' && (snap.name || snap.logo_url || snap.app_logo_url)) {
    return { ...liveCompany, ...snap };
  }
  return liveCompany || {};
}
