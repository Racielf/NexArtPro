import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { SERVICES_LIST, getServiceName } from '@/lib/services';

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
            <Link to="/gallery" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Gallery</Link>
            <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">About</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Contact</Link>
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition">Team Access</Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="bg-white text-slate-900 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Quality Construction Services in Oregon
            </h1>
            <p className="text-lg text-slate-600 mb-12 leading-relaxed">
              Expert craftsmanship. Licensed & insured. Your project deserves the best.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#estimate-form" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
                Get a Free Estimate
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-900 text-slate-900 hover:bg-slate-50 font-semibold rounded-lg transition">
                Team Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-20">What We Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {services.map((svc, i) => {
              const Icon = svc.icon;
              return (
                <div key={i} className="flex flex-col items-start">
                  <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 transition">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-3 text-lg">{svc.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{svc.description}</p>
                </div>
              );
            })}
          </div>
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
                <a href="#estimate-form" className="text-sm text-slate-300 hover:text-white transition">Get Estimate</a>
                <br />
                <Link to="/login" className="text-sm text-slate-300 hover:text-white transition">Team Access</Link>
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