import React, { useState } from 'react';
import { APP_CONFIG } from '@/lib/appConfig';
import { Shield, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ClientPortalLogin({ onLogin, loading, error }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ email: email.trim().toLowerCase(), phone: phone.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
              <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{APP_CONFIG.appName}</h1>
          <p className="text-sm text-slate-500 mt-1">Client Portal — View your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>Enter the email and phone number on file to access your documents.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="h-10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              required
              className="h-10"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" disabled={loading || !email || !phone} className="w-full h-10 gap-2">
            {loading ? 'Verifying…' : 'Access My Documents'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>

        <p className="text-center text-[10px] text-slate-400 mt-6">
          Secure access provided by {APP_CONFIG.company.displayName}
        </p>
      </div>
    </div>
  );
}