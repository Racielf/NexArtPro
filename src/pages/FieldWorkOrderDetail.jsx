import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Send,
  Signature,
} from 'lucide-react';

function getNowISO() {
  return new Date().toISOString();
}

function groupPhotos(list) {
  const photos = Array.isArray(list) ? list : [];
  return {
    before: photos.filter(p => p.phase === 'before'),
    during: photos.filter(p => p.phase === 'during'),
    after: photos.filter(p => p.phase === 'after'),
  };
}

export default function FieldWorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();
  const canvasRef = useRef();

  const [workOrder, setWorkOrder] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState('during');
  const [summary, setSummary] = useState('');
  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [wo, ph] = await Promise.all([
      base44.entities.WorkOrder.get(id),
      base44.entities.ProjectPhoto.filter({ work_order_id: id }),
    ]);
    setWorkOrder(wo);
    setPhotos(ph || []);
    setSummary(wo?.work_summary || '');
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleCheckIn = async () => {
    if (!workOrder || workOrder.checked_in_at) return;
    try {
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 7000 }));
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          console.warn('GPS failed', e);
        }
      }
      await base44.entities.WorkOrder.update(workOrder.id, {
        checked_in_at: getNowISO(),
        field_status: 'checked_in',
        check_in_location: location,
      });
      toast.success('Checked in');
      load();
    } catch (e) {
      toast.error('Check-in failed');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ProjectPhoto.create({
        work_order_id: workOrder.id,
        phase,
        photo_url: file_url,
        taken_by: 'Field',
      });
      toast.success('Photo uploaded');
      load();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleComplete = async () => {
    if (!workOrder || !signed) {
      toast.error('Signature required');
      return;
    }
    setSaving(true);
    try {
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 7000 }));
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {}
      }

      const signature = canvasRef.current?.toDataURL();

      await base44.entities.WorkOrder.update(workOrder.id, {
        status: 'completed',
        completed_at: getNowISO(),
        work_summary: summary,
        closure_signature: signature,
        closure_location: location,
      });

      toast.success('Work completed');
      navigate('/field');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const start = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setDrawing(true);
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
      setSigned(true);
    };

    const end = () => setDrawing(false);

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [drawing]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const grouped = groupPhotos(photos);

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/field')}><ArrowLeft /></button>
        <span className="font-bold">WO#{workOrder.work_order_number}</span>
        <span />
      </div>

      <div className="p-4 space-y-4 max-w-xl mx-auto">
        <div className="bg-white p-4 rounded-xl">
          <h2 className="font-bold text-lg">{workOrder.client_name}</h2>
          <p className="text-sm text-slate-500">{workOrder.title}</p>
          <div className="flex gap-2 mt-3">
            {workOrder.client_phone && (
              <a href={`tel:${workOrder.client_phone}`} className="p-3 bg-slate-100 rounded-lg"><Phone /></a>
            )}
            {workOrder.client_address && (
              <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(workOrder.client_address)}`)} className="p-3 bg-blue-100 rounded-lg"><Navigation /></button>
            )}
          </div>
        </div>

        <Button onClick={handleCheckIn} disabled={!!workOrder.checked_in_at}>
          {workOrder.checked_in_at ? 'Checked In' : 'Check In'}
        </Button>

        <div className="bg-white p-4 rounded-xl space-y-3">
          <div className="flex gap-2">
            {['before','during','after'].map(p => (
              <button key={p} onClick={() => setPhase(p)} className={`px-3 py-1 rounded ${phase===p?'bg-blue-600 text-white':'bg-slate-100'}`}>{p}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {photos.map(p => (
              <img key={p.id} src={p.photo_url} className="rounded-lg" />
            ))}

            <button onClick={()=>fileRef.current.click()} className="border-dashed border p-6 rounded-lg text-center">
              {uploading ? 'Uploading...' : 'Add Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>
        </div>

        <textarea
          value={summary}
          onChange={e=>setSummary(e.target.value)}
          placeholder="Work summary..."
          className="w-full p-3 rounded-xl border"
        />

        <div className="bg-white p-4 rounded-xl">
          <p className="text-xs font-bold">Signature</p>
          <canvas ref={canvasRef} width={300} height={120} className="border w-full" />
        </div>

        <Button onClick={handleComplete} disabled={saving} className="w-full bg-green-600">
          Complete Work
        </Button>
      </div>
    </div>
  );
}
