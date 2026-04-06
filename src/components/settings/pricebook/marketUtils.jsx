import { MARKET_REFERENCE } from './marketReferenceData';

/**
 * Category → market data key mapping.
 * Maps Price Book category strings to MARKET_REFERENCE top-level keys.
 */
const CATEGORY_MAP = {
  'Painting':               'painting',
  'Drywall':                'drywall',
  'Flooring':               'flooring',
  'Tile':                   'tile',
  'Carpentry':              'carpentry',
  'Bathroom Remodeling':    'bathroom',
  'Kitchen Remodeling':     'kitchen',
  'Doors & Windows':        'doors_windows',
  'Framing':                'framing',
  'Repairs':                'repairs',
  'Demolition':             'demolition',
  'Misc':                   'misc',
};

/**
 * Keyword → service key mapping within each category.
 * Keywords are lowercased substrings matched against the service display_name.
 */
const KEYWORD_MAPS = {
  painting: [
    { keys: ['interior wall', 'wall paint'],          ref: 'interior_walls' },
    { keys: ['ceiling paint', 'ceiling'],             ref: 'ceiling' },
    { keys: ['trim', 'baseboard paint'],              ref: 'trim' },
    { keys: ['door paint', 'door'],                   ref: 'door' },
    { keys: ['cabinet paint', 'cabinet refin'],       ref: 'cabinet' },
    { keys: ['exterior siding', 'siding paint'],      ref: 'exterior_siding' },
    { keys: ['fence paint', 'fence stain'],           ref: 'fence' },
    { keys: ['deck stain', 'deck paint', 'deck seal'],ref: 'deck_stain' },
    { keys: ['epoxy', 'garage floor'],                ref: 'garage_epoxy' },
    { keys: ['accent wall', 'feature wall'],          ref: 'accent_wall' },
    { keys: ['primer'],                               ref: 'primer' },
    { keys: ['touch-up', 'touch up'],                ref: 'touch_ups' },
  ],
  drywall: [
    { keys: ['installation', 'install', 'sheetrock'], ref: 'installation' },
    { keys: ['patch', 'hole repair'],                 ref: 'patch_repair' },
    { keys: ['tape', 'texture', 'mud'],               ref: 'tape_texture' },
    { keys: ['level 5', 'skim coat'],                 ref: 'level_5' },
    { keys: ['water damage'],                         ref: 'water_damage' },
    { keys: ['popcorn'],                              ref: 'popcorn_removal' },
    { keys: ['ceiling'],                              ref: 'ceiling' },
    { keys: ['corner bead'],                          ref: 'corner_bead' },
  ],
  flooring: [
    { keys: ['lvp', 'luxury vinyl plank', 'vinyl plank'], ref: 'lvp' },
    { keys: ['laminate'],                             ref: 'laminate' },
    { keys: ['hardwood'],                             ref: 'hardwood' },
    { keys: ['tile floor'],                           ref: 'tile_floor' },
    { keys: ['floor removal', 'remove floor', 'flooring demo'], ref: 'removal' },
    { keys: ['subfloor'],                             ref: 'subfloor_repair' },
    { keys: ['baseboard'],                            ref: 'baseboard' },
    { keys: ['carpet install'],                       ref: 'carpet' },
    { keys: ['carpet removal', 'carpet demo'],        ref: 'carpet_removal' },
    { keys: ['transition strip'],                     ref: 'transition_strip' },
  ],
  tile: [
    { keys: ['floor tile', 'tile floor', 'tile installation (floor)'], ref: 'floor' },
    { keys: ['wall tile', 'tile installation (wall)'], ref: 'wall' },
    { keys: ['tile removal', 'tile demo'],            ref: 'removal' },
    { keys: ['grout repair', 'regrout'],              ref: 'grout_repair' },
    { keys: ['tile caulk'],                           ref: 'caulking' },
    { keys: ['mosaic'],                               ref: 'mosaic' },
    { keys: ['large format'],                         ref: 'large_format' },
    { keys: ['marble', 'natural stone'],              ref: 'natural_stone' },
  ],
  carpentry: [
    { keys: ['shelving', 'shelf'],                    ref: 'shelving' },
    { keys: ['closet'],                               ref: 'closet' },
    { keys: ['deck construct', 'deck build'],         ref: 'deck' },
    { keys: ['fence install', 'fence build'],         ref: 'fence' },
    { keys: ['stair'],                                ref: 'stairs' },
    { keys: ['wood rot', 'rot repair'],               ref: 'wood_rot' },
    { keys: ['crown molding'],                        ref: 'crown_molding' },
    { keys: ['chair rail'],                           ref: 'chair_rail' },
    { keys: ['cabinet install'],                      ref: 'cabinet_install' },
    { keys: ['countertop'],                           ref: 'countertop' },
  ],
  bathroom: [
    { keys: ['full bathroom', 'bathroom remodel'],    ref: 'full_remodel' },
    { keys: ['shower tile'],                          ref: 'shower_tile' },
    { keys: ['bathtub', 'tub replacement'],           ref: 'bathtub' },
    { keys: ['vanity'],                               ref: 'vanity' },
    { keys: ['toilet'],                               ref: 'toilet' },
    { keys: ['exhaust fan', 'bathroom fan'],          ref: 'exhaust_fan' },
    { keys: ['shower door'],                          ref: 'shower_door' },
    { keys: ['bathroom caulk', 'recaulk'],            ref: 'caulking' },
  ],
  kitchen: [
    { keys: ['full kitchen', 'kitchen remodel'],      ref: 'full_remodel' },
    { keys: ['cabinet replacement', 'cabinet replace'],ref: 'cabinet_replace' },
    { keys: ['backsplash'],                           ref: 'backsplash' },
    { keys: ['kitchen countertop', 'counter install'],ref: 'countertop' },
    { keys: ['sink install'],                         ref: 'sink' },
    { keys: ['faucet'],                               ref: 'faucet' },
    { keys: ['island'],                               ref: 'island' },
  ],
  doors_windows: [
    { keys: ['interior door'],                        ref: 'interior_door' },
    { keys: ['exterior door', 'entry door'],          ref: 'exterior_door' },
    { keys: ['window install'],                       ref: 'window' },
    { keys: ['window trim', 'window casing'],         ref: 'window_trim' },
    { keys: ['door hardware', 'door knob', 'lockset'],ref: 'hardware' },
  ],
  framing: [
    { keys: ['interior wall framing', 'wall framing'],ref: 'interior_wall' },
    { keys: ['partition wall'],                       ref: 'partition_wall' },
    { keys: ['ceiling framing', 'soffit framing'],    ref: 'ceiling' },
  ],
  repairs: [
    { keys: ['general home repair', 'handyman'],      ref: 'general' },
    { keys: ['stucco'],                               ref: 'stucco' },
    { keys: ['fence repair'],                         ref: 'fence_repair' },
    { keys: ['deck repair'],                          ref: 'deck_repair' },
    { keys: ['door adjust', 'door repair'],           ref: 'door_repair' },
  ],
  demolition: [
    { keys: ['interior demolition', 'interior demo'], ref: 'interior' },
    { keys: ['wall removal', 'wall demo'],            ref: 'wall_removal' },
    { keys: ['debris', 'haul'],                       ref: 'debris_hauling' },
  ],
  misc: [
    { keys: ['project management', 'site management'],ref: 'project_mgmt' },
    { keys: ['site visit', 'consultation'],           ref: 'site_visit' },
    { keys: ['travel', 'mobilization'],               ref: 'travel' },
  ],
};

