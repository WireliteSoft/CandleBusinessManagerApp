import type { SupplyRecord } from '../../lib/models';

export type Supply = SupplyRecord;
export type SupplyView = 'cards' | 'list';

export const PREVIEW_CACHE_KEY = 'supply-link-preview-cache-v1';
export const FAVORITE_SUPPLIES_STORAGE_KEY = 'candles.supplyFavorites.v1';

export const SUPPLY_CATEGORIES = [
  'containers',
  'boxes',
  'wax',
  'fragrances',
  'color (dye)',
  'wicks',
  'labels',
  'other',
] as const;

export type SupplyFormData = {
  name: string;
  description: string;
  category: string;
  cost_per_unit: string;
  quantity_in_stock: string;
  unit_type: string;
  supplier: string;
};

export const INITIAL_SUPPLY_FORM: SupplyFormData = {
  name: '',
  description: '',
  category: 'containers',
  cost_per_unit: '',
  quantity_in_stock: '',
  unit_type: 'oz',
  supplier: '',
};
