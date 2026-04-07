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
          <div className="w-10 h-10 bg-white/90 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none">
              <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 28V22H25V28" stroke="#1a56db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-white drop-shadow-md">{appConfig.company.name}</span>
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