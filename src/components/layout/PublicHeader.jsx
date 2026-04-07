import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

export default function PublicHeader() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none">
              <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900">{appConfig.company.name}</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          <Link 
            to="/" 
            className={`text-sm font-medium transition ${
              isActive('/') 
                ? 'text-slate-900 border-b-2 border-blue-600' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/services" 
            className={`text-sm font-medium transition ${
              isActive('/services') 
                ? 'text-slate-900 border-b-2 border-blue-600' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Services
          </Link>
          <Link 
            to="/gallery" 
            className={`text-sm font-medium transition ${
              isActive('/gallery') 
                ? 'text-slate-900 border-b-2 border-blue-600' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gallery
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-medium transition ${
              isActive('/about') 
                ? 'text-slate-900 border-b-2 border-blue-600' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            About
          </Link>
          <Link 
            to="/contact" 
            className={`text-sm font-medium transition ${
              isActive('/contact') 
                ? 'text-slate-900 border-b-2 border-blue-600' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contact
          </Link>

          {/* CTA Section */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
            <a 
              href="/#estimate-form" 
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition shadow-sm"
            >
              Get Estimate
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link 
              to="/login" 
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
            >
              Team Access
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}