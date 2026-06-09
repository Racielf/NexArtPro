import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Archive } from 'lucide-react';

/**
 * RecoveryPreviewModal
 *
 * Displays snapshot preview of a deleted record from RecoveryVault.
 * Shows metadata and key fields in a structured, safe way.
 *
 * Props:
 * - open: bool
 * - vaultEntry: RecoveryVault object (or null)
 * - onClose: fn
 * - onRestore: fn
 * - restoring: bool (loading state)
 */
export default function RecoveryPreviewModal({ open, vaultEntry, onClose, onRestore, restoring = false }) {
  if (!open || !vaultEntry) return null;

  const snapshot = vaultEntry.snapshot_json || {};

  // Safe field extraction
  const getField = (key, fallback = '—') => {
    const val = snapshot[key];
    if (val === null || val === undefined || val === '') return fallback;
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 100);
    return String(val);
  };

  // Metadata row
  const MetaRow = ({ label, value }) => (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 uppercase w-32 flex-shrink-0">
        {label}
      </span>
      <span className="text-[13px] text-slate-700 break-words flex-1">
        {value}
      </span>
    </div>
  );

  // Sample key fields by entity type
  const sampleFields = {
    Invoice: ['client_name', 'invoice_number', 'total', 'status', 'due_date'],
    Customer: ['display_name', 'email', 'phone', 'service_address', 'customer_type'],
    Client: ['full_name', 'email', 'phone', 'address', 'preferred_language'],
    Lead: ['name', 'email', 'phone', 'company', 'status'],
    Estimate: ['client_name', 'estimate_number', 'total', 'status', 'expiration_date'],
    Proposal: ['client_name', 'proposal_number', 'total_amount', 'status', 'close_outcome'],
    WorkOrder: ['client_name', 'work_order_number', 'total', 'status', 'scheduled_date'],
  };

  const keyFields = sampleFields[vaultEntry.entity_type] || [
    'name', 'title', 'email', 'phone', 'status',
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-600" />
            Snapshot Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entity & metadata header */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Entity</span>
              <span className="text-sm font-semibold text-slate-800">{vaultEntry.entity_type}</span>
            </div>
            {vaultEntry.record_label && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Record</span>
                <span className="text-sm font-semibold text-slate-800">{vaultEntry.record_label}</span>
              </div>
            )}
            {vaultEntry.reference_number && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Number</span>
                <span className="text-sm font-semibold text-slate-800">{vaultEntry.reference_number}</span>
              </div>
            )}
          </div>

          {/* Deletion metadata */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Deletion Info</span>
            <MetaRow label="Deleted At" value={vaultEntry.deleted_at ? new Date(vaultEntry.deleted_at).toLocaleString() : '—'} />
            <MetaRow label="Deleted By" value={vaultEntry.deleted_by || '—'} />
            {vaultEntry.delete_reason && (
              <MetaRow label="Reason" value={vaultEntry.delete_reason} />
            )}
            {vaultEntry.is_restored && (
              <MetaRow label="Restored At" value={vaultEntry.restored_at ? new Date(vaultEntry.restored_at).toLocaleString() : '—'} />
            )}
            {vaultEntry.is_purged && (
              <MetaRow label="Purged At" value={vaultEntry.purged_at ? new Date(vaultEntry.purged_at).toLocaleString() : '—'} />
            )}
          </div>

          {/* Sample snapshot fields */}
          {keyFields.some(f => getField(f) !== '—') && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Record Data</span>
              {keyFields.map(field => {
                const val = getField(field);
                if (val === '—') return null;
                return <MetaRow key={field} label={field} value={val} />;
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={restoring}
            >
              <X className="w-3 h-3 mr-1" />
              Close
            </Button>
            {!vaultEntry.is_purged && (
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onRestore}
                disabled={restoring}
              >
                <RotateCcw className="w-3 h-3" />
                {restoring ? 'Restoring…' : 'Restore Record'}
              </Button>
            )}
          </div>

          {/* Status badges */}
          {(vaultEntry.is_restored || vaultEntry.is_purged) && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              {vaultEntry.is_restored && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  ✓ Restored
                </span>
              )}
              {vaultEntry.is_purged && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">
                  ✓ Permanently Deleted
                </span>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}