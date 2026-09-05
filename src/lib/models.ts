export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  image_data: string;
  product_type: 'physical' | 'sample' | 'bundle' | 'custom' | 'subscription' | 'gift_card' | 'service';
  scent_family: string; fragrance_notes: string; sweetness: string; scent_strength: string; warmth: string; freshness: string; season: string; mood: string; room: string; burn_time: string; wax_type: string; wick_type: string; batch_number: string; inspiration: string; making_process: string; limited_drop: boolean; drop_number: string; purchase_limit: number; upcoming_release: boolean; release_date: string; preorders_enabled: boolean; member_exclusive: boolean; member_early_access_days: number; subscriber_exclusive: boolean; subscriber_early_access_days: number;
  price: number;
  quantity_in_stock: number;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  image_data?: string;
  product_type?: 'physical' | 'sample' | 'bundle' | 'custom' | 'subscription' | 'gift_card' | 'service';
  scent_family?: string; fragrance_notes?: string; sweetness?: string; scent_strength?: string; warmth?: string; freshness?: string; season?: string; mood?: string; room?: string; burn_time?: string; wax_type?: string; wick_type?: string; batch_number?: string; inspiration?: string; making_process?: string; limited_drop?: boolean; drop_number?: string; purchase_limit?: number; upcoming_release?: boolean; release_date?: string; preorders_enabled?: boolean; member_exclusive?: boolean; member_early_access_days?: number; subscriber_exclusive?: boolean; subscriber_early_access_days?: number;
  price: number;
  quantity_in_stock?: number;
  cost_per_unit: number;
}

export interface SupplyRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  cost_per_unit: number;
  quantity_in_stock: number;
  unit_type: string;
  supplier: string;
  created_at: string;
  updated_at: string;
}

export interface SupplyInput {
  name: string;
  description?: string;
  category?: string;
  cost_per_unit: number;
  quantity_in_stock?: number;
  unit_type?: string;
  supplier?: string;
}

export interface WaxInventoryRecord {
  id: string;
  wax_type_id: string;
  wax_name: string;
  pounds: number;
  total_price: number;
  selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaxInventoryInput {
  wax_type_id: string;
  wax_name: string;
  pounds?: number;
  total_price?: number;
  selected?: boolean;
}

export interface ScentProfileRecord {
  id: string;
  supplier: string;
  supplier_sku: string;
  name: string;
  scent_family: string;
  top_notes: string;
  middle_notes: string;
  base_notes: string;
  flashpoint_f: number | null;
  vanillin_content: string;
  phthalate_free: boolean;
  prop65_warning: boolean;
  soy_performance: string;
  recommended_load: string;
  usage_notes: string;
  source_url: string;
  source_attribution: string;
  created_at: string;
  updated_at: string;
}

export type ScentProfileInput = Omit<ScentProfileRecord, 'id' | 'created_at' | 'updated_at'>;

export interface CartItemRecord {
  id: string;
  supply_id: string;
  quantity: number;
  notes: string;
  created_at: string;
}

export interface CartItemInput {
  supply_id: string;
  quantity?: number;
  notes?: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  picture_data: string;
  commission_rate: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeInput {
  name: string;
  email: string;
  address?: string;
  phone?: string;
  picture_data?: string;
  commission_rate?: number;
  active?: boolean;
}

export interface SaleRecord {
  id: string;
  product_id: string;
  employee_id: string | null;
  quantity: number;
  sale_price: number;
  total_amount: number;
  commission_amount: number;
  sale_date: string;
  created_at: string;
}

export interface SaleInput {
  product_id: string;
  employee_id?: string | null;
  quantity?: number;
  sale_price: number;
  total_amount: number;
  commission_amount?: number;
}

export interface CandleRecipeRecord {
  id: string;
  name: string;
  description: string;
  yield_quantity: number;
  batch_size: number;
  difficulty_level: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CandleRecipeInput {
  name: string;
  description?: string;
  yield_quantity?: number;
  batch_size: number;
  difficulty_level?: string;
  notes?: string;
}

export interface RecipeIngredientRecord {
  id: string;
  recipe_id: string;
  supply_id: string;
  quantity: number;
  percentage: number;
  notes: string;
  created_at: string;
}

export interface RecipeIngredientInput {
  recipe_id: string;
  supply_id: string;
  quantity: number;
  percentage?: number;
  notes?: string;
}
