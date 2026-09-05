const API_BASE = import.meta.env.VITE_API_BASE || '';
const API_FALLBACK = 'http://localhost:3001';

export const AUTH_TOKEN_STORAGE_KEY = 'candles.authToken.v1';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const bases = API_BASE ? [API_BASE] : [''];
  if (!bases.includes(API_FALLBACK)) {
    bases.push(API_FALLBACK);
  }

  let lastError: Error | null = null;

  for (const base of bases) {
    try {
      const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      const res = await fetch(`${base}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
          // Ignore JSON parsing failure and keep default message.
        }
        const error = new Error(message) as Error & { status?: number };
        error.status = res.status;

        const canFallback =
          base === '' &&
          (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504);
        if (canFallback) {
          lastError = error;
          continue;
        }
        throw error;
      }

      if (res.status === 204) {
        return undefined as T;
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof TypeError) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('Request failed');
}

export async function requestPublic<T>(path: string, init?: RequestInit, customerToken = ''): Promise<T> {
  const bases = API_BASE ? [API_BASE] : [''];
  if (!bases.includes(API_FALLBACK)) bases.push(API_FALLBACK);
  let lastError: Error | null = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
          ...(init?.headers || {}),
        },
      });
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const payload = (await res.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Keep the HTTP status fallback.
        }
        const error = new Error(message) as Error & { status?: number };
        error.status = res.status;
        if (base === '' && [404, 502, 503, 504].includes(res.status)) {
          lastError = error;
          continue;
        }
        throw error;
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (error) {
      if (error instanceof TypeError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error('Request failed');
}
