/**
 * templateLayouts.js — Layout configuration per template.
 *
 * Each template defines structural choices for:
 *   header: how logo, company info, and doc number are arranged
 *   clientProject: how client and project blocks are laid out
 *   dates: how dates (doc date, start, end) are presented
 *   lineItems: how the items table is styled
 *   totals: how financial summary is presented
 *   footer: footer style key
 *
 * Header modes:
 *   "left-right"     — logo+company left, doc info right (row)
 *   "stacked"        — logo+company top, doc info below (column)
 *   "split-premium"  — logo+company left, doc info right with accent divider
 *
 * ClientProject modes:
 *   "grid"           — 2 equal columns side by side
 *   "cards"          — 2 bordered card boxes
 *   "stacked"        — client on top, project below (single column)
 *
 * Dates modes:
 *   "block"          — stacked key-value pairs
 *   "inline"         — single line with separator
 *   "formal"         — label: value rows in a mini table
 *
 * Logo positions:
 *   "left"           — logo on the left of company text
 *   "top"            — logo above company text (centered)
 */

export const TEMPLATE_LAYOUTS = {
  // ── Standard / Minimal → "Clean" ────────────────────────
  standard: {
    header: 'left-right',
    logoPosition: 'left',
    headerBg: '#0f172a',
    headerColor: '#ffffff',
    accentColor: '#3b82f6',
    clientProject: 'grid',
    dates: 'block',
    lineItems: 'striped',
    totals: 'right-aligned',
    footer: 'standard',
    font: 'Inter, Arial, sans-serif',
  },
  minimal: {
    header: 'left-right',
    logoPosition: 'left',
    headerBg: '#ffffff',
    headerColor: '#111827',
    accentColor: '#374151',
    clientProject: 'grid',
    dates: 'inline',
    lineItems: 'clean',
    totals: 'right-aligned',
    footer: 'minimal',
    font: 'Arial, sans-serif',
  },

  // ── Modern → future "Bold" ──────────────────────────────
  modern: {
    header: 'stacked',
    logoPosition: 'top',
    headerBg: '#ffffff',
    headerColor: '#111827',
    accentColor: '#7c3aed',
    clientProject: 'cards',
    dates: 'inline',
    lineItems: 'bordered',
    totals: 'card',
    footer: 'modern',
    font: 'system-ui, -apple-system, sans-serif',
  },

  // ── Executive → future "Classic" ────────────────────────
  executive: {
    header: 'split-premium',
    logoPosition: 'left',
    headerBg: '#ffffff',
    headerColor: '#1a1a1a',
    accentColor: '#b8860b',
    clientProject: 'grid',
    dates: 'formal',
    lineItems: 'elegant',
    totals: 'right-aligned',
    footer: 'executive',
    font: 'Georgia, serif',
  },

  // ── Compact (legacy, maps to standard layout) ───────────
  compact: {
    header: 'left-right',
    logoPosition: 'left',
    headerBg: '#f0f0f0',
    headerColor: '#222222',
    accentColor: '#0066cc',
    clientProject: 'stacked',
    dates: 'inline',
    lineItems: 'clean',
    totals: 'right-aligned',
    footer: 'minimal',
    font: 'Arial, sans-serif',
  },

  // ── Pro → future "Bold" ─────────────────────────────────
  pro: {
    header: 'left-right',
    logoPosition: 'left',
    headerBg: '#0f172a',
    headerColor: '#ffffff',
    accentColor: '#1e40af',
    clientProject: 'cards',
    dates: 'block',
    lineItems: 'striped',
    totals: 'card',
    footer: 'pro',
    font: 'Inter, Arial, sans-serif',
  },
};

/**
 * Resolve layout config for a template key.
 * Falls back to standard if unknown.
 */
export function getTemplateLayout(templateKey) {
  return TEMPLATE_LAYOUTS[templateKey] || TEMPLATE_LAYOUTS.standard;
}