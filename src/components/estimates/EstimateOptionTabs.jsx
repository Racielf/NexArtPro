import React, { useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Copy, FileText, Ban, Trash2 } from 'lucide-react';

export default function EstimateOptionTabs({ activeOption, options, onSelectOption, onAddOption }) {
  const [showMenu, setShowMenu] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const menuItems = [
    { icon: Pencil, label: 'Rename' },
    { icon: FileText, label: 'Save as template' },
    { icon: Copy, label: 'Copy to new option' },
    { icon: FileText, label: 'Copy to new estimate' },
    { icon: Ban, label: 'Cancel Option #1', danger: false },
    { icon: Trash2, label: 'Delete Option #1', danger: true },
  ];

  return (
    <div className="flex items-center gap-0 relative">
      {options.map((opt, idx) => (
        <div key={idx} className="relative flex items-center">
          <button
            onClick={() => onSelectOption(idx)}
            className={`flex items-center gap-1 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeOption === idx
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {opt.label}
          </button>
          {activeOption === idx && (
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(showMenu === idx ? null : idx); }}
              className="p-1 ml-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
          {showMenu === idx && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(null)} />
              <div className="absolute top-full left-0 z-40 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1">
                {menuItems.map(({ icon: Icon, label, danger }) => (
                  <button
                    key={label}
                    onClick={() => setShowMenu(null)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-700'}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add option button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(v => !v)}
          className="flex items-center gap-1 px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-primary border-b-2 border-transparent hover:border-primary/30 transition-colors"
        >
          Add option
        </button>
        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowAddMenu(false)} />
            <div className="absolute top-full left-0 z-40 mt-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1">
              <button
                onClick={() => { onAddOption(); setShowAddMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />New option
              </button>
              <button
                onClick={() => setShowAddMenu(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4" />Select from templates
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}