'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest, setCsrfToken } from './api';

type PermissionMap = Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;

type Profile = {
  id: number | null;
  full_name: string;
  email: string;
  role: { id: number | null; name: string; is_active: boolean };
  is_active: boolean;
  must_change_password: boolean;
  permissions: PermissionMap;
};

type AuthContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (module: string, action: 'create' | 'read' | 'update' | 'delete') => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest('/api/v1/dashboard/auth/me');
      setCsrfToken(data?.csrf_token);
      setProfile(data?.profile || null);
      setError(null);
    } catch (_) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const data = await apiRequest('/api/v1/dashboard/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setCsrfToken(data?.csrf_token);
    setProfile(data?.profile || null);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/api/v1/dashboard/auth/logout', {
      method: 'POST',
      body: {},
    });
    setProfile(null);
  }, []);

  const hasPermission = useCallback(
    (module: string, action: 'create' | 'read' | 'update' | 'delete') => {
      if (!profile) return false;
      const modulePermission = profile.permissions?.[module];
      return Boolean(modulePermission?.[action]);
    },
    [profile]
  );

  const value = useMemo(
    () => ({ profile, loading, error, login, logout, refresh, hasPermission }),
    [profile, loading, error, login, logout, refresh, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
