import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Plus, User, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { filterActiveRecords } from '@/lib/softDelete';

export default function NewProposalCustomerModal({ open, onOpenChange, onCustomerSelected }) {
  const [tab, setTab] = useState('select'); // 'select' | 'create'
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', address: '', city: '', state: '', zip: '' });

  useEffect(() => {
    if (open) {
      setTab('select');
      setSearch('');
      setForm({ full_name: '', phone: '', email: '', address: '', city: '', state: '', zip: '' });
      setLoading(true);
      base44.entities.Customer.list('-created_date', 100)
        .then(data => setClients(filterActiveRecords(data)))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const name = c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ');
    return (
      name.toLowerCase().includes(q) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const handleSelectClient = (customer) => {
    // Normalize Customer entity fields to the shape callers expect
    const normalized = {
      ...customer,
      full_name: customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(' '),
    };
    onCustomerSelected(normalized);
    onOpenChange(false);
  };

  const handleCreateClient = async () => {
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }
    setSaving(true);
    const nameParts = form.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const created = await base44.entities.Customer.create({
      first_name: firstName,
      last_name: lastName,
      display_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      service_address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
    });
    setSaving(false);
    toast.success('Customer created');
    onCustomerSelected({ ...created, full_name: created.display_name || form.full_name.trim() });
    onOpenChange(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Select Customer</DialogTitle>
              <DialogDescription className="mt-1">Choose an existing customer or create a new one for this proposal.</DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mt-1 -mr-7 w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5">
          <button
            onClick={() => setTab('select')}
            className={`flex-1 text-sm font-semibold py-2.5 border-b-2 transition-colors ${
              tab === 'select'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Existing Customer
          </button>
          <button
            onClick={() => setTab('create')}
            className={`flex-1 text-sm font-semibold py-2.5 border-b-2 transition-colors ${
              tab === 'create'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            New Customer
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'select' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  autoFocus
                  placeholder="Search by name, phone, or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading customers...</p>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 mb-3">
                    {clients.length === 0 ? 'No customers yet.' : 'No matches found.'}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setTab('create')} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Create New Customer
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
                  {filtered.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ')}</p>
                          <div className="flex gap-3 text-[11px] text-slate-500">
                            {c.phone && <span>{c.phone}</span>}
                            {c.email && <span className="truncate">{c.email}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'create' && (
            <div className="space-y-3">
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
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={handleCreateClient} disabled={saving}>
                  <Plus className="w-3.5 h-3.5" />
                  {saving ? 'Creating...' : 'Create & Continue'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}