import type { PublicStorefrontConfig } from '../../lib/localDb';

export type CartLine = {
  productId: string;
  quantity: number;
  customization?: CandleCustomization;
};

export type CandleCustomization = { size: string; scent: string; wick: string; label: string; label_date?: string; label_message?: string; label_logo_data?: string; label_style?: 'classic' | 'minimal' | 'celebration'; label_approval_status?: 'pending_review' | 'approved' | 'changes_requested'; label_production_notes?: string; extras: string[] };

export type ThemeMode = 'light' | 'dark';
export type LightTheme = 'classic' | 'sunset' | 'mint';
export type DarkTheme = 'midnight' | 'forest' | 'ember';

export const THEME_MODE_STORAGE_KEY = 'candles.themeMode.v1';
export const LIGHT_THEME_STORAGE_KEY = 'candles.lightTheme.v1';
export const DARK_THEME_STORAGE_KEY = 'candles.darkTheme.v1';
export const LIGHT_THEMES: LightTheme[] = ['classic', 'sunset', 'mint'];
export const DARK_THEMES: DarkTheme[] = ['midnight', 'forest', 'ember'];

export type ProductDescriptionField = {
  label: string;
  value: string;
};

export type PublicStoreProduct = PublicStorefrontConfig['products'][number];

export type CartDetailItem = {
  product: PublicStoreProduct;
  quantity: number;
  lineTotal: number;
  customization?: CandleCustomization;
};

export type CartDetail = {
  items: CartDetailItem[];
  count: number;
  subtotal: number;
  discount: number;
  discountPercent: number;
  total: number;
};

export function mixMatchDiscountPercent(quantity: number) {
  if (quantity >= 12) return 60;
  if (quantity >= 6) return 40;
  if (quantity >= 3) return 20;
  return 0;
}

export function parseStructuredProductDescription(
  description: string
): ProductDescriptionField[] | null {
  const text = String(description || '').trim();
  if (!text) return null;

  const lines = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const parsed = lines
    .map((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex <= 0) return null;
      const label = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!label || !value) return null;
      return { label, value };
    })
    .filter((item): item is ProductDescriptionField => Boolean(item));

  return parsed.length >= 2 ? parsed : null;
}

export function getCartStorageKey(slug: string) {
  return `candles.store.cart.${slug}`;
}

export function getRecentlyViewedStorageKey(slug: string) {
  return `candles.store.recentlyViewed.${slug}`;
}
