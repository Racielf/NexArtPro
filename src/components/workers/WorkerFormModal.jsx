import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { nexartClient } from '@/api/nexartClient';
import { toast } from 'sonner';

const TRADES = ['electrician', 'plumber', 'carpenter', 'painter', 'hvac', 'general', 'supervisor', 'other'];
const TRADE_LABELS = {
  electrician: '⚡ Electrician', plumber: '🔧 Plumber', carpenter: '🪚 Carpenter',
  painter: '🖌️ Painter', hvac: '❄️ HVAC', general: '🔨 General',
  supervisor: '👷 Supervisor', other: '🔩 Other',
};

const EMPTY = {
  full_name: '', first_name: '', last_name: '',
  worker_type: 'employee', trade: 'general', role: 'technician',
  active: true,
  phone: '', alternate_phone: '', email: '',
  company_name: '',
  address: '', city: '', state: '', zip: '',
  emergency_contact: '', emergency_phone: '',
  hire_date: '', start_date: '', end_date: '',
  license_number: '', license_expiry: '', insurance_expiry: '',
  hourly_rate: '',
  notes: '', internal_notes: '',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="text-xs font-bold text-slate-400 uppercase tracking-wide pt-3 border-t border-slate-100">{children}</p>;
}

export default function WorkerFormModal({ open, onClose, worker, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(worker ? { ...EMPTY, ...worker } : EMPTY);
  }, [worker, open]);

  const f = (k, v) => setForm(p => {
    const next = { ...p, [k]: v };
    // Auto-sync full_name from first+last
    if (k === 'first_name' || k === 'last_name') {
      const fn = k === 'first_name' ? v : p.first_name;
      const ln = k === 'last_name' ? v : p.last_name;
      next.full_name = `${fn} ${ln}`.trim();
    }
    return next;
  });

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    const payload = { ...form, hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null };
    if (worker) {
      await nexartClient.entities.Worker.update(worker.id, payload);
      toast.success('Worker updated');
    } else {
      await nexartClient.entities.Worker.create(payload);
      toast.success('Worker added');
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const sel = (key, options) => (
    <select value={form[key]} onChange={e => f(key, e.target.value)}
      className="w-full h-9 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-primary capitalize">
      {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
    </select>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{worker ? 'Edit Worker' : 'New Worker'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">

          {/* Status */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} className="rounded w-4 h-4 accent-primary" />
              <span className="text-sm font-medium text-slate-700">Active — available for assignments</span>
            </label>
            <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-full ${form.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {form.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Identity */}
          <SectionTitle>Personal Info</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name">
              <Input value={form.first_name} onChange={e => f('first_name', e.target.value)} placeholder="Carlos" />
            </Field>
            <Field label="Last Name">
              <Input value={form.last_name} onChange={e => f('last_name', e.target.value)} placeholder="Mendez" />
            </Field>
            <Field label="Full Name *">
              <Input value={form.full_name} onChange={e => f('full_name', e.target.value)} placeholder="Auto-generated or override" />
            </Field>
            <Field label="Company Name">
              <Input value={form.company_name} onChange={e => f('company_name', e.target.value)} placeholder="(for subcontractors)" />
            </Field>
          </div>

          {/* Role/Type/Trade */}
          <SectionTitle>Work Classification</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Worker Type">
              {sel('worker_type', [['employee','Employee'],['subcontractor','Subcontractor'],['agent','Agent']])}
            </Field>
            <Field label="Trade">
              {sel('trade', TRADES.map(t => [t, TRADE_LABELS[t]]))}
            </Field>
            <Field label="Role">
              {sel('role', [['technician','Technician'],['lead','Lead'],['supervisor','Supervisor'],['subcontractor','Subcontractor']])}
            </Field>
          </div>

          {/* Contact */}
          <SectionTitle>Contact</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="(503) 555-0100" />
            </Field>
            <Field label="Alternate Phone">
              <Input value={form.alternate_phone} onChange={e => f('alternate_phone', e.target.value)} placeholder="(503) 555-0199" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="worker@email.com" />
            </Field>
          </div>

          {/* Address */}
          <SectionTitle>Address</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Street Address">
              <Input value={form.address} onChange={e => f('address', e.target.value)} placeholder="123 Main St" className="col-span-2" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={e => f('city', e.target.value)} placeholder="Portland" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="State">
                <Input value={form.state} onChange={e => f('state', e.target.value)} placeholder="OR" />
              </Field>
              <Field label="ZIP">
                <Input value={form.zip} onChange={e => f('zip', e.target.value)} placeholder="97201" />
              </Field>
            </div>
          </div>

          {/* HR */}
          <SectionTitle>HR & Compliance</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Start Date">
              <Input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} />
            </Field>
            <Field label="Hire Date">
              <Input type="date" value={form.hire_date} onChange={e => f('hire_date', e.target.value)} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} />
            </Field>
            <Field label="Hourly Rate ($)">
              <Input type="number" value={form.hourly_rate} onChange={e => f('hourly_rate', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="License #">
              <Input value={form.license_number} onChange={e => f('license_number', e.target.value)} placeholder="LIC-12345" />
            </Field>
            <Field label="License Expiry">
              <Input type="date" value={form.license_expiry} onChange={e => f('license_expiry', e.target.value)} />
            </Field>
            <Field label="Insurance Expiry">
              <Input type="date" value={form.insurance_expiry} onChange={e => f('insurance_expiry', e.target.value)} />
            </Field>
          </div>

          {/* Emergency Contact */}
          <SectionTitle>Emergency Contact</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={form.emergency_contact} onChange={e => f('emergency_contact', e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Phone">
              <Input value={form.emergency_phone} onChange={e => f('emergency_phone', e.target.value)} placeholder="(503) 555-0199" />
            </Field>
          </div>

          {/* Notes */}
          <SectionTitle>Notes</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Notes (visible to team)">
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3} className="resize-none text-sm" placeholder="General notes..." />
            </Field>
            <Field label="Internal Notes (admin only)">
              <Textarea value={form.internal_notes} onChange={e => f('internal_notes', e.target.value)} rows={3} className="resize-none text-sm" placeholder="Internal admin notes..." />
            </Field>
          </div>

        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : worker ? 'Save Changes' : 'Add Worker'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}