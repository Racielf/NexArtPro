import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';

/**
 * ArchiveReasonModal — Lightweight reusable archive confirmation dialog.
 *
 * Props:
 *   open: bool
 *   onCancel: fn
 *   onConfirm: fn(reason: string)
 *   entityLabel: string — e.g. "Customer", "Estimate #42"
 *   count: number — if > 1, shows bulk message
 */
export default function ArchiveReasonModal({ open, onCancel, onConfirm, entityLabel = 'record', count = 1 }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(reason.trim());
    setReason('');
    setLoading(false);
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Archive className="w-4 h-4 text-amber-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Archive {count > 1 ? `${count} records` : entityLabel}?</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {count > 1
            ? `${count} records will be archived. They can be recovered from the Recovery Center.`
            : `This ${entityLabel} will be archived. It can be recovered later from the Recovery Center.`}
        </p>
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Reason <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. duplicate, data entry error…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>Cancel</Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5" onClick={handleConfirm} disabled={loading}>
            <Archive className="w-3.5 h-3.5" />
            {loading ? 'Archiving…' : 'Archive'}
          </Button>
        </div>
      </div>
    </div>
  );
}