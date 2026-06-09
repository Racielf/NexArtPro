import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

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
      <PublicHeader />

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

      <PublicFooter />
    </div>
  );
}