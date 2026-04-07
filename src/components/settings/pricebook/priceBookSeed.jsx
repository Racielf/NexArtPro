// Price Book seed — Oregon Market Reference Prices (2024-2025)
// book_price = non-editable reference (Oregon avg). estimated_cost = internal cost basis.
// All prices in USD. Labor rates reflect Portland Metro / Statewide average.

let _id = 1;
const id = () => `pb-seed-${_id++}`;

function entry(serviceName, category, unit, base_price, estimated_cost = null, markup = null, notes = '') {
  return {
    id: id(),
    service_id: null,
    _service_name_ref: serviceName,
    display_name: serviceName,
    category,
    unit,
    base_price,
    estimated_cost,
    markup,
    notes,
    is_active: true,
    needs_review: false,
    source: 'seed',
    // ── Immutable audit originals (set once at seed creation, never overwritten) ──
    _original_display_name: serviceName,
    _original_base_price:   base_price,
    _original_notes:        notes,
    _original_unit:         unit,
  };
}

export const PRICE_BOOK_SEED = [
  // ── Painting — OR avg $1.50–$3.50/sqft labor ─────────────────────────────
  entry('Interior Wall Painting',     'Painting',  'sqft',      2.25,  0.65,  null,  'OR avg $1.50–$3.50/sqft · 2-coat finish'),
  entry('Ceiling Painting',           'Painting',  'sqft',      2.50,  0.70,  null,  'OR avg · includes prep and 2 coats'),
  entry('Trim Painting',              'Painting',  'linear_ft', 3.00,  0.90,  null,  'OR avg · caulk and touch-up included'),
  entry('Door Painting',              'Painting',  'door',      110,   32,    null,  'OR avg · both sides, all edges'),
  entry('Cabinet Painting',           'Painting',  'project',   2200,  650,   null,  'OR avg · full kitchen cabinet set'),
  entry('Exterior Siding Painting',   'Painting',  'sqft',      2.75,  0.80,  null,  'OR avg · power wash + prime included'),
  entry('Deck Staining',              'Painting',  'sqft',      2.25,  0.55,  null,  'OR avg · clean and seal included'),
  entry('Primer Application',         'Painting',  'sqft',      0.75,  0.22,  null,  'OR avg · one coat primer only'),

  // ── Drywall — OR avg $1.50–$3.00/sqft labor ──────────────────────────────
  entry('Drywall Patch Repair',       'Drywall',   'each',      225,   65,    null,  'OR avg $185–$265 · textured match'),
  entry('Drywall Installation',       'Drywall',   'sqft',      3.00,  0.95,  null,  'OR avg $1.50–$3.00/sqft · hang, tape, first coat'),
  entry('Tape and Texture',           'Drywall',   'sqft',      1.75,  0.50,  null,  'OR avg · tape, mud, texture match'),
  entry('Level 5 Finish',             'Drywall',   'sqft',      4.00,  1.25,  null,  'OR avg · skim coat, paint-ready'),
  entry('Popcorn Ceiling Removal',    'Drywall',   'sqft',      2.00,  0.45,  null,  'OR avg · scrape, sand, patch'),
  entry('Water Damage Drywall Repair','Drywall',   'sqft',      5.00,  1.75,  null,  'OR avg · remove, replace, re-texture'),

  // ── Flooring ──────────────────────────────────────────────────────────────
  entry('LVP Installation',           'Flooring',  'sqft',      5.50,  1.50,  null,  'OR avg · includes underlayment'),
  entry('Laminate Flooring Installation','Flooring','sqft',     4.50,  1.20,  null,  'OR avg · includes underlayment + transitions'),
  entry('Tile Floor Installation',    'Flooring',  'sqft',      10.00, 3.20,  null,  'OR avg · ceramic/porcelain standard size'),
  entry('Baseboard Installation',     'Flooring',  'linear_ft', 4.50,  1.30,  null,  'OR avg · install and paint included'),
  entry('Carpet Installation',        'Flooring',  'sqft',      3.75,  0.90,  null,  'OR avg · includes pad, excludes carpet cost'),
  entry('Floor Removal',              'Flooring',  'sqft',      1.75,  0.45,  null,  'OR avg · any type, includes haul away'),
  entry('Subfloor Repair',            'Flooring',  'sqft',      7.00,  2.25,  null,  'OR avg · cut, replace, and secure'),

  // ── Carpentry — OR Carpenters avg $45–$55/hr ──────────────────────────────
  entry('Carpentry Labor',            'Carpentry', 'hour',      52,    null,  null,  'OR avg $45–$55/hr · general carpentry'),
  entry('Crown Molding Installation', 'Carpentry', 'linear_ft', 7.50,  2.20,  null,  'OR avg · install and caulk, no paint'),
  entry('Cabinet Installation',       'Carpentry', 'each',      140,   40,    null,  'OR avg · per cabinet box, pre-made'),
  entry('Wood Rot Repair',            'Carpentry', 'each',      325,   105,   null,  'OR avg · per section, includes material'),

  // ── Labor — OR Prevailing Wage & Market ───────────────────────────────────
  entry('General Labor',              'Misc',      'hour',      48,    null,  null,  'OR avg $38–$58/hr · general contractor rate'),
  entry('Skilled Trade Labor',        'Misc',      'hour',      55,    null,  null,  'OR avg $45–$55/hr · carpenter / finish trade'),
  entry('Electrician Labor',          'Misc',      'hour',      95,    null,  null,  'OR avg $50–$125/hr · licensed electrician'),
  entry('Plumber Labor',              'Misc',      'hour',      95,    null,  null,  'OR avg $50–$125/hr · licensed plumber'),

  // ── Bathroom Remodeling ───────────────────────────────────────────────────
  entry('Shower Tile Installation',   'Bathroom Remodeling','sqft',  14.00, 4.50, null, 'OR avg · wall tile, includes backer'),
  entry('Vanity Installation',        'Bathroom Remodeling','each',  400,   110,  null, 'OR avg · labor only, excludes vanity'),
  entry('Toilet Installation',        'Bathroom Remodeling','each',  265,   55,   null, 'OR avg · labor only, excludes toilet'),
  entry('Bathroom Caulking',          'Bathroom Remodeling','project',200, 45,   null, 'OR avg · tub, shower, and fixtures'),

  // ── Kitchen Remodeling ────────────────────────────────────────────────────
  entry('Backsplash Tile Installation','Kitchen Remodeling','sqft',  16.00, 5.00, null,'OR avg · ceramic, includes grout'),
  entry('Faucet Installation',        'Kitchen Remodeling','each',   200,   40,   null, 'OR avg · labor only, excludes faucet'),
  entry('Sink Installation',          'Kitchen Remodeling','each',   260,   55,   null, 'OR avg · labor only, excludes sink'),

  // ── Tile ──────────────────────────────────────────────────────────────────
  entry('Tile Installation (Floor)',  'Tile',      'sqft',      10.00, 3.20,  null,  'OR avg · ceramic/porcelain floor'),
  entry('Tile Installation (Wall)',   'Tile',      'sqft',      13.00, 4.00,  null,  'OR avg · wall tile, includes waterproofing'),
  entry('Tile Removal',              'Tile',      'sqft',      2.75,  0.65,  null,  'OR avg · includes haul away'),
  entry('Grout Repair / Regrouting', 'Tile',      'sqft',      4.50,  1.00,  null,  'OR avg · remove and replace grout'),

  // ── Demolition ────────────────────────────────────────────────────────────
  entry('Debris Hauling',             'Demolition','project',   400,   90,    null,  'OR avg · full load, single trip'),
  entry('Wall Removal',               'Demolition','each',      525,   140,   null,  'OR avg · non-load-bearing, includes patch'),

  // ── Doors & Windows ───────────────────────────────────────────────────────
  entry('Interior Door Installation', 'Doors & Windows','door', 325,   80,    null,  'OR avg · pre-hung door, labor only'),
  entry('Exterior Door Installation', 'Doors & Windows','door', 495,   140,   null,  'OR avg · includes weatherstrip'),
  entry('Window Installation',        'Doors & Windows','window',450,  125,   null,  'OR avg · labor only, excludes window'),

  // ── Repairs ───────────────────────────────────────────────────────────────
  entry('General Home Repair',        'Repairs',   'hour',      95,    28,    null,  'OR avg $85–$110/hr · handyman rate'),
  entry('Door Adjustment / Repair',   'Repairs',   'each',      110,   22,    null,  'OR avg · adjust, align, and re-hang'),

  // ── Roofing — OR avg $4.00–$7.00/sqft ────────────────────────────────────
  entry('Roof Shingle Installation',  'Misc',      'sqft',      5.50,  2.00,  null,  'OR avg $4.00–$7.00/sqft · labor only'),
  entry('Roof Repair',                'Misc',      'each',      450,   120,   null,  'OR avg · patch/spot repair, per section'),

  // ── Residential Construction (sq ft) ─────────────────────────────────────
  entry('Standard Construction (Residential)','Misc','sqft',  200,    120,   null,  'OR avg $150–$250/sqft · basic/standard build'),
  entry('Custom Construction (Residential)', 'Misc','sqft',   450,    220,   null,  'OR avg $350–$550/sqft · custom/high-end build'),

  // ── Cleaning & Final Touch ────────────────────────────────────────────────
  entry('Post-Construction Cleaning', 'Cleaning & Final Touch','sqft', 0.50, 0.12, null,'OR avg · full broom + detail clean'),

  // ── Project Management & Site Costs ──────────────────────────────────────
  entry('Project Management',         'Misc',      'hour',      75,    null,  null,  'OR avg · admin, scheduling, coordination'),
  entry('Site Visit / Consultation',  'Misc',      'each',      175,   null,  null,  'OR avg · first consultation'),
  entry('Travel / Mobilization',      'Misc',      'each',      85,    null,  null,  'OR avg · per trip, within service area'),
];