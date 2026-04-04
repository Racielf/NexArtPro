import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search, User, Phone, Mail, MapPin, Pencil, Trash2,
  Calendar, FileText, Plus, Building2, Home, HardHat, ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const CUSTOMER_TYPES = [
  { value: 'residential', label: 'Residential', icon: Home, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'commercial', label: 'Commercial', icon: Building2, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'contractor', label: 'Contractor', icon: HardHat, color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

const emptyForm = {
  first_name: '', last_name: '', display_name: '', email: '', phone: '',
  customer_type: 'residential', company_name: '', service_address: '',
  city: '', state: '', zip: '', notes: '', internal_notes: '',
};

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await base44.entities.Customer.list('-created_date');
    setCustomers(data);
    setLoading(false);
  };

  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      // Auto-generate display_name from first/last
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

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...emptyForm, ...c }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.phone) {
      toast.error('First name, last name and phone are required');
      return;
    }
    const data = { ...form, display_name: form.display_name || `${form.first_name} ${form.last_name}` };
    if (editing) {
      await base44.entities.Customer.update(editing.id, data);
      toast.success('Customer updated');
    } else {
      await base44.entities.Customer.create(data);
      toast.success('Customer created');
    }
    setShowForm(false);
    loadCustomers();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    await base44.entities.Customer.delete(id);
    toast.success('Customer deleted');
    loadCustomers();
  };

  const filtered = customers.filter(c => {
    const name = c.display_name || `${c.first_name} ${c.last_name}`;
    const q = search.toLowerCase();
    const matchSearch = !q || name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q) || c.company_name?.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || c.customer_type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeConfig = (type) => CUSTOMER_TYPES.find(t => t.value === type) || CUSTOMER_TYPES[0];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customers</h1>
            <p className="text-xs text-slate-400 mt-0.5">{customers.length} total customers</p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />New Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 bg-white" />
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
          {[{ value: 'all', label: 'All' }, ...CUSTOMER_TYPES].map(t => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === t.value ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium mb-1">No customers found</p>
            <p className="text-sm text-slate-400 mb-4">Create your first customer to get started</p>
            <Button onClick={openCreate} size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />New Customer</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(customer => {
              const typeConfig = getTypeConfig(customer.customer_type);
              const TypeIcon = typeConfig.icon;
              const displayName = customer.display_name || `${customer.first_name} ${customer.last_name}`;
              const fullAddress = [customer.service_address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ');
              return (
                <div key={customer.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-4 hover:shadow-sm hover:border-slate-300 transition-all group">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(customer.first_name?.[0] || '?').toUpperCase()}{(customer.last_name?.[0] || '').toUpperCase()}
                    </span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{displayName}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${typeConfig.color}`}>
                        <TypeIcon className="w-2.5 h-2.5" />{typeConfig.label}
                      </span>
                      {customer.company_name && (
                        <span className="text-xs text-slate-400">{customer.company_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {customer.phone && (
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors">
                          <Phone className="w-3 h-3" />{customer.phone}
                        </a>
                      )}
                      {customer.email && (
                        <a href={`mailto:${customer.email}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors truncate max-w-48">
                          <Mail className="w-3 h-3 flex-shrink-0" />{customer.email}
                        </a>
                      )}
                      {fullAddress && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-60">
                          <MapPin className="w-3 h-3 flex-shrink-0" />{fullAddress}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to="/appointments" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors" title="View appointments">
                      <Calendar className="w-3.5 h-3.5" />
                    </Link>
                    <Link to="/estimates" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors" title="View estimates">
                      <FileText className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => openEdit(customer)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(customer.id)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Customer' : 'New Customer'}</DialogTitle>
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
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.customer_type === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />{t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
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
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleSave}>
                {editing ? 'Save Changes' : 'Create Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}