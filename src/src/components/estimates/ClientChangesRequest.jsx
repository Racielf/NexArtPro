import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';

/**
 * ClientChangesRequest — modal for client to describe requested changes.
 */
export default function ClientChangesRequest({ onSubmit, onCancel }) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Request Changes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Let us know what you'd like adjusted.</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="text-xs font-semibold text-slate-500 block mb-2">Describe the changes you need</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={5}
            placeholder="e.g. Please remove the painting services and add a 10% discount for the materials..."
            className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 resize-none text-slate-700"
            autoFocus
          />
          <p className="text-[11px] text-slate-400 mt-2">We'll review your request and send you a revised estimate.</p>
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            disabled={!note.trim()}
            onClick={() => onSubmit(note.trim())}
            className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}