-- ═══════════════════════════════════════════════════════════════
-- NexArtPro — Price Book seed: 38 Oregon construction services
-- Source: NexArtProV3 priceBook.jsx + Oregon market rates 2025-26
-- IDEMPOTENT: deletes source='system' entries before reinserting
-- Apply AFTER 20260628_price_book_columns.sql
-- ═══════════════════════════════════════════════════════════════

-- Remove existing system seed to make this idempotent
DELETE FROM price_book_entries WHERE source = 'system';

-- ─────────────────────────────────────────────────────────────────
-- unit codes used by fmtUnit():
--   sqft · lf · ea · hr · day · lot · fix · gal · ckt · load
--
-- negotiable:  'yes' = negotiable service
--              'no'  = fixed price (materials + permits)
--              'ask' = quote on request
--
-- book_price:  > 0 for fixed-price items  → shown as "Fixed"
-- unit_price:  > 0 for negotiable items  → shown as "Negotiable"
-- ─────────────────────────────────────────────────────────────────

INSERT INTO price_book_entries
  (display_name, name, type, category, sub_category,
   unit, unit_price, unit_cost, book_price, markup,
   notes, is_active, source, negotiable, labor_hrs)
VALUES

-- ══ LABOR ══════════════════════════════════════════════════════
('Crew labor — 2 person',
 'Crew labor — 2 person', 'service', 'Labor', 'Field Crew',
 'day', 625, 480, 0, 30,
 '2-person finish crew, 8-hour day, fully insured',
 true, 'system', 'yes', 8),

('Lead carpenter',
 'Lead carpenter', 'service', 'Labor', 'Supervisory',
 'hr', 90, 65, 0, 38,
 'OR licensed lead carpenter, supervisory rate',
 true, 'system', 'yes', 1),

('Painter',
 'Painter', 'service', 'Labor', 'Specialty',
 'hr', 55, 42, 0, 31,
 'Journeyman painter',
 true, 'system', 'yes', 1),

('Project supervision',
 'Project supervision', 'service', 'Labor', 'Supervisory',
 'day', 350, 280, 0, 25,
 'Daily site supervision + sub coordination',
 true, 'system', 'yes', 8),

-- ══ DEMOLITION ══════════════════════════════════════════════════
('Demo — kitchen package',
 'Demo — kitchen package', 'service', 'Demolition', 'Interior',
 'lot', 1550, 1100, 0, 41,
 'Cabinets, counters, flooring removal',
 true, 'system', 'yes', 8),

('Demo — bathroom package',
 'Demo — bathroom package', 'service', 'Demolition', 'Interior',
 'lot', 1000, 720, 0, 39,
 'Tile, vanity, fixtures removal',
 true, 'system', 'yes', 6),

('Disposal fee + haul',
 'Disposal fee + haul', 'service', 'Demolition', 'Waste Removal',
 'load', 350, 280, 0, 25,
 '20yd dumpster + haul-away',
 true, 'system', 'yes', 2),

-- ══ FRAMING ══════════════════════════════════════════════════════
('Wall framing',
 'Wall framing', 'service', 'Framing', 'Rough Carpentry',
 'lf', 50, 38, 0, 32,
 '2×4 stud wall, plates, blocking',
 true, 'system', 'yes', 0.5),

('Doug fir 2×4 × 8''',
 'Doug fir 2×4 × 8''', 'material', 'Framing', 'Lumber',
 'ea', 8.40, 6.20, 8.40, 35,
 'Kiln-dried Douglas fir stud',
 true, 'system', 'no', null),

-- ══ CABINETRY ════════════════════════════════════════════════════
('Custom base cabinet — shaker',
 'Custom base cabinet — shaker', 'material', 'Cabinetry', 'Millwork',
 'lf', 700, 520, 700, 35,
 'White oak shaker, soft-close, finished interior',
 true, 'system', 'no', null),

('Custom wall cabinet — shaker',
 'Custom wall cabinet — shaker', 'material', 'Cabinetry', 'Millwork',
 'lf', 560, 420, 560, 33,
 'White oak shaker uppers',
 true, 'system', 'no', null),

('Custom island base',
 'Custom island base', 'material', 'Cabinetry', 'Millwork',
 'lot', 3300, 2400, 3300, 38,
 '7'' island, 4-drawer + trash pullout',
 true, 'system', 'no', null),

('Cabinet installation labor',
 'Cabinet installation labor', 'service', 'Cabinetry', 'Installation',
 'day', 750, 540, 0, 39,
 '2-person crew',
 true, 'system', 'yes', 8),

-- ══ COUNTERTOP ═══════════════════════════════════════════════════
('Quartz countertop',
 'Quartz countertop', 'material', 'Countertop', 'Engineered Stone',
 'sqft', 142, 105, 142, 35,
 'Caesarstone 5151 Empira White',
 true, 'system', 'no', null),

('Stone slab — granite premium',
 'Stone slab — granite premium', 'material', 'Countertop', 'Natural Stone',
 'sqft', 120, 88, 120, 36,
 'Premium granite, exotic',
 true, 'system', 'no', null),

('Countertop fab + install',
 'Countertop fab + install', 'service', 'Countertop', 'Installation',
 'sqft', 28, 22, 0, 27,
 'Template, fabricate, install, seam',
 true, 'system', 'yes', 0.2),

-- ══ TILE ═════════════════════════════════════════════════════════
('Ceramic subway tile',
 'Ceramic subway tile', 'material', 'Tile', 'Ceramic',
 'sqft', 8.80, 6.50, 8.80, 35,
 '3×6 ceramic, white gloss',
 true, 'system', 'no', null),

