import React, { useState } from 'react';
import { MapPin, Mail, Phone, User, ChevronDown, ChevronUp } from 'lucide-react';

export default function EstimateClientSidebar({ estimate }) {
  const [mapView, setMapView] = useState('map');

  const address = estimate?.client_address || '';
  const encodedAddress = encodeURIComponent(address);
  const streetViewUrl = address
    ? `https://maps.googleapis.com/maps/api/streetview?size=300x160&location=${encodedAddress}&key=AIzaSyD-placeholder`
    : null;

  // Fallback image for street view
  const fallbackMapUrl = `https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=200&fit=crop`;

  return (
    <div className="flex flex-col h-full">
      {/* Property Image */}
      <div className="relative">
        <img
          src={fallbackMapUrl}
          alt="Property"
          className="w-full h-40 object-cover"
          onError={e => { e.target.src = fallbackMapUrl; }}
        />
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            onClick={() => setMapView('map')}
            className={`px-2 py-0.5 text-xs rounded ${mapView === 'map' ? 'bg-white text-slate-800 shadow' : 'bg-black/40 text-white'}`}
          >Map</button>
          <button
            onClick={() => setMapView('satellite')}
            className={`px-2 py-0.5 text-xs rounded ${mapView === 'satellite' ? 'bg-white text-slate-800 shadow' : 'bg-black/40 text-white'}`}
          >Satellite</button>
        </div>
      </div>

      {/* Property Stats */}
      <div className="grid grid-cols-3 border-b border-slate-200 text-center">
        <div className="py-2 border-r border-slate-200">
          <div className="text-xs text-slate-400">Est. Value</div>
          <div className="font-semibold text-slate-800 text-sm">
            {estimate?.client_id ? '$---' : '$—'}
          </div>
        </div>
        <div className="py-2 border-r border-slate-200">
          <div className="text-xs text-slate-400">Beds / Baths</div>
          <div className="font-semibold text-slate-800 text-sm">— / —</div>
        </div>
        <div className="py-2">
          <div className="text-xs text-slate-400">Sq Ft</div>
          <div className="font-semibold text-slate-800 text-sm">—</div>
        </div>
      </div>

      {/* Client Info */}
      <div className="p-4 space-y-3 flex-1">
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-slate-800 text-sm">{estimate?.client_name}</div>
          </div>
        </div>

        {estimate?.client_address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline leading-snug"
              >
                {estimate.client_address}
              </a>
            </div>
          </div>
        )}

        {estimate?.client_email && (
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <a href={`mailto:${estimate.client_email}`} className="text-sm text-primary hover:underline">
              {estimate.client_email}
            </a>
          </div>
        )}

        {estimate?.client_phone && (
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <a href={`tel:${estimate.client_phone}`} className="text-sm text-slate-700 hover:text-primary">
              {estimate.client_phone}
            </a>
          </div>
        )}
      </div>

      {/* Map embed */}
      {estimate?.client_address && (
        <div className="border-t border-slate-200">
          <iframe
            title="map"
            width="100%"
            height="160"
            frameBorder="0"
            style={{ border: 0 }}
            src={`https://www.google.com/maps?q=${encodedAddress}&output=embed`}
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}