import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Camera, Upload, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

const PHASES = [
  { id: 'before',  label: 'Before',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'during',  label: 'During',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'after',   label: 'After',   color: 'bg-green-100 text-green-700 border-green-200' },
];

export default function PhotoGallery({ workOrderId, appointmentId, customerId, customerName, workOrderNumber }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // phase being uploaded
  const [lightbox, setLightbox] = useState(null); // { photos, index }
  const fileRefs = { before: useRef(), during: useRef(), after: useRef() };

  useEffect(() => { loadPhotos(); }, [workOrderId, appointmentId]);

  const loadPhotos = async () => {
    setLoading(true);
    let filter = {};
    if (workOrderId) filter = { work_order_id: workOrderId };
    else if (appointmentId) filter = { appointment_id: appointmentId };
    else if (customerId) filter = { customer_id: customerId };
    const data = Object.keys(filter).length
      ? await base44.entities.ProjectPhoto.filter(filter, '-created_date')
      : [];
    setPhotos(data);
    setLoading(false);
  };

  const handleUpload = async (phase, files) => {
    if (!files?.length) return;
    setUploading(phase);
    const user = await base44.auth.me();
    for (const file of Array.from(files)) {
      // Resize before upload for speed
      const resized = await resizeImage(file, 1200);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: resized });
      await base44.entities.ProjectPhoto.create({
        photo_url: file_url,
        phase,
        work_order_id: workOrderId || '',
        appointment_id: appointmentId || '',
        customer_id: customerId || '',
        customer_name: customerName || '',
        work_order_number: workOrderNumber || null,
        taken_by: user?.full_name || user?.email || 'Unknown',
      });
    }
    toast.success(`${files.length} photo(s) uploaded`);
    setUploading(null);
    loadPhotos();
  };

  const handleDelete = async (photo) => {
    await base44.entities.ProjectPhoto.delete(photo.id);
    toast.success('Photo removed');
    loadPhotos();
  };

  const openLightbox = (phasePhotos, index) => setLightbox({ photos: phasePhotos, index });
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () => setLightbox(l => ({ ...l, index: (l.index - 1 + l.photos.length) % l.photos.length }));
  const nextPhoto = () => setLightbox(l => ({ ...l, index: (l.index + 1) % l.photos.length }));

  if (loading) return <div className="text-xs text-slate-400 py-4 text-center">Loading photos...</div>;

  return (
    <div className="space-y-6">
      {PHASES.map(phase => {
        const phasePhotos = photos.filter(p => p.phase === phase.id);
        return (
          <div key={phase.id}>
            {/* Phase header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${phase.color}`}>
                  {phase.label}
                </span>
                <span className="text-xs text-slate-400">{phasePhotos.length} photo{phasePhotos.length !== 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => fileRefs[phase.id].current?.click()}
                disabled={uploading === phase.id}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
              >
                {uploading === phase.id ? (
                  <><div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="w-3 h-3" />Add Photos</>
                )}
              </button>
              <input
                ref={fileRefs[phase.id]}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleUpload(phase.id, e.target.files)}
              />
            </div>

            {/* Photo grid */}
            {phasePhotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {phasePhotos.map((photo, idx) => (
                  <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || phase.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => openLightbox(phasePhotos, idx)}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
                      </button>
                      <button
                        onClick={() => handleDelete(photo)}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => fileRefs[phase.id].current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-primary hover:text-primary transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Click to add {phase.label.toLowerCase()} photos</span>
              </button>
            )}
          </div>
        );
      })}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 text-white hover:text-slate-300">
            <X className="w-6 h-6" />
          </button>
          <button onClick={e => { e.stopPropagation(); prevPhoto(); }}
            className="absolute left-4 p-2 text-white hover:text-slate-300">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img
            src={lightbox.photos[lightbox.index]?.photo_url}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button onClick={e => { e.stopPropagation(); nextPhoto(); }}
            className="absolute right-4 p-2 text-white hover:text-slate-300">
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-4 text-white text-sm">
            {lightbox.index + 1} / {lightbox.photos.length}
            {lightbox.photos[lightbox.index]?.caption && ` · ${lightbox.photos[lightbox.index].caption}`}
          </div>
        </div>
      )}
    </div>
  );
}

// Resize image to max width for faster upload
function resizeImage(file, maxWidth) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxWidth) { resolve(file); return; }
        const canvas = document.createElement('canvas');
        const ratio = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })), 'image/jpeg', 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}