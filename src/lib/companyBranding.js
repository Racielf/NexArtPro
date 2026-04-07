/**
 * Company Branding Helpers
 * 
 * Centralized branding functions that read from company context.
 * Enables easy migration to multi-company SaaS.
 * 
 * Usage:
 * - Instead of hardcoding "R.C Art Construction LLC" everywhere
 * - Use getDocumentCompanyName() or getBrandingConfig()
 * - All references automatically sync when company context changes
 */

import { getCurrentCompany, getCompanyContact } from './companyContext';
import { APP_CONFIG } from '@/config/app';

/**
 * Get document branding config
 * Used in Estimates, Invoices, PDFs
 */
export function getDocumentBrandingConfig() {
  const company = getCurrentCompany();
  const contact = getCompanyContact();
  
  return {
    companyName: company.name,
    companyEmail: contact.email,
    companyPhone: contact.phone,
    companyAddress: contact.address,
    systemName: APP_CONFIG.appName,
    systemAttribution: `Generated with ${APP_CONFIG.appName}`,
  };
}

/**
 * Get company name for document header
 */
export function getDocumentCompanyName() {
  return getCurrentCompany().name;
}

/**
 * Get company address for invoice/estimate
 */
export function getDocumentAddress() {
  const contact = getCompanyContact();
  return {
    address: contact.address,
    email: contact.email,
    phone: contact.phone,
  };
}

/**
 * Get footer text (company + system branding)
 */
export function getDocumentFooterText() {
  const company = getCurrentCompany();
  const branding = getDocumentBrandingConfig();
  
  return {
    company: `${company.name} · ${contact.address} · ${contact.email}`,
    attribution: branding.systemAttribution,
  };
}