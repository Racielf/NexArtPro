/**
 * Price Book Seed — Oregon Market Reference (2024-2026)
 *
 * FIELD DEFINITIONS:
 *   type          — 'service' | 'material' | 'labor'
 *   unit_price    — client-facing selling price (drives estimate totals)
 *   unit_cost     — internal cost basis (drives margin calculations)
 *   book_price    — market reference only (never drives totals)
 *   markup        — optional percentage for suggested pricing
 *
 * ESTIMATE INTEGRATION:
 *   When a PB item is inserted into an estimate line:
 *     line.unit_price = pb.unit_price
 *     line.unit_cost  = pb.unit_cost
 *   book_price is NEVER copied to estimates — it is reference only.
 */

let _id = 1;
const id = () => `pb-seed-${_id++}`;

function entry(name, type, category, unit, unit_price, unit_cost = null, book_price = null, markup = null, notes = '') {
  return {
    id: id(),
    service_id: null,
    _service_name_ref: name,
    display_name: name,
    type,
    category,
    unit,
    unit_price,
    unit_cost,
    book_price,
    markup,
    notes,
    is_active: true,
    needs_review: false,
    source: 'seed',
    _original_display_name: name,
    _original_unit_price: unit_price,
    _original_unit_cost: unit_cost,
    _original_book_price: book_price,
    _original_notes: notes,
    _original_unit: unit,
  };
}

// Shorthand: service entry (most common)
const svc = (name, cat, unit, price, cost, book = null, mk = null, notes = '') =>
  entry(name, 'service', cat, unit, price, cost, book, mk, notes);

// Shorthand: material entry
const mat = (name, cat, unit, price, cost, book = null, mk = null, notes = '') =>
  entry(name, 'material', cat, unit, price, cost, book, mk, notes);

// Shorthand: labor entry
const lbr = (name, cat, unit, price, cost, book = null, mk = null, notes = '') =>
  entry(name, 'labor', cat, unit, price, cost, book, mk, notes);

