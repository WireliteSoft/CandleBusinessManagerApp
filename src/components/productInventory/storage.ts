import { FAVORITE_PRODUCTS_STORAGE_KEY } from './config';

export function loadFavoriteProductIds(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITE_PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === 'string');
  } catch {
    return [];
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  if (file.size > 1_500_000) {
    return Promise.reject(new Error('Images must be 1.5 MB or smaller on the free Cloudflare plan.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}
