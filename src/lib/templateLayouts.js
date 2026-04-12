/**
 * templateLayouts.js — Layout configuration per template.
 *
 * With v2 template system, layouts primarily serve the FlexibleDoc* components
 * for any shared rendering needs. The main templates (CleanTemplate, PremiumTemplate,
 * ModernCardTemplate) handle their own layout internally.
 *
 * Legacy layout configs kept for backward compat with any code still calling getTemplateLayout().
 */

export const TEMPLATE_LAYOUTS = {
  // ── New templates ───────────────────────────────────
  clean: {
    header: 'left-right',
    logoPosition: 'left',
    headerBg: '#0f172a',
    headerColor: '#ffffff',
    accentColor: '#3b82f6',
    clientProject: 'grid',
    dates: 'block',
    font: "'Inter', Arial, sans-serif",
  },
  premium: {
    header: 'split-premium',
    logoPosition: 'left',
    headerBg: '#ffffff',
    headerColor: '#1a1a1a',
    accentColor: '#b8860b',
    clientProject: 'grid',
    dates: 'formal',
    font: "Georgia, 'Times New Roman', serif",
  },
  modern_card: {
    header: 'left-right',
    logoPosition: 'left',
    headerBg: '#0f172a',
    headerColor: '#ffffff',
    accentColor: '#2563eb',
    clientProject: 'cards',
    dates: 'inline',
    font: "'Inter', Arial, sans-serif",
  },

  // ── Legacy mappings ─────────────────────────────────
  standard: {
    header: 'left-right', logoPosition: 'left', headerBg: '#0f172a', headerColor: '#ffffff',
    accentColor: '#3b82f6', clientProject: 'grid', dates: 'block',
    font: "'Inter', Arial, sans-serif",
  },
  minimal: {
    header: 'left-right', logoPosition: 'left', headerBg: '#ffffff', headerColor: '#111827',
    accentColor: '#374151', clientProject: 'grid', dates: 'inline',
    font: 'Arial, sans-serif',
  },
  modern: {
    header: 'left-right', logoPosition: 'left', headerBg: '#0f172a', headerColor: '#ffffff',
    accentColor: '#2563eb', clientProject: 'cards', dates: 'inline',
    font: "'Inter', Arial, sans-serif",
  },
  executive: {
    header: 'split-premium', logoPosition: 'left', headerBg: '#ffffff', headerColor: '#1a1a1a',
    accentColor: '#b8860b', clientProject: 'grid', dates: 'formal',
    font: "Georgia, 'Times New Roman', serif",
  },
  compact: {
    header: 'left-right', logoPosition: 'left', headerBg: '#f0f0f0', headerColor: '#222222',
    accentColor: '#0066cc', clientProject: 'stacked', dates: 'inline',
    font: 'Arial, sans-serif',
  },
  pro: {
    header: 'left-right', logoPosition: 'left', headerBg: '#0f172a', headerColor: '#ffffff',
    accentColor: '#1e40af', clientProject: 'cards', dates: 'block',
    font: "'Inter', Arial, sans-serif",
  },
};

export function getTemplateLayout(templateKey) {
  return TEMPLATE_LAYOUTS[templateKey] || TEMPLATE_LAYOUTS.clean;
}