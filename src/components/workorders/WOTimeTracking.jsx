import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

function calcHours(arrival, departure) {
  if (!arrival || !departure) return null;
  const [ah, am] = arrival.split(':').map(Number);
  const [dh, dm] = departure.split(':').map(Number);
  const total = (dh * 60 + dm) - (ah * 60 + am);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export default function WOTimeTracking({ workOrderId, initialArrival, initialDeparture }) {
  const [arrival, setArrival] = useState(initialArrival || '');
  const [departure, setDeparture] = useState(initialDeparture || '');
  const [saving, setSaving] = useState(false);

  const totalHours = calcHours(arrival, departure);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.WorkOrder.update(workOrderId, {
      arrival_time: arrival,
      departure_time: departure,
    });
    setSaving(false);
    toast.success('Time saved');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-slate-900">Time Tracking</h2>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <div className="px-6 py-5">
        <div className="grid grid-cols-3 gap-4">
          {/* Arrival */}
          <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Arrival Time</p>
            <input
              type="time"
              value={arrival}
              onChange={e => setArrival(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {/* Departure */}
          <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Departure Time</p>
            <input
              type="time"
              value={departure}
              onChange={e => setDeparture(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {/* Total */}
          <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4 text-center flex flex-col items-center justify-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Total Hours</p>
            {totalHours
              ? <p className="text-xl font-bold text-primary">{totalHours}</p>
              : <p className="text-xl font-semibold text-slate-200">—</p>}
          </div>
        </div>
      </div>
    </div>
  );
}