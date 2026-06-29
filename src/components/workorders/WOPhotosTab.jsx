import React, { useState, useRef } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

const TYPE_CONFIG = {
  before:   { label: 'Before',   bg: 'bg-slate-100 text-slate-700 border-slate-300' },
  progress: { label: 'Progress', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  after:    { label: 'After',    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  issue:    { label: 'Issue',    bg: 'bg-red-50 text-red-700 border-red-200' },
};

export default function WOPhotosTab({ workOrderId }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ type: 'progress', label: '', area: '' });
  const [showUploadForm, setShowUploadForm] = useState(false);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['wo-photos', workOrderId],
    queryFn: () => nexartClient.entities.WorkOrderPhoto.filter({ work_order_id: workOrderId }),
    enabled: !!workOrderId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => nexartClient.entities.WorkOrderPhoto.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['wo-photos', workOrderId]);
      toast.success('Photo removed');
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${workOrderId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wo-photos')
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('wo-photos').getPublicUrl(path);

      let gps_lat = null;
      let gps_lng = null;
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { gps_lat = pos.coords.latitude; gps_lng = pos.coords.longitude; resolve(); },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }

      await nexartClient.entities.WorkOrderPhoto.create({
        work_order_id: workOrderId,
        type:          form.type,
        label:         form.label || null,
        area:          form.area || null,
        photo_url:     urlData.publicUrl,
        storage_path:  path,
        gps_lat,
        gps_lng,
        taken_by:      null,
      });

      qc.invalidateQueries(['wo-photos', workOrderId]);
      setShowUploadForm(false);
      setForm({ type: 'progress', label: '', area: '' });
      toast.success('Photo saved');
    } catch (err) {
      toast.error('Upload failed: ' + (err.message || 'unknown error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowUploadForm(v => !v)}>
          <Camera className="w-3.5 h-3.5" />
          Add Photo
        </Button>
      </div>

      {showUploadForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-slate-700">New Photo</p>
            <button onClick={() => setShowUploadForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setForm(f => ({ ...f, type: key }))}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  form.type === key ? cfg.bg + ' ring-2 ring-offset-1 ring-primary' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Label / description"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Area (Kitchen, Bath…)"
              value={form.area}
              onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-semibold hover:border-primary/60 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Choose Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <Camera className="w-8 h-8 mb-3 opacity-40" />
          <p className="text-sm">No photos yet</p>
          <p className="text-xs mt-1 opacity-70">Add before, progress, after or issue photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => {
            const cfg = TYPE_CONFIG[photo.type] || TYPE_CONFIG.progress;
            return (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={photo.photo_url}
                  alt={photo.label || photo.type}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(photo.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-600 rounded-full p-1"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.label && <p className="text-white text-xs font-semibold truncate">{photo.label}</p>}
                  {photo.area  && <p className="text-white/70 text-[10px] truncate">{photo.area}</p>}
                  {photo.gps_lat && (
                    <p className="text-white/50 text-[10px] flex items-center gap-0.5 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {Number(photo.gps_lat).toFixed(4)}, {Number(photo.gps_lng).toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
