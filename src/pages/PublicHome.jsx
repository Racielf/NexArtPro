import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Home, Paintbrush, Wrench, Wind, Layers } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

const services = [
  { icon: Paintbrush, name: 'Painting', description: 'Interior and exterior painting services' },
  { icon: Wrench, name: 'Kitchen Remodeling', description: 'Complete kitchen redesigns and upgrades' },
  { icon: Home, name: 'Bathroom Remodeling', description: 'Modern bathroom renovations' },
  { icon: Wind, name: 'Drywall', description: 'Professional drywall installation and repair' },
  { icon: Layers, name: 'Flooring', description: 'Quality flooring solutions' },
];

export default function PublicHome() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    service: '',
    details: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Form structure ready for backend integration
    console.log('Form submitted:', formData);
    // TODO: Connect to backend API
  };

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
            <span className="text-lg font-bold text-slate-900">{appConfig.company.name}</span>
          </div>
          <Link to="/login" className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition">
            Team Access
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Professional Construction & Remodeling Services
          </h1>
          <p className="text-xl text-slate-300 mb-10 leading-relaxed">
            Expert craftsmanship. On-time delivery. Quality you can trust. Get your free estimate today.
          </p>
          <a href="#estimate-form" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
            Get a Free Estimate
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Our Services</h2>
            <p className="text-lg text-slate-600">From painting to complete remodels, we handle it all with professional expertise</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {services.map((svc, i) => {
              const Icon = svc.icon;
              return (
                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg transition text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{svc.name}</h3>
                  <p className="text-sm text-slate-600">{svc.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LEAD FORM SECTION */}
      <section id="estimate-form" className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-3">Get Your Free Estimate</h2>
            <p className="text-lg text-slate-600">Fill out the form below and we'll contact you within 24 hours</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-slate-50 p-8 rounded-xl border border-slate-200">
            {/* Name & Phone - Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Email & Address - Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>

            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Service Needed *</label>
              <select
                name="service"
                value={formData.service}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select a service...</option>
                {services.map((svc) => (
                  <option key={svc.name} value={svc.name}>{svc.name}</option>
                ))}
              </select>
            </div>

            {/* Project Details */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Project Details</label>
              <textarea
                name="details"
                value={formData.details}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Tell us about your project..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              Get Your Free Estimate
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-xs text-slate-500 text-center">
              We'll contact you within 24 hours to discuss your project
            </p>
          </form>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Space?</h2>
          <p className="text-lg text-slate-300 mb-8">
            Join hundreds of satisfied customers who've trusted us with their renovation projects
          </p>
          <a href="#estimate-form" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
            Get a Free Estimate Now
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div>&copy; 2026 {appConfig.company.name}. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <span>📍 {appConfig.company.city}</span>
            <span>📧 {appConfig.company.email}</span>
            <span>📞 {appConfig.company.phone}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}