/**
 * ContentLibraryPopover.jsx
 *
 * Compact popover UI para insertar desde biblioteca o guardar en biblioteca.
 * Se integra en cada campo textarea (scopeOfWork, inclusions, exclusions, timeline).
 *
 * Dos modos:
 * - Insert: muestra items guardados, clickeable para insertar
 * - Save: guarda texto actual en biblioteca
 */

import React, { useState } from 'react';
import { Plus, BookOpen, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useProposalContentLibrary } from '@/hooks/useProposalContentLibrary';
import { toast } from 'sonner';

export default function ContentLibraryPopover({ type, currentValue, onInsert, label }) {
  // type: 'scope' | 'inclusion' | 'exclusion' | 'timeline'
  // currentValue: current textarea value
  // onInsert: callback when user selects an item to insert
  // label: display label (e.g., "Scope of Work")

  const library = useProposalContentLibrary();
  const [showInsert, setShowInsert] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveCategory, setSaveCategory] = useState('General');
  const [saving, setSaving] = useState(false);

  const items = library.getByType(type);
  const categories = library.getCategories(type);

  const handleInsert = (item) => {
    if (currentValue && currentValue.trim()) {
      // Append with newline separator
      onInsert(currentValue + '\n\n' + item.content);
    } else {
      // Replace if empty
      onInsert(item.content);
    }
    setShowInsert(false);
    toast.success(`Inserted "${item.title}"`);
  };

  const handleSave = async () => {
    if (!currentValue || !currentValue.trim()) {
      toast.error('Nothing to save — add content first');
      return;
    }
    if (!saveTitle || !saveTitle.trim()) {
      toast.error('Please enter a label for this content');
      return;
    }

    setSaving(true);
    const saved = library.save(type, saveTitle, currentValue, saveCategory);
    setSaving(false);

    if (saved) {
      toast.success(`Saved as "${saveTitle}"`);
      setSaveTitle('');
      setSaveCategory('General');
      setShowSave(false);
    } else {
      toast.error('Failed to save — try again');
    }
  };

  const handleDelete = (itemId) => {
    if (library.remove(itemId)) {
      toast.success('Item removed');
    }
  };

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {/* Insert button */}
      <div className="relative">
        <button
          onClick={() => setShowInsert(!showInsert)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          title="Insert from saved library"
        >
          <BookOpen className="w-3 h-3" />
          Insert
          {items.length > 0 && <span className="ml-0.5 text-slate-400">({items.length})</span>}
        </button>

        {showInsert && (
          <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-72 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2">
              <p className="text-xs font-semibold text-slate-600">Insert from library</p>
            </div>

            {items.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">
                No saved items yet — create some with "Save"
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div
                      onClick={() => handleInsert(item)}
                      className="block"
                    >
                      <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.category} • {item.content.slice(0, 40)}...
                      </p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="mt-1.5 text-[10px] text-slate-300 hover:text-red-500 flex items-center gap-1"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowInsert(false)}
              className="w-full text-center py-2 text-xs text-slate-400 hover:text-slate-600 border-t border-slate-100 bg-slate-50"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="relative">
        <button
          onClick={() => setShowSave(!showSave)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          title="Save this content for reuse"
        >
          <Plus className="w-3 h-3" />
          Save
        </button>

        {showSave && (
          <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-72">
            <div className="px-3 py-2.5 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-600">Save to library</p>
            </div>

            <div className="p-3 space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Label (short name)
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  placeholder="e.g., Standard residential scope"
                  className="w-full h-7 text-xs border border-slate-200 rounded px-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Category (optional)
                </label>
                <select
                  value={saveCategory}
                  onChange={e => setSaveCategory(e.target.value)}
                  className="w-full h-7 text-xs border border-slate-200 rounded px-2 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="New category">+ New category</option>
                </select>
                {saveCategory === 'New category' && (
                  <input
                    type="text"
                    placeholder="Enter new category"
                    onChange={e => setSaveCategory(e.target.value)}
                    className="w-full h-6 text-xs border border-slate-200 rounded px-2 mt-1 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSave(false)}
                  className="flex-1 h-6 text-xs font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !saveTitle.trim()}
                  className="flex-1 h-6 text-xs font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}