import React, { useState, useEffect, useRef } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import { ImageIcon, Plus, Trash2, ExternalLink, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { archiveWithSnapshot } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { useAuth } from '@/lib/AuthContext';

const PHASES = [
  { id: 'before', label: 'Before', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'during', label: 'During', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'after',  label: 'After',  color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
];

function PhotoGrid({ photos, onDelete, onUploadClick, uploading }) {
  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name || '');

  if (photos.length === 0) {
    return (
      <div
        className="border-2 border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
        onClick={onUploadClick}
      >
        <Camera className="w-7 h-7 mb-2" />
        <p className="text-sm font-medium">Upload photo</p>
        <p className="text-xs mt-0.5">Click to select</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {photos.map(p => (
        <div key={p.id} className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
          {isImage(p.file_name) ? (
            <img src={p.photo_url} alt={p.caption || p.file_name} className="w-full h-28 object-cover" />
          ) : (
            <div className="w-full h-28 flex flex-col items-center justify-center bg-slate-100">
              <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-medium">File</span>
            </div>
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a href={p.photo_url} target="_blank" rel="noopener noreferrer"
               className="bg-white rounded-full p-1.5 hover:bg-slate-100 transition-colors">
              <ExternalLink className="w-3.5 h-3.5 text-slate-700" />
            </a>
            <button onClick={() => onDelete(p.id)}
                    className="bg-white rounded-full p-1.5 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
          {p.caption && (
            <div className="px-2 py-1.5 border-t border-slate-100">
              <p className="text-[10px] text-slate-500 truncate">{p.caption}</p>
            </div>
          )}
        </div>
      ))}
      {/* Add more tile */}
      <div
        className="border-2 border-dashed border-slate-200 rounded-lg h-28 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
        onClick={onUploadClick}
      >
        {uploading
          ? <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          : <><Plus className="w-5 h-5 mb-1" /><span className="text-xs">Add</span></>
        }
      </div>
    </div>
  );
}

export default function WOReceipts({ workOrderId, workOrderNumber, clientName }) {
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState('before');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => { loadPhotos(); }, [workOrderId]);

  const loadPhotos = async () => {
    const data = await nexartClient.entities.ProjectPhoto.filter({ work_order_id: workOrderId });
    setPhotos(data);
    setLoading(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await nexartClient.integrations.Core.UploadFile({ file });
    await nexartClient.entities.ProjectPhoto.create({
      photo_url: file_url,
      phase: activePhase,
      work_order_id: workOrderId,
      work_order_number: workOrderNumber,
      customer_name: clientName,
      taken_by: '',
      caption: '',
    });
    toast.success(`${activePhase.charAt(0).toUpperCase() + activePhase.slice(1)} photo uploaded`);
    setUploading(false);
    e.target.value = '';
    loadPhotos();
  };

  const handleDelete = async (photoId) => {
    if (!confirm('Delete this photo?')) return;
    await archiveWithSnapshot(nexartClient.entities.ProjectPhoto, 'ProjectPhoto', photoId, actor, 'Deleted by user');
    await logAuditEvent('archive', 'ProjectPhoto', photoId, actor, {});
    toast.success('Photo deleted');
    loadPhotos();
  };

  const byPhase = (phase) => photos.filter(p => p.phase === phase);
  const totalCount = photos.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-slate-900">Receipts & Photos</h2>
          {totalCount > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">{totalCount}</span>
          )}
        </div>
        <Button
          size="sm" variant="outline" className="gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <><span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />Uploading…</>
            : <><Upload className="w-3.5 h-3.5" />Upload</>
          }
        </Button>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="px-6 pt-4 pb-5">
        {/* Phase tabs */}
        <div className="flex gap-1 mb-4 border-b border-slate-100">
          {PHASES.map(phase => {
            const count = byPhase(phase.id).length;
            const isActive = activePhase === phase.id;
            return (
              <button
                key={phase.id}
                onClick={() => setActivePhase(phase.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? `border-primary ${phase.color}`
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {phase.label}
                {count > 0 && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${isActive ? `${phase.bg} ${phase.color}` : 'bg-slate-100 text-slate-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-6">Loading…</p>
        ) : (
          <PhotoGrid
            photos={byPhase(activePhase)}
            onDelete={handleDelete}
            onUploadClick={() => fileRef.current?.click()}
            uploading={uploading}
          />
        )}
      </div>
    </div>
  );
}