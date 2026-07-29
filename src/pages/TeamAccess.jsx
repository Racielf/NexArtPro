import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { nexartClient } from '@/api/nexartClient';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { ShieldCheck } from 'lucide-react';
import { getDefaultRouteForRole, normalizeLocalRole } from '@/lib/roleUtils';

export default function TeamAccess() {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('password'); // 'password' | 'pin'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinUsername, setPinUsername] = useState('');
  const [pin, setPin] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated && !recovery) {
      navigate(getDefaultRouteForRole(normalizeLocalRole(user?.role)), { replace: true });
    }
  }, [isAuthenticated, user, recovery, navigate]);

  // Fires when the user lands here from a "forgot password" or invite email link --
  // Supabase establishes a session from the URL, but they still need to pick a
  // password before using the app normally.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.trim().length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword.trim() });
    setSubmitting(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setRecovery(false);
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email above first');
      return;
    }
    setSubmitting(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/team-access`,
    });
    setSubmitting(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setInfo('Check your email for a password reset link.');
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-cta-orange rounded-full animate-spin"></div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setSubmitting(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    setSubmitting(false);
    if (signInErr) setError(signInErr.message || 'Invalid email or password');
    // On success, AuthContext's onAuthStateChange listener updates isAuthenticated,
    // and the effect above navigates once that lands.
  };

  const handlePinSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!pinUsername.trim() || !pin.trim()) {
      setError('Username and PIN are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data: result } = await nexartClient.functions.invoke('pin-login', {
        username: pinUsername.trim(),
        pin: pin.trim().toUpperCase(),
      });
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.password,
      });
      if (signInErr) setError('Could not complete sign-in');
    } catch (err) {
      setError(err?.data?.error || 'Invalid username or PIN');
    } finally {
      setSubmitting(false);
    }
  };

  if (recovery) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-xs">
            <div className="text-center mb-6">
              <ShieldCheck className="w-10 h-10 text-cta-orange mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
              <p className="text-slate-400 text-sm">Choose a new password for your account.</p>
            </div>
            <form onSubmit={handleSetNewPassword} className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="New password (min. 8 characters)"
                autoFocus
                className="w-full h-11 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
              />
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
              >
                {submitting ? 'Saving…' : 'Save Password'}
              </button>
            </form>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-6">
            <ShieldCheck className="w-10 h-10 text-cta-orange mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Team Access</h1>
            <p className="text-slate-400 text-sm">Sign in to access the internal system.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-900/60 border border-slate-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); }}
              className={`h-9 rounded-md text-xs font-bold transition ${mode === 'password' ? 'bg-cta-orange text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('pin'); setError(''); }}
              className={`h-9 rounded-md text-xs font-bold transition ${mode === 'pin' ? 'bg-cta-orange text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Quick PIN
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="Email"
                autoFocus
                className="w-full h-11 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Password"
                className="w-full h-11 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
              />
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
              {info && <p className="text-xs text-emerald-400 font-medium">{info}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
              >
                {submitting ? 'Signing in…' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={submitting}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition"
              >
                Forgot password?
              </button>
            </form>
          ) : (
            <form onSubmit={handlePinSignIn} className="space-y-3">
              <input
                type="text"
                value={pinUsername}
                onChange={(e) => { setPinUsername(e.target.value); setError(''); }}
                placeholder="Username"
                autoFocus
                className="w-full h-11 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
              />
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => { setPin(e.target.value.toUpperCase().slice(0, 6)); setError(''); }}
                placeholder="PIN"
                className="w-full h-11 text-center text-lg tracking-widest font-bold bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
              />
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
              >
                {submitting ? 'Verifying…' : 'Continue'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-500 mt-6">
            New team members are invited by an admin from Settings → Team &amp; Access.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
