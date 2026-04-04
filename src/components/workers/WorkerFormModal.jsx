import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const TRADES = ['electrician', 'plumber', 'carpenter', 'painter', 'hvac', 'general', 'supervisor', 'other'];
const TRADE_LABELS = {
  electrician: '⚡ Electrician', plumber: '🔧 Plumber', carpenter: '🪚 Carpenter',
  painter: '🖌️ Painter', hvac: '❄️ HVAC', general: '🔨 General',
  supervisor: '👷 Supervisor', other: '🔩 Other',
};
const EMPTY = {
  full_name: '', worker_type: 'employee', trade: 'general', role: 'technician',
  active: true, phone: '', email: '', emergency_contact: '', emergency_phone: '',
  hire_date: '', license_number: '', license_expiry: '', insurance_expiry: '',
  hourly_rate: '', address: '', notes: ''
};

export default function WorkerFormModal({ open, onClose, worker, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(worker ? { ...EMPTY, ...worker } : EMPTY);
  }, [worker, open]);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    const payload = { ...form, hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null };
    if (worker) {
      await base44.entities.Worker.update(worker.id, payload);
      toast.success('Worker updated');
    } else {
      await base44.entities.Worker.create(payload);
      toast.success('Worker added');
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{worker ? 'Edit Worker' : 'New Worker'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">

          {/* Basic Info */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name *</label>
            <Input value={form.full_name} onChange={e => f('full_name', e.target.value)} placeholder="e.g. Carlos Mendez" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Type</label>
              <select value={form.worker_type} onChange={e => f('worker_type', e.target.value)}
                className="w-full h-9 text-sm border border-slate-200 rounded-md px-2 focus:outline-none focus:border-primary capitalize">
                <option value="employee">Employee</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Trade</label>
              <select value={form.trade} onChange={e => f('trade', e.target.value)}
                className="w-full h-9 text-sm border border-slate-200 rounded-md px-2 focus:outline-none focus:border-primary">
                {TRADES.map(t => <option key={t} value={t}>{TRADE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Role</label>
              <select value={form.role} onChange={e => f('role', e.target.value)}
                className="w-full h-9 text-sm border border-slate-200 rounded-md px-2 focus:outline-none focus:border-primary capitalize">
                {['technician', 'lead', 'supervisor', 'subcontractor'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Phone</label>
              <Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="(503) 555-0100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Email</label>
              <Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="worker@email.com" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Address</label>
            <Input value={form.address} onChange={e => f('address', e.target.value)} placeholder="123 Main St, Portland, OR" />
          </div>

          {/* HR / Compliance */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">HR & Compliance</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Hire Date</label>
                <Input type="date" value={form.hire_date} onChange={e => f('hire_date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Hourly Rate ($)</label>
                <Input type="number" value={form.hourly_rate} onChange={e => f('hourly_rate', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">License #</label>
                <Input value={form.license_number} onChange={e => f('license_number', e.target.value)} placeholder="LIC-12345" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">License Expiry</label>
                <Input type="date" value={form.license_expiry} onChange={e => f('license_expiry', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Insurance Expiry</label>
                <Input type="date" value={form.insurance_expiry} onChange={e => f('insurance_expiry', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Name</label>
                <Input value={form.emergency_contact} onChange={e => f('emergency_contact', e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Phone</label>
                <Input value={form.emergency_phone} onChange={e => f('emergency_phone', e.target.value)} placeholder="(503) 555-0199" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-700">Active — available for job assignments</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : worker ? 'Save Changes' : 'Add Worker'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}