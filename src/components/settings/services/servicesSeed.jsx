// Simple ID generator
let _id = 1;
const id = () => `seed-${_id++}`;

export const UNITS = [
  { value: 'each',       label: 'Each' },
  { value: 'sqft',       label: 'Sq Ft' },
  { value: 'linear_ft',  label: 'Linear Ft' },
  { value: 'room',       label: 'Room' },
  { value: 'wall',       label: 'Wall' },
  { value: 'door',       label: 'Door' },
  { value: 'window',     label: 'Window' },
  { value: 'box',        label: 'Box' },
  { value: 'gallon',     label: 'Gallon' },
  { value: 'bag',        label: 'Bag' },
  { value: 'hour',       label: 'Hour' },
  { value: 'day',        label: 'Day' },
  { value: 'project',    label: 'Project' },
  { value: 'custom',     label: 'Custom' },
];

export const CATEGORIES = [
  'Painting',
  'Drywall',
  'Flooring',
  'Carpentry',
  'Bathroom Remodeling',
  'Kitchen Remodeling',
  'Demolition',
  'Doors & Windows',
  'Siding & Exterior',
  'Framing',
  'Trim & Finish',
  'Tile',
  'Repairs',
  'Cleaning & Final Touch',
  'Misc',
];

function svc(name, category, unit, description = '', aliases = []) {
  return {
    id: id(),
    name,
    category,
    description,
    default_unit: unit,
    aliases,
    is_active: true,
    needs_review: false,
    created_from: 'seed',
  };
}

