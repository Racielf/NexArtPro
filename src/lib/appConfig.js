/**
 * appConfig.js
 * Single source of truth for app and company branding.
 * Used by all components to access app/company metadata.
 * 
 * PHASE 2: Preparation only (read-only, no backend changes)
 * PHASE 4: Will become dynamic (read from entity/backend)
 */

export const APP_CONFIG = {
  // App branding
  appName: "NexArt Pro",
  appDescription: "Professional Field Service Management",
  
  // Company branding
  company: {
    id: "rc-art",
    name: "R.C Art Construction LLC",           // Legal name (documents/footers)
    displayName: "R.C Art Construction",        // Short name (UI/sidebar)
    city: "Portland, OR",
    email: "info@rcartconstruction.com",
    phone: "",
    address: "",
    license: "",
    logo_url: "",
    tagline: "Professional Art Services",
  },
  
  // Document branding
  document: {
    generator: "NexArt Pro",
  }
};

// Convenience exports for common usage
export const appName = APP_CONFIG.appName;
export const companyName = APP_CONFIG.company.name;           // Legal name
export const companyDisplayName = APP_CONFIG.company.displayName; // UI name
export const companyId = APP_CONFIG.company.id;
export const companyCity = APP_CONFIG.company.city;
export const companyEmail = APP_CONFIG.company.email;