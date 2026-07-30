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

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeColor(value?: string | null) {
  if (!value) return null;
  const v = value.trim();
  return HEX.test(v) ? v : null;
}

function setFavicon(url: string) {
  // só troca o favicon se a imagem realmente carregar (evita ícone quebrado)
  const probe = new Image();
  probe.onload = () => {
    document
      .querySelectorAll<HTMLLinkElement>("link[rel~='icon']")
      .forEach((el) => el.parentElement?.removeChild(el));
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = url;
    document.head.appendChild(link);
  };
  probe.src = url;
}

function applyBranding(b: Branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = safeColor(b.primaryColor);
  const accent = safeColor(b.accentColor);
  if (primary) {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-glow', primary);
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-glow');
  }
  if (accent) {
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--ring', accent);
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--ring');
  }
  if (b.appName) document.title = b.appName;
  if (b.faviconUrl) setFavicon(b.faviconUrl);
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
