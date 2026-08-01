/**
 * Shared color/type tokens for the Estimate Editor's "Pipeline" redesign
 * (owner-approved mockup: Design project "Pipeline para estimate editor",
 * `Estimate Pipeline.dc.html`). Scoped to estimate-editor components only —
 * intentionally NOT merged into src/index.css's app-wide ink/burnt/cream
 * tokens, since the rest of the app (Dashboard, Leads, Customers,
 * Appointments, Calendar) keeps that palette. This is a deliberate
 * per-module exception, requested explicitly by the owner ("lo quiero
 * igualito") after building the reference mockup by hand.
 */
export const ORGANIC = {
  bg: '#f5ead8',
  surface: '#f9f4ed',
  ink900: '#201e1d',
  ink700: '#474238',
  ink500: '#645c50',
  ink400: '#82796a',
  ink300: '#a19786',
  divider: 'rgba(32,30,29,0.14)',

  neutral100: '#f9f4ed',
  neutral200: '#eee7db',
  neutral300: '#dcd3c4',

  accent100: '#fff2eb',
  accent200: '#ffe1d0',
  accent300: '#ffc6a5',
  accent500: '#d67f48',
  accent: '#c67139',
  accent600: '#b2622d',
  accent700: '#8c491a',
  accent800: '#643312',

  olive100: '#f0fae1',
  olive200: '#e1eecc',
  olive500: '#8fa073',
  olive600: '#728157',
  olive700: '#56633f',
  olive800: '#3d472b',
  olive900: '#272e1b',

  danger: '#b91c1c',

  radiusMd: '16px',
  radiusLg: '26px',
  shadowSm: '0 1px 2px rgba(46,43,37,0.14)',
  shadowMd: '0 3px 10px rgba(46,43,37,0.16)',
  shadowLg: '0 12px 32px rgba(46,43,37,0.22)',

  fontHeading: '"Caprasimo", system-ui, sans-serif',
  fontBody: '"Figtree", system-ui, sans-serif',
};

export const organicHeadingStyle = { fontFamily: ORGANIC.fontHeading, fontWeight: 400 };
export const organicBodyStyle = { fontFamily: ORGANIC.fontBody };
