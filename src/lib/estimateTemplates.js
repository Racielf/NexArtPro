/**
 * Estimate Template System (v2)
 *
 * 3 structurally distinct templates:
 *   clean       — Modern professional contractor estimate
 *   premium     — Presentation-level formal proposal
 *   modern_card — Contemporary SaaS-style card layout
 *
 * Legacy keys are preserved for backward compat but map to new templates
 * in EstimateTemplateRenderer.
 */

export const TEMPLATES = {
  clean: {
    name: 'Clean',
    description: 'Modern professional — balanced, minimal, highly readable',
    key: 'clean',
  },
  premium: {
    name: 'Premium',
    description: 'Formal presentation — serif, warm tones, elegant spacing',
    key: 'premium',
  },
  modern_card: {
    name: 'Modern',
    description: 'Contemporary card layout — modular, SaaS-style sections',
    key: 'modern_card',
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
  showProjectDates: true,
  showDeposit: true,
  hideInternalNotes: true,
};

/**
 * Get template by key (supports legacy keys)
 */
export function getTemplate(key) {
  return TEMPLATES[key] || TEMPLATES.clean;
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