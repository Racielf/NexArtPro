import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

export default function PublicHeader() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img 
            src="https://media.nexartClient.com/images/public/69cc888bb34befdf803a06b0/93e30ea2b_LogomodernodeconstruccionRCART.png" 
            alt="R.C ART Construction" 
            className="h-11"
          />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          <Link 
            to="/" 
            className={`text-base font-bold transition ${
              isActive('/') 
                ? 'text-slate-100 border-b-2 border-cta-orange' 
                : 'text-slate-100 hover:text-cta-orange'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/services" 
            className={`text-sm font-medium transition ${
              isActive('/services') 
                ? 'text-slate-100 border-b-2 border-cta-orange' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Services
          </Link>
          <Link 
            to="/gallery" 
            className={`text-sm font-medium transition ${
              isActive('/gallery') 
                ? 'text-slate-100 border-b-2 border-cta-orange' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Gallery
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-medium transition ${
              isActive('/about') 
                ? 'text-slate-100 border-b-2 border-cta-orange' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            About
          </Link>
          <Link 
            to="/contact" 
            className={`text-sm font-medium transition ${
              isActive('/contact') 
                ? 'text-slate-100 border-b-2 border-cta-orange' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Contact
          </Link>
          <Link 
            to="/partners" 
            className={`text-sm font-medium transition ${
              isActive('/partners') 
                ? 'text-slate-100 border-b-2 border-cta-orange' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Partners
          </Link>

          {/* CTA Section */}
          <div className="flex items-center gap-3 ml-8">
            <Link 
              to="/team-access" 
              className="px-6 py-2 text-xs font-bold text-white bg-cta-orange hover:bg-orange-600 rounded-lg transition uppercase tracking-wider"
            >
              Team Access
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}