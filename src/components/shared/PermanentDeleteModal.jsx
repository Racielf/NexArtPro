import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * PermanentDeleteModal — Strong confirmation required before hard delete.
 * User must type exactly "DELETE" to enable the confirm button.
 *
 * Props:
 *   open: bool
 *   onCancel: fn
 *   onConfirm: fn()
 *   entityLabel: string — e.g. "Customer: John Doe" or "INV#42"
 */
export default function PermanentDeleteModal({ open, onCancel, onConfirm, entityLabel = 'record' }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const canConfirm = input.trim() === 'DELETE';

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    await onConfirm();
    setInput('');
    setLoading(false);
  };

  const handleCancel = () => {
    setInput('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-red-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Eliminar permanentemente</h2>
            <p className="text-[11px] text-slate-500">Esta acción no puede deshacerse</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
          <p className="text-xs text-red-700 font-medium truncate">{entityLabel}</p>
          <p className="text-[11px] text-red-500 mt-0.5">
            Este registro será eliminado de forma permanente. No podrá ser recuperado.
          </p>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Escribe <span className="font-bold text-red-600">DELETE</span> para confirmar
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="DELETE"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 font-mono tracking-widest"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && canConfirm) handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!canConfirm || loading}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white gap-1.5 disabled:opacity-40"
          >
            {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
          </Button>
        </div>
      </div>
    </div>
  );
}