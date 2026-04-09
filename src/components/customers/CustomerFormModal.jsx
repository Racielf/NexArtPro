import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Home, Building2, HardHat } from 'lucide-react';
import { toast } from 'sonner';

const CUSTOMER_TYPES = [
  { value: 'residential', label: 'Residential', icon: Home },
  { value: 'commercial',  label: 'Commercial',  icon: Building2 },
  { value: 'contractor',  label: 'Contractor',  icon: HardHat },
];

const emptyForm = {
  first_name: '', last_name: '', display_name: '', email: '', phone: '',
  customer_type: 'residential', company_name: '', service_address: '',
  city: '', state: '', zip: '', notes: '', internal_notes: '',
};

/**
 * CustomerFormModal — reusable create/edit modal for Customer records.
 *
 * Props:
 *   open         — boolean
 *   onOpenChange — (bool) => void
 *   customer     — existing customer object (edit mode) or null (create mode)
 *   onSaved      — (savedCustomer) => void — called after successful save
 */
export default function CustomerFormModal({ open, onOpenChange, customer = null, onSaved }) {
  const [form, setForm] = useState(() =>
    customer ? { ...emptyForm, ...customer } : emptyForm
  );
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens with a different customer
  React.useEffect(() => {
    if (open) {
      setForm(customer ? { ...emptyForm, ...customer } : emptyForm);
    }
  }, [open, customer?.id]);

  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === 'first_name' || k === 'last_name') {
        const fn = k === 'first_name' ? v : f.first_name;
        const ln = k === 'last_name' ? v : f.last_name;
        if (!f.display_name || f.display_name === `${f.first_name} ${f.last_name}`.trim()) {
          updated.display_name = `${fn} ${ln}`.trim();
        }
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.phone) {
      toast.error('First name, last name and phone are required');
      return;
    }
    if (!supabase) {
      toast.error('Database not configured');
      return;
    }
    setSaving(true);
    try {
      const data = {
        first_name: form.first_name,
        last_name: form.last_name,
        display_name: form.display_name || `${form.first_name} ${form.last_name}`,
        email: form.email || null,
        phone: form.phone,
        customer_type: form.customer_type,
        company_name: form.company_name || null,
        service_address: form.service_address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        notes: form.notes || null,
        internal_notes: form.internal_notes || null,
      };
      let saved;
      if (customer) {
        const { data: row, error } = await supabase
          .from('customers')
          .update(data)
          .eq('id', customer.id)
          .select()
          .single();
        if (error) throw error;
        saved = row;
        toast.success('Customer updated');
      } else {
        const { data: row, error } = await supabase
          .from('customers')
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        saved = row;
        toast.success('Customer created');
      }
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      console.error('[CustomerFormModal] Save failed:', err);
      toast.error(err?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'New Customer'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">

          {/* Type selector */}
          <div>
            <Label className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-2 block">Customer Type</Label>
            <div className="flex gap-2">
              {CUSTOMER_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('customer_type', t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.customer_type === t.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Personal Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name *</Label>
                <Input className="h-8 text-sm" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name *</Label>
                <Input className="h-8 text-sm" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name</Label>
                <Input className="h-8 text-sm" value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Auto-generated" />
              </div>
              {form.customer_type !== 'residential' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Name</Label>
                  <Input className="h-8 text-sm" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Acme Construction" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Phone *</Label>
                <Input className="h-8 text-sm" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(503) 555-0100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@email.com" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Service Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Street Address</Label>
                <Input className="h-8 text-sm" value={form.service_address} onChange={e => set('service_address', e.target.value)} placeholder="1440 SE 143rd Ave" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input className="h-8 text-sm" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Portland" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Input className="h-8 text-sm" value={form.state} onChange={e => set('state', e.target.value)} placeholder="OR" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ZIP</Label>
                  <Input className="h-8 text-sm" value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="97233" />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer Notes</Label>
              <Textarea className="text-sm resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Visible in customer profile..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea className="text-sm resize-none" value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} placeholder="Team only..." rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : customer ? 'Save Changes' : 'Create Customer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}