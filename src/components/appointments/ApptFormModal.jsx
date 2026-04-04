import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SERVICE_TYPES = [
  'Inspection', 'Estimate Visit', 'Repair', 'Installation',
  'Maintenance', 'Follow-up', 'Consultation', 'Emergency Call', 'Other'
];

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'follow_up_needed', label: 'Follow-up Needed' },
];

const emptyForm = {
  client_id: '', client_name: '', client_phone: '', client_email: '',
  client_address: '', title: '', service_type: '', scheduled_date: '',
  scheduled_time: '09:00', end_time: '', description: '', internal_notes: '',
  assigned_to: '', status: 'new', notify_customer: true, reminder_set: false,
};

export default function ApptFormModal({ open, onOpenChange, editing, clients, onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(editing ? { ...emptyForm, ...editing } : emptyForm);
  }, [editing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(f => ({
        ...f,
        client_id: client.id,
        client_name: client.full_name,
        client_phone: client.phone || '',
        client_email: client.email || '',
        client_address: [client.address, client.city, client.state, client.zip].filter(Boolean).join(', '),
      }));
    }
  };

  const handleSubmit = (openCustomer = false) => onSave(form, openCustomer);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editing ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Customer */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Customer</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Select Existing Customer</Label>
              <Select onValueChange={handleClientSelect} value={form.client_id || ''}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Search or choose customer..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">
                      {c.full_name} {c.phone ? `· ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Name *</Label>
                <Input className="h-8 text-sm" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="(555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Address</Label>
                <Input className="h-8 text-sm" value={form.client_address} onChange={e => set('client_address', e.target.value)} placeholder="Street, City, State ZIP" />
              </div>
            </div>
          </div>

          {/* Appointment details */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Appointment</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Title</Label>
                <Input className="h-8 text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Roof Inspection, Kitchen Estimate..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service Type</Label>
                <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input type="date" className="h-8 text-sm" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned To</Label>
                <Input className="h-8 text-sm" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Technician name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" className="h-8 text-sm" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time</Label>
                <Input type="time" className="h-8 text-sm" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Notes</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Description / Notes</Label>
              <Textarea className="text-sm resize-none" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the work or scope..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea className="text-sm resize-none" value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} placeholder="Team only — not visible to customer..." rows={2} />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.notify_customer} onChange={e => set('notify_customer', e.target.checked)} className="rounded" />
              Notify customer
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.reminder_set} onChange={e => set('reminder_set', e.target.checked)} className="rounded" />
              Set reminder
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSubmit(true)} className="text-xs">
                Save & Open Customer
              </Button>
              <Button size="sm" onClick={() => handleSubmit(false)} className="bg-primary hover:bg-primary/90 text-white text-xs">
                {editing ? 'Save Changes' : 'Save Appointment'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}