'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { get, post, setAccessToken, setSessionLostHandler, refreshAccessToken } from '@/lib/api';
import type { CurrentUser, Resource } from '@/lib/types';

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (resource: Resource, level?: 'read' | 'write') => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setSessionLostHandler(() => {
      setUser(null);
      router.replace('/login');
    });
  }, [router]);

  // On load there is no token in memory, so recover the session from the
  // httpOnly refresh cookie before deciding the user is signed out.
  useEffect(() => {
    (async () => {
      try {
        await refreshAccessToken();
        setUser(await get<CurrentUser>('/auth/me'));
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await post<{ accessToken: string; user: CurrentUser }>('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await post('/auth/logout'); } catch { /* signing out locally regardless */ }
    setAccessToken(null);
    setUser(null);
    router.replace('/login');
  }, [router]);

  const can = useCallback((resource: Resource, level: 'read' | 'write' = 'read') => {
    const granted = user?.access?.[resource];
    if (granted === 'write') return true;
    return granted === 'read' && level === 'read';
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
