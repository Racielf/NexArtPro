import React, { useState } from 'react';
import { MapPin, Mail, Phone, Bell, BellOff, ExternalLink, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EstimateClientSidebar({ estimate, client, onEditCustomer }) {
  const [mapTab, setMapTab] = useState('map');

  const address = estimate?.client_address || client?.address || '';
  const encodedAddress = encodeURIComponent(address);
  const name = estimate?.client_name || client?.full_name || '';
  const email = estimate?.client_email || client?.email || '';
  const phone = estimate?.client_phone || client?.phone || '';
  const notificationsOn = !!email;

  const beds = client?.beds ?? '—';
  const baths = client?.baths ?? '—';
  const sqft = client?.sqft ? client.sqft.toLocaleString() : '—';
  const propValue = client?.property_value ? `$${client.property_value.toLocaleString()}` : '—';

  // Use a real street view image via Google (fallback to unsplash house)
  const streetViewUrl = address
    ? `https://maps.googleapis.com/maps/api/streetview?size=280x160&location=${encodedAddress}&fov=90&pitch=10&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`
    : 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=200&fit=crop&auto=format';

  // Fallback if street view fails
  const fallbackImg = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=200&fit=crop&auto=format';

  const mapSrc = mapTab === 'map'
    ? `https://www.google.com/maps?q=${encodedAddress}&output=embed`
    : `https://www.google.com/maps?q=${encodedAddress}&output=embed&t=k`;

  return (
    <div className="flex flex-col h-full text-sm bg-white">

      {/* CUSTOMER HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Customer</span>
        </div>
        <div className="flex items-center gap-1">
          {onEditCustomer && (
            <button
              type="button"
              onClick={onEditCustomer}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition-colors"
              title="Edit customer info"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* PROPERTY IMAGE WITH STATS OVERLAY */}
      <div className="relative flex-shrink-0">
        <img
          src={streetViewUrl}
          alt="Property"
          className="w-full object-cover"
          style={{ height: 140 }}
          onError={e => { e.target.src = fallbackImg; }}
        />
        {/* Stats overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
          <div className="flex items-end gap-3 text-white text-xs">
            <div>
              <div className="text-white/70 text-[10px]">Est. Value</div>
              <div className="font-bold text-sm">{propValue}</div>
            </div>
            {beds !== '—' && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">{beds}</span>
                <span className="text-white/70">beds</span>
              </div>
            )}
            {baths !== '—' && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">{baths}</span>
                <span className="text-white/70">baths</span>
              </div>
            )}
            {sqft !== '—' && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">{sqft}</span>
                <span className="text-white/70">sq ft</span>
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <button className="p-1.5 bg-black/30 hover:bg-black/50 rounded text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* CLIENT DETAILS */}
      <div className="px-4 py-4 space-y-3 border-b border-slate-100">
        {/* Name */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">{name}</p>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {estimate?.client_id && (
              <Link to="/clients" className="text-xs text-primary hover:underline font-medium border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                View details
              </Link>
            )}
          </div>
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2">
            <div className="flex gap-1 flex-shrink-0 mt-0.5">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`} target="_blank" rel="noreferrer"
                className="text-slate-400 hover:text-primary p-0.5 rounded hover:bg-slate-100 transition-colors" title="Directions">
                <Pencil className="w-3 h-3" />
              </a>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`} target="_blank" rel="noreferrer"
                className="text-slate-400 hover:text-primary p-0.5 rounded hover:bg-slate-100 transition-colors" title="Open in Maps">
                <MapPin className="w-3 h-3" />
              </a>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
              target="_blank" rel="noreferrer"
              className="text-primary hover:underline text-xs leading-snug flex-1"
            >
              {address}
            </a>
          </div>
        )}

        {/* Email */}
        {email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <a href={`mailto:${email}`} className="text-primary hover:underline text-xs truncate">{email}</a>
          </div>
        )}

        {/* Phone */}
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <a href={`tel:${phone}`} className="text-slate-700 hover:text-primary text-xs">{phone}</a>
          </div>
        )}

        {/* Notifications badge */}
        <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${notificationsOn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {notificationsOn ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
          {notificationsOn ? 'Notifications on' : 'Notifications off'}
        </div>

        {/* Customer profile link */}
        {estimate?.client_id && (
          <Link to="/clients" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
            Customer profile <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* MAP SECTION */}
      {address && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Map / Hybrid tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setMapTab('map')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${mapTab === 'map' ? 'text-slate-900 border-b-2 border-primary bg-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mapa
            </button>
            <button
              onClick={() => setMapTab('hybrid')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${mapTab === 'hybrid' ? 'text-slate-900 border-b-2 border-primary bg-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Híbrido
            </button>
          </div>
          <div className="relative flex-1 min-h-[160px]">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-700 shadow-sm border border-slate-200">
              HCP Map
            </div>
            <iframe
              title="hcp-map"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block', minHeight: 160 }}
              src={mapSrc}
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* EXTRA SECTIONS */}
      <div className="border-t border-slate-200 divide-y divide-slate-100">
        {[
          { label: 'Fields', icon: '⚙️' },
          { label: 'Estimate tags', icon: '🏷️' },
          { label: 'Private notes', icon: '📋' },
          { label: 'Attachments', icon: '📎' },
        ].map(({ label, icon }) => (
          <button key={label} className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
            </div>
            <span className="text-slate-300 text-base leading-none">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}