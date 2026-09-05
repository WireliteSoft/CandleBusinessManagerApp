import { FAVORITE_SUPPLIES_STORAGE_KEY, PREVIEW_CACHE_KEY } from './config';

export function readPreviewCache(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(PREVIEW_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function writePreviewCache(cache: Record<string, string | null>) {
  try {
    localStorage.setItem(PREVIEW_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage write errors.
  }
}

export function readFavoriteSupplyIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_SUPPLIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === 'string');
  } catch {
    return [];
  }
}
