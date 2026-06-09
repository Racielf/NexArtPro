/**
 * Global App Configuration
 * Centralized branding and metadata
 */

export const APP_CONFIG = {
  appName: 'NexArt Pro',
  companyName: 'R.C Art Construction LLC',
  tagline: 'Professional Field Service Management',
  motto: 'Generated with NexArt Pro',
} as const;

export type AppConfig = typeof APP_CONFIG;