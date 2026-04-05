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
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'on_the_way', label: 'On The Way' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'visit_completed', label: 'Visit Completed' },
  { value: 'follow_up_needed', label: 'Follow-up Needed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const ARRIVAL_WINDOWS = ['8am – 10am', '10am – 12pm', '12pm – 2pm', '2pm – 4pm', '4pm – 6pm', 'Flexible'];

const emptyForm = {
  customer_id: '', customer_display_name: '', customer_phone: '', customer_email: '',
  service_address: '', title: '', service_type: '', appointment_date: '',
  start_time: '09:00', end_time: '', arrival_window: '', description: '',
  internal_notes: '', notes: '', assigned_worker_id: '', assigned_worker_name: '',
  status: 'new', notify_customer: true,
};

export default function ApptFormModal({ open, onOpenChange, editing, customers = [], workers = [], onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(editing ? { ...emptyForm, ...editing } : emptyForm);
  }, [editing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const displayName = customer.display_name || `${customer.first_name} ${customer.last_name}`;
      const address = [customer.service_address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ');
      setForm(f => ({
        ...f,
        customer_id: customer.id,
        customer_display_name: displayName,
        customer_phone: customer.phone || '',
        customer_email: customer.email || '',
        service_address: address,
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editing ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">

          {/* Customer Section */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Customer</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Select Customer</Label>
              <Select onValueChange={handleCustomerSelect} value={form.customer_id || ''}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => {
                    const name = c.display_name || `${c.first_name} ${c.last_name}`;
                    return (
                      <SelectItem key={c.id} value={c.id} className="text-sm">
                        {name}{c.phone ? ` · ${c.phone}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Name *</Label>
                <Input className="h-8 text-sm" value={form.customer_display_name} onChange={e => set('customer_display_name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="(555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" value={form.customer_email} onChange={e => set('customer_email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Service Address</Label>
                <Input className="h-8 text-sm" value={form.service_address} onChange={e => set('service_address', e.target.value)} placeholder="Street, City, State ZIP" />
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Appointment Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Title</Label>
                <Input className="h-8 text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Roof Inspection, Kitchen Estimate..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service Type</Label>
                <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input type="date" className="h-8 text-sm" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Arrival Window</Label>
                <Select value={form.arrival_window} onValueChange={v => set('arrival_window', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select window..." /></SelectTrigger>
                  <SelectContent>
                    {ARRIVAL_WINDOWS.map(w => <SelectItem key={w} value={w} className="text-sm">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" className="h-8 text-sm" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time</Label>
                <Input type="time" className="h-8 text-sm" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Assigned Worker</Label>
                <Select
                  value={form.assigned_worker_id || ''}
                  onValueChange={v => {
                    if (v === '__none__') {
                      set('assigned_worker_id', '');
                      set('assigned_worker_name', '');
                    } else {
                      const w = workers.find(w => w.id === v);
                      if (w) {
                        set('assigned_worker_id', w.id);
                        set('assigned_worker_name', w.full_name);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select a worker..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-sm text-slate-400">— No worker assigned —</SelectItem>
                    {workers.map(w => (
                      <SelectItem key={w.id} value={w.id} className="text-sm">
                        {w.full_name}{w.trade ? ` · ${w.trade}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Notes</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Description / Customer Notes</Label>
                <Textarea className="text-sm resize-none" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the work or scope..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Internal Notes</Label>
                <Textarea className="text-sm resize-none" value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} placeholder="Team only — not visible to customer..." rows={3} />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="notify" checked={!!form.notify_customer} onChange={e => set('notify_customer', e.target.checked)} className="rounded" />
            <label htmlFor="notify" className="text-sm text-slate-600 cursor-pointer select-none">
              Notify customer via email
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={() => onSave(form)}>
              {editing ? 'Save Changes' : 'Save Appointment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}