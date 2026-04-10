import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Bell, BellOff, Pencil, Search, UserPlus, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ProposalSidebarCustomer({ proposal, onCustomerChange }) {
  const [editing, setEditing] = useState(!proposal?.client_name);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [form, setForm] = useState({
    client_name: proposal?.client_name || '',
    client_email: proposal?.client_email || '',
    client_phone: proposal?.client_phone || '',
    client_address: proposal?.client_address || '',
  });

  useEffect(() => {
    base44.entities.Client.list('-created_date', 50).then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    setForm({
      client_name: proposal?.client_name || '',
      client_email: proposal?.client_email || '',
      client_phone: proposal?.client_phone || '',
      client_address: proposal?.client_address || '',
    });
    setEditing(!proposal?.client_name);
  }, [proposal?.id, proposal?.client_name]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.client_name.trim()) return;
    onCustomerChange(form, null);
    setEditing(false);
    setShowSearch(false);
  };

  const handleSelectClient = (client) => {
    const addr = [client.address, client.city, client.state, client.zip].filter(Boolean).join(', ');
    const data = {
      client_id: client.id,
      client_name: client.full_name,
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: addr,
    };
    setForm({ client_name: client.full_name, client_email: client.email || '', client_phone: client.phone || '', client_address: addr });
    onCustomerChange(data, client);
    setEditing(false);
    setShowSearch(false);
    setSearch('');
  };

  const address = form.client_address;
  const encodedAddress = encodeURIComponent(address || '');

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full text-sm bg-white overflow-y-auto min-h-0">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Customer</span>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowSearch(v => !v); setEditing(false); }}
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors" title="Search existing">
            <Search className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setEditing(v => !v); setShowSearch(false); }}
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors" title="Edit contact">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SEARCH */}
      {showSearch && (
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60">
          <Input autoFocus placeholder="Search by name, phone, email…" value={search}
            onChange={e => setSearch(e.target.value)} className="h-7 text-xs mb-2" />
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filteredClients.length === 0 && <p className="text-xs text-slate-400 py-2 text-center">No clients found</p>}
            {filteredClients.map(c => (
              <button key={c.id} onClick={() => handleSelectClient(c)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-primary/5 hover:text-primary transition-colors text-xs">
                <span className="font-semibold text-slate-800">{c.full_name}</span>
                {c.phone && <span className="text-slate-400 ml-2">{c.phone}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* EDIT FORM */}
      {editing && (
        <div className="px-3 py-3 border-b border-slate-100 space-y-2 bg-blue-50/30">
          <Input placeholder="Full name *" value={form.client_name} onChange={e => set('client_name', e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Phone" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Address" value={form.client_address} onChange={e => set('client_address', e.target.value)} className="h-7 text-xs" />
          <div className="flex gap-1.5 pt-1">
            <button onClick={handleSave} disabled={!form.client_name.trim()}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors">
              <Check className="w-3 h-3" />Save
            </button>
            {proposal?.client_name && (
              <button onClick={() => setEditing(false)}
                className="px-2 py-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-xs">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* FILLED VIEW */}
      {!editing && form.client_name && (
        <>
          <div className="relative flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=160&fit=crop&auto=format"
              alt="Property" className="w-full object-cover" style={{ height: 120 }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
              <p className="text-white font-bold text-sm leading-tight truncate">{form.client_name}</p>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2 border-b border-slate-100">
            {form.client_address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`} target="_blank" rel="noreferrer"
                  className="text-primary hover:underline text-xs leading-snug">{form.client_address}</a>
              </div>
            )}
            {form.client_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <a href={`mailto:${form.client_email}`} className="text-primary hover:underline text-xs truncate">{form.client_email}</a>
              </div>
            )}
            {form.client_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <a href={`tel:${form.client_phone}`} className="text-slate-700 hover:text-primary text-xs">{form.client_phone}</a>
              </div>
            )}
            <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${form.client_email ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {form.client_email ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              {form.client_email ? 'Notifications on' : 'No email'}
            </div>
            {proposal?.client_id && (
              <Link to="/clients" className="block text-xs text-primary hover:underline font-medium">View customer profile →</Link>
            )}
          </div>

          {address && (
            <div className="flex flex-col border-t border-slate-100">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-600">Location</span>
                <button onClick={() => setMapExpanded(v => !v)} className="text-xs text-primary hover:underline font-medium">
                  {mapExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
              <div style={{ minHeight: mapExpanded ? 200 : 100 }} className="bg-slate-100">
                <iframe title="map" width="100%" height="100%"
                  style={{ border: 0, display: 'block', minHeight: mapExpanded ? 200 : 100 }}
                  src={`https://www.google.com/maps?q=${encodedAddress}&output=embed`} allowFullScreen />
              </div>
            </div>
          )}
        </>
      )}

      {/* EMPTY STATE */}
      {!editing && !form.client_name && (
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-xs font-medium text-slate-500 mb-1">No customer yet</p>
          <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline font-medium">+ Add customer</button>
        </div>
      )}
    </div>
  );
}