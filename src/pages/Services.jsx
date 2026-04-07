import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { SERVICES_LIST } from '@/lib/services';

export default function Services() {
  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none">
                <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <Link to="/" className="text-lg font-bold text-slate-900">{appConfig.company.name}</Link>
          </div>
          <nav className="flex items-center gap-8">
            <Link to="/services" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition">Services</Link>
            <Link to="/gallery" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Gallery</Link>
            <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">About</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Contact</Link>
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition">Team Access</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-white py-20 px-6 border-b border-slate-200">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">Our Services</h1>
          <p className="text-xl text-slate-600">Professional construction and remodeling services tailored to your needs</p>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES_LIST.map((svc) => (
              <div key={svc.id} className="group overflow-hidden rounded-xl border border-slate-200 hover:shadow-lg transition flex flex-col">
                <div className="relative h-56 overflow-hidden bg-slate-200">
                  <img
                    src={svc.image}
                    alt={svc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-semibold text-slate-900 mb-3 text-lg">{svc.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">{svc.description}</p>
                  <Link
                    to={`/estimate?service=${svc.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition self-start"
                  >
                    Get Estimate
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-slate-600 mb-12">
            Get a free, no-obligation estimate for your project today.
          </p>
          <a href="/#estimate-form" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
            Get a Free Estimate
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-700">
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-slate-300">
                <p>📍 {appConfig.company.city}</p>
                <p>📧 {appConfig.company.email}</p>
                <p>📞 {appConfig.company.phone}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <div className="space-y-2">
                <Link to="/services" className="text-sm text-slate-300 hover:text-white transition block">Services</Link>
                <Link to="/gallery" className="text-sm text-slate-300 hover:text-white transition block">Gallery</Link>
                <Link to="/about" className="text-sm text-slate-300 hover:text-white transition block">About</Link>
                <Link to="/contact" className="text-sm text-slate-300 hover:text-white transition block">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <div className="text-sm text-slate-300 space-y-1">
                <p>Painting</p>
                <p>Kitchen & Bath</p>
                <p>Flooring & Drywall</p>
              </div>
            </div>
          </div>
          <div className="pt-8 text-center text-sm text-slate-400">
            &copy; 2026 {appConfig.company.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}