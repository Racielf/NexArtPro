import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { validateWorkOrderCompletion } from '@/lib/workOrderCompletionValidator';
import { ensureInvoiceFromWorkOrder } from '@/lib/workOrderInvoiceConversion';
import { getInvoicePaymentState, recordInvoicePayment } from '@/lib/invoicePaymentRecorder';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
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
  const [invoice, setInvoice] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [phase, setPhase] = useState('during');
  const [summary, setSummary] = useState('');
  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [wo, ph, invList] = await Promise.all([
      base44.entities.WorkOrder.get(id),
      base44.entities.ProjectPhoto.filter({ work_order_id: id }),
      base44.entities.Invoice.filter({ work_order_id: id }),
    ]);
    setWorkOrder(wo);
    setPhotos(ph || []);
    setInvoice(invList?.[0] || null);
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

      const { invoice: nextInvoice, created } = await ensureInvoiceFromWorkOrder({
        ...workOrder,
        work_summary: summary,
      });

      setInvoice(nextInvoice);
      setPaymentAmount(String((getInvoicePaymentState(nextInvoice).balance_due || 0).toFixed(2)));

      if (created) {
        toast.success(`Invoice #${nextInvoice.invoice_number} created`);
      } else {
        toast.info(`Invoice #${nextInvoice.invoice_number} already exists`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!invoice) {
      toast.error('Complete the work order first to create an invoice.');
      return;
    }

    setCollecting(true);
    try {
      const { invoice: updatedInvoice } = await recordInvoicePayment(invoice, {
        amount: paymentAmount,
        method: paymentMethod,
        note: paymentNote || 'Collected in field',
      }, 'Field Agent');

      setInvoice(updatedInvoice);
      setPaymentAmount('');
      setPaymentNote('');
      toast.success('Payment collected');
    } catch (err) {
      toast.error(err?.message || 'Payment failed');
    } finally {
      setCollecting(false);
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

  const paymentState = invoice ? getInvoicePaymentState(invoice) : null;
  const isWorkClosed = ['completed', 'invoiced'].includes(workOrder?.status) || !!invoice;

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

        <Button onClick={handleCheckIn} disabled={!!workOrder.checked_in_at || isWorkClosed}>
          {workOrder.checked_in_at ? 'Checked In' : 'Check In'}
        </Button>

        {!isWorkClosed && (
          <>
            <div className="bg-white p-4 rounded-xl space-y-3">
              <div className="flex gap-2">
                {['before', 'during', 'after'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPhase(p)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold ${phase === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
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
              {saving ? 'Completing...' : 'Complete Work & Create Invoice'}
            </Button>
          </>
        )}

        {invoice && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Invoice #{invoice.invoice_number}</p>
                <h3 className="text-xl font-black text-slate-900">${(invoice.total || 0).toFixed(2)}</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-black uppercase ${paymentState?.isPaid ? 'bg-green-100 text-green-700' : paymentState?.isPartial ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                {paymentState?.payment_status || 'unpaid'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                <p className="text-[10px] font-black uppercase text-green-700">Paid</p>
                <p className="font-black text-green-700">${(paymentState?.amount_paid || 0).toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] font-black uppercase text-amber-700">Balance</p>
                <p className="font-black text-amber-700">${(paymentState?.balance_due || 0).toFixed(2)}</p>
              </div>
            </div>

            {!paymentState?.isPaid && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 font-black text-slate-800">
                  <DollarSign className="w-4 h-4 text-green-600" /> Collect Payment
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentState?.balance_due || 0}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="Amount"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="check">Check</option>
                    <option value="zelle">Zelle</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <input
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="Payment note / reference optional"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
                />
                <Button onClick={handleCollectPayment} disabled={collecting} className="w-full bg-green-600 hover:bg-green-700 gap-2">
                  <CreditCard className="w-4 h-4" />
                  {collecting ? 'Recording...' : 'Record Field Payment'}
                </Button>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate(`/invoice-detail?id=${invoice.id}`)}>
              Open Invoice
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
