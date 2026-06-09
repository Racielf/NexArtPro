/**
 * Oregon Market Reference Data — 2026
 * Source: contractor industry benchmarks for the Portland / Oregon metro area.
 * All prices in USD. Units match the Price Book unit system.
 *
 * Structure:
 *   category_key → service_key → { unit, low, avg, high }
 *
 * These are READ-ONLY reference values. They never modify user prices.
 */

export const MARKET_REFERENCE = {
  // ── Painting ────────────────────────────────────────────────────────────────
  painting: {
    interior_walls:   { unit: 'sqft',      low: 1.50, avg: 2.30, high: 3.20 },
    ceiling:          { unit: 'sqft',      low: 1.80, avg: 2.70, high: 3.80 },
    trim:             { unit: 'linear_ft', low: 1.20, avg: 2.00, high: 3.00 },
    door:             { unit: 'door',      low: 80,   avg: 150,  high: 250  },
    cabinet:          { unit: 'project',   low: 900,  avg: 1800, high: 3500 },
    exterior_siding:  { unit: 'sqft',      low: 1.80, avg: 2.80, high: 4.00 },
    fence:            { unit: 'linear_ft', low: 2.00, avg: 3.50, high: 5.50 },
    deck_stain:       { unit: 'sqft',      low: 1.50, avg: 2.50, high: 3.80 },
    garage_epoxy:     { unit: 'sqft',      low: 3.00, avg: 5.00, high: 8.00 },
    accent_wall:      { unit: 'wall',      low: 200,  avg: 350,  high: 600  },
    primer:           { unit: 'sqft',      low: 0.40, avg: 0.70, high: 1.10 },
    touch_ups:        { unit: 'hour',      low: 45,   avg: 65,   high: 95   },
  },

  // ── Drywall ─────────────────────────────────────────────────────────────────
  drywall: {
    installation:     { unit: 'sqft',      low: 1.50, avg: 2.50, high: 3.80 },
    patch_repair:     { unit: 'each',      low: 75,   avg: 150,  high: 325  },
    tape_texture:     { unit: 'sqft',      low: 1.00, avg: 1.80, high: 2.80 },
    level_5:          { unit: 'sqft',      low: 1.80, avg: 2.80, high: 4.00 },
    water_damage:     { unit: 'sqft',      low: 4.00, avg: 7.00, high: 12.0 },
    popcorn_removal:  { unit: 'sqft',      low: 1.00, avg: 1.75, high: 2.80 },
    ceiling:          { unit: 'sqft',      low: 1.80, avg: 2.80, high: 4.20 },
    corner_bead:      { unit: 'linear_ft', low: 2.00, avg: 3.50, high: 5.50 },
  },

  // ── Flooring ────────────────────────────────────────────────────────────────
  flooring: {
    lvp:              { unit: 'sqft',      low: 3.50, avg: 5.50, high: 8.00 },
    laminate:         { unit: 'sqft',      low: 3.00, avg: 4.80, high: 7.50 },
    hardwood:         { unit: 'sqft',      low: 6.00, avg: 9.00, high: 14.0 },
    tile_floor:       { unit: 'sqft',      low: 5.00, avg: 8.50, high: 13.0 },
    removal:          { unit: 'sqft',      low: 1.00, avg: 1.80, high: 3.00 },
    subfloor_repair:  { unit: 'sqft',      low: 3.00, avg: 5.50, high: 9.00 },
    baseboard:        { unit: 'linear_ft', low: 2.50, avg: 4.00, high: 6.50 },
    carpet:           { unit: 'sqft',      low: 2.50, avg: 4.50, high: 7.00 },
    carpet_removal:   { unit: 'sqft',      low: 0.50, avg: 1.00, high: 1.80 },
    transition_strip: { unit: 'each',      low: 25,   avg: 50,   high: 90   },
  },

  // ── Tile ────────────────────────────────────────────────────────────────────
  tile: {
    floor:            { unit: 'sqft',      low: 5.00, avg: 8.50, high: 13.0 },
    wall:             { unit: 'sqft',      low: 6.00, avg: 10.0, high: 15.0 },
    removal:          { unit: 'sqft',      low: 2.00, avg: 3.50, high: 5.50 },
    grout_repair:     { unit: 'sqft',      low: 2.50, avg: 4.50, high: 7.00 },
    caulking:         { unit: 'linear_ft', low: 1.50, avg: 3.00, high: 5.00 },
    mosaic:           { unit: 'sqft',      low: 8.00, avg: 13.0, high: 20.0 },
    large_format:     { unit: 'sqft',      low: 7.00, avg: 12.0, high: 18.0 },
    natural_stone:    { unit: 'sqft',      low: 10.0, avg: 16.0, high: 25.0 },
  },

  // ── Carpentry ───────────────────────────────────────────────────────────────
  carpentry: {
    shelving:         { unit: 'each',      low: 250,  avg: 450,  high: 800  },
    closet:           { unit: 'project',   low: 800,  avg: 1800, high: 4000 },
    deck:             { unit: 'sqft',      low: 18.0, avg: 28.0, high: 45.0 },
    fence:            { unit: 'linear_ft', low: 25.0, avg: 40.0, high: 65.0 },
    stairs:           { unit: 'project',   low: 1200, avg: 2500, high: 5000 },
    wood_rot:         { unit: 'each',      low: 150,  avg: 350,  high: 800  },
    crown_molding:    { unit: 'linear_ft', low: 4.00, avg: 7.00, high: 12.0 },
    chair_rail:       { unit: 'linear_ft', low: 3.00, avg: 5.50, high: 9.00 },
    cabinet_install:  { unit: 'each',      low: 80,   avg: 150,  high: 280  },
    countertop:       { unit: 'linear_ft', low: 60.0, avg: 100,  high: 180  },
  },

  // ── Bathroom Remodeling ─────────────────────────────────────────────────────
  bathroom: {
    full_remodel:     { unit: 'project',   low: 8000, avg: 14000, high: 28000 },
    shower_tile:      { unit: 'sqft',      low: 7.00, avg: 12.0,  high: 18.0  },
    bathtub:          { unit: 'each',      low: 500,  avg: 900,   high: 2000  },
    vanity:           { unit: 'each',      low: 250,  avg: 500,   high: 1200  },
    toilet:           { unit: 'each',      low: 150,  avg: 280,   high: 500   },
    exhaust_fan:      { unit: 'each',      low: 120,  avg: 220,   high: 400   },
    shower_door:      { unit: 'each',      low: 350,  avg: 700,   high: 1500  },
    caulking:         { unit: 'project',   low: 80,   avg: 160,   high: 300   },
  },

  // ── Kitchen Remodeling ──────────────────────────────────────────────────────
  kitchen: {
    full_remodel:     { unit: 'project',   low: 15000, avg: 30000, high: 65000 },
    cabinet_replace:  { unit: 'project',   low: 5000,  avg: 10000, high: 22000 },
    backsplash:       { unit: 'sqft',      low: 6.00,  avg: 10.0,  high: 16.0  },
    countertop:       { unit: 'linear_ft', low: 60.0,  avg: 110,   high: 200   },
    sink:             { unit: 'each',      low: 150,   avg: 280,   high: 550   },
    faucet:           { unit: 'each',      low: 120,   avg: 220,   high: 450   },
    island:           { unit: 'project',   low: 2500,  avg: 5000,  high: 12000 },
  },

  // ── Doors & Windows ─────────────────────────────────────────────────────────
  doors_windows: {
    interior_door:    { unit: 'door',      low: 180,  avg: 320,  high: 600   },
    exterior_door:    { unit: 'door',      low: 400,  avg: 750,  high: 1800  },
    window:           { unit: 'window',    low: 300,  avg: 600,  high: 1400  },
    window_trim:      { unit: 'window',    low: 80,   avg: 150,  high: 280   },
    hardware:         { unit: 'each',      low: 60,   avg: 120,  high: 250   },
  },

  // ── Framing ─────────────────────────────────────────────────────────────────
  framing: {
    interior_wall:    { unit: 'sqft',      low: 5.00, avg: 9.00, high: 15.0 },
    partition_wall:   { unit: 'sqft',      low: 4.50, avg: 8.00, high: 13.0 },
    ceiling:          { unit: 'sqft',      low: 6.00, avg: 10.0, high: 16.0 },
  },

  // ── Repairs ─────────────────────────────────────────────────────────────────
  repairs: {
    general:          { unit: 'hour',      low: 55,   avg: 85,   high: 130  },
    stucco:           { unit: 'sqft',      low: 6.00, avg: 10.0, high: 16.0 },
    fence_repair:     { unit: 'each',      low: 100,  avg: 200,  high: 400  },
    deck_repair:      { unit: 'sqft',      low: 5.00, avg: 9.00, high: 15.0 },
    door_repair:      { unit: 'each',      low: 80,   avg: 150,  high: 280  },
  },

  // ── Demolition ──────────────────────────────────────────────────────────────
  demolition: {
    interior:         { unit: 'project',   low: 800,  avg: 2000, high: 5000 },
    wall_removal:     { unit: 'each',      low: 500,  avg: 1200, high: 3000 },
    debris_hauling:   { unit: 'project',   low: 300,  avg: 600,  high: 1200 },
  },

  // ── Misc ────────────────────────────────────────────────────────────────────
  misc: {
    project_mgmt:     { unit: 'hour',      low: 65,   avg: 95,   high: 140  },
    site_visit:       { unit: 'each',      low: 80,   avg: 150,  high: 280  },
    travel:           { unit: 'each',      low: 50,   avg: 100,  high: 200  },
  },
};