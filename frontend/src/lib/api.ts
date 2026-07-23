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