export const SERVICES_SEED = [
  // ── Painting ──────────────────────────────────────────────────
  svc('Interior Wall Painting',      'Painting', 'sqft',    'Paint interior walls, one or two coats',       ['wall paint', 'interior paint']),
  svc('Ceiling Painting',            'Painting', 'sqft',    'Paint ceilings, includes prep and roller',     ['ceiling paint']),
  svc('Trim Painting',               'Painting', 'linear_ft','Paint baseboards, door frames, window casing',['trim', 'baseboard paint']),
  svc('Door Painting',               'Painting', 'door',    'Paint interior or exterior doors, both sides', ['door paint']),
  svc('Cabinet Painting',            'Painting', 'project', 'Sand, prime, and paint kitchen/bath cabinets', ['cabinet refinish']),
  svc('Exterior Siding Painting',    'Painting', 'sqft',    'Paint exterior wood or fiber cement siding',   ['exterior paint']),
  svc('Fence Painting / Staining',   'Painting', 'linear_ft','Paint or stain wood fence panels',            ['fence stain']),
  svc('Deck Staining',               'Painting', 'sqft',    'Clean and stain deck boards',                  ['deck paint', 'deck seal']),
  svc('Garage Floor Epoxy',          'Painting', 'sqft',    'Apply epoxy coating to garage floor',          ['epoxy floor']),
  svc('Accent Wall Painting',        'Painting', 'wall',    'Single accent wall, premium finish',           ['feature wall']),
  svc('Primer Application',          'Painting', 'sqft',    'Apply primer coat before painting',            ['prime', 'primer']),
  svc('Paint Touch-Ups',             'Painting', 'hour',    'Touch up existing paint, small areas',         ['paint touch up']),

  // ── Drywall ───────────────────────────────────────────────────
  svc('Drywall Installation',        'Drywall',  'sqft',    'Hang new drywall sheets',                      ['sheetrock install']),
  svc('Drywall Patch Repair',        'Drywall',  'each',    'Patch small to medium holes',                  ['drywall hole repair', 'patch']),
  svc('Tape and Texture',            'Drywall',  'sqft',    'Tape, mud, and texture drywall',               ['tape mud', 'texture']),
  svc('Level 5 Finish',              'Drywall',  'sqft',    'Premium smooth finish for paint-ready walls',  ['skim coat', 'smooth finish']),
  svc('Water Damage Drywall Repair', 'Drywall',  'sqft',    'Remove and replace water-damaged drywall',     ['water damage repair']),
  svc('Popcorn Ceiling Removal',     'Drywall',  'sqft',    'Scrape and remove popcorn ceiling texture',    ['popcorn removal']),
  svc('Drywall Ceiling Installation','Drywall',  'sqft',    'Hang drywall on ceilings',                     ['ceiling drywall']),
  svc('Corner Bead Installation',    'Drywall',  'linear_ft','Install metal or vinyl corner beads',         ['corner bead']),
  svc('Soundproofing Drywall',       'Drywall',  'sqft',    'Install soundproofing drywall layers',         ['sound drywall']),

  // ── Flooring ──────────────────────────────────────────────────
  svc('LVP Installation',            'Flooring', 'sqft',    'Install luxury vinyl plank flooring',          ['vinyl plank', 'lvp', 'vinyl floor']),
  svc('Laminate Flooring Installation','Flooring','sqft',   'Install laminate flooring with underlayment',  ['laminate floor']),
  svc('Hardwood Flooring Installation','Flooring','sqft',   'Install solid or engineered hardwood',         ['hardwood floor']),
  svc('Tile Floor Installation',     'Flooring', 'sqft',    'Install ceramic or porcelain floor tile',      ['floor tile']),
  svc('Floor Removal',               'Flooring', 'sqft',    'Remove existing flooring (any type)',          ['flooring demo', 'remove floor']),
  svc('Subfloor Repair',             'Flooring', 'sqft',    'Repair damaged or squeaky subfloor sections',  ['subfloor']),
  svc('Baseboard Installation',      'Flooring', 'linear_ft','Install new baseboards after flooring',       ['baseboard', 'base molding']),
  svc('Carpet Installation',         'Flooring', 'sqft',    'Install carpet with padding',                  ['carpet']),
  svc('Carpet Removal',              'Flooring', 'sqft',    'Remove existing carpet and padding',           ['carpet demo']),
  svc('Floor Leveling / Self-Level', 'Flooring', 'sqft',    'Apply self-leveling compound to prep floor',   ['floor leveling']),
  svc('Transition Strip Installation','Flooring','each',    'Install transition strips between floor types', ['transition strip']),

  // ── Carpentry ─────────────────────────────────────────────────
  svc('Custom Shelving',             'Carpentry','each',    'Build and install custom shelving units',       ['shelf', 'built-in shelves']),
  svc('Closet Build-Out',            'Carpentry','project', 'Build custom closet system',                   ['closet organizer', 'closet build']),
  svc('Deck Construction',           'Carpentry','sqft',    'Build new wood or composite deck',             ['deck build', 'deck framing']),
  svc('Fence Installation',          'Carpentry','linear_ft','Install wood or vinyl fence',                 ['fence build']),
  svc('Stairs / Staircase Work',     'Carpentry','project', 'Build or repair staircase',                   ['stairs', 'staircase']),
  svc('Wood Rot Repair',             'Carpentry','each',    'Replace rotted wood framing or trim',          ['rot repair', 'wood repair']),
  svc('Crown Molding Installation',  'Carpentry','linear_ft','Install crown molding in rooms',              ['crown molding']),
  svc('Chair Rail Installation',     'Carpentry','linear_ft','Install chair rail molding',                  ['chair rail']),
  svc('Cabinet Installation',        'Carpentry','each',    'Install pre-made or custom cabinets',          ['cabinet install']),
  svc('Countertop Installation',     'Carpentry','linear_ft','Install kitchen or bath countertops',         ['countertop']),

  // ── Bathroom Remodeling ───────────────────────────────────────
  svc('Full Bathroom Remodel',       'Bathroom Remodeling','project','Complete bathroom renovation',        ['bathroom reno', 'bathroom remodel']),
  svc('Shower Tile Installation',    'Bathroom Remodeling','sqft',  'Tile shower walls and floor',         ['shower tile']),
  svc('Bathtub Replacement',         'Bathroom Remodeling','each',  'Remove old tub and install new',      ['tub replacement']),
  svc('Vanity Installation',         'Bathroom Remodeling','each',  'Install bathroom vanity and sink',    ['vanity install']),
  svc('Toilet Installation',         'Bathroom Remodeling','each',  'Remove old toilet and install new',   ['toilet install']),
  svc('Bathroom Exhaust Fan',        'Bathroom Remodeling','each',  'Install or replace exhaust fan',      ['fan install', 'bathroom fan']),
  svc('Shower Door Installation',    'Bathroom Remodeling','each',  'Install glass or framed shower door', ['shower door']),
  svc('Grab Bar Installation',       'Bathroom Remodeling','each',  'Install safety grab bars',            ['grab bars']),
  svc('Bathroom Caulking',           'Bathroom Remodeling','project','Recaulk tub, shower, and fixtures',  ['caulk', 'recaulking']),

  // ── Kitchen Remodeling ────────────────────────────────────────
  svc('Full Kitchen Remodel',        'Kitchen Remodeling','project','Complete kitchen renovation',         ['kitchen reno', 'kitchen remodel']),
  svc('Kitchen Cabinet Replacement', 'Kitchen Remodeling','project','Replace all kitchen cabinets',        ['cabinet replacement']),
  svc('Backsplash Tile Installation','Kitchen Remodeling','sqft',   'Install kitchen backsplash tile',     ['backsplash', 'kitchen tile']),
  svc('Kitchen Countertop Install',  'Kitchen Remodeling','linear_ft','Install kitchen countertop',        ['counter install']),
  svc('Sink Installation',           'Kitchen Remodeling','each',   'Install or replace kitchen sink',     ['sink install']),
  svc('Faucet Installation',         'Kitchen Remodeling','each',   'Install or replace faucet',           ['faucet install']),
  svc('Kitchen Island Build',        'Kitchen Remodeling','project','Build or install kitchen island',     ['island build']),
  svc('Under-Cabinet Lighting',      'Kitchen Remodeling','linear_ft','Install LED under-cabinet lighting',['cabinet lighting']),

  // ── Demolition ────────────────────────────────────────────────
  svc('Interior Demolition',         'Demolition','project','Demo interior walls, flooring, fixtures',     ['demo', 'teardown']),
  svc('Wall Removal',                'Demolition','each',   'Remove non-load-bearing wall',                ['wall demo', 'wall removal']),
  svc('Debris Hauling',              'Demolition','project','Load and haul away construction debris',      ['haul away', 'junk removal', 'debris removal']),
  svc('Dumpster Coordination',       'Demolition','project','Arrange dumpster drop and pickup',            ['dumpster']),
  svc('Fixture Removal',             'Demolition','each',   'Remove old plumbing or electrical fixtures',  ['fixture demo']),

  // ── Doors & Windows ───────────────────────────────────────────
  svc('Interior Door Installation',  'Doors & Windows','door',  'Install interior pre-hung door',         ['door install', 'interior door']),
  svc('Exterior Door Installation',  'Doors & Windows','door',  'Install exterior entry door',            ['entry door', 'exterior door']),
  svc('Window Installation',         'Doors & Windows','window','Install new or replacement window',      ['window install']),
  svc('Window Trim Installation',    'Doors & Windows','window','Install interior window casing',         ['window casing', 'window trim']),
  svc('Door Hardware Installation',  'Doors & Windows','each', 'Install locksets, handles, hinges',       ['door hardware', 'door knob']),
  svc('Sliding Door Installation',   'Doors & Windows','each', 'Install patio or closet sliding door',    ['sliding door']),
  svc('Screen Door Installation',    'Doors & Windows','each', 'Install screen door',                     ['screen door']),
  svc('Window Caulking / Sealing',   'Doors & Windows','each', 'Seal windows for weatherproofing',        ['window seal', 'window caulk']),

  // ── Siding & Exterior ─────────────────────────────────────────
  svc('Siding Installation',         'Siding & Exterior','sqft',    'Install fiber cement or vinyl siding',['siding install']),
  svc('Siding Repair',               'Siding & Exterior','sqft',    'Replace damaged siding sections',    ['siding repair']),
  svc('Soffit & Fascia Install',     'Siding & Exterior','linear_ft','Install soffit and fascia boards',  ['soffit', 'fascia']),
  svc('Gutter Installation',         'Siding & Exterior','linear_ft','Install gutters and downspouts',    ['gutters', 'downspout']),
  svc('Exterior Trim Installation',  'Siding & Exterior','linear_ft','Install exterior trim boards',      ['exterior trim']),
  svc('Pressure Washing',            'Siding & Exterior','sqft',    'Pressure wash exterior surfaces',    ['power wash', 'pressure wash']),
  svc('Weatherproofing / Caulking',  'Siding & Exterior','project', 'Seal and caulk exterior gaps',      ['exterior caulk']),

  // ── Framing ───────────────────────────────────────────────────
  svc('Interior Wall Framing',       'Framing','sqft',    'Frame new interior walls',                     ['wall framing', 'stud wall']),
  svc('Partition Wall Framing',      'Framing','sqft',    'Frame partition walls for room division',       ['partition wall']),
  svc('Ceiling Framing / Soffits',   'Framing','sqft',    'Frame ceiling soffits or dropped ceilings',    ['soffit framing', 'dropped ceiling']),
  svc('Structural Beam Work',        'Framing','each',    'Install structural beams or posts',             ['beam install', 'header']),
  svc('Subfloor Framing',            'Framing','sqft',    'Frame or repair floor joist system',           ['floor framing', 'joist']),
  svc('Garage Conversion Framing',   'Framing','project', 'Frame for garage-to-room conversion',          ['garage conversion']),

  // ── Trim & Finish ─────────────────────────────────────────────
  svc('Interior Trim Package',       'Trim & Finish','project','Install all interior trim in a space',    ['trim package', 'finish work']),
  svc('Door Casing Installation',    'Trim & Finish','door',   'Install door casing on both sides',       ['door casing']),
  svc('Window Sill Installation',    'Trim & Finish','window', 'Install interior window sills',           ['window sill']),
  svc('Wainscoting Installation',    'Trim & Finish','sqft',   'Install wainscoting panels',              ['wainscoting']),
  svc('Board & Batten Installation', 'Trim & Finish','sqft',   'Install board and batten wall feature',   ['board batten']),
  svc('Shiplap Installation',        'Trim & Finish','sqft',   'Install shiplap wall panels',             ['shiplap']),
  svc('Built-In Bookcase',           'Trim & Finish','each',   'Build and install built-in bookcase',     ['bookcase', 'built-in']),

  // ── Tile ──────────────────────────────────────────────────────
  svc('Tile Installation (Floor)',   'Tile','sqft',    'Install ceramic/porcelain floor tile',            ['floor tile install']),
  svc('Tile Installation (Wall)',    'Tile','sqft',    'Install ceramic/porcelain wall tile',             ['wall tile install']),
  svc('Tile Removal',                'Tile','sqft',    'Demo and remove existing tile',                   ['tile demo', 'tile removal']),
  svc('Grout Repair / Regrouting',   'Tile','sqft',    'Remove and replace old grout',                   ['regrout', 'grout repair']),
  svc('Tile Caulking',               'Tile','linear_ft','Caulk tile joints and transitions',             ['tile caulk']),
  svc('Mosaic Tile Installation',    'Tile','sqft',    'Install decorative mosaic tile sheets',           ['mosaic', 'decorative tile']),
  svc('Large Format Tile Install',   'Tile','sqft',    'Install large format tiles (24"x24"+)',           ['large tile']),
  svc('Marble / Natural Stone Tile', 'Tile','sqft',    'Install natural stone or marble tile',            ['stone tile', 'marble tile']),

  // ── Repairs ───────────────────────────────────────────────────
  svc('General Home Repair',         'Repairs','hour',    'General handyman repair work',                 ['handyman', 'home repair']),
  svc('Caulking & Sealant',          'Repairs','project', 'Re-caulk gaps throughout home',               ['caulk']),
  svc('Stucco Patch Repair',         'Repairs','sqft',    'Patch and paint stucco exterior',              ['stucco repair']),
  svc('Fence Repair',                'Repairs','each',    'Repair or replace broken fence sections',      ['fence fix']),
  svc('Deck Repair',                 'Repairs','sqft',    'Replace rotten boards, re-fasten loose boards',['deck fix']),
  svc('Driveway Crack Repair',       'Repairs','each',    'Fill and seal driveway cracks',                ['driveway repair']),
  svc('Window Screen Repair',        'Repairs','each',    'Replace torn or damaged window screens',       ['screen repair']),
  svc('Door Adjustment / Repair',    'Repairs','each',    'Fix sticking, sagging, or misaligned doors',   ['door repair', 'door fix']),
  svc('Weather Stripping',           'Repairs','each',    'Install or replace weather stripping',         ['weatherstrip']),

  // ── Cleaning & Final Touch ────────────────────────────────────
  svc('Post-Construction Cleaning',  'Cleaning & Final Touch','sqft',    'Full construction cleanup',    ['construction clean', 'final clean']),
  svc('Window Cleaning',             'Cleaning & Final Touch','each',    'Clean windows inside and out', ['window clean']),
  svc('Surface Protection & Prep',   'Cleaning & Final Touch','sqft',    'Mask, tape, and cover surfaces before work',['surface prep', 'masking']),
  svc('Trash / Debris Removal',      'Cleaning & Final Touch','project', 'Remove and dispose of trash',  ['trash removal', 'cleanup']),
  svc('Final Walk-Through Punch List','Cleaning & Final Touch','hour',   'Complete punch list items',    ['punch list', 'final walkthrough']),

  // ── Misc ──────────────────────────────────────────────────────
  svc('Project Management',          'Misc','hour',    'Supervision, scheduling, and coordination',       ['PM', 'site management']),
  svc('Permit Coordination',         'Misc','project', 'Pull and manage building permits',               ['permit', 'permits']),
  svc('Site Visit / Consultation',   'Misc','each',    'On-site consultation and assessment',            ['site visit', 'consultation']),
  svc('Material Procurement',        'Misc','project', 'Source and purchase project materials',          ['material sourcing']),
  svc('Travel / Mobilization',       'Misc','each',    'Travel time and job site mobilization fee',      ['travel', 'mobilization']),
  svc('Rush / Priority Service',     'Misc','each',    'Priority scheduling surcharge',                  ['rush', 'priority']),
  svc('Rental Equipment',            'Misc','day',     'Equipment rental (scaffolding, lift, etc.)',     ['equipment rental']),
];