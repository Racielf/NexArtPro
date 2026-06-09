/**
 * VaultPreviewDrawer — Admin-only lightweight preview of a RecoveryVault snapshot.
 * Shows key fields from snapshot_json before restore decision.
 * Does NOT render full document viewer.
 */

import React from 'react';
import { X, Archive, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREVIEW_FIELDS = {
  Invoice:   ['invoice_number', 'client_name', 'client_email', 'total', 'status', 'due_date', 'sent_at'],
  Estimate:  ['estimate_number', 'client_name', 'client_email', 'total', 'status', 'title'],
  WorkOrder: ['work_order_number', 'client_name', 'title', 'status', 'scheduled_date', 'assigned_worker_name'],
  Proposal:  ['proposal_number', 'client_name', 'title', 'status', 'total_amount'],
  Customer:  ['first_name', 'last_name', 'email', 'phone', 'customer_type', 'service_address'],
  Client:    ['full_name', 'email', 'phone', 'address'],
  Lead:      ['name', 'email', 'phone', 'status', 'notes'],
};

function fmt(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 80) + '…';
  return String(val);
}

export default function VaultPreviewDrawer({ vaultEntry, onClose, onRestore }) {
  if (!vaultEntry) return null;

  const snap = vaultEntry.snapshot_json || {};
  const fieldsToShow = PREVIEW_FIELDS[vaultEntry.entity_type] || Object.keys(snap).slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-500" />
              <p className="font-bold text-slate-800 text-sm">
                {vaultEntry.reference_number
                  ? `${vaultEntry.reference_number} — ${vaultEntry.record_label}`
                  : vaultEntry.record_label}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{vaultEntry.entity_type} snapshot</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Meta block */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex-shrink-0 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Deleted by</p>
              <p className="text-xs text-slate-700 font-medium">{vaultEntry.deleted_by || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Deleted at</p>
              <p className="text-xs text-slate-700 font-medium">
                {vaultEntry.deleted_at ? new Date(vaultEntry.deleted_at).toLocaleString() : '—'}
              </p>
            </div>
            {vaultEntry.delete_reason && (
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Reason</p>
                <p className="text-xs text-slate-700">{vaultEntry.delete_reason}</p>
              </div>
            )}
          </div>
          {vaultEntry.is_purged && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-xs text-red-700 font-semibold">Original record permanently deleted</p>
            </div>
          )}
          {vaultEntry.is_restored && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-semibold">
                Restored by {vaultEntry.restored_by} · {vaultEntry.restored_at ? new Date(vaultEntry.restored_at).toLocaleDateString() : ''}
              </p>
            </div>
          )}
        </div>

        {/* Snapshot fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Record Snapshot</p>
          <div className="space-y-2.5">
            {fieldsToShow.map(field => {
              const val = snap[field];
              if (val === null || val === undefined || val === '') return null;
              return (
                <div key={field} className="flex items-start gap-3">
                  <span className="text-[11px] text-slate-400 w-36 flex-shrink-0 font-medium capitalize">
                    {field.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[12px] text-slate-700 font-medium break-words">{fmt(val)}</span>
                </div>
              );
            })}
          </div>

          {/* Show raw snapshot toggle for remaining fields */}
          {snap && Object.keys(snap).length > fieldsToShow.length && (
            <details className="mt-4">
              <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600 font-medium">
                Show all fields ({Object.keys(snap).length} total)
              </summary>
              <div className="mt-2 space-y-1.5">
                {Object.entries(snap)
                  .filter(([k]) => !fieldsToShow.includes(k))
                  .map(([k, v]) => (v === null || v === undefined || v === '' ? null : (
                    <div key={k} className="flex items-start gap-3">
                      <span className="text-[11px] text-slate-400 w-36 flex-shrink-0 font-medium capitalize">
                        {k.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-600 break-words">{fmt(v)}</span>
                    </div>
                  )))}
              </div>
            </details>
          )}
        </div>

        {/* Footer actions */}
        {!vaultEntry.is_purged && !vaultEntry.is_restored && onRestore && (
          <div className="px-5 py-4 border-t border-slate-200 flex-shrink-0">
            <Button
              className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onRestore()}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore this record
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}