import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { ShieldCheck, X } from 'lucide-react';
import { authenticate, completeRegistration } from '@/lib/userStore';
import { getDefaultRouteForRole, normalizeLocalRole } from '@/lib/roleUtils';

const GATE_KEY = 'team_access_granted';
const GATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TEAM_ACCESS_CODE = 'Rc2604';

export function isTeamAccessGranted() {
  try {
    const raw = sessionStorage.getItem(GATE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed?.granted || !parsed?.expiresAt) {
      sessionStorage.removeItem(GATE_KEY);
      return false;
    }

    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(GATE_KEY);
      return false;
    }

    return true;
  } catch {
    sessionStorage.removeItem(GATE_KEY);
    return false;
  }
}

export function clearTeamAccessGrant() {
  sessionStorage.removeItem(GATE_KEY);
}

function persistLocalSession(user) {
  const role = normalizeLocalRole(user?.role);
  sessionStorage.setItem('user_role', role);
  sessionStorage.setItem('local_auth', 'true');
  if (user?.id) sessionStorage.setItem('local_user_id', user.id);
  if (user?.username) sessionStorage.setItem('local_username', user.username);
  if (user?.display_name) sessionStorage.setItem('local_display_name', user.display_name);
  return role;
}

export default function TeamAccess() {
  const { isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [accessMode, setAccessMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('field_agent');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registrationCode, setRegistrationCode] = useState('');
  const [registrationUsername, setRegistrationUsername] = useState('');
  const [registrationPassword, setRegistrationPassword] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const value = pin.trim();

    if (!value) {
      setError('Enter access code');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const isValidFormat = /^(?=.*[A-Za-z])[A-Za-z0-9]{6}$/.test(value);

      if (!isValidFormat) {
        setError('Invalid access code format');
        setPin('');
        return;
      }

      if (value !== TEAM_ACCESS_CODE) {
        setError('Invalid access code');
        setPin('');
        return;
      }

      sessionStorage.setItem(
        GATE_KEY,
        JSON.stringify({
          granted: true,
          expiresAt: Date.now() + GATE_TTL_MS
        })
      );

      setAccessMode('login');
      setShowLoginModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Email and password are required');
      return;
    }

    setLoginSubmitting(true);
    try {
      const result = await authenticate(loginEmail.trim(), loginPassword.trim());
      if (!result.ok) {
        setLoginError(result.error);
        return;
      }

      const actualRole = normalizeLocalRole(result.user?.role);
      const selectedRole = normalizeLocalRole(loginRole);

      if (actualRole !== selectedRole) {
        setLoginError(`Role mismatch — this account is registered as ${actualRole || 'unknown'}`);
        return;
      }

      const role = persistLocalSession(result.user);
      setShowLoginModal(false);
      navigate(getDefaultRouteForRole(role), { replace: true });
    } catch (err) {
      setLoginError('Connection error — try again');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setRegistrationError('');

    if (!registrationCode.trim() || !registrationUsername.trim() || !registrationPassword.trim()) {
      setRegistrationError('Registration code, username and password are required');
      return;
    }

    setRegistrationSubmitting(true);
    try {
      const result = await completeRegistration({
        registrationCode: registrationCode.trim(),
        username: registrationUsername.trim(),
        password: registrationPassword.trim(),
      });

      if (!result.ok) {
        setRegistrationError(result.error || 'Could not complete registration');
        return;
      }

      const role = persistLocalSession(result.user);
      setShowLoginModal(false);
      navigate(getDefaultRouteForRole(role), { replace: true });
    } catch (err) {
      setRegistrationError('Connection error — try again');
    } finally {
      setRegistrationSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <ShieldCheck className="w-10 h-10 text-cta-orange mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Team Access</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your access code to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              placeholder="Access code"
              maxLength={16}
              autoFocus
              className="w-full h-11 text-center text-lg tracking-widest font-bold bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
            />
            {error && (
              <p className="text-xs text-red-400 font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
            >
              {submitting ? 'Verifying…' : 'Continue'}
            </button>
          </form>
        </div>
      </main>

      <PublicFooter />

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-full max-w-sm mx-4 bg-slate-900 border border-slate-700 rounded-xl p-6">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white text-center mb-1">
              {accessMode === 'login' ? 'Sign In' : 'Complete Registration'}
            </h2>
            <p className="text-slate-400 text-sm text-center mb-4">
              {accessMode === 'login'
                ? 'Enter your credentials to continue.'
                : 'Use your registration code to activate your account.'}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-800/60 border border-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setAccessMode('login'); setLoginError(''); }}
                className={`h-9 rounded-md text-xs font-bold transition ${accessMode === 'login' ? 'bg-cta-orange text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAccessMode('register'); setRegistrationError(''); }}
                className={`h-9 rounded-md text-xs font-bold transition ${accessMode === 'register' ? 'bg-cta-orange text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Complete Registration
              </button>
            </div>

            {accessMode === 'login' ? (
              <form onSubmit={handleCredentialLogin} className="space-y-3">
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                  placeholder="Username / Email"
                  autoFocus
                  className="w-full h-11 px-3 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                  placeholder="Password"
                  className="w-full h-11 px-3 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                />
                <select
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                >
                  <option value="admin">Owner / Admin</option>
                  <option value="office_agent">Office Agent</option>
                  <option value="field_agent">Field Agent</option>
                </select>
                {loginError && (
                  <p className="text-xs text-red-400 font-medium">{loginError}</p>
                )}
                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
                >
                  {loginSubmitting ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteRegistration} className="space-y-3">
                <input
                  type="text"
                  value={registrationCode}
                  onChange={(e) => { setRegistrationCode(e.target.value); setRegistrationError(''); }}
                  placeholder="Registration code"
                  autoFocus
                  className="w-full h-11 px-3 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                />
                <input
                  type="text"
                  value={registrationUsername}
                  onChange={(e) => { setRegistrationUsername(e.target.value); setRegistrationError(''); }}
                  placeholder="Create username / email"
                  className="w-full h-11 px-3 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                />
                <input
                  type="password"
                  value={registrationPassword}
                  onChange={(e) => { setRegistrationPassword(e.target.value); setRegistrationError(''); }}
                  placeholder="Create password"
                  className="w-full h-11 px-3 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cta-orange focus:ring-2 focus:ring-cta-orange/20 transition"
                />
                {registrationError && (
                  <p className="text-xs text-red-400 font-medium">{registrationError}</p>
                )}
                <button
                  type="submit"
                  disabled={registrationSubmitting}
                  className="w-full px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 disabled:opacity-50 rounded-lg transition uppercase tracking-wider"
                >
                  {registrationSubmitting ? 'Activating…' : 'Activate Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}