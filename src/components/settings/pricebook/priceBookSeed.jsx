// Price Book seed — connected to Service Catalog by service name
// service_id references are matched at runtime by name since seed IDs are dynamic
// Each entry can have base_price = null if not yet priced

let _id = 1;
const id = () => `pb-seed-${_id++}`;

function entry(serviceName, category, unit, base_price, estimated_cost = null, markup = null, notes = '') {
  return {
    id: id(),
    service_id: null,          // resolved at runtime against SERVICES_SEED by name
    _service_name_ref: serviceName,  // used to resolve service_id on mount
    display_name: serviceName,
    category,
    unit,
    base_price,                // null = unpriced
    estimated_cost,
    markup,
    notes,
    is_active: true,
    needs_review: false,
    source: 'seed',
  };
}

export const PRICE_BOOK_SEED = [
  // ── Painting ──────────────────────────────────────────────────────────────
  entry('Interior Wall Painting',    'Painting',  'sqft',      1.75,  0.55,  null,  'Per sqft, 2-coat finish'),
  entry('Ceiling Painting',          'Painting',  'sqft',      2.00,  0.60,  null,  'Includes prep, 1–2 coats'),
  entry('Trim Painting',             'Painting',  'linear_ft', 2.50,  0.80,  null,  'Includes caulk and touch-ups'),
  entry('Door Painting',             'Painting',  'door',      95,    30,    null,  'Both sides, all edges'),
  entry('Cabinet Painting',          'Painting',  'project',   1800,  550,   null,  'Full kitchen cabinet set'),
  entry('Exterior Siding Painting',  'Painting',  'sqft',      2.25,  0.70,  null,  'Includes power wash and prime'),
  entry('Deck Staining',             'Painting',  'sqft',      2.00,  0.50,  null,  'Includes clean and seal'),
  entry('Primer Application',        'Painting',  'sqft',      0.65,  0.20,  null,  'One coat primer only'),

  // ── Drywall ───────────────────────────────────────────────────────────────
  entry('Drywall Patch Repair',      'Drywall',   'each',      185,   55,    null,  'Small to medium hole, textured'),
  entry('Drywall Installation',      'Drywall',   'sqft',      2.80,  0.85,  null,  'Hang, tape, and first coat'),
  entry('Tape and Texture',          'Drywall',   'sqft',      1.50,  0.45,  null,  'Tape, mud, and match texture'),
  entry('Level 5 Finish',            'Drywall',   'sqft',      3.50,  1.10,  null,  'Skim coat, paint-ready'),
  entry('Popcorn Ceiling Removal',   'Drywall',   'sqft',      1.80,  0.40,  null,  'Scrape, sand, patch'),
  entry('Water Damage Drywall Repair','Drywall',  'sqft',      4.50,  1.50,  null,  'Remove, replace, re-texture'),

  // ── Flooring ──────────────────────────────────────────────────────────────
  entry('LVP Installation',          'Flooring',  'sqft',      4.50,  1.20,  null,  'Includes underlayment'),
  entry('Laminate Flooring Installation','Flooring','sqft',    3.75,  1.00,  null,  'Includes underlayment, transitions'),
  entry('Tile Floor Installation',   'Flooring',  'sqft',      8.50,  2.80,  null,  'Ceramic/porcelain, standard size'),
  entry('Baseboard Installation',    'Flooring',  'linear_ft', 4.00,  1.20,  null,  'Install and paint included'),
  entry('Carpet Installation',       'Flooring',  'sqft',      3.25,  0.80,  null,  'Includes pad, excludes carpet cost'),
  entry('Floor Removal',             'Flooring',  'sqft',      1.50,  0.40,  null,  'Any type, includes haul away'),
  entry('Subfloor Repair',           'Flooring',  'sqft',      6.00,  2.00,  null,  'Cut, replace, and secure'),

  // ── Carpentry ─────────────────────────────────────────────────────────────
  entry('Crown Molding Installation','Carpentry', 'linear_ft', 6.50,  2.00,  null,  'Install and caulk, no paint'),
  entry('Cabinet Installation',      'Carpentry', 'each',      120,   35,    null,  'Per cabinet box, pre-made'),
  entry('Wood Rot Repair',           'Carpentry', 'each',      275,   90,    null,  'Per section, includes material'),

  // ── Bathroom Remodeling ───────────────────────────────────────────────────
  entry('Shower Tile Installation',  'Bathroom Remodeling','sqft',  12.00, 4.00, null, 'Wall tile, includes backer'),
  entry('Vanity Installation',       'Bathroom Remodeling','each',  350,   100,  null, 'Labor only, excludes vanity'),
  entry('Toilet Installation',       'Bathroom Remodeling','each',  225,   50,   null, 'Labor only, excludes toilet'),
  entry('Bathroom Caulking',         'Bathroom Remodeling','project',185,  40,   null, 'Tub, shower, and fixtures'),

  // ── Kitchen Remodeling ────────────────────────────────────────────────────
  entry('Backsplash Tile Installation','Kitchen Remodeling','sqft', 14.00, 4.50, null,'Standard ceramic, includes grout'),
  entry('Faucet Installation',       'Kitchen Remodeling','each',   175,   35,   null, 'Labor only, excludes faucet'),
  entry('Sink Installation',         'Kitchen Remodeling','each',   225,   50,   null, 'Labor only, excludes sink'),

  // ── Tile ──────────────────────────────────────────────────────────────────
  entry('Tile Installation (Floor)', 'Tile',      'sqft',      8.50,  2.80,  null,  'Ceramic/porcelain floor tile'),
  entry('Tile Installation (Wall)',   'Tile',      'sqft',      11.00, 3.50,  null,  'Wall tile, includes waterproofing'),
  entry('Tile Removal',              'Tile',      'sqft',      2.50,  0.60,  null,  'Includes haul away'),
  entry('Grout Repair / Regrouting', 'Tile',      'sqft',      4.00,  0.90,  null,  'Remove and replace grout'),

  // ── Demolition ────────────────────────────────────────────────────────────
  entry('Debris Hauling',            'Demolition','project',   350,   80,    null,  'Full load, single trip'),
  entry('Wall Removal',              'Demolition','each',      450,   120,   null,  'Non-load-bearing, includes patch'),

  // ── Doors & Windows ───────────────────────────────────────────────────────
  entry('Interior Door Installation','Doors & Windows','door', 275,   70,    null,  'Pre-hung door, labor only'),
  entry('Exterior Door Installation','Doors & Windows','door', 425,   120,   null,  'Includes weatherstrip'),
  entry('Window Installation',       'Doors & Windows','window',385,  110,   null,  'Labor only, excludes window'),

  // ── Repairs ───────────────────────────────────────────────────────────────
  entry('General Home Repair',       'Repairs',   'hour',      85,    25,    null,  'Standard handyman rate'),
  entry('Door Adjustment / Repair',  'Repairs',   'each',      95,    20,    null,  'Adjust, align, and re-hang'),

  // ── Cleaning & Final Touch ────────────────────────────────────────────────
  entry('Post-Construction Cleaning','Cleaning & Final Touch','sqft', 0.45, 0.10, null,'Full broom + detail clean'),

  // ── Misc ──────────────────────────────────────────────────────────────────
  entry('Project Management',        'Misc',      'hour',      65,    null,  null,  'Admin, scheduling, coordination'),
  entry('Site Visit / Consultation', 'Misc',      'each',      150,   null,  null,  'First visit free over $X'),
  entry('Travel / Mobilization',     'Misc',      'each',      75,    null,  null,  'Per trip, within service area'),
];