export const PRICE_BOOK_SEED = [
  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Drywall
  // ══════════════════════════════════════════════════════════════════
  svc('Drywall Install per sqft',                'Drywall', 'sqft',      3.00,  0.95,  2.50,  null, 'Hang, tape, first coat · OR avg $1.50–$3.00/sqft'),
  svc('Drywall Finish + Paint per sqft',         'Drywall', 'sqft',      5.25,  1.60,  4.25,  null, 'Hang, tape, texture, 2 coats paint · full service'),
  svc('Drywall Level 5 Finish per sqft',         'Drywall', 'sqft',      4.00,  1.25,  3.60,  null, 'Premium skim coat, paint-ready · OR avg'),
  svc('Tape and Texture per sqft',               'Drywall', 'sqft',      1.75,  0.50,  1.45,  null, 'Tape, mud, texture match'),
  svc('Drywall Patch Repair',                    'Drywall', 'each',      225,   65,    200,   null, 'Small-medium holes · textured match · OR avg $185–$265'),
  svc('Drywall Patch - Medium (up to 4x4)',      'Drywall', 'each',      275,   75,    250,   null, 'California patch, texture blend'),
  svc('Popcorn Ceiling Removal per sqft',        'Drywall', 'sqft',      2.00,  0.45,  1.80,  null, 'Scrape, sand, patch · OR avg'),
  svc('Water Damage Drywall Repair per sqft',    'Drywall', 'sqft',      5.00,  1.75,  4.55,  null, 'Remove, replace, re-texture · OR avg'),
  svc('Hanging Drywall 1/2" (Standard)',         'Drywall', 'sqft',      1.85,  0.50,  1.70,  null, 'Standard interior walls'),
  svc('Hanging Drywall 5/8" (Fire-rated)',       'Drywall', 'sqft',      2.25,  0.65,  2.10,  null, 'Fire-rated, ceilings, garage'),
  svc('Moisture Resistant Drywall (Green Board)','Drywall', 'sqft',      2.50,  0.75,  2.30,  null, 'Bathrooms, laundry, high humidity'),
  svc('Ceiling Texture - Orange Peel (Spray)',   'Drywall', 'sqft',      0.95,  0.25,  0.85,  null, 'Spray texture, match existing'),
  svc('Ceiling Texture - Knockdown',             'Drywall', 'sqft',      1.35,  0.35,  1.20,  null, 'Hand or spray knockdown'),
  svc('Corner Bead Installation',                'Drywall', 'linear_ft', 3.75,  1.00,  3.50,  null, 'Metal/vinyl 90° corner bead'),
  svc('Bullnose Corner Installation',            'Drywall', 'linear_ft', 4.50,  1.25,  4.00,  null, 'Rounded/bullnose corner profile'),
  svc('Sound Dampening Drywall (QuietRock)',     'Drywall', 'sqft',      6.50,  2.80,  6.00,  null, 'Specialty acoustic drywall'),
  svc('Mold/Water Damage Cut-out & Replace',     'Drywall', 'sqft',      8.50,  3.20,  7.50,  null, 'Remediation, includes disposal'),
  svc('Sanding & Priming (Ready for Paint)',     'Drywall', 'sqft',      0.65,  0.18,  0.55,  null, 'Final sand + prime coat'),
  svc('High Ceiling Surcharge (Over 10ft)',      'Drywall', 'each',      185,   null,  170,   15,   'Per job surcharge, tall walls'),
  svc('Drywall Daily Minimum / Service Call',    'Drywall', 'each',      185,   null,  170,   null, 'Minimum job charge, Portland area'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Paint
  // ══════════════════════════════════════════════════════════════════
  svc('Paint Interior per sqft',                 'Paint', 'sqft',      2.25,  0.65,  2.05,  null, '2-coat finish · OR avg $1.50–$3.50/sqft'),
  svc('Paint Ceiling per sqft',                  'Paint', 'sqft',      2.50,  0.70,  2.25,  null, 'Includes prep and 2 coats'),
  svc('Paint Trim per linear foot',              'Paint', 'linear_ft', 3.00,  0.90,  2.72,  null, 'Caulk and touch-up included'),
  svc('Paint Door (both sides)',                 'Paint', 'door',      110,   32,    100,   null, 'Both sides, all edges · OR avg'),
  svc('Paint Cabinets (full kitchen)',           'Paint', 'project',   2200,  650,   2000,  null, 'Sand, prime, paint kitchen set'),
  svc('Paint Exterior Siding per sqft',          'Paint', 'sqft',      2.75,  0.80,  2.50,  null, 'Power wash + prime included'),
  svc('Deck Staining per sqft',                  'Paint', 'sqft',      2.25,  0.55,  2.05,  null, 'Clean and seal included'),
  svc('Primer Application per sqft',             'Paint', 'sqft',      0.75,  0.22,  0.65,  null, 'One coat primer only'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Tile
  // ══════════════════════════════════════════════════════════════════
  svc('Tile Install Floor per sqft',             'Tile', 'sqft',      10.00, 3.20,  9.09,  null, 'Ceramic/porcelain standard floor · OR avg'),
  svc('Tile Install Wall per sqft',              'Tile', 'sqft',      13.00, 4.00,  11.82, null, 'Includes waterproofing · OR avg'),
  svc('Shower Tile Installation per sqft',       'Tile', 'sqft',      14.00, 4.50,  12.73, null, 'Wall tile, includes backer'),
  svc('Backsplash Tile per sqft',                'Tile', 'sqft',      16.00, 5.00,  14.55, null, 'Kitchen backsplash, includes grout'),
  svc('Tile Removal per sqft',                   'Tile', 'sqft',      2.75,  0.65,  2.50,  null, 'Includes haul away'),
  svc('Grout Repair / Regrouting per sqft',      'Tile', 'sqft',      4.50,  1.00,  4.09,  null, 'Remove and replace grout'),
  svc('Mosaic Tile Install per sqft',            'Tile', 'sqft',      18.00, 6.00,  null,  null, 'Decorative mosaic sheets'),
  svc('Large Format Tile Install per sqft',      'Tile', 'sqft',      15.00, 5.00,  null,  null, 'Large format 24x24+'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Flooring
  // ══════════════════════════════════════════════════════════════════
  svc('LVP Install per sqft',                    'Flooring', 'sqft',      5.50,  1.50,  5.00,  null, 'Luxury vinyl plank, underlayment included'),
  svc('Laminate Install per sqft',               'Flooring', 'sqft',      4.50,  1.20,  4.09,  null, 'Includes underlayment + transitions'),
  svc('Carpet Install per sqft',                 'Flooring', 'sqft',      3.75,  0.90,  3.41,  null, 'Includes pad, excludes carpet cost'),
  svc('Baseboard Install per linear foot',       'Flooring', 'linear_ft', 4.50,  1.30,  4.09,  null, 'Install and paint included'),
  svc('Floor Removal per sqft',                  'Flooring', 'sqft',      1.75,  0.45,  1.59,  null, 'Any type, includes haul away'),
  svc('Subfloor Repair per sqft',                'Flooring', 'sqft',      7.00,  2.25,  6.36,  null, 'Cut, replace, and secure'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Carpentry / Finish Carpentry
  // ══════════════════════════════════════════════════════════════════
  svc('Crown Molding Install per linear foot',   'Finish Carpentry', 'linear_ft', 7.50,  2.20, 6.82, null, 'Install and caulk, no paint'),
  svc('Cabinet Install (pre-made) per box',      'Finish Carpentry', 'each',      140,   40,   127,  null, 'Per cabinet box'),
  svc('Wood Rot Repair per section',             'Finish Carpentry', 'each',      325,   105,  295,  null, 'Includes material'),
  svc('Custom Shelving',                         'Finish Carpentry', 'each',      450,   180,  null, null, 'Build and install custom shelving'),
  svc('Closet Build-Out',                        'Finish Carpentry', 'project',   1800,  700,  null, null, 'Custom closet system'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Framing
  // ══════════════════════════════════════════════════════════════════
  svc('Framing - Wood Structure per sqft',       'Framing', 'sqft',      6.00,  2.00,  5.50,  null, 'BOLI Carpenter $52/hr · OR avg ~$5.50–6.50/sqft'),
  svc('Interior Wall Framing per sqft',          'Framing', 'sqft',      9.00,  3.00,  8.00,  null, 'New interior stud walls'),
  svc('Partition Wall Framing per sqft',         'Framing', 'sqft',      8.00,  2.80,  7.50,  null, 'Room division walls'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Doors & Windows
  // ══════════════════════════════════════════════════════════════════
  svc('Interior Door Install (pre-hung)',        'Doors & Windows', 'door',   325,  80,  295,  null, 'Labor only · OR avg'),
  svc('Exterior Door Install',                   'Doors & Windows', 'door',   495,  140, 450,  null, 'Includes weatherstrip · OR avg'),
  svc('Window Install (labor only)',             'Doors & Windows', 'window', 450,  125, 409,  null, 'Labor only, excludes window'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Bathroom
  // ══════════════════════════════════════════════════════════════════
  svc('Vanity Install (labor only)',             'Bathroom', 'each',    400,  110, 364,  null, 'Labor only, excludes vanity'),
  svc('Toilet Install (labor only)',             'Bathroom', 'each',    265,  55,  241,  null, 'Labor only, excludes toilet'),
  svc('Bathroom Caulking (full)',                'Bathroom', 'project', 200,  45,  182,  null, 'Tub, shower, fixtures'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Kitchen
  // ══════════════════════════════════════════════════════════════════
  svc('Faucet Install (labor only)',             'Kitchen', 'each',    200,  40,  182,  null, 'Labor only'),
  svc('Sink Install (labor only)',               'Kitchen', 'each',    260,  55,  236,  null, 'Labor only'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Demolition
  // ══════════════════════════════════════════════════════════════════
  svc('Wall Removal (non-load-bearing)',         'Demolition', 'each',    525,  140, 477,  null, 'Includes patch · OR avg'),
  svc('Debris Hauling (full load)',              'Demolition', 'project', 400,  90,  364,  null, 'Single trip · Portland avg'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Cleaning
  // ══════════════════════════════════════════════════════════════════
  svc('Post-Construction Cleaning per sqft',     'Cleaning', 'sqft',    0.50, 0.12, 0.45, null, 'Full broom + detail clean'),
  svc('Final Cleaning (project)',                'Cleaning', 'project', 545,  180,  500,  null, 'Full residential clean'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Repairs
  // ══════════════════════════════════════════════════════════════════
  svc('General Home Repair',                     'Repairs', 'hour',    95,   28,   85,   null, 'Handyman rate · OR avg $85–$110/hr'),
  svc('Door Adjustment / Repair',                'Repairs', 'each',    110,  22,   100,  null, 'Adjust, align, re-hang'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Admin / Project Mgmt
  // ══════════════════════════════════════════════════════════════════
  svc('Project Management',                      'Admin', 'hour',     75,   null, 68,   null, 'GC PM rate · Portland 2025'),
  svc('Site Visit / Consultation',               'Admin', 'each',     175,  null, 159,  null, 'First visit · Portland avg'),
  svc('Travel / Mobilization',                   'Admin', 'each',     85,   null, 77,   null, 'Per trip, within service area'),

  // ══════════════════════════════════════════════════════════════════
  // LABOR — Only where standalone labor rate is needed
  // ══════════════════════════════════════════════════════════════════
  lbr('General Labor (GC rate)',                 'Labor', 'hour',     48,   null, 48,   null, 'BOLI 2025 Portland Metro $38–58/hr avg'),
  lbr('Skilled Trade Labor',                     'Labor', 'hour',     55,   null, 55,   null, 'Carpenter / finish trade · $45–55/hr'),
  lbr('Electrician (licensed)',                  'Labor', 'hour',     95,   null, 90,   null, 'BOLI Electrician · $86.50/hr base'),
  lbr('Plumber (licensed)',                      'Labor', 'hour',     95,   null, 88,   null, 'BOLI Plumber · ~$84/hr base Portland'),
  lbr('Carpentry Labor (general)',               'Labor', 'hour',     52,   null, 52,   null, 'BOLI Carpenter Area 1 $52.34/hr base'),

  // ══════════════════════════════════════════════════════════════════
  // MATERIALS — For when material-only line items are needed
  // ══════════════════════════════════════════════════════════════════
  mat('Drywall Sheet 4x8 1/2"',                 'Drywall', 'each',    14,   10,   12,   null, 'Standard 1/2" sheet'),
  mat('Drywall Sheet 4x8 5/8"',                 'Drywall', 'each',    18,   13,   16,   null, 'Fire-rated 5/8" sheet'),
  mat('Joint Compound (5 gal)',                  'Drywall', 'each',    22,   15,   19,   null, 'All-purpose mud'),
  mat('Paint - Interior Gallon (premium)',       'Paint',   'gallon',  55,   35,   48,   null, 'Premium interior latex'),
  mat('Paint - Exterior Gallon (premium)',       'Paint',   'gallon',  65,   42,   58,   null, 'Premium exterior latex'),
  mat('Primer Gallon',                           'Paint',   'gallon',  28,   18,   24,   null, 'Multi-surface primer'),
  mat('LVP Flooring per sqft (material)',        'Flooring','sqft',    3.50, 2.20, 3.00, null, 'Mid-grade luxury vinyl plank'),
  mat('Ceramic Tile per sqft (material)',        'Tile',    'sqft',    4.00, 2.50, 3.50, null, 'Standard ceramic/porcelain'),

  // ══════════════════════════════════════════════════════════════════
  // SERVICES — Concrete
  // ══════════════════════════════════════════════════════════════════
  svc('Concrete Slab Installation (4" Standard)', 'Concrete', 'sqft',      10.50, 6.00,  9.50,  null, 'Basic residential slab'),
  svc('Concrete Patio Installation',              'Concrete', 'sqft',      11.50, 6.50,  10.50, null, 'Standard patio pour'),
  svc('Concrete Walkway Installation',            'Concrete', 'sqft',      12.00, 7.00,  11.00, null, 'Sidewalk / walkway'),
  svc('Concrete Driveway Installation',           'Concrete', 'sqft',      13.50, 8.00,  12.50, null, 'Residential driveway'),
  svc('Concrete Driveway Extension',              'Concrete', 'sqft',      12.50, 7.25,  11.50, null, 'Extend existing driveway'),
  svc('Concrete Steps Installation',              'Concrete', 'each',      450,   250,   400,   null, 'Standard 3-5 step set'),
  svc('Concrete Crack Repair',                    'Concrete', 'linear_ft', 12,    4.00,  10.00, null, 'Seal cracks'),
  svc('Concrete Surface Resurfacing',             'Concrete', 'sqft',      6.50,  3.00,  5.75,  null, 'Overlay resurfacing'),
  svc('Concrete Removal / Demolition',            'Concrete', 'sqft',      4.00,  1.75,  3.50,  null, 'Break and haul'),
  svc('Broom Finish Concrete',                    'Concrete', 'sqft',      1.25,  0.40,  1.00,  null, 'Finish add-on'),
  svc('Stamped Concrete Finish (Basic)',           'Concrete', 'sqft',      5.50,  2.25,  4.75,  null, 'Decorative finish add-on'),
];