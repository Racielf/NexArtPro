import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

/**
 * ClientFormModal — create or edit a base44 Client record.
 * Props:
 *   open         — boolean
 *   onOpenChange — (bool) => void
 *   client       — existing client object (edit mode) or null (create)
 *   onSaved      — (savedClient) => void
 */
export default function ClientFormModal({ open, onOpenChange, client = null, onSaved }) {
  const empty = { full_name: '', phone: '', email: '', address: '', city: '', state: '', zip: '', notes: '' };
  const [form, setForm] = useState(() => client ? { ...empty, ...client } : empty);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [mode, setMode] = useState('form'); // 'select' | 'form'
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    if (open) {
      setForm(client ? { ...empty, ...client } : empty);
      setMode(client ? 'form' : 'select');
      setSearchTerm('');
      base44.entities.Client.list('-created_date', 100).then(setClients).catch(() => {});
    }
  }, [open, client?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSelectExisting = (selectedClient) => {
    setForm({ ...empty, ...selectedClient });
    setMode('form');
  };

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error('Full name and phone are required');
      return;
    }
    setSaving(true);
    const data = {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || '',
      address: form.address || '',
      city: form.city || '',
      state: form.state || '',
      zip: form.zip || '',
      notes: form.notes || '',
    };
    let saved;
    if (client?.id) {
      saved = await base44.entities.Client.update(client.id, data);
      toast.success('Customer updated');
    } else {
      saved = await base44.entities.Client.create(data);
      toast.success('Customer created');
    }
    onOpenChange(false);
    onSaved?.({ ...data, id: saved?.id || client?.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Customer' : 'New Customer'}</DialogTitle>
        </DialogHeader>
        
        {mode === 'select' && !client && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-600">Select an existing customer or create a new one:</p>
            <Input
              autoFocus
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
              {filteredClients.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No customers found</p>
              ) : (
                filteredClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectExisting(c)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-primary/10 transition-colors border border-slate-100 hover:border-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{c.full_name}</p>
                        {c.phone && <p className="text-[10px] text-slate-500">{c.phone}</p>}
                      </div>
                      <span className="text-[10px] text-primary font-medium">→</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => { setMode('form'); setSearchTerm(''); }}
              className="w-full text-xs text-primary hover:underline font-medium py-2"
            >
              + Create new customer
            </button>
          </div>
        )}
        
        {mode === 'form' && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input className="h-8 text-sm" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone *</Label>
              <Input className="h-8 text-sm" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(503) 555-0100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input className="h-8 text-sm" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@email.com" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Street Address</Label>
              <Input className="h-8 text-sm" value={form.address} onChange={e => set('address', e.target.value)} placeholder="1440 SE 143rd Ave" />
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
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input className="h-8 text-sm" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {!client && (
              <Button variant="outline" size="sm" onClick={() => { setMode('select'); setSearchTerm(''); }}>Back</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : client ? 'Save Changes' : 'Create Customer'}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}