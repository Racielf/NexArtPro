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
  const { isLoadingAuth, isAuthenticated, user, isRecovery, clearRecovery } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('password'); // 'password' | 'pin'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinUsername, setPinUsername] = useState('');
  const [pin, setPin] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [myPin, setMyPin] = useState('');
  const [showPinRecovery, setShowPinRecovery] = useState(false);
  const [pinRecoveryEmail, setPinRecoveryEmail] = useState('');

  useEffect(() => {
    if (isAuthenticated && !isRecovery) {
      navigate(getDefaultRouteForRole(normalizeLocalRole(user?.role)), { replace: true });
    }
  }, [isAuthenticated, user, isRecovery, navigate]);

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
    clearRecovery();
  };

  const sendRecoveryEmail = async (targetEmail) => {
    setError('');
    setInfo('');
    if (!targetEmail.trim()) {
      setError('Enter your email first');
      return;
    }
    setSubmitting(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail.trim(), {
      redirectTo: `${window.location.origin}/team-access`,
    });
    setSubmitting(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setInfo('Check your email for a reset link. Opening it brings you back here to get a new PIN.');
  };

  const handleForgotPassword = () => sendRecoveryEmail(email);
  const handleForgotPin = () => sendRecoveryEmail(pinRecoveryEmail);

  const handleGenerateMyPin = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await nexartClient.functions.invoke('set-my-pin', {});
      setMyPin(data.pin);
    } catch (err) {
      setError(err?.data?.error || 'Could not generate a new PIN');
    } finally {
      setSubmitting(false);
    }
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

  if (isRecovery) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-xs">
            <div className="text-center mb-6">
              <ShieldCheck className="w-10 h-10 text-cta-orange mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Account Recovery</h1>
              <p className="text-slate-400 text-sm">You're verified. Get a new PIN, or set a password if you use that instead.</p>
            </div>

            {myPin ? (
              <div className="text-center space-y-3">
                <p className="text-xs text-slate-400">Your new PIN — write it down now, it won't be shown again:</p>
                <p className="font-mono text-2xl font-bold tracking-widest bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg py-3">
                  {myPin}
                </p>
                <button
                  type="button"
                  onClick={() => { clearRecovery(); setMyPin(''); }}
                  className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 rounded-lg transition uppercase tracking-wider"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                <button
                  type="button"
                  onClick={handleGenerateMyPin}
                  disabled={submitting}
                  className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
                >
                  {submitting ? 'Generating…' : 'Generate New PIN'}
                </button>

                <div className="flex items-center gap-2 text-slate-600 text-[10px] uppercase tracking-widest">
                  <div className="h-px flex-1 bg-slate-800" /> or <div className="h-px flex-1 bg-slate-800" />
                </div>

                <form onSubmit={handleSetNewPassword} className="space-y-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="New password (min. 8 characters)"
                    className="w-full h-11 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-8 py-3 text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
                  >
                    {submitting ? 'Saving…' : 'Set Password Instead'}
                  </button>
                </form>
              </div>
            )}
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
              {info && <p className="text-xs text-emerald-400 font-medium">{info}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
              >
                {submitting ? 'Verifying…' : 'Continue'}
              </button>

              {showPinRecovery ? (
                <div className="space-y-2 pt-1">
                  <input
                    type="email"
                    value={pinRecoveryEmail}
                    onChange={(e) => { setPinRecoveryEmail(e.target.value); setError(''); }}
                    placeholder="Your email"
                    className="w-full h-10 px-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                  />
                  <button
                    type="button"
                    onClick={handleForgotPin}
                    disabled={submitting}
                    className="w-full text-center text-xs text-cta-orange hover:text-orange-400 transition"
                  >
                    Send reset link
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowPinRecovery(true); setError(''); }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white transition"
                >
                  Forgot PIN? No admin available?
                </button>
              )}
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
