import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

export default function PublicHeader() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-transparent sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img 
            src="https://media.base44.com/images/public/69cc888bb34befdf803a06b0/93e30ea2b_LogomodernodeconstruccionRCART.png" 
            alt="R.C ART Construction" 
            className="h-12"
          />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          <Link 
            to="/" 
            className={`text-sm font-medium transition ${
              isActive('/') 
                ? 'text-white border-b-2 border-white' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/services" 
            className={`text-sm font-medium transition ${
              isActive('/services') 
                ? 'text-white border-b-2 border-white' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Services
          </Link>
          <Link 
            to="/gallery" 
            className={`text-sm font-medium transition ${
              isActive('/gallery') 
                ? 'text-white border-b-2 border-white' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Gallery
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-medium transition ${
              isActive('/about') 
                ? 'text-white border-b-2 border-white' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            About
          </Link>
          <Link 
            to="/contact" 
            className={`text-sm font-medium transition ${
              isActive('/contact') 
                ? 'text-white border-b-2 border-white' 
                : 'text-slate-100 hover:text-white'
            }`}
          >
            Contact
          </Link>

          {/* CTA Section */}
          <div className="flex items-center gap-3 border-l border-white/20 pl-8">
            <Link 
              to="/login" 
              className="px-6 py-2.5 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition border border-white/40"
            >
              Team Access
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}