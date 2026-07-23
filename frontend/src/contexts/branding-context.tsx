import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

export type Branding = {
  id: string;
  appName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  tagline: string | null;
};

type BrandingCtx = {
  branding: Branding | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (data: Partial<Branding>) => Promise<Branding>;
};

const Ctx = createContext<BrandingCtx | null>(null);

function hexToOklchApprox(hex: string) {
  // simples: só definimos como CSS var raw hex; navegador aceita em background/color mas nossas vars são oklch.
  // Vamos sobrescrever --primary e --accent com o hex diretamente (color-mix continua funcionando).
  return hex;
}

function applyBranding(b: Branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--primary', hexToOklchApprox(b.primaryColor));
  root.style.setProperty('--accent', hexToOklchApprox(b.accentColor));
  root.style.setProperty('--ring', b.accentColor);
  if (b.appName) document.title = b.appName;
  if (b.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Branding>('/branding');
      setBranding(data);
      applyBranding(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (data: Partial<Branding>) => {
    const { data: updated } = await api.put<Branding>('/branding', data);
    setBranding(updated);
    applyBranding(updated);
    return updated;
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Ctx.Provider value={{ branding, loading, refresh: load, save }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBranding() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBranding fora do BrandingProvider');
  return c;
}
