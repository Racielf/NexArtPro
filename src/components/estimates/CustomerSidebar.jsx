import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  ChevronUp, 
  ChevronDown, 
  User, 
  Pencil, 
  MapPin, 
  Mail, 
  Phone,
  Bell, 
  ExternalLink
} from 'lucide-react';

export default function CustomerSidebar({ estimate, client, onEditCustomer }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mapTab, setMapTab] = useState('map');

  const resolvedCustomer = {
    name: client?.full_name || estimate?.client_name || '—',
    email: client?.email || estimate?.client_email || '',
    phone: client?.phone || estimate?.client_phone || '',
    address: client?.address || estimate?.client_address || '',
    city: client?.city || '',
    state: client?.state || '',
    zip: client?.zip || '',
    propertyValue: client?.property_value || null,
    beds: client?.beds || null,
    baths: client?.baths || null,
    sqft: client?.sqft || null,
    builtYear: client?.year_built || null,
  };

  const addressStr = resolvedCustomer.address || [resolvedCustomer.city, resolvedCustomer.state, resolvedCustomer.zip].filter(Boolean).join(', ');
  const encodedAddress = encodeURIComponent(addressStr);
  
  // Use Google street view if address is present, fallback to a beautiful house placeholder
  const streetViewUrl = addressStr
    ? `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${encodedAddress}&fov=90&pitch=10&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`
    : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=200&fit=crop';

  const mapSrc = mapTab === 'map'
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${encodedAddress}`
    : `https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${encodedAddress}&maptype=satellite`;


  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Customer Card */}
      <Card className="shadow-sm border border-border bg-white rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">Customer</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {isExpanded && (
            <div className="border-t border-border">
              {/* Property Image Card */}
              <div className="relative">
                <img 
                  src={streetViewUrl}
                  alt="Property"
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=200&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                
                {/* Property Stats Overlay */}
                <div className="absolute bottom-2 left-3 right-3 text-white">
                  <div className="flex items-start justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-white/80 font-medium leading-none">Estimate</span>
                      <span className="font-bold text-sm leading-tight mt-0.5">
                        {resolvedCustomer.propertyValue ? `$${resolvedCustomer.propertyValue.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      {resolvedCustomer.beds !== null && (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-xs leading-none">{resolvedCustomer.beds}</span>
                          <span className="text-[9px] text-white/80 font-medium leading-none mt-0.5">Beds</span>
                        </div>
                      )}
                      {resolvedCustomer.baths !== null && (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-xs leading-none">{resolvedCustomer.baths}</span>
                          <span className="text-[9px] text-white/80 font-medium leading-none mt-0.5">Baths</span>
                        </div>
                      )}
                      {resolvedCustomer.sqft !== null && (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-xs leading-none">{resolvedCustomer.sqft.toLocaleString()}</span>
                          <span className="text-[9px] text-white/80 font-medium leading-none mt-0.5">Sq.ft.</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {resolvedCustomer.builtYear && (
                    <div className="text-[9px] text-white/80 mt-1 font-medium leading-none">
                      Built in {resolvedCustomer.builtYear}
                    </div>
                  )}
                </div>
                
                {/* Google badge */}
                <div className="absolute bottom-2 right-2">
                  <span className="text-[9px] text-white/70">Google</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 space-y-4">
                {/* Name */}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground text-sm truncate">{resolvedCustomer.name}</p>
                  {estimate?.client_id && (
                    <Link to={`/clients?id=${estimate.client_id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs font-semibold px-2.5">
                        View details
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Address */}
                {addressStr && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-foreground leading-snug">{resolvedCustomer.address}</p>
                      {(resolvedCustomer.city || resolvedCustomer.state || resolvedCustomer.zip) && (
                        <p className="text-sm text-foreground leading-snug">
                          {[resolvedCustomer.city, [resolvedCustomer.state, resolvedCustomer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onEditCustomer && (
                        <button 
                          onClick={onEditCustomer}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          title="Edit address"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        title="Open in Maps"
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Email */}
                {resolvedCustomer.email && (
                  <div className="flex items-center justify-between gap-2">
                    <a href={`mailto:${resolvedCustomer.email}`} className="text-sm text-primary hover:underline truncate">
                      {resolvedCustomer.email}
                    </a>
                    <a href={`mailto:${resolvedCustomer.email}`} className="p-1.5 hover:bg-muted rounded-md transition-colors flex-shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                )}

                {/* Phone */}
                {resolvedCustomer.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <a href={`tel:${resolvedCustomer.phone}`} className="text-sm text-foreground hover:text-primary transition-colors font-medium">
                      {resolvedCustomer.phone}
                    </a>
                    <a href={`tel:${resolvedCustomer.phone}`} className="p-1.5 hover:bg-muted rounded-md transition-colors flex-shrink-0">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                )}

                {/* Notifications Badge */}
                <div className="flex">
                  <Badge variant="secondary" className={`text-[10px] font-medium leading-none px-2 py-1 flex items-center gap-1.5 ${
                    resolvedCustomer.email ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-105 text-slate-500 hover:bg-slate-105'
                  }`}>
                    <Bell className="w-3 h-3" />
                    {resolvedCustomer.email ? 'Notifications on' : 'Notifications off'}
                  </Badge>
                </div>

                {/* Customer Profile Link */}
                {estimate?.client_id && (
                  <Link 
                    to={`/clients?id=${estimate.client_id}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline font-semibold"
                  >
                    Customer profile
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Card */}
      {isExpanded && addressStr && (
        <Card className="shadow-sm border border-border bg-white rounded-xl overflow-hidden">
          <CardContent className="p-0">
            {/* Map Tabs */}
            <div className="flex items-center gap-4 p-2 bg-white border-b border-border">
              <button 
                onClick={() => setMapTab('map')}
                className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                  mapTab === 'map' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mapa
              </button>
              <button 
                onClick={() => setMapTab('hybrid')}
                className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                  mapTab === 'hybrid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Híbrido
              </button>
            </div>
            
            {/* Google Map iframe */}
            <div className="relative h-48 bg-muted">
              <iframe
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Customer Location"
              />
              
              {/* HCP Map Label */}
              <div className="absolute top-12 left-2 bg-white px-2 py-1 rounded shadow-sm border border-border">
                <span className="text-xs font-medium text-foreground">HCP Map</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}