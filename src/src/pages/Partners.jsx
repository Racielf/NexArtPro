import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Building2, Users, Zap } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function Partners() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* HERO */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 py-24 px-6 text-white">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">Partner With Us</h1>
          <p className="text-xl text-slate-200">Reliable construction services for realtors, property managers, and contractors.</p>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-16 text-center">Who We Work With</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Realtors */}
            <div className="border border-slate-200 rounded-xl p-8">
              <div className="w-12 h-12 bg-cta-orange/20 rounded-lg flex items-center justify-center mb-6">
                <Building2 className="w-6 h-6 text-cta-orange" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Realtors</h3>
              <p className="text-slate-600 leading-relaxed">
                Fast turnaround on property repairs and upgrades. We help you close deals and satisfy clients with quality work.
              </p>
            </div>

            {/* Property Managers */}
            <div className="border border-slate-200 rounded-xl p-8">
              <div className="w-12 h-12 bg-cta-orange/20 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-cta-orange" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Property Managers</h3>
              <p className="text-slate-600 leading-relaxed">
                Reliable maintenance and renovation services for single and multi-unit properties. Responsive and professional.
              </p>
            </div>

            {/* Contractors */}
            <div className="border border-slate-200 rounded-xl p-8">
              <div className="w-12 h-12 bg-cta-orange/20 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-cta-orange" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Contractors</h3>
              <p className="text-slate-600 leading-relaxed">
                Specialized subcontracting services. Licensed, insured, and ready to handle overflow work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY PARTNER */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-16 text-center">Why Partner With R.C Art Construction</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex gap-4">
              <Check className="w-6 h-6 text-cta-orange flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-lg">Reliable & Responsive</h3>
                <p className="text-slate-600">We answer calls, honor deadlines, and communicate clearly throughout every project.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Check className="w-6 h-6 text-cta-orange flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-lg">Licensed & Insured</h3>
                <p className="text-slate-600">Fully licensed in Oregon with comprehensive insurance coverage. Compliant with all regulations.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Check className="w-6 h-6 text-cta-orange flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-lg">Quality Workmanship</h3>
                <p className="text-slate-600">Professional craftsmanship on every project. Your reputation is our priority.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Check className="w-6 h-6 text-cta-orange flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-lg">Flexible Pricing</h3>
                <p className="text-slate-600">Competitive rates with volume discounts available. Transparent, detailed estimates.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Check className="w-6 h-6 text-cta-orange flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-lg">Quick Turnaround</h3>
                <p className="text-slate-600">We prioritize partner projects. Fast scheduling and efficient execution.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Check className="w-6 h-6 text-cta-orange flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 text-lg">Full Service</h3>
                <p className="text-slate-600">From painting to roofing, kitchens to bathrooms. One trusted contractor for all needs.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-12 text-center">Our Services</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              'Kitchen Remodeling',
              'Bathroom Remodeling',
              'Interior Painting',
              'Exterior Painting',
              'Flooring Installation',
              'Drywall Repair',
              'Roof Repair / Replacement',
              'General Home Renovation',
              'Plumbing',
              'Electrical Work',
              'Carpentry',
              'Door & Window Installation',
              'Home Additions',
              'Basement Finishing',
              'Deck & Patio Construction'
            ].map(service => (
              <div key={service} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <p className="text-slate-900 font-medium">{service}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-cta-orange">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Work Together?</h2>
          <p className="text-lg text-white/90 mb-8">Let's discuss how we can support your business and clients.</p>
          <a 
            href="tel:+15039366172"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-100 text-cta-orange font-bold rounded-lg transition"
          >
            Call Us Today
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-white/80 text-sm mt-4">(503) 936-6172</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
