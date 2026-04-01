import React, { useState } from 'react';
import { MapPin, Mail, Phone, User, Bell, BellOff, Tag, FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EstimateClientSidebar({ estimate, client }) {
  const [mapMode, setMapMode] = useState('map');

  const address = estimate?.client_address || client?.address || '';
  const encodedAddress = encodeURIComponent(address);

  // Street view image (Google Maps static)
  const streetViewUrl = address
    ? `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${encodedAddress}&fov=90&heading=235&pitch=10`
    : null;

  const fallbackImg = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=200&fit=crop&auto=format';

  const beds = client?.beds || '—';
  const baths = client?.baths || '—';
  const sqft = client?.sqft ? client.sqft.toLocaleString() : '—';
  const propValue = client?.property_value ? `$${client.property_value.toLocaleString()}` : '—';
  const notificationsOn = !!(estimate?.client_email || client?.email);

  return (
    <div className="flex flex-col h-full text-sm">

      {/* SECTION HEADER */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <User className="w-3.5 h-3.5" />
          Customer
        </div>
        {estimate?.client_id && (
          <Link to={`/clients`} className="text-xs text-primary hover:underline flex items-center gap-1">
            View details <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* PROPERTY IMAGE */}
      <div className="relative flex-shrink-0">
        <img
          src={fallbackImg}
          alt="Property"
          className="w-full h-36 object-cover"
        />
        <div className="absolute bottom-2 right-2 flex gap-1 bg-black/40 rounded overflow-hidden text-xs">
          <button
            onClick={() => setMapMode('map')}
            className={`px-2 py-0.5 ${mapMode === 'map' ? 'bg-white text-slate-800' : 'text-white'}`}
          >Map</button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-2 py-0.5 ${mapMode === 'satellite' ? 'bg-white text-slate-800' : 'text-white'}`}
          >Hybrid</button>
        </div>
      </div>

      {/* PROPERTY STATS */}
      <div className="grid grid-cols-3 border-b border-slate-200 text-center text-xs flex-shrink-0">
        <div className="py-2 px-1 border-r border-slate-200">
          <div className="text-slate-400 mb-0.5">Est. Value</div>
          <div className="font-semibold text-slate-800">{propValue}</div>
        </div>
        <div className="py-2 px-1 border-r border-slate-200">
          <div className="text-slate-400 mb-0.5">Bed/Bath</div>
          <div className="font-semibold text-slate-800">{beds}/{baths}</div>
        </div>
        <div className="py-2 px-1">
          <div className="text-slate-400 mb-0.5">Sq Ft</div>
          <div className="font-semibold text-slate-800">{sqft}</div>
        </div>
      </div>

      {/* CLIENT DETAILS */}
      <div className="p-3 space-y-2.5 flex-1">
        {/* Name */}
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span className="font-semibold text-slate-800">{estimate?.client_name || client?.full_name}</span>
        </div>

        {/* Address with map link */}
        {address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline leading-snug text-xs"
              >
                {address}
              </a>
            </div>
            <div className="flex gap-1 ml-1 flex-shrink-0">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`} target="_blank" rel="noreferrer"
                className="p-1 text-slate-400 hover:text-primary rounded hover:bg-slate-100" title="Open in Maps">
                <MapPin className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Phone */}
        {(estimate?.client_phone || client?.phone) && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <a href={`tel:${estimate?.client_phone || client?.phone}`} className="text-slate-700 hover:text-primary text-xs">
              {estimate?.client_phone || client?.phone}
            </a>
          </div>
        )}

        {/* Email */}
        {(estimate?.client_email || client?.email) && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <a href={`mailto:${estimate?.client_email || client?.email}`} className="text-primary hover:underline text-xs truncate">
              {estimate?.client_email || client?.email}
            </a>
          </div>
        )}

        {/* Notifications badge */}
        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md ${notificationsOn ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'}`}>
          {notificationsOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          {notificationsOn ? 'Notifications on' : 'No email — notifications off'}
        </div>

        {/* Notes */}
        {(estimate?.notes || client?.notes) && (
          <div className="pt-1 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-1 font-medium">Notes</div>
            <p className="text-xs text-slate-600 leading-relaxed">{estimate?.notes || client?.notes}</p>
          </div>
        )}
      </div>

      {/* MAP EMBED */}
      {address && (
        <div className="border-t border-slate-200 flex-shrink-0">
          <iframe
            title="location-map"
            width="100%"
            height="150"
            frameBorder="0"
            style={{ border: 0, display: 'block' }}
            src={`https://www.google.com/maps?q=${encodedAddress}&output=embed`}
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}