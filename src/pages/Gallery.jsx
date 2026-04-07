import React from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

const projects = [
  {
    title: 'Master Bathroom Renovation',
    category: 'Bathroom',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop',
  },
  {
    title: 'Modern Kitchen Redesign',
    category: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
  },
  {
    title: 'Interior Wall Painting',
    category: 'Painting',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=600&h=400&fit=crop',
  },
  {
    title: 'Hardwood Flooring Installation',
    category: 'Flooring',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
  },
  {
    title: 'Professional Drywall Work',
    category: 'Drywall',
    image: 'https://images.unsplash.com/photo-1565084888279-d2b6ba0c0109?w=600&h=400&fit=crop',
  },
  {
    title: 'Spa-Like Bathroom',
    category: 'Bathroom',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop',
  },
  {
    title: 'Custom Kitchen Cabinets',
    category: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
  },
  {
    title: 'Exterior Painting',
    category: 'Painting',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=600&h=400&fit=crop',
  },
  {
    title: 'Tile Flooring',
    category: 'Flooring',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
  },
];

export default function Gallery() {
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
            <Link to="/services" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Services</Link>
            <Link to="/gallery" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition">Gallery</Link>
            <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">About</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Contact</Link>
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition">Team Access</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-white py-20 px-6 border-b border-slate-200">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">Project Gallery</h1>
          <p className="text-xl text-slate-600">Beautiful transformations. Quality workmanship. Real results.</p>
        </div>
      </section>

      {/* GALLERY GRID */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, i) => (
              <div key={i} className="group overflow-hidden rounded-xl border border-slate-200 hover:shadow-lg transition">
                <div className="relative h-64 overflow-hidden bg-slate-200">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-6 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{project.title}</h3>
                    <span className="text-xs font-medium px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                      {project.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">Professional installation and finishing</p>
                </div>
              </div>
            ))}
          </div>
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