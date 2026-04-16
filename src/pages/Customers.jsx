import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Search, User, Phone, Mail, MapPin, Pencil,
  Plus, Building2, Home, HardHat
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

      {/* ── Header — firma visual consistente con Leads ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">CRM</p>
            <h1 className="text-[18px] font-bold text-slate-900 leading-tight tracking-tight">Customers</h1>
            <p className="text-xs text-slate-400 mt-0.5">{customers.length} total customers</p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />New Customer
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          {/* Type filter pills */}
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
            {[{ value: 'all', label: 'All' }, ...CUSTOMER_TYPES].map(t => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === t.value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Selection bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm font-semibold text-red-700">{selectedIds.size} selected</span>
              <Button size="sm" variant="destructive" className="gap-1.5 h-7 text-xs"
                onClick={() => { if (confirm(`Delete ${selectedIds.size} customer(s)?`)) handleDeleteSelected(); }}>
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-20 text-center">
            <User className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm mb-1">No customers found</p>
            <p className="text-xs text-slate-400 mb-4">Create your first customer to get started</p>
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />New Customer
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid items-center gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50/80"
              style={{ gridTemplateColumns: '20px 40px 1fr 120px 28px' }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
              />
              <div />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type</span>
              <div />
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {filtered.map(customer => {
                const typeConfig = getTypeConfig(customer.customer_type);
                const TypeIcon = typeConfig.icon;
                const displayName = customer.display_name || `${customer.first_name} ${customer.last_name}`;
                const fullAddress = [customer.service_address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ');
                const initials = `${customer.first_name?.[0] || '?'}${customer.last_name?.[0] || ''}`.toUpperCase();
                const isSelected = selectedIds.has(customer.id);
                return (
                  <div
                    key={customer.id}
                    className="grid items-center gap-4 px-4 py-3.5 transition-colors duration-100 group cursor-pointer"
                    style={{
                      gridTemplateColumns: '20px 40px 1fr 120px 28px',
                      background: isSelected ? '#eff6ff' : undefined,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
                    onClick={() => navigate(`/customer-profile?id=${customer.id}`)}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(customer.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                    />

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[12px] font-bold text-slate-500">{initials}</span>
                    </div>

                    {/* Main info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-[13px]">{displayName}</span>
                        {customer.company_name && (
                          <span className="text-[11px] text-slate-400">{customer.company_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-[12px] text-slate-500">
                            <Phone className="w-3 h-3 text-slate-300 flex-shrink-0" />{customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 text-[12px] text-slate-400 truncate max-w-52">
                            <Mail className="w-3 h-3 text-slate-300 flex-shrink-0" />{customer.email}
                          </span>
                        )}
                        {fullAddress && (
                          <span className="flex items-center gap-1 text-[12px] text-slate-400 truncate max-w-64">
                            <MapPin className="w-3 h-3 text-slate-300 flex-shrink-0" />{fullAddress}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Type badge */}
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${typeConfig.color}`}>
                        <TypeIcon className="w-2.5 h-2.5" />{typeConfig.label}
                      </span>
                    </div>

                    {/* Actions — reveal on hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(customer)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[11px] text-slate-400">{filtered.length} customer{filtered.length !== 1 ? 's' : ''} shown</p>
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