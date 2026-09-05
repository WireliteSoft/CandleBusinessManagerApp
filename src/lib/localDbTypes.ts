import type {
  CandleRecipeRecord,
  CartItemRecord,
  EmployeeRecord,
  ProductRecord,
  RecipeIngredientRecord,
  SaleRecord,
  SupplyRecord,
  WaxInventoryRecord,
} from './models';

export interface CartItemWithSupply extends CartItemRecord {
  supplies: SupplyRecord;
}

export type WaxInventoryRow = WaxInventoryRecord;

export interface SaleWithDetails extends SaleRecord {
  products: ProductRecord;
  employees: EmployeeRecord | null;
}

export interface RecipeWithIngredients extends CandleRecipeRecord {
  recipe_ingredients: Array<RecipeIngredientRecord & { supplies: SupplyRecord }>;
}

export interface BatchLogRecord {
  id: string;
  batch_date: string;
  batch_name: string;
  candles_amount: number;
  wax_type: string;
  container_type: string;
  container_size: string;
  wax_weight_oz: number;
  fragrance_load: number;
  fragrance_oil: string;
  wick_type: string;
  wick_size: string;
  wick_count: number;
  vessel: string;
  pour_temp_f: number;
  room_temp_f: number;
  room_humidity: number;
  pricing_wax_cost: number;
  pricing_wax_weight_lb: number;
  pricing_fragrance_used_oz: number;
  pricing_fragrance_cost_used: number;
  pricing_fill_per_candle_oz: number;
  pricing_jar_cost_each: number;
  pricing_wick_cost_each: number;
  pricing_label_cost_each: number;
  pricing_other_cost_each: number;
  pricing_labor_overhead_each: number;
  pricing_material_cost_per_candle: number;
  pricing_total_cost_per_candle: number;
  pricing_wholesale_suggestion: number;
  pricing_retail_suggestion: number;
  pricing_premium_suggestion: number;
  pricing_cogs_source: 'total';
  pricing_price_source: 'wholesale' | 'retail' | 'premium';
  notes: string;
  outcome: 'pending' | 'pass' | 'fail';
  created_at: string;
  updated_at: string;
}

export interface MoldRecord {
  id: string;
  name: string;
  weight_oz: number;
  image_data: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  user_id: string;
  account_id: string;
  account_name: string;
  plan_tier: 'free' | 'standard' | 'pro' | 'elite';
  join_code?: string;
  email?: string;
  username: string;
  role: string;
  expires_at: string;
}

export interface BillingPricing {
  standard_monthly_usd: number;
  standard_yearly_usd: number;
  pro_monthly_usd: number;
  pro_yearly_usd: number;
  elite_monthly_usd: number;
  elite_yearly_usd: number;
  currency: string;
  updated_at?: string;
}

export interface BillingTierCadencePricing {
  monthly: number;
  yearly: number;
  yearly_savings: number;
}

export interface BillingPaymentOptions {
  square_enabled: boolean;
  square_application_id: string;
  square_location_id: string;
  paypal_enabled: boolean;
  paypal_client_id: string;
}

export interface BillingTierQuote {
  tier: 'free' | 'standard' | 'pro' | 'elite';
  billing_cycle: 'monthly' | 'yearly';
  base_price: number;
  credit_applied: number;
  amount_due: number;
  currency: string;
  can_switch_directly: boolean;
  credit_eligible: boolean;
  prior_purchase_amount: number;
  prior_purchase_date: string | null;
  credit_expires_at: string | null;
}

export interface BillingPlansResponse {
  plan_tier: 'free' | 'standard' | 'pro' | 'elite';
  pricing: BillingPricing;
  pricing_by_tier: Record<'free' | 'standard' | 'pro' | 'elite', BillingTierCadencePricing>;
  payment_options: BillingPaymentOptions;
  tier_quotes: Record<'monthly' | 'yearly', Record<'free' | 'standard' | 'pro' | 'elite', BillingTierQuote>>;
}

export interface AccountBillingProfile {
  account_id: string;
  billing_name: string;
  billing_email: string;
  billing_phone: string;
  company_name: string;
  street_address_1: string;
  street_address_2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country: string;
  preferred_payment_method: 'card' | 'apple_pay' | 'google_pay' | 'paypal' | 'manual';
  paypal_email: string;
  payment_profile_note: string;
  created_at: string;
  updated_at: string;
}

