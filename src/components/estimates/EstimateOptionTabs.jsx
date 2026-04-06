import React, { useState, useRef, useEffect } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react';

export default function EstimateOptionTabs({ activeOption, options, onSelectOption, onAddOption, onRenameOption, onDeleteOption }) {
  const [showMenu, setShowMenu] = useState(null);
  const [renamingIdx, setRenamingIdx] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (renamingIdx !== null) renameInputRef.current?.focus();
  }, [renamingIdx]);

  const startRename = (idx) => {
    setRenameValue(options[idx].label);
    setRenamingIdx(idx);
    setShowMenu(null);
  };

  const commitRename = (idx) => {
    const val = renameValue.trim();
    if (val && onRenameOption) onRenameOption(idx, val);
    setRenamingIdx(null);
  };

  return (
    <div className="flex items-center gap-0 relative">
      {options.map((opt, idx) => (
        <div key={idx} className="relative flex items-center">
          {renamingIdx === idx ? (
            <div className="flex items-center gap-1 px-2 py-1.5">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(idx); if (e.key === 'Escape') setRenamingIdx(null); }}
                className="text-sm font-semibold border border-primary rounded px-2 py-0.5 w-28 focus:outline-none"
              />
              <button onClick={() => commitRename(idx)} className="p-0.5 text-primary hover:text-primary/80">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
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
          )}

          {activeOption === idx && renamingIdx !== idx && (
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
              <div className="absolute top-full left-0 z-40 mt-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1">
                <button
                  onClick={() => startRename(idx)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Pencil className="w-4 h-4 flex-shrink-0" />Rename
                </button>
                {options.length > 1 && (
                  <button
                    onClick={() => { onDeleteOption?.(idx); setShowMenu(null); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0" />Delete option
                  </button>
                )}
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