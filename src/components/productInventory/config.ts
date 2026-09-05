import type { EmployeeRecord, ProductRecord } from '../../lib/models';

export type Product = ProductRecord;
export type Employee = EmployeeRecord;

export type InventoryView = 'cards' | 'list';
export type InventoryCategory = 'all' | 'favorites';

export const FAVORITE_PRODUCTS_STORAGE_KEY = 'candles.productFavorites.v1';

export type ProductFormData = {
  name: string;
  description: string;
  image_data: string;
  product_type: Product['product_type'];
  scent_family: string; fragrance_notes: string; sweetness: string; scent_strength: string; warmth: string; freshness: string; season: string; mood: string; room: string; burn_time: string; wax_type: string; wick_type: string; batch_number: string; inspiration: string; making_process: string; limited_drop: boolean; drop_number: string; purchase_limit: string; upcoming_release: boolean; release_date: string; preorders_enabled: boolean; member_exclusive: boolean; member_early_access_days: string; subscriber_exclusive: boolean; subscriber_early_access_days: string;
  price: string;
  quantity_in_stock: string;
  cost_per_unit: string;
};

export type ProductSaleData = {
  employee_id: string;
  quantity: string;
};

export const INITIAL_PRODUCT_FORM: ProductFormData = {
  name: '',
  description: '',
  image_data: '',
  product_type: 'physical',
  scent_family: '', fragrance_notes: '', sweetness: '', scent_strength: '', warmth: '', freshness: '', season: '', mood: '', room: '', burn_time: '', wax_type: '', wick_type: '', batch_number: '', inspiration: '', making_process: '', limited_drop: false, drop_number: '', purchase_limit: '', upcoming_release: false, release_date: '', preorders_enabled: false, member_exclusive: false, member_early_access_days: '', subscriber_exclusive: false, subscriber_early_access_days: '',
  price: '',
  quantity_in_stock: '',
  cost_per_unit: '',
};

export const INITIAL_SALE_FORM: ProductSaleData = {
  employee_id: '',
  quantity: '1',
};
