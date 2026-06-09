import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { clearTeamAccessGrant } from '@/pages/TeamAccess';
import { clearLocalSession, normalizeLocalRole } from '@/lib/roleUtils';

const AuthContext = createContext();

function persistSessionProfile(profile, authUser) {
  const role = normalizeLocalRole(profile?.role);
  sessionStorage.setItem('local_auth', 'true');
  sessionStorage.setItem('nexartpro_authenticated', 'true');
  sessionStorage.setItem('local_user_id', profile?.id || authUser?.id || '');
  sessionStorage.setItem('local_username', profile?.username || authUser?.email || '');
  sessionStorage.setItem('local_display_name', profile?.display_name || authUser?.email || '');
  if (role) sessionStorage.setItem('user_role', role);
}

async function loadUserProfile(authUser) {
  if (!authUser?.id) return null;

  const { data, error } = await supabase
    .from('app_users')
    .select('id, auth_user_id, username, display_name, role, active')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.active === false) return null;

  return data;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const applySession = useCallback(async (nextSession) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    setSession(nextSession || null);

    try {
      const authUser = nextSession?.user;
      if (!authUser) {
        setUser(null);
        setIsAuthenticated(false);
        clearLocalSession();
        return;
      }

      const profile = await loadUserProfile(authUser);
      if (!profile) {
        setUser(null);
        setIsAuthenticated(false);
        clearLocalSession();
        setAuthError({ type: 'user_not_registered', message: 'User is not active or registered for this app' });
        return;
      }

      const mergedUser = {
        ...authUser,
        ...profile,
        email: authUser.email,
        auth_user_id: authUser.id,
      };

      persistSessionProfile(profile, authUser);
      setUser(mergedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Supabase auth profile load failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      clearLocalSession();
      setAuthError({ type: 'unknown', message: error.message || 'Failed to load user profile' });
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingAuth(true);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase session check failed:', error);
      clearLocalSession();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message });
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      return;
    }
    await applySession(data?.session || null);
  }, [applySession]);

  useEffect(() => {
    checkAppState();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [applySession, checkAppState]);

  const logout = useCallback(async () => {
    clearTeamAccessGrant();
    clearLocalSession();
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    await supabase.auth.signOut();
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.assign('/team-access');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};