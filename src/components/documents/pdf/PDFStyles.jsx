/**
 * PDFStyles.js — Professional PDF Design System
 *
 * Centralized spacing, typography, and color tokens.
 * Used by all PDF layout components for visual consistency.
 */

// ─── COLOR PALETTES ───────────────────────────────────────────────
export const COLORS = {
  // Shared
  white: '#ffffff',
  black: '#000000',
  text: {
    primary:   '#0f172a',  // slate-900 — headings, bold values
    secondary: '#334155',  // slate-700 — body text
    muted:     '#64748b',  // slate-500 — labels, captions
    faint:     '#94a3b8',  // slate-400 — subtle, hints
    inverse:   '#ffffff',
  },
  bg: {
    page:       '#ffffff',
    tableHead:  '#f8fafc',  // very light gray
    tableStripe:'#fafbfc',
    subtle:     '#f1f5f9',
    card:       '#f8fafc',
  },
  border: {
    light:  '#f1f5f9',
    medium: '#e2e8f0',
    heavy:  '#cbd5e1',
  },
  // Proposal-specific
  proposal: {
    accent:      '#7c3aed',  // violet
    accentLight: '#ede9fe',  // violet-50
    accentMuted: '#a78bfa',  // violet-400
    headerBg:    '#ffffff',
    cardBg:      '#faf5ff',
    cardBorder:  'rgba(124,58,237,0.12)',
  },
  // Bid-specific
  bid: {
    accent:      '#0f172a',  // slate-900
    accentBlue:  '#38bdf8',  // sky-400
    headerBg:    '#0f172a',
    headerText:  '#ffffff',
    sectionAccent:'#475569',
  },
};

// ─── SPACING SYSTEM (px) ──────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  page: 48,       // horizontal page padding
  pageTop: 40,    // top padding
  sectionGap: 28, // gap between sections
};

// ─── TYPOGRAPHY ──────────────────────────────────────────────────
export const FONT = {
  family: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  size: {
    tiny:    9,
    xs:     10,
    sm:     11,
    base:   12,
    md:     13,
    lg:     14,
    xl:     16,
    '2xl':  18,
    '3xl':  22,
    '4xl':  26,
    '5xl':  28,
  },
  weight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold:800,
    black:    900,
  },
  lineHeight: {
    tight:   1.2,
    snug:    1.35,
    normal:  1.55,
    relaxed: 1.7,
    loose:   1.85,
  },
};

// ─── COMMON INLINE STYLES ────────────────────────────────────────
export const S = {
  // Section title
  sectionTitle: (color = COLORS.text.muted) => ({
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color,
    marginBottom: SPACE.md,
    marginTop: 0,
  }),

  // Section block container
  sectionBlock: {
    marginBottom: SPACE.sectionGap,
  },

  // Body paragraph
  body: {
    fontSize: FONT.size.base,
    color: COLORS.text.secondary,
    lineHeight: FONT.lineHeight.relaxed,
    whiteSpace: 'pre-wrap',
    margin: 0,
  },

  // Small body text
  bodySmall: {
    fontSize: FONT.size.sm,
    color: COLORS.text.muted,
    lineHeight: FONT.lineHeight.relaxed,
    margin: 0,
  },

  // Tiny label (above data)
  tinyLabel: {
    fontSize: FONT.size.tiny,
    fontWeight: FONT.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: COLORS.text.faint,
    marginBottom: SPACE.xs + 2,
  },

  // Sub-heading within section
  subHeading: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.text.secondary,
    marginBottom: SPACE.xs + 2,
  },

  // Divider line
  divider: {
    borderTop: `1px solid ${COLORS.border.medium}`,
    margin: `${SPACE.xl}px 0`,
  },

  // Card container
  card: (bg = COLORS.bg.card, border = COLORS.border.medium) => ({
    background: bg,
    borderRadius: 8,
    padding: `${SPACE.lg}px ${SPACE.xl}px`,
    border: `1px solid ${border}`,
  }),
};