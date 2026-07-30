import axios from 'axios';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function refreshAccessToken(): Promise<string> {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const t = res.data.accessToken as string;
  accessToken = t;
  return t;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) refreshPromise = refreshAccessToken();
        const t = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${t}`;
        return api(original);
      } catch (e) {
        refreshPromise = null;
        accessToken = null;
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth';
        }
        throw e;
      }
    }
    throw error;
  },
);

/** Baixa um documento em 1 clique (streaming autenticado + nome amigável). */
export async function downloadDocument(id: string, name?: string) {
  let res;
  try {
    res = await api.get(`/documents/${id}/file`, {
      params: { download: 1 },
      responseType: 'blob',
    });
  } catch (e: any) {
    // erros vêm como Blob por causa do responseType: extrai a mensagem real
    let message = 'Falha no download';
    const blob = e?.response?.data;
    if (blob instanceof Blob) {
      try {
        const text = await blob.text();
        const parsed = JSON.parse(text);
        if (parsed?.message) message = String(parsed.message);
      } catch {
        /* mantém mensagem padrão */
      }
    }
    throw new Error(message);
  }

  const blob = res.data as Blob;
  if (!blob || blob.size === 0) throw new Error('Arquivo vazio ou indisponível');

  const disposition = String(res.headers?.['content-disposition'] || '');
  const utf8 = /filename\*=UTF-8''([^;]+)/.exec(disposition);
  const plain = /filename="([^"]+)"/.exec(disposition);
  const fileName = utf8
    ? decodeURIComponent(utf8[1])
    : plain
      ? plain[1]
      : name || 'documento';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


/**
 * Resolve uma URL de arquivo servido pelo backend (`/api/files/...`) para a
 * origem correta da API. Sem isso, o navegador procura o arquivo no host do
 * frontend (nginx) e o logo/favicon aparecem quebrados.
 */
export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const p = String(path).trim();
  if (!p) return undefined;
  if (/^(https?:|data:|blob:)/i.test(p)) return p;

  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
  const rel = p.startsWith('/') ? p : `/${p}`;

  // base absoluta (ex.: https://api.exemplo.com/api) -> usa apenas a origem
  if (/^https?:\/\//i.test(base)) {
    try {
      const origin = new URL(base).origin;
      return `${origin}${rel}`;
    } catch {
      return rel;
    }
  }
  return rel;
}
