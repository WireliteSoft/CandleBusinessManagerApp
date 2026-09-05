const API_BASE = import.meta.env.VITE_API_BASE || '';

export const AUTH_TOKEN_STORAGE_KEY = 'candles.authToken.v1';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, ...init });
  if (!res.ok) { let message = `Request failed (${res.status})`; try { const payload = await res.json() as { error?: string }; if (payload.error) message = payload.error; } catch { /* Keep status error. */ } const error = new Error(message) as Error & { status?: number }; error.status = res.status; throw error; }
  return res.status === 204 ? undefined as T : await res.json() as T;
}

export async function requestPublic<T>(path: string, init?: RequestInit, customerToken = ''): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}), ...(init?.headers || {}) } });
  if (!res.ok) { let message = `Request failed (${res.status})`; try { const payload = await res.json() as { error?: string }; if (payload.error) message = payload.error; } catch { /* Keep status error. */ } const error = new Error(message) as Error & { status?: number }; error.status = res.status; throw error; }
  return res.status === 204 ? undefined as T : await res.json() as T;
}
