/**
 * Price Book categories and types.
 * Centralized so PriceBookSection, PriceBookForm, PriceBookTable, and filters all share the same source.
 */

export const ITEM_TYPES = [
  { value: 'service',  label: 'Service',  color: 'bg-blue-50 text-blue-600' },
  { value: 'material', label: 'Material', color: 'bg-amber-50 text-amber-600' },
  { value: 'labor',    label: 'Labor',    color: 'bg-purple-50 text-purple-600' },
];

export const PRICE_BOOK_CATEGORIES = [
  'Drywall',
  'Paint',
  'Tile',
  'Flooring',
  'Framing',
  'Finish Carpentry',
  'Doors & Windows',
  'Bathroom',
  'Kitchen',
  'Demolition',
  'Cleaning',
  'Repairs',
  'Concrete',
  'Admin',
  'Labor',
];

export const CATEGORY_COLORS = {
  'Drywall':           'bg-gray-100 text-gray-600',
  'Paint':             'bg-blue-50 text-blue-600',
  'Tile':              'bg-cyan-50 text-cyan-600',
  'Flooring':          'bg-amber-50 text-amber-600',
  'Framing':           'bg-yellow-50 text-yellow-600',
  'Finish Carpentry':  'bg-orange-50 text-orange-600',
  'Doors & Windows':   'bg-purple-50 text-purple-600',
  'Bathroom':          'bg-teal-50 text-teal-600',
  'Kitchen':           'bg-green-50 text-green-600',
  'Demolition':        'bg-red-50 text-red-600',
  'Cleaning':          'bg-sky-50 text-sky-600',
  'Repairs':           'bg-rose-50 text-rose-600',
  'Admin':             'bg-slate-100 text-slate-500',
  'Labor':             'bg-purple-50 text-purple-600',
  // Legacy categories still supported
  'Painting':          'bg-blue-50 text-blue-600',
  'Carpentry':         'bg-orange-50 text-orange-600',
  'Bathroom Remodeling': 'bg-teal-50 text-teal-600',
  'Kitchen Remodeling': 'bg-green-50 text-green-600',
  'Trim & Finish':     'bg-pink-50 text-pink-600',
  'Siding & Exterior': 'bg-lime-50 text-lime-600',
  'Cleaning & Final Touch': 'bg-sky-50 text-sky-600',
  'Concrete':           'bg-stone-100 text-stone-600',
  'Misc':              'bg-slate-100 text-slate-500',
};

export function getTypeConfig(type) {
  return ITEM_TYPES.find(t => t.value === type) || ITEM_TYPES[0];
}