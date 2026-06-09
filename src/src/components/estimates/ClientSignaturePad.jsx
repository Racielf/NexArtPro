import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, PenLine } from 'lucide-react';

/**
 * ClientSignaturePad — canvas-based signature capture.
 * Returns base64 PNG via onSign(base64).
 */
export default function ClientSignaturePad({ onSign, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    setDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  };

  const stopDraw = (e) => {
    e?.preventDefault();
    setDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const handleSign = () => {
    if (!hasStrokes) return;
    if (!signerName.trim()) { alert('Please enter your full name'); return; }
    const canvas = canvasRef.current;
    const base64 = canvas.toDataURL('image/png');
    onSign({ base64, signerName: signerName.trim(), signerEmail: signerEmail.trim() });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-slate-900">Sign Estimate</h3>
          </div>
          <p className="text-xs text-slate-500">Draw your signature in the box below to authorize this estimate.</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Signer info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name *</label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Your full name"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Email</label>
              <input
                type="email"
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="relative">
            <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Signature</p>
            <canvas
              ref={canvasRef}
              width={480}
              height={160}
              className="w-full border-2 border-slate-200 rounded-xl cursor-crosshair bg-white touch-none"
              style={{ borderStyle: hasStrokes ? 'solid' : 'dashed' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {!hasStrokes && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-slate-300 text-sm font-medium">Sign here</span>
              </div>
            )}
            <button
              onClick={clearCanvas}
              className="absolute top-7 right-2 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              title="Clear signature"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            By signing, you agree that this constitutes a legally binding electronic signature and you authorize the work described in this estimate.
          </p>
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            disabled={!hasStrokes || !signerName.trim()}
            onClick={handleSign}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            <PenLine className="w-3.5 h-3.5" />
            Confirm Signature
          </Button>
        </div>
      </div>
    </div>
  );
}