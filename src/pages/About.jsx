import React from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
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
          <p className="text-xl text-slate-600 leading-relaxed">Trusted construction and remodeling services in Oregon since 2015</p>
        </div>
      </section>

      {/* ABOUT CONTENT */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Story</h2>
              <p className="text-slate-600 mb-4 leading-8">
                R.C Art Construction LLC was founded in 2023 with a clear purpose: to provide dependable construction and remodeling services for homeowners who want their project done right from start to finish.
              </p>
              <p className="text-slate-600 mb-4 leading-8">
                We are a small company, and that is our advantage. We stay directly involved in our projects, maintain clear communication, and focus on doing the work properly.
              </p>
              <p className="text-slate-600 leading-8">
                Our goal is to help homeowners improve their spaces with solid workmanship, straightforward communication, and service they can rely on.
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
                  <p className="text-slate-600 text-sm leading-relaxed">Fully licensed and compliant with all state regulations and building codes.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Fully Insured</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">Complete coverage for your peace of mind and project protection.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Professional Estimates</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">Transparent, detailed estimates with no hidden fees or surprises.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Quality Workmanship</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">Expert craftsmanship and attention to detail on every project.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AVISO SITIO */}
      <section className="py-12 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200/70 bg-white p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Website Update in Progress
          </h2>

          <p className="text-slate-600 mb-4 leading-relaxed">
            Our website is still being updated, and some sections may be incomplete. You can still request services normally using the form on the home page.
          </p>

          <p className="text-slate-600 leading-relaxed">
            If you do not receive a response, please call or text{" "}
            <a
              href="tel:+15039366172"
              className="font-semibold text-slate-900 hover:text-cta-orange"
            >
              (503) 936-6172
            </a>.
          </p>
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