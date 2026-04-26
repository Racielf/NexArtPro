import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { validateWorkOrderCompletion } from '@/lib/workOrderCompletionValidator';
import { ensureInvoiceFromWorkOrder } from '@/lib/workOrderInvoiceConversion';
import {
  ArrowLeft,
  Loader2,
  Navigation,
  Phone,
} from 'lucide-react';

function getNowISO() {
  return new Date().toISOString();
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
      await base44.entities.WorkOrder.update(workOrder.id, {
        checked_in_at: getNowISO(),
        field_status: 'checked_in',
      });
      toast.success('Checked in');
      load();
    } catch {
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
      });
      toast.success('Photo uploaded');
      load();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const validation = validateWorkOrderCompletion({
    workOrder,
    photos,
    summary,
    signed,
  });

  const handleComplete = async () => {
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    setSaving(true);
    try {
      const signature = canvasRef.current?.toDataURL();

      await base44.entities.WorkOrder.update(workOrder.id, {
        status: 'completed',
        completed_at: getNowISO(),
        work_summary: summary,
        closure_signature: signature,
      });

      const { invoice, created } = await ensureInvoiceFromWorkOrder({
        ...workOrder,
        work_summary: summary,
      });

      if (created) {
        toast.success(`Invoice #${invoice.invoice_number} created`);
      } else {
        toast.info(`Invoice #${invoice.invoice_number} already exists`);
      }

      navigate(`/invoice-detail?id=${invoice.id}`);
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

        <div className="bg-white p-4 rounded-xl">
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} />
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

        <Button
          onClick={handleComplete}
          disabled={!validation.valid || saving}
          className="w-full bg-green-600"
        >
          Complete Work
        </Button>
      </div>
    </div>
  );
}
