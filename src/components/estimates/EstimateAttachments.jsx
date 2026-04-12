/**
 * EstimateAttachments — Upload & manage attachments on an estimate.
 *
 * Each attachment has an `intent`:
 *   - internal_only  → company use, never sent to client
 *   - send_to_client → included as download links in the client email
 *
 * Props:
 *   attachments  — array from estimate.attachments (may be null/undefined)
 *   onUpdate     — (newAttachments: array) => void — persist to parent
 *   readOnly     — boolean, disables upload/edit
 */
import { useState } from 'react';
import { Upload, Trash2, Lock, Send, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const INTENT_CONFIG = {
  internal_only: {
    label: 'Internal only',
    shortLabel: 'Internal',
    icon: Lock,
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  send_to_client: {
    label: 'Send to client',
    shortLabel: 'Client',
    icon: Send,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
};

export default function EstimateAttachments({ attachments = [], onUpdate, readOnly = false }) {
  const [uploading, setUploading] = useState(false);

  const items = Array.isArray(attachments) ? attachments : [];

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const newItems = [...items];
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newItems.push({
          id: Math.random().toString(36).slice(2, 10),
          file_url,
          file_name: file.name,
          intent: 'internal_only',
          uploaded_at: new Date().toISOString(),
        });
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    onUpdate(newItems);
    // Reset the input so the same file can be re-uploaded
    e.target.value = '';
  };

  const toggleIntent = (id) => {
    const updated = items.map(a =>
      a.id === id
        ? { ...a, intent: a.intent === 'internal_only' ? 'send_to_client' : 'internal_only' }
        : a
    );
    onUpdate(updated);
  };

  const removeAttachment = (id) => {
    onUpdate(items.filter(a => a.id !== id));
  };

  const clientCount = items.filter(a => a.intent === 'send_to_client').length;

  return (
    <div className="space-y-3">
      {/* Upload button */}
      {!readOnly && (
        <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
          {uploading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs font-medium text-slate-500">
            {uploading ? 'Uploading…' : 'Upload file'}
          </span>
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}

      {/* File list */}
      {items.length === 0 && !uploading && (
        <p className="text-[11px] text-slate-400 text-center py-2">No attachments</p>
      )}

      {items.map((att) => {
        const cfg = INTENT_CONFIG[att.intent] || INTENT_CONFIG.internal_only;
        const Icon = cfg.icon;
        return (
          <div key={att.id} className="flex items-center gap-2 group">
            {/* File icon */}
            <div className="w-7 h-7 bg-slate-50 border border-slate-200 rounded flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <a
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-slate-700 hover:text-primary truncate block"
                title={att.file_name}
              >
                {att.file_name || 'file'}
              </a>
            </div>

            {/* Intent toggle */}
            {!readOnly ? (
              <button
                type="button"
                onClick={() => toggleIntent(att.id)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors ${cfg.cls}`}
                title={`Click to switch: ${att.intent === 'internal_only' ? 'Mark as Send to Client' : 'Mark as Internal Only'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.shortLabel}
              </button>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.shortLabel}
              </span>
            )}

            {/* Delete */}
            {!readOnly && (
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {clientCount > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5">
          <Send className="w-3 h-3" />
          {clientCount} file{clientCount > 1 ? 's' : ''} will be sent to client
        </div>
      )}
    </div>
  );
}