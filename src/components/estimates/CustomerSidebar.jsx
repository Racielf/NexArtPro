import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronUp, 
  ChevronDown, 
  User, 
  Pencil, 
  MapPin, 
  Mail, 
  Bell, 
  ExternalLink,
  BedDouble,
  Bath,
  Ruler
} from 'lucide-react';

export default function CustomerSidebar({ customer, isExpanded, onToggle }) {
  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Customer Card */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-0">
          {/* Header */}
          <button 
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Customer</span>
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
                  src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=200&fit=crop"
                  alt="Property"
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Property Stats Overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Estimate</span>
                    <span className="font-bold text-sm">${customer.propertyValue?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <BedDouble className="w-3 h-3" />
                      <span>{customer.beds}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-3 h-3" />
                      <span>{customer.baths}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      <span>{customer.sqft?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Google badge */}
                <div className="absolute bottom-2 right-2">
                  <span className="text-[10px] text-white/70">Google</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 space-y-4">
                {/* Name */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{customer.name}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    View details
                  </Button>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{customer.address}</p>
                    <p className="text-sm text-foreground">{customer.city}, {customer.state} {customer.zip}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between">
                  <a href={`mailto:${customer.email}`} className="text-sm text-primary hover:underline">
                    {customer.email}
                  </a>
                  <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Notifications Badge */}
                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                  <Bell className="w-3 h-3 mr-1" />
                  Notifications on
                </Badge>

                {/* Customer Profile Link */}
                <a 
                  href="#" 
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Customer profile
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Card */}
      {isExpanded && (
        <Card className="shadow-sm border border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Map Tabs */}
            <div className="flex items-center gap-4 p-2 bg-white border-b border-border">
              <button className="text-xs font-medium text-foreground px-2 py-1 bg-muted rounded">
                Mapa
              </button>
              <button className="text-xs font-medium text-muted-foreground px-2 py-1 hover:text-foreground">
                Híbrido
              </button>
            </div>
            
            {/* Map Placeholder */}
            <div className="relative h-48 bg-muted">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2795.2!2d-122.6784!3d45.5152!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDXCsDMwJzU0LjciTiAxMjLCsDQwJzQyLjIiVw!5e0!3m2!1sen!2sus!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Customer Location"
              />
              
              {/* HCP Map Label */}
              <div className="absolute top-12 left-2 bg-white px-2 py-1 rounded shadow-sm">
                <span className="text-xs font-medium text-foreground">HCP Map</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}