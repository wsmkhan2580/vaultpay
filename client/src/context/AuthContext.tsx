import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/resources';
import { setAccessToken } from '../services/api';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    // On page load there's no access token in memory yet (it never survives
    // a refresh, by design). Attempt a silent refresh using the httpOnly
    // cookie; if it succeeds we're still logged in.
    try {
      const res = await authApi.me();
      setUser(res.data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { accessToken, user: loggedInUser } = res.data.data;
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser as AuthUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const res = await authApi.me();
    setUser(res.data.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
