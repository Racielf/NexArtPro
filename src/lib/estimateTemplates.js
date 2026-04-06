/**
 * Estimate Template System
 * Defines 6 professional templates with different layouts & styles
 * Used by EstimateTemplateRenderer for Preview, Review & Send, Print/PDF
 */

export const TEMPLATES = {
  minimal: {
    name: 'Minimal',
    description: 'Clean, simple, focused on essentials',
    key: 'minimal',
  },
  compact: {
    name: 'Compact',
    description: 'Space-efficient, single column',
    key: 'compact',
  },
  professional: {
    name: 'Professional',
    description: 'Classic dark header, full details',
    key: 'professional',
  },
  modern: {
    name: 'Modern',
    description: 'Contemporary design with accent colors',
    key: 'modern',
  },
  executive: {
    name: 'Executive',
    description: 'Premium look, comprehensive info',
    key: 'executive',
  },
  detailed: {
    name: 'Detailed',
    description: 'Maximum detail, full breakdown',
    key: 'detailed',
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

/**
 * Default options for all templates
 */
export const DEFAULT_OPTIONS = {
  showPrices: true,
  showBreakdown: true,
  showTerms: true,
  showSignatures: true,
  showProjectDates: true,       // Show project start/end dates
  showDeposit: true,            // Show deposit & remaining balance section
  hideInternalNotes: true,      // CRITICAL: Never show internal notes to client
};

/**
 * Get template by key
 */
export function getTemplate(key) {
  return TEMPLATES[key] || TEMPLATES.professional;
}

/**
 * Get all template options (for UI selector)
 */
export function getTemplateOptions() {
  return Object.values(TEMPLATES).map(t => ({
    value: t.key,
    label: t.name,
    description: t.description,
  }));
}