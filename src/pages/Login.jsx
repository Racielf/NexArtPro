import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Thin alias: real sign-in lives at /team-access. Kept as a route so old links/
// bookmarks to /login keep working.
export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-cta-orange rounded-full animate-spin"></div>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/team-access'} replace />;
}
