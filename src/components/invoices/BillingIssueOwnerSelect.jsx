import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, ChevronDown, X } from 'lucide-react';

/**
 * BillingIssueOwnerSelect — Lightweight owner assignment for billing issues
 * Accepts free-form owner names (email or name)
 * Used in Invoices list + InvoiceDetail
 */
export default function BillingIssueOwnerSelect({ 
  currentOwner, 
  onAssign, 
  disabled = false,
  compact = false
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleAssign = (owner) => {
    onAssign(owner);
    setInput('');
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onAssign(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          currentOwner
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <User className="w-3 h-3" />
        {currentOwner || 'Assign'}
        {currentOwner && (
          <X className="w-3 h-3 ml-auto hover:opacity-70" onClick={handleClear} />
        )}
        {!compact && <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              placeholder="Enter owner name or email…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && input.trim()) {
                  handleAssign(input.trim());
                }
              }}
              autoFocus
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="p-1 space-y-1 max-h-[160px] overflow-y-auto">
            {input.trim() ? (
              <button
                onClick={() => handleAssign(input.trim())}
                className="w-full text-left px-3 py-2 rounded-md text-xs hover:bg-blue-50 text-blue-700 font-medium"
              >
                Assign to "{input.trim()}"
              </button>
            ) : (
              <p className="px-3 py-2 text-[11px] text-slate-400">
                Type to create owner
              </p>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-100"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}