/**
 * getMarketReference(entry)
 *
 * Attempts to find a market reference for a price book entry.
 * Strategy:
 *   1. Map category string → market category key
 *   2. Match display_name keywords → specific service ref
 *   3. Fallback: return first entry of that category (broad reference)
 *
 * Returns { unit, low, avg, high } or null.
 */
export function getMarketReference(entry) {
  if (!entry) return null;

  const catKey = CATEGORY_MAP[entry.category];
  if (!catKey) return null;

  const catData = MARKET_REFERENCE[catKey];
  if (!catData) return null;

  const name = (entry.display_name || '').toLowerCase();
  const keywordMap = KEYWORD_MAPS[catKey] || [];

  // Try keyword matching
  for (const { keys, ref } of keywordMap) {
    if (keys.some(k => name.includes(k))) {
      const refData = catData[ref];
      if (refData) return refData;
    }
  }

  // Fallback: first entry in category
  const firstKey = Object.keys(catData)[0];
  return firstKey ? catData[firstKey] : null;
}

/**
 * getPriceIndicator(userPrice, marketRef)
 *
 * Compares user price against market low/high range.
 * Returns { status: 'below' | 'within' | 'above', label, badgeCls, dotCls }
 */
export function getPriceIndicator(userPrice, marketRef) {
  if (!marketRef || userPrice === null || userPrice === undefined || userPrice === '') return null;

  const price = parseFloat(userPrice);
  if (isNaN(price)) return null;

  if (price < marketRef.low) {
    return {
      status: 'below',
      label: 'Below market',
      badgeCls: 'bg-emerald-50 text-emerald-700',
      dotCls: 'bg-emerald-400',
    };
  }
  if (price > marketRef.high) {
    return {
      status: 'above',
      label: 'Above market',
      badgeCls: 'bg-rose-50 text-rose-600',
      dotCls: 'bg-rose-400',
    };
  }
  return {
    status: 'within',
    label: 'Market range',
    badgeCls: 'bg-amber-50 text-amber-700',
    dotCls: 'bg-amber-400',
  };
}

/**
 * formatDiff(userPrice, avg)
 * Returns a string like "+12%" or "-8%" showing difference vs market avg.
 */
export function formatDiff(userPrice, avg) {
  const price = parseFloat(userPrice);
  if (isNaN(price) || !avg) return null;
  const diff = ((price - avg) / avg) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}