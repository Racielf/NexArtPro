import React from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-700">
          
          {/* Company */}
          <div>
            <h4 className="font-semibold mb-3">{appConfig.company.name}</h4>
            <p className="text-sm text-slate-300">
              Professional construction and remodeling services in {appConfig.company.city}, Oregon.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <nav className="space-y-2">
              <Link to="/" className="text-sm text-slate-300 hover:text-white transition block">Home</Link>
              <Link to="/services" className="text-sm text-slate-300 hover:text-white transition block">Services</Link>
              <Link to="/gallery" className="text-sm text-slate-300 hover:text-white transition block">Gallery</Link>
              <Link to="/about" className="text-sm text-slate-300 hover:text-white transition block">About</Link>
              <Link to="/contact" className="text-sm text-slate-300 hover:text-white transition block">Contact</Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-slate-300">
              <p>📍 {appConfig.company.city}, Oregon</p>
              <p>📧 {appConfig.company.email}</p>
              <p>📞 {appConfig.company.phone}</p>
              <div className="pt-3">
                <Link to="/login" className="text-xs text-slate-400 hover:text-slate-300 transition">Team Access →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 text-center text-sm text-slate-400">
          &copy; 2026 {appConfig.company.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}