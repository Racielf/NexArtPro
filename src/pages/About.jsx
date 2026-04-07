import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* HERO */}
      <section className="bg-white py-20 px-6 border-b border-slate-200">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">About {appConfig.company.name}</h1>
          <p className="text-xl text-slate-600">Trusted construction and remodeling services in Oregon since 2015</p>
        </div>
      </section>

      {/* ABOUT CONTENT */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Story</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                {appConfig.company.name} started with a simple mission: deliver exceptional quality and professional service to every project, regardless of size. With over a decade of experience in construction and remodeling, we've built a reputation for reliability, craftsmanship, and customer satisfaction.
              </p>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Our team is committed to understanding your vision and bringing it to life with meticulous attention to detail. From bathrooms to kitchens, painting to flooring, we take pride in transforming spaces and exceeding expectations.
              </p>
              <p className="text-slate-600 leading-relaxed">
                We believe in transparent communication, fair pricing, and quality workmanship. Every project is an opportunity to demonstrate our commitment to excellence.
              </p>
            </div>
            <div className="bg-slate-100 rounded-xl h-96" />
          </div>

          {/* TRUST SECTION */}
          <div className="bg-slate-50 rounded-xl p-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Why Choose Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Licensed in Oregon</h3>
                  <p className="text-slate-600 text-sm">Fully licensed and compliant with all state regulations and building codes.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Fully Insured</h3>
                  <p className="text-slate-600 text-sm">Complete coverage for your peace of mind and project protection.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Professional Estimates</h3>
                  <p className="text-slate-600 text-sm">Transparent, detailed estimates with no hidden fees or surprises.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Quality Workmanship</h3>
                  <p className="text-slate-600 text-sm">Expert craftsmanship and attention to detail on every project.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Let's Work Together</h2>
          <p className="text-lg text-slate-600 mb-12">
            Ready to transform your space? Get a free estimate today.
          </p>
          <a href="/#estimate-form" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
            Request a Free Estimate
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}