('Carrara marble tile',
 'Carrara marble tile', 'material', 'Tile', 'Natural Stone',
 'sqft', 24, 18, 24, 33,
 'Honed Carrara, 4×8',
 true, 'system', 'no', null),

('Tile install + grout',
 'Tile install + grout', 'service', 'Tile', 'Installation',
 'sqft', 15.50, 12, 0, 29,
 'Setting, grout, sealer',
 true, 'system', 'yes', 0.12),

-- ══ PLUMBING ═════════════════════════════════════════════════════
('Plumbing rough-in',
 'Plumbing rough-in', 'service', 'Plumbing', 'Rough-In',
 'fix', 500, 380, 0, 31,
 'Per fixture, copper or PEX',
 true, 'system', 'yes', 4),

('Plumbing trim + finish',
 'Plumbing trim + finish', 'service', 'Plumbing', 'Finish',
 'fix', 300, 220, 0, 36,
 'Install fixtures + test',
 true, 'system', 'yes', 2.5),

('Plumbing permit + inspection',
 'Plumbing permit + inspection', 'service', 'Plumbing', 'Permits',
 'lot', 0, 410, 495, 21,
 'City permit + 2 inspections (city-set fee)',
 true, 'system', 'no', 0),

-- ══ ELECTRICAL ═══════════════════════════════════════════════════
('Electrical circuit (new)',
 'Electrical circuit (new)', 'service', 'Electrical', 'Rough-In',
 'ckt', 380, 280, 0, 35,
 'New 20A circuit, romex, breaker',
 true, 'system', 'yes', 3),

('Outlet / switch install',
 'Outlet / switch install', 'service', 'Electrical', 'Finish',
 'ea', 65, 48, 0, 35,
 'Receptacle or switch, R&I',
 true, 'system', 'yes', 0.75),

('Electrical permit',
 'Electrical permit', 'service', 'Electrical', 'Permits',
 'lot', 0, 295, 365, 24,
 'City permit + inspection (city-set fee)',
 true, 'system', 'no', 0),

-- ══ PAINT ════════════════════════════════════════════════════════
('Interior paint — premium',
 'Interior paint — premium', 'material', 'Paint', 'Interior',
 'gal', 80, 58, 80, 38,
 'Sherwin-Williams Emerald, eggshell',
 true, 'system', 'no', null),

('Exterior paint — Duration',
 'Exterior paint — Duration', 'material', 'Paint', 'Exterior',
 'gal', 98, 72, 98, 36,
 'SW Duration, satin',
 true, 'system', 'no', null),

('Paint application',
 'Paint application', 'service', 'Paint', 'Application',
 'sqft', 1.60, 1.20, 0, 33,
 '2 coats incl. prep',
 true, 'system', 'yes', 0.005),

-- ══ ROOFING ══════════════════════════════════════════════════════
('Asphalt shingle roofing',
 'Asphalt shingle roofing', 'material', 'Roofing', 'Shingles',
 'sqft', 5.60, 4.20, 5.60, 33,
 'GAF Timberline HDZ 30yr',
 true, 'system', 'no', null),

('Roof tear-off + install',
 'Roof tear-off + install', 'service', 'Roofing', 'Installation',
 'sqft', 4.60, 3.40, 0, 35,
 'Strip, underlayment, install',
 true, 'system', 'yes', 0.008),

('Synthetic underlayment',
 'Synthetic underlayment', 'material', 'Roofing', 'Underlayment',
 'sqft', 0.47, 0.34, 0.47, 38,
 'GAF FeltBuster HT',
 true, 'system', 'no', null),

-- ══ FLOORING ═════════════════════════════════════════════════════
('White oak hardwood',
 'White oak hardwood', 'material', 'Flooring', 'Hardwood',
 'sqft', 10.50, 7.80, 10.50, 35,
 '3/4 × 5" rift + quartered',
 true, 'system', 'no', null),

('Hardwood install + finish',
 'Hardwood install + finish', 'service', 'Flooring', 'Installation',
 'sqft', 6.30, 4.80, 0, 32,
 'Install, sand, 3-coat finish',
 true, 'system', 'yes', 0.06),

-- ══ CONCRETE ═════════════════════════════════════════════════════
('Concrete flatwork',
 'Concrete flatwork', 'service', 'Concrete', 'Flatwork',
 'sqft', 10.90, 8.20, 0, 33,
 '4" with rebar, broom finish',
 true, 'system', 'yes', 0.05),

('Concrete pump truck',
 'Concrete pump truck', 'service', 'Concrete', 'Equipment',
 'day', 1200, 950, 0, 26,
 'Day rate w/ operator',
 true, 'system', 'yes', 0),

-- ══ GENERAL / SITE ═══════════════════════════════════════════════
('Project contingency (8%)',
 'Project contingency (8%)', 'service', 'General Repairs', 'Contingency',
 'lot', 0, 0, 0, 0,
 'Applied to subtotal · adjustable percentage',
 true, 'system', 'ask', null),

('Site protection',
 'Site protection', 'service', 'General Repairs', 'Site Prep',
 'lot', 500, 380, 0, 32,
 'Floor protection, dust barriers',
 true, 'system', 'yes', 2),

('Final clean',
 'Final clean', 'service', 'Cleaning', 'Cleanup',
 'lot', 300, 240, 0, 25,
 'Detail clean + window track',
 true, 'system', 'yes', 4);

-- ─────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────
-- SELECT count(*) FROM price_book_entries WHERE source = 'system';
-- Expected: 38