export interface BillingPurchaseHistoryRecord {
  id: string;
  from_tier: 'free' | 'standard' | 'pro' | 'elite';
  target_tier: 'free' | 'standard' | 'pro' | 'elite';
  billing_cycle: 'monthly' | 'yearly';
  payment_method: 'free' | 'card' | 'apple_pay' | 'google_pay' | 'paypal';
  provider: 'internal' | 'square' | 'paypal';
  currency: string;
  base_amount: number;
  credit_applied: number;
  amount_due: number;
  payment_status: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountUsageSummary {
  account_name: string;
  plan_tier: 'free' | 'standard' | 'pro' | 'elite';
  role: string;
  account_created_at: string | null;
  last_paid_at: string | null;
  totals: {
    products: number;
    supplies: number;
    recipes: number;
    batch_logs: number;
    sales: number;
    employees: number;
    wax_inventory_entries: number;
    team_users: number;
    active_team_users: number;
    contact_messages: number;
    checkout_sessions: number;
    paid_orders: number;
    units_sold: number;
  };
  financials: {
    gross_sales: number;
    last_paid_amount: number;
  };
}

export interface AccountUserRecord {
  id: string;
  name?: string;
  email?: string;
  username: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JoinRequestRecord {
  id: string;
  account_id: string;
  name?: string;
  email?: string;
  username: string;
  requested_role: 'admin' | 'member';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface BanAppealInput {
  account_identifier: string;
  email?: string;
  name: string;
  reason: string;
  details: string;
}

export interface BanAppealTicket {
  id: string;
  account_identifier: string;
  email: string;
  name: string;
  reason: string;
  details: string;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export interface BanAppealMessage {
  id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
}

export interface RolePermissions {
  [featureKey: string]: boolean;
}

export interface TeamRoleRecord {
  name: string;
  built_in: boolean;
  permissions: RolePermissions;
}

export interface StorefrontConfig {
  store_slug: string;
  store_title: string;
  store_description: string;
  store_logo_data: string;
  store_banner_data: string;
  store_background_image_data: string;
  store_custom_html: string;
  store_preset_state: Record<string, unknown> | null;
  store_custom_full_mode: boolean;
  store_show_details: boolean;
  store_product_ids: string[];
}

export interface StorefrontProductSummary {
  id: string;
  name: string;
  description: string;
  image_data: string;
  product_type: string;
  price: number;
  quantity_in_stock: number;
  scent_family: string; fragrance_notes: string; sweetness: string; scent_strength: string; warmth: string; freshness: string; season: string; mood: string; room: string; burn_time: string; wax_type: string; wick_type: string; batch_number: string; inspiration: string; making_process: string; limited_drop: boolean; drop_number: string; purchase_limit: number; upcoming_release: boolean; release_date: string; preorders_enabled: boolean; member_exclusive: boolean; member_early_access_days: number; subscriber_exclusive: boolean; subscriber_early_access_days: number;
}

export interface StoreScentPollRecord { id: string; title: string; poll_type: 'next_scent' | 'retired_scent'; options_json?: string; active?: boolean; created_at?: string; updated_at?: string; vote_count?: number; voted_option?: string; options?: Array<{ name: string; votes: number }>; }
export interface StoreCustomScentRequestRecord { id: string; name: string; email: string; desired_notes: string; scent_family: string; occasion: string; details: string; status: 'new' | 'reviewing' | 'quoted' | 'accepted' | 'declined' | 'closed'; quote_amount: number; admin_notes: string; created_at: string; updated_at: string; }

export interface PublicStorefrontConfig extends StorefrontConfig {
  account_name: string;
  products: StorefrontProductSummary[];
}

export interface StoreCustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  marketing_opt_in: boolean;
  reminder_opt_in: boolean;
  birthday: string;
  anniversary: string;
  occasion_reminder_opt_in: boolean;
  expires_at?: string;
}

export interface StoreCustomerAddress {
  id: string;
  label: string;
  recipient_name: string;
  street_address_1: string;
  street_address_2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

export interface StoreCustomerOrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  currency: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface StoreCustomerOrderDetail extends StoreCustomerOrderSummary {
  customer_note: string;
  shipping_recipient_name: string;
  shipping_street_address_1: string;
  shipping_street_address_2: string;
  shipping_city: string;
  shipping_state_region: string;
  shipping_postal_code: string;
  shipping_country: string;
  tracking_number: string;
  items: Array<{ id: string; product_name: string; product_image_data: string; unit_price: number; quantity: number; line_total: number }>;
  payments: Array<{ id: string; provider: string; status: string; amount: number; currency: string; created_at: string }>;
}

export interface StorefrontOrderRecord extends StoreCustomerOrderSummary {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  tracking_number: string;
  staff_note: string;
  reservation_expires_at: string | null;
  paid_at: string | null;
  item_count: number;
}

export interface StoreContactMessageRecord {
  id: string;
  name: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  message: string;
  ip_address: string;
  is_read: boolean;
  read_at: string | null;
  workflow_status:
    | 'new'
    | 'custom_request'
    | 'in_progress'
    | 'awaiting_payment'
    | 'order_shipped'
    | 'completed'
    | 'closed';
  priority_level: 'none' | 'low' | 'normal' | 'high' | 'urgent';
  admin_notes: string;
  created_at: string;
}

export interface StoreContactMessageStatusCounts {
  new: { total: number; urgent: number };
  custom_request: { total: number; urgent: number };
  in_progress: { total: number; urgent: number };
  awaiting_payment: { total: number; urgent: number };
  order_shipped: { total: number; urgent: number };
  completed: { total: number; urgent: number };
  closed: { total: number; urgent: number };
}
