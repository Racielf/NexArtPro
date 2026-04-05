import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ImageIcon, Plus, Trash2, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function WOReceipts({ workOrderId }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => { loadReceipts(); }, [workOrderId]);

  const loadReceipts = async () => {
    const data = await base44.entities.WorkOrderReceipt.filter({ work_order_id: workOrderId });
    setReceipts(data);
    setLoading(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.WorkOrderReceipt.create({
      work_order_id: workOrderId,
      file_url,
      file_name: file.name,
    });
    toast.success('Receipt uploaded');
    setUploading(false);
    e.target.value = '';
    loadReceipts();
  };

  const handleDelete = async (receiptId) => {
    if (!confirm('Delete this receipt?')) return;
    await base44.entities.WorkOrderReceipt.delete(receiptId);
    toast.success('Receipt deleted');
    loadReceipts();
  };

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name || '');
  const isPdf = (name) => /\.pdf$/i.test(name || '');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-slate-900">Receipts & Photos</h2>
          {receipts.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">
              {receipts.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <><span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />Uploading…</>
            : <><Upload className="w-3.5 h-3.5" />Upload</>
          }
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">Loading…</p>
        ) : receipts.length === 0 ? (
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg py-10 flex flex-col items-center text-slate-400 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-7 h-7 mb-2" />
            <p className="text-sm font-medium">Click to upload receipt or photo</p>
            <p className="text-xs mt-1">Images or PDF</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {receipts.map(r => (
              <div key={r.id} className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                {/* Thumbnail */}
                {isImage(r.file_name) ? (
                  <img
                    src={r.file_url}
                    alt={r.file_name}
                    className="w-full h-28 object-cover"
                  />
                ) : (
                  <div className="w-full h-28 flex flex-col items-center justify-center bg-red-50">
                    <ImageIcon className="w-8 h-8 text-red-400 mb-1" />
                    <span className="text-[10px] text-red-400 font-medium uppercase">PDF</span>
                  </div>
                )}
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-full p-1.5 hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-700" />
                  </a>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="bg-white rounded-full p-1.5 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
                {/* File name */}
                <div className="px-2 py-1.5 border-t border-slate-100">
                  <p className="text-[10px] text-slate-500 truncate">{r.file_name || 'Receipt'}</p>
                </div>
              </div>
            ))}
            {/* Upload tile */}
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg h-28 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs">Add more</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}