import { SUPERADMIN_TOKEN_STORAGE_KEY } from './types';

export async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = window.localStorage.getItem(SUPERADMIN_TOKEN_STORAGE_KEY);
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
