/**
 * Company Context & Configuration
 * 
 * This is the single source of truth for company branding/identity.
 * In future: will be replaced with API call or user context.
 * 
 * Current mode: DEFAULT_COMPANY (single-company SaaS)
 * Future mode: Multi-company support via user session
 */

export const DEFAULT_COMPANY = {
  id: 'rc-art',
  name: 'R.C Art Construction LLC',
  email: 'info@rcartconstruction.com',
  phone: '(503) 555-0100',
  address: 'Portland, OR 97201',
  website: 'www.rcartconstruction.com',
};

/**
 * Get the current company context
 * 
 * Future enhancement: Read from:
 * - User session (multi-company SaaS)
 * - API endpoint
 * - Auth context
 * 
 * For now: Returns DEFAULT_COMPANY always
 */
export function getCurrentCompany() {
  // TODO: In future, fetch from user session or API
  // if (user?.company_id) {
  //   return await base44.entities.Company.get(user.company_id);
  // }
  return DEFAULT_COMPANY;
}

/**
 * Get company name for display
 * Single source of truth for company name in UI
 */
export function getCompanyName() {
  return getCurrentCompany().name;
}

/**
 * Get company contact info
 */
export function getCompanyContact() {
  const company = getCurrentCompany();
  return {
    email: company.email,
    phone: company.phone,
    address: company.address,
  };
}