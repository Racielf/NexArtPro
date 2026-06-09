import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SERVICES_LIST } from '@/lib/services';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function Services() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

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

      <PublicFooter />
    </div>
  );
}