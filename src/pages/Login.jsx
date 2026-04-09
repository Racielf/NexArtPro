import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isTeamAccessGranted } from '@/pages/TeamAccess';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function Login() {
  const { navigateToLogin, isAuthenticated, isLoadingAuth } = useAuth();

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

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isTeamAccessGranted()) {
    return <Navigate to="/team-access" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Team Access</h1>
          <p className="text-slate-300 mb-6">Sign in to access the internal system.</p>
          <button
            onClick={() => navigateToLogin()}
            className="px-8 py-3 text-sm font-bold text-white bg-cta-orange hover:bg-orange-600 rounded-lg transition uppercase tracking-wider"
          >
            Sign In
          </button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
