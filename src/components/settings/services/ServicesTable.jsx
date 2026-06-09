import React from 'react';
import { Pencil, Power, AlertCircle } from 'lucide-react';
import { UNITS } from './servicesSeed';

const CATEGORY_COLORS = {
  'Painting':               'bg-blue-50 text-blue-600',
  'Drywall':                'bg-gray-100 text-gray-600',
  'Flooring':               'bg-amber-50 text-amber-600',
  'Carpentry':              'bg-orange-50 text-orange-600',
  'Bathroom Remodeling':    'bg-teal-50 text-teal-600',
  'Kitchen Remodeling':     'bg-green-50 text-green-600',
  'Demolition':             'bg-red-50 text-red-600',
  'Doors & Windows':        'bg-purple-50 text-purple-600',
  'Siding & Exterior':      'bg-lime-50 text-lime-600',
  'Framing':                'bg-yellow-50 text-yellow-600',
  'Trim & Finish':          'bg-pink-50 text-pink-600',
  'Tile':                   'bg-cyan-50 text-cyan-600',
  'Repairs':                'bg-rose-50 text-rose-600',
  'Cleaning & Final Touch': 'bg-sky-50 text-sky-600',
  'Misc':                   'bg-slate-100 text-slate-500',
};

const SOURCE_LABELS = {
  seed:      { label: 'Seed',      cls: 'bg-slate-100 text-slate-500' },
  manual:    { label: 'Manual',    cls: 'bg-blue-50 text-blue-500' },
  estimate:  { label: 'Estimate',  cls: 'bg-green-50 text-green-600' },
  invoice:   { label: 'Invoice',   cls: 'bg-purple-50 text-purple-600' },
  workorder: { label: 'Work Order',cls: 'bg-orange-50 text-orange-600' },
};

function unitLabel(val) {
  return UNITS.find(u => u.value === val)?.label || val;
}

export default function ServicesTable({ services, onEdit, onToggleActive, onToggleReview }) {
  if (services.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-14 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <p className="text-sm font-semibold text-slate-600 mb-1">No services found</p>
        <p className="text-xs text-slate-400">Try adjusting your search or filter</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Unit</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Source</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Review</th>
            <th className="px-4 py-3 w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {services.map(svc => {
            const catCls = CATEGORY_COLORS[svc.category] || 'bg-slate-100 text-slate-500';
            const src = SOURCE_LABELS[svc.created_from] || SOURCE_LABELS.manual;
            return (
              <tr key={svc.id} className={`group transition-colors hover:bg-slate-50/60 ${!svc.is_active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-800 leading-tight">{svc.name}</p>
                  {svc.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{svc.description}</p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${catCls}`}>
                    {svc.category}
                  </span>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-xs text-slate-500 bg-slate-100 rounded-md px-2 py-0.5">{unitLabel(svc.default_unit)}</span>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${src.cls}`}>{src.label}</span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <button onClick={() => onToggleActive(svc.id)}
                    title={svc.is_active ? 'Deactivate' : 'Activate'}
                    className="transition">
                    <span className={`inline-block w-2 h-2 rounded-full ${svc.is_active ? 'bg-green-400' : 'bg-slate-300'}`} />
                  </button>
                </td>
                <td className="px-4 py-3.5 text-center hidden md:table-cell">
                  <button onClick={() => onToggleReview(svc.id)}
                    title="Toggle needs review"
                    className="transition">
                    <AlertCircle className={`w-3.5 h-3.5 ${svc.needs_review ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`} />
                  </button>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button onClick={() => onEdit(svc)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-slate-700">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400">
        {services.length} service{services.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}