import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { SERVICES_LIST, getServiceName } from '@/lib/services';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function PublicHome() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServiceFromUrl, setSelectedServiceFromUrl] = useState(null);
  const [formData, setFormData] = useState({
    service: '',
    details: '',
    size: '',
    timeline: '',
    address: '',
    city: '',
    zip: '',
    name: '',
    phone: '',
    email: '',
    budget: '',
    propertyType: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Hero quick form state
  const [heroFormData, setHeroFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    service: '',
  });
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroSuccess, setHeroSuccess] = useState(false);
  const [heroError, setHeroError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('service');
    if (serviceId) {
      const serviceName = getServiceName(serviceId);
      if (serviceName) {
        setFormData(prev => ({ ...prev, service: serviceName }));
        setSelectedServiceFromUrl(serviceId);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return formData.service;
      case 2: return formData.details && formData.timeline;
      case 3: return formData.address && formData.city && formData.zip;
      case 4: return formData.name && formData.phone && formData.email;
      case 5: return formData.budget && formData.propertyType;
      case 6: return true;
      default: return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { base44 } = await import('@/api/base44Client');
      const response = await base44.functions.invoke('submitContactForm', formData);

      setSuccess(true);
      setFormData({ name: '', phone: '', email: '', address: '', service: '', details: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHeroFormChange = (e) => {
    const { name, value } = e.target;
    setHeroFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleHeroSubmit = async (e) => {
    e.preventDefault();
    setHeroLoading(true);
    setHeroError('');
    setHeroSuccess(false);

    try {
      const { base44 } = await import('@/api/base44Client');
      await base44.functions.invoke('submitContactForm', {
        ...heroFormData,
        details: '',
        timeline: 'ASAP',
        city: '',
        zip: '',
        budget: '',
        propertyType: 'Residential',
      });

      setHeroSuccess(true);
      setHeroFormData({ name: '', phone: '', email: '', address: '', service: '' });
      setTimeout(() => setHeroSuccess(false), 5000);
    } catch (err) {
      setHeroError(err.message || 'An error occurred. Please try again.');
    } finally {
      setHeroLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* HERO SECTION - Professional Construction Design */}
      <section 
        className="relative py-20 px-6 overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1541123603104-802565a7fce3?w=1600&h=800&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Headline + CTA */}
            <div className="text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Transform Your Space
              </h1>
              <p className="text-lg text-slate-100 mb-10 leading-relaxed max-w-xl">
                Professional construction and remodeling services. Licensed, insured, and committed to excellence.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => document.querySelector('[data-hero-form]')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-cta-orange hover:bg-orange-600 text-white font-semibold rounded-lg transition shadow-lg"
                >
                  Get Free Estimate
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right: Floating Card Form */}
            <div className="relative" data-hero-form>
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Free Estimate</h2>
                <p className="text-sm text-slate-500 mb-6">No commitment • Takes 2 minutes</p>

                {heroSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Request received!</p>
                    <p className="text-xs text-slate-500 mt-1">We'll contact you within 24 hours</p>
                  </div>
                ) : (
                  <form onSubmit={handleHeroSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={heroFormData.name}
                        onChange={handleHeroFormChange}
                        required
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cta-orange focus:border-transparent"
                        placeholder="Your name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Phone *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={heroFormData.phone}
                          onChange={handleHeroFormChange}
                          required
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cta-orange focus:border-transparent"
                          placeholder="(503) 555-0100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={heroFormData.email}
                          onChange={handleHeroFormChange}
                          required
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cta-orange focus:border-transparent"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Address *</label>
                      <input
                        type="text"
                        name="address"
                        value={heroFormData.address}
                        onChange={handleHeroFormChange}
                        required
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cta-orange focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Service *</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="service"
                          value={heroFormData.service}
                          onChange={e => setHeroFormData(p => ({ ...p, service: e.target.value }))}
                          required
                          className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cta-orange focus:border-transparent"
                          placeholder="Search services..."
                          autoComplete="off"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        {heroFormData.service && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                            {SERVICES_LIST.filter(svc => 
                              svc.name.toLowerCase().includes(heroFormData.service.toLowerCase())
                            ).length > 0 ? (
                              SERVICES_LIST.filter(svc => 
                                svc.name.toLowerCase().includes(heroFormData.service.toLowerCase())
                              ).map(svc => (
                                <button
                                  key={svc.id}
                                  type="button"
                                  onClick={() => setHeroFormData(p => ({ ...p, service: svc.name }))}
                                  className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition border-b border-slate-100 last:border-b-0"
                                >
                                  <div className="font-medium">{svc.name}</div>
                                  <div className="text-xs text-slate-500">{svc.description}</div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-center text-sm text-slate-500">
                                No services found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">What do you need? *</label>
                      <textarea
                        name="details"
                        value={heroFormData.details || ''}
                        onChange={e => setHeroFormData(p => ({ ...p, details: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cta-orange focus:border-transparent resize-none"
                        placeholder="Describe your project..."
                      />
                    </div>

                    {heroError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-xs">{heroError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={heroLoading || !heroFormData.service || !heroFormData.name || !heroFormData.phone || !heroFormData.email || !heroFormData.address}
                      className="w-full py-3 bg-cta-orange hover:bg-orange-600 disabled:bg-slate-300 text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                    >
                      {heroLoading ? 'Submitting...' : 'Get Free Estimate'}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <p className="text-xs text-slate-400 text-center">Licensed • Insured • Fast response</p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION - Link to dedicated Services page */}
      <section className="py-24 px-6 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Our Services</h2>
          <p className="text-lg text-slate-600 mb-10">Explore our full range of professional construction services</p>
          <Link to="/services" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
            View All Services
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0" />
                <h3 className="font-semibold text-slate-900">Licensed in Oregon</h3>
              </div>
              <p className="text-sm text-slate-600">Full compliance with state regulations</p>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0" />
                <h3 className="font-semibold text-slate-900">Fully Insured</h3>
              </div>
              <p className="text-sm text-slate-600">Complete coverage for your peace of mind</p>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0" />
                <h3 className="font-semibold text-slate-900">Free Estimates</h3>
              </div>
              <p className="text-sm text-slate-600">Transparent pricing, no hidden fees</p>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Check className="w-6 h-6 text-slate-900 flex-shrink-0" />
                <h3 className="font-semibold text-slate-900">Quality First</h3>
              </div>
              <p className="text-sm text-slate-600">Professional craftsmanship always</p>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-STEP FORM SECTION */}
      <section id="estimate-form" className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          {!success ? (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-900 mb-2">Free Estimate</h2>
                <p className="text-slate-600 text-sm">✓ No commitment  •  ✓ Takes less than 2 minutes  •  ✓ Free estimate</p>
              </div>

              {/* Progress Bar */}
              <div className="mb-12">
                <div className="flex justify-between mb-4 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        step <= currentStep ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 text-center font-medium">Step {currentStep} of 6</p>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* STEP 1: Project Type */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      {selectedServiceFromUrl && (
                        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className="text-sm text-emerald-700 font-medium">
                            ✓ Selected: <strong>{formData.service}</strong>
                          </p>
                        </div>
                      )}
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">What type of project?</h3>
                      <p className="text-sm text-slate-500 mb-6">Select the service that best fits your needs</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SERVICES_LIST.map((svc) => (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => handleSelectChange('service', svc.name)}
                            className={`p-4 rounded-lg border-2 font-semibold transition text-left h-full ${
                              formData.service === svc.name
                                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                : 'border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:shadow-sm'
                            }`}
                          >
                            {svc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Project Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">Tell us about your project</h3>
                      <p className="text-sm text-slate-500 mb-6">Help us understand your scope and timeline</p>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Project Description *</label>
                          <textarea
                            name="details"
                            value={formData.details}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                            placeholder="e.g., Replace kitchen cabinets, new countertops, and flooring..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-3">When do you want to start? *</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['ASAP', '1–2 weeks', 'Flexible'].map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => handleSelectChange('timeline', time)}
                                className={`p-3 rounded-lg border-2 font-semibold transition text-center ${
                                  formData.timeline === time
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-900 hover:border-blue-400'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Location */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">Where is your project?</h3>
                      <p className="text-sm text-slate-500 mb-6">We currently serve the Portland area and surrounding regions</p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Street Address *</label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                            <input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                              placeholder="Portland"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code *</label>
                            <input
                              type="text"
                              name="zip"
                              value={formData.zip}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                              placeholder="97201"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Contact Info */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">How can we reach you?</h3>
                      <p className="text-sm text-slate-500 mb-6">We'll contact you within 24 hours with a free estimate</p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            placeholder="John Smith"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            placeholder="(503) 555-0100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Budget & Property */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">Almost done!</h3>
                      <p className="text-sm text-slate-500 mb-6">Help us tailor the estimate to your needs</p>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-3">Budget Range *</label>
                          <div className="grid grid-cols-1 gap-2">
                            {['Under $5,000', '$5,000 - $15,000', 'Over $15,000'].map((budget) => (
                              <button
                                key={budget}
                                type="button"
                                onClick={() => handleSelectChange('budget', budget)}
                                className={`p-3 rounded-lg border-2 font-semibold text-left transition ${
                                  formData.budget === budget
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-900 hover:border-blue-400'
                                }`}
                              >
                                {budget}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-3">Property Type *</label>
                          <div className="grid grid-cols-1 gap-2">
                            {['Residential', 'Rental', 'Commercial'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleSelectChange('propertyType', type)}
                                className={`p-3 rounded-lg border-2 font-semibold text-left transition ${
                                  formData.propertyType === type
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-900 hover:border-blue-400'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: Review & Submit */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">Review your estimate request</h3>
                      <p className="text-sm text-slate-500 mb-6">Please review the information below before submitting</p>
                      <div className="bg-slate-50 rounded-lg p-6 space-y-3 mb-6 border border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Service:</span>
                          <span className="font-semibold text-slate-900">{formData.service}</span>
                        </div>
                        <div className="border-t border-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Location:</span>
                          <span className="font-semibold text-slate-900">{formData.city}, {formData.zip}</span>
                        </div>
                        <div className="border-t border-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Contact:</span>
                          <span className="font-semibold text-slate-900">{formData.name}</span>
                        </div>
                        <div className="border-t border-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Timeline:</span>
                          <span className="font-semibold text-slate-900">{formData.timeline}</span>
                        </div>
                        <div className="border-t border-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Budget:</span>
                          <span className="font-semibold text-slate-900">{formData.budget}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 text-center">✓ No commitment  •  ✓ We'll contact you within 24 hours</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={`px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                      currentStep === 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  {currentStep < 6 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!isStepValid()}
                      className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                        isStepValid()
                          ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-md'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-400 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-md"
                    >
                      {loading ? 'Submitting...' : 'Request Free Estimate'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Thank You!</h3>
              <p className="text-slate-600 mb-2">Your estimate request has been submitted successfully.</p>
              <p className="text-sm text-slate-500">We'll contact you within 24 hours to discuss your project.</p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setCurrentStep(1);
                  setFormData({
                    service: '',
                    details: '',
                    size: '',
                    timeline: '',
                    address: '',
                    city: '',
                    zip: '',
                    name: '',
                    phone: '',
                    email: '',
                    budget: '',
                    propertyType: '',
                  });
                }}
                className="mt-8 px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
              >
                Submit Another Estimate
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-white text-slate-900 py-24 px-6 border-t border-slate-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Let's Get Started</h2>
          <p className="text-lg text-slate-600 mb-12">
            Get your free estimate today. We'll contact you within 24 hours.
          </p>
          <a href="#estimate-form" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
            Request Your Free Estimate
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}