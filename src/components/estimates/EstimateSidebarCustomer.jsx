/**
 * Inline customer panel in the estimate editor sidebar.
 * Always visible — shows filled data when available, inline edit form otherwise.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  MapPin, Mail, Phone, Bell, BellOff, Pencil, ChevronDown, ChevronUp,
  Search, UserPlus, Check, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import ClientFormModal from '@/components/proposals/ClientFormModal';

export default function EstimateSidebarCustomer({ estimate, onCustomerChange }) {
  const [editing, setEditing] = useState(!estimate?.client_name);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [linkedClient, setLinkedClient] = useState(null);
  const [form, setForm] = useState({
    client_name: estimate?.client_name || '',
    client_email: estimate?.client_email || '',
    client_phone: estimate?.client_phone || '',
    client_address: estimate?.client_address || '',
  });
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mapTab, setMapTab] = useState('map');
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    base44.entities.Client.list('-created_date', 50).then(setClients).catch(() => {});
  }, []);

  // Load linked Client entity when client_id changes
  useEffect(() => {
    if (estimate?.client_id) {
      base44.entities.Client.filter({ id: estimate.client_id }).then(res => {
        setLinkedClient(res[0] || null);
      }).catch(() => {});
    } else {
      setLinkedClient(null);
    }
  }, [estimate?.client_id]);

  // Sync if estimate changes externally
  useEffect(() => {
    setForm({
      client_name: estimate?.client_name || '',
      client_email: estimate?.client_email || '',
      client_phone: estimate?.client_phone || '',
      client_address: estimate?.client_address || '',
    });
    setEditing(!estimate?.client_name);
  }, [estimate?.id, estimate?.client_name]);

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
  const encodedAddress = encodeURIComponent(address);
  const mapSrc = mapTab === 'map'
    ? `https://www.google.com/maps?q=${encodedAddress}&output=embed`
    : `https://www.google.com/maps?q=${encodedAddress}&output=embed&t=k`;

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full text-sm bg-white overflow-y-auto min-h-0">

      {/* ── PANEL HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowSearch(v => !v); setEditing(false); }}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Search existing">
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setShowCustomerModal(true); setEditing(false); setShowSearch(false); }}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Edit contact">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── SEARCH EXISTING ──────────────────────────────────────────────── */}
      {showSearch && (
        <div className="px-3 py-3 border-b border-slate-100 bg-slate-50">
          <Input
            autoFocus
            placeholder="Search by name, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs mb-2 border-slate-200 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <div className="max-h-44 overflow-y-auto space-y-0.5">
            {filteredClients.length === 0 && (
              <p className="text-xs text-slate-400 py-3 text-center">No clients found</p>
            )}
            {filteredClients.map(c => (
              <button key={c.id} onClick={() => handleSelectClient(c)}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-xs">
                <span className="font-semibold text-slate-800 block">{c.full_name}</span>
                {c.phone && <span className="text-slate-400 text-[11px]">{c.phone}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── INLINE EDIT FORM ─────────────────────────────────────────────── */}
      {editing && (
        <div className="px-4 py-4 border-b border-slate-100 space-y-2.5 bg-slate-50/60">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name *</label>
            <Input placeholder="John Smith" value={form.client_name} onChange={e => set('client_name', e.target.value)}
              className="h-8 text-xs border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
            <Input placeholder="email@example.com" value={form.client_email} onChange={e => set('client_email', e.target.value)}
              className="h-8 text-xs border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</label>
            <Input placeholder="(555) 000-0000" value={form.client_phone} onChange={e => set('client_phone', e.target.value)}
              className="h-8 text-xs border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</label>
            <Input placeholder="123 Main St, City, ST" value={form.client_address} onChange={e => set('client_address', e.target.value)}
              className="h-8 text-xs border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={!form.client_name.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-slate-900 text-white hover:bg-black disabled:opacity-40 transition-colors">
              <Check className="w-3 h-3" /> Save Customer
            </button>
            {estimate?.client_name && (
              <button onClick={() => setEditing(false)}
                className="w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── FILLED CUSTOMER VIEW ─────────────────────────────────────────── */}
      {!editing && form.client_name && (
        <>
          {/* Hero image with name overlay */}
          <div className="relative flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=160&fit=crop&auto=format"
              alt="Property"
              className="w-full object-cover"
              style={{ height: 110 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
              <p className="text-white font-bold text-sm leading-tight truncate">{form.client_name}</p>
              <div className={`inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${form.client_email ? 'bg-emerald-500/80 text-white' : 'bg-white/20 text-white/70'}`}>
                {form.client_email ? <Bell className="w-2.5 h-2.5" /> : <BellOff className="w-2.5 h-2.5" />}
                {form.client_email ? 'Notifications on' : 'No email'}
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="px-4 py-3.5 space-y-2.5 border-b border-slate-100">
            {form.client_phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <a href={`tel:${form.client_phone}`} className="text-[13px] font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                  {form.client_phone}
                </a>
              </div>
            )}
            {form.client_email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <a href={`mailto:${form.client_email}`} className="text-[12px] text-slate-500 hover:text-blue-600 transition-colors truncate">
                  {form.client_email}
                </a>
              </div>
            )}
            {form.client_address && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`} target="_blank" rel="noreferrer"
                  className="text-[12px] text-slate-500 hover:text-blue-600 transition-colors leading-snug">
                  {form.client_address}
                </a>
              </div>
            )}
            {estimate?.client_id && (
              <Link to="/clients" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition-colors mt-1">
                View customer profile →
              </Link>
            )}
          </div>

          {/* Location / Map */}
          {address && (
            <div className="border-b border-slate-100">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</span>
                <button onClick={() => setMapExpanded(!mapExpanded)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                  {mapExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {mapExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
              <div className="relative overflow-hidden" style={{ height: mapExpanded ? 200 : 100 }}>
                <iframe title="map" width="100%" height="100%"
                  style={{ border: 0, display: 'block', height: mapExpanded ? 200 : 100 }}
                  src={mapSrc} allowFullScreen />
              </div>
              {estimate?.status === 'on_my_way' && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-800">
                    On the way{estimate?.miles_traveled > 0 ? ` · ${estimate.miles_traveled} mi` : ''}
                  </span>
                </div>
              )}
              {mapExpanded && (
                <div className="flex border-t border-slate-200 bg-slate-50">
                  {['map', 'hybrid'].map(t => (
                    <button key={t} onClick={() => setMapTab(t)}
                      className={`flex-1 py-1.5 text-[11px] font-semibold capitalize transition-colors ${mapTab === t ? 'text-slate-900 border-b-2 border-blue-500 bg-white' : 'text-slate-400 hover:text-slate-600'}`}>
                      {t === 'map' ? 'Map' : 'Satellite'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
      {!editing && !form.client_name && (
        <div className="flex flex-col items-center justify-center flex-1 px-5 py-10 text-center">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">No customer linked</p>
          <p className="text-xs text-slate-400 mb-3">Link a customer to this estimate</p>
          <button onClick={() => setEditing(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            + Add customer
          </button>
        </div>
      )}

      {/* ── EXTRA FIELDS (footer actions) ────────────────────────────────── */}
      {form.client_name && !editing && (
        <div className="border-t border-slate-100 divide-y divide-slate-100 mt-auto">
          {[
            { label: 'Tags', icon: '🏷️' },
            { label: 'Private notes', icon: '📋' },
            { label: 'Attachments', icon: '📎' },
          ].map(({ label, icon }) => (
            <button key={label} className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2.5">
                <span className="text-slate-300">{icon}</span>
                <span className="font-medium text-slate-600">{label}</span>
              </span>
              <span className="text-slate-300 text-sm leading-none">+</span>
            </button>
          ))}
        </div>
      )}

      {/* Customer edit modal — uses Client entity (same as proposals) */}
      <ClientFormModal
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        client={linkedClient || (form.client_name ? {
          id: estimate?.client_id || null,
          full_name: form.client_name,
          phone: form.client_phone,
          email: form.client_email,
          address: form.client_address?.split(',')[0]?.trim() || '',
          city: form.client_address?.split(',')[1]?.trim() || '',
          state: form.client_address?.split(',')[2]?.trim() || '',
        } : null)}
        onSaved={(saved) => {
          setLinkedClient(saved);
          const addr = [saved.address, saved.city, saved.state, saved.zip].filter(Boolean).join(', ');
          const updatedFields = {
            client_id: saved.id,
            client_name: saved.full_name || '',
            client_email: saved.email || '',
            client_phone: saved.phone || '',
            client_address: addr,
          };
          setForm(f => ({ ...f, ...updatedFields }));
          onCustomerChange(updatedFields, saved);
        }}
      />
    </div>
  );
}