import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050/api/v1';

export const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

// Held in memory only, never localStorage — a page reload recovers it from the
// httpOnly refresh cookie instead.
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const setSessionLostHandler = (fn: () => void) => { onSessionLost = fn; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Concurrent 401s must trigger ONE refresh, or they rotate each other's tokens.
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  refreshing ??= axios
    .post<{ data: { accessToken: string } }>(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((r) => {
      const token = r.data.data.accessToken;
      setAccessToken(token);
      return token;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const isAuthCall = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null);
        onSessionLost?.();
      }
    }
    return Promise.reject(error);
  },
);

export function apiMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: { message: string }[] } | undefined;
    if (data?.errors?.length) return data.errors.map((e) => e.message).join(', ');
    return data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export async function get<T>(url: string): Promise<T> {
  return (await api.get<{ data: T }>(url)).data.data;
}
export async function post<T>(url: string, body?: unknown): Promise<T> {
  return (await api.post<{ data: T }>(url, body)).data.data;
}
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  return (await api.patch<{ data: T }>(url, body)).data.data;
}
export async function del<T>(url: string): Promise<T> {
  return (await api.delete<{ data: T }>(url)).data.data;
}

export { refreshAccessToken };
