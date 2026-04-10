import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Search, User, Phone, Mail, MapPin, Pencil,
  Calendar, FileText, Plus, Building2, Home, HardHat, ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerFormModal from '@/components/customers/CustomerFormModal';

const CUSTOMER_TYPES = [
  { value: 'residential', label: 'Residential', icon: Home, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'commercial', label: 'Commercial', icon: Building2, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'contractor', label: 'Contractor', icon: HardHat, color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await base44.entities.Customer.list('-created_date');
    setCustomers(data);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    await base44.entities.Customer.delete(id);
    toast.success('Customer deleted');
    loadCustomers();
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const idsArray = Array.from(selectedIds);
    await Promise.all(idsArray.map(id => base44.entities.Customer.delete(id)));
    setSelectedIds(new Set());
    toast.success(`${idsArray.length} customer(s) deleted`);
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

      {/* Filters & Select All */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600">Select all</span>
            </label>
          )}
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
          <div className="space-y-3">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <span className="text-sm font-semibold text-blue-900">{selectedIds.size} selected</span>
                <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1.5" onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} customer(s)?`)) handleDeleteSelected();
                }}>
                  Delete Selected
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {filtered.map(customer => {
                const typeConfig = getTypeConfig(customer.customer_type);
                const TypeIcon = typeConfig.icon;
                const displayName = customer.display_name || `${customer.first_name} ${customer.last_name}`;
                const fullAddress = [customer.service_address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ');
                return (
                  <div key={customer.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-4 hover:shadow-sm hover:border-slate-300 transition-all group">
                    {/* Checkbox */}
                    <label className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </label>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {(customer.first_name?.[0] || '?').toUpperCase()}{(customer.last_name?.[0] || '').toUpperCase()}
                      </span>
                    </div>

                    {/* Main info - clickable for Open */}
                    <div onClick={() => navigate(`/customer-profile?id=${customer.id}`)} className="flex-1 min-w-0 cursor-pointer">
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
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <CustomerFormModal
        open={showForm}
        onOpenChange={setShowForm}
        customer={editing}
        onSaved={loadCustomers}
      />
    </div>
  );
}