import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAccessToken } from '@/lib/api';
import type { AppRole } from '@/lib/utils';

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  status: string;
  roles: AppRole[];
  allowedModules?: string[];
};

type AuthCtx = {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};


const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get<CurrentUser>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        await loadMe();
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    setAccessToken(null);
    setUser(null);
  }, []);

  const isAdmin = !!user?.roles?.some((r) => r === 'admin' || r === 'super_admin');
  const isSuperAdmin = !!user?.roles?.includes('super_admin');

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refresh: loadMe, isAdmin, isSuperAdmin }}>
      {children}
    </Ctx.Provider>
  );
}


export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
