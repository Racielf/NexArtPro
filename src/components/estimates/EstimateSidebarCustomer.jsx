/**
 * EstimateSidebarCustomer — Premium customer card for the Estimate Editor sidebar.
 * Uses client prop (loaded entity) with fallback to estimate fields for display.
 * All handlers, DB writes, and data flow are unchanged.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  MapPin, Mail, Phone, Bell, BellOff, Pencil, ChevronDown, ChevronUp,
  Search, UserPlus, Check, X, ExternalLink, User
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import ClientFormModal from '@/components/proposals/ClientFormModal';
import EstimateAttachments from '@/components/estimates/EstimateAttachments';
import CommTimeline from '@/components/shared/CommTimeline';


export default function EstimateSidebarCustomer({ estimate, client: clientProp, onCustomerChange, onAttachmentsUpdate }) {
  const [editing, setEditing] = useState(!estimate?.client_name);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [linkedClient, setLinkedClient] = useState(clientProp || null);
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

  // Sync linkedClient when parent loads the client entity
  useEffect(() => {
    if (clientProp) setLinkedClient(clientProp);
  }, [clientProp]);

  // Load linked Client entity when client_id changes
  useEffect(() => {
    if (estimate?.client_id) {
      base44.entities.Client.filter({ id: estimate.client_id }).then(res => {
        if (res[0]) setLinkedClient(res[0]);
      }).catch(() => {});
    } else {
      setLinkedClient(null);
    }
  }, [estimate?.client_id]);

  // Sync form when estimate changes externally
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

  // ── Resolve display values: client entity takes priority over estimate fields ──
  const displayName    = linkedClient?.full_name   || form.client_name;
  const displayEmail   = linkedClient?.email       || form.client_email;
  const displayPhone   = linkedClient?.phone       || form.client_phone;
  const displayAddress = (() => {
    if (linkedClient) {
      return [
        linkedClient.address,
        [linkedClient.city, linkedClient.state, linkedClient.zip].filter(Boolean).join(' '),
      ].filter(Boolean).join(', ');
    }
    return form.client_address || '';
  })();

  const hasDisplay = !!(estimate?.client_id || estimate?.client_name || displayName);

  const encodedAddress = encodeURIComponent(displayAddress);
  const mapSrc = mapTab === 'map'
    ? `https://www.google.com/maps?q=${encodedAddress}&output=embed`
    : `https://www.google.com/maps?q=${encodedAddress}&output=embed&t=k`;

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto min-h-0">

      {/* ── PANEL HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center">
            <User className="w-3 h-3 text-slate-400" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setShowSearch(v => !v); setEditing(false); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Search existing clients"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setShowCustomerModal(true); setEditing(false); setShowSearch(false); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Edit contact"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── SEARCH EXISTING ──────────────────────────────────────────────── */}
      {showSearch && (
        <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
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
              <button key={c.id} type="button" onClick={() => handleSelectClient(c)}
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
        <div className="px-4 py-4 border-b border-slate-100 space-y-2.5 bg-slate-50/60 flex-shrink-0">
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
            <button type="button" onClick={handleSave} disabled={!form.client_name.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-slate-900 text-white hover:bg-black disabled:opacity-40 transition-colors">
              <Check className="w-3 h-3" /> Save Customer
            </button>
            {estimate?.client_name && (
              <button type="button" onClick={() => setEditing(false)}
                className="w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── FILLED CUSTOMER CARD ─────────────────────────────────────────── */}
      {!editing && hasDisplay && (
        <>
          {/* ── HERO BLOCK ─────────────────────────────────────────────── */}
          <div className="relative flex-shrink-0 overflow-hidden" style={{ height: 116 }}>
            {displayAddress ? (
              <img
                src={`https://maps.googleapis.com/maps/api/streetview?size=480x240&location=${encodedAddress}&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`}
                alt="Property"
                className="w-full h-full object-cover"
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=480&h=240&fit=crop&auto=format&q=80'; }}
              />
            ) : (
              <img
                src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=480&h=240&fit=crop&auto=format&q=80"
                alt="Property"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
              <p className="text-white font-bold text-[15px] leading-tight truncate drop-shadow">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                  displayEmail ? 'bg-emerald-500/85 text-white' : 'bg-white/15 text-white/60'
                }`}>
                  {displayEmail
                    ? <><Bell className="w-2.5 h-2.5" /> Notifications on</>
                    : <><BellOff className="w-2.5 h-2.5" /> No email</>
                  }
                </span>
              </div>
            </div>
          </div>

          {/* ── IDENTITY + CONTACT BLOCK ──────────────────────────────── */}
          <div className="px-4 pt-4 pb-3 space-y-3 flex-shrink-0">
            {/* Avatar row + profile link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-[11px] font-bold text-white tracking-wide">{initials}</span>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900 leading-tight">{displayName}</p>
                  {(estimate?.client_id || linkedClient?.id) && (
                    <Link
                      to="/clients"
                      className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 font-semibold transition-colors leading-none mt-0.5"
                    >
                      Customer profile <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Contact rows */}
            <div className="space-y-2">
              {displayPhone && (
                <a href={`tel:${displayPhone}`} className="flex items-center gap-3 group">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                    {displayPhone}
                  </span>
                </a>
              )}
              {displayEmail && (
                <a href={`mailto:${displayEmail}`} className="flex items-center gap-3 group">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="text-[12px] text-slate-500 group-hover:text-blue-600 transition-colors truncate">
                    {displayEmail}
                  </span>
                </a>
              )}
              {displayAddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="text-[12px] text-slate-500 group-hover:text-blue-600 transition-colors leading-snug">
                    {displayAddress}
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* ── QUICK ACTIONS ROW ─────────────────────────────────────── */}
          <div className="px-4 pb-4 flex-shrink-0">
            <div className="grid grid-cols-3 gap-2">
              {displayPhone && (
                <a href={`tel:${displayPhone}`}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                  <Phone className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-[9px] font-semibold text-slate-400 group-hover:text-blue-600 uppercase tracking-wide">Call</span>
                </a>
              )}
              {displayEmail && (
                <a href={`mailto:${displayEmail}`}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                  <Mail className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-[9px] font-semibold text-slate-400 group-hover:text-blue-600 uppercase tracking-wide">Email</span>
                </a>
              )}
              {displayAddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
                  target="_blank" rel="noreferrer"
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                  <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-[9px] font-semibold text-slate-400 group-hover:text-blue-600 uppercase tracking-wide">Directions</span>
                </a>
              )}
            </div>
          </div>

          {/* ── MAP SECTION — always rendered when address exists ─────── */}
          {displayAddress && (
            <div className="flex-shrink-0 border-t border-slate-100">
              {/* Map header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Location</span>
                <div className="flex items-center gap-2">
                  {mapExpanded && (
                    <div className="flex rounded-md overflow-hidden border border-slate-200 bg-white">
                      {['map', 'hybrid'].map(t => (
                            <button key={t} type="button" onClick={() => setMapTab(t)}
                              className={`px-2 py-1 text-[10px] font-semibold capitalize transition-colors ${
                                mapTab === t ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                              }`}>
                              {t === 'map' ? 'Map' : 'Sat'}
                            </button>
                          ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setMapExpanded(!mapExpanded)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {mapExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Map iframe — always visible at default height */}
              <div className="relative overflow-hidden" style={{ height: mapExpanded ? 200 : 130 }}>
                <iframe
                  key={`${displayAddress}-${mapTab}`}
                  title="map"
                  width="100%"
                  height={mapExpanded ? 200 : 130}
                  style={{ border: 0, display: 'block' }}
                  src={mapSrc}
                  allowFullScreen
                  loading="lazy"
                />
                {!mapExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                )}
              </div>

              {/* OMW status bar */}
              {estimate?.status === 'on_my_way' && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-800">
                    On the way{estimate?.miles_traveled > 0 ? ` · ${estimate.miles_traveled} mi` : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── ATTACHMENTS ───────────────────────────────────────────── */}
          {estimate?.id && (
            <div className="px-4 pt-1 pb-4 border-t border-slate-100 flex-shrink-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Attachments</p>
              <EstimateAttachments
                attachments={estimate.attachments}
                onUpdate={async (newAttachments) => {
                  if (onAttachmentsUpdate) onAttachmentsUpdate(newAttachments);
                }}
              />
            </div>
          )}

          {/* ── COMMUNICATIONS ────────────────────────────────────────── */}
          {estimate?.id && (
            <div className="px-4 pt-1 pb-5 border-t border-slate-100 flex-shrink-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Communications</p>
              <CommTimeline estimateId={estimate.id} />
            </div>
          )}
        </>
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
      {!editing && !hasDisplay && (
        <div className="flex flex-col items-center justify-center flex-1 px-5 py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">No customer linked</p>
          <p className="text-xs text-slate-400 mb-3">Link a customer to this estimate</p>
          <button type="button" onClick={() => setEditing(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            + Add customer
          </button>
        </div>
      )}

      {/* ── CLIENT FORM MODAL ────────────────────────────────────────────── */}
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