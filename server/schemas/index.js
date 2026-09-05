import { z } from 'zod';

const productInput = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  image_data: z.string().optional().default(''),
  product_type: z.enum(['physical', 'sample', 'bundle', 'custom', 'subscription', 'gift_card', 'service']).optional().default('physical'),
  scent_family: z.string().max(80).optional().default(''), fragrance_notes: z.string().max(500).optional().default(''), sweetness: z.string().max(40).optional().default(''), scent_strength: z.string().max(40).optional().default(''), warmth: z.string().max(40).optional().default(''), freshness: z.string().max(40).optional().default(''), season: z.string().max(80).optional().default(''), mood: z.string().max(80).optional().default(''), room: z.string().max(80).optional().default(''), burn_time: z.string().max(80).optional().default(''), wax_type: z.string().max(80).optional().default(''), wick_type: z.string().max(80).optional().default(''), batch_number: z.string().max(120).optional().default(''), inspiration: z.string().max(2000).optional().default(''), making_process: z.string().max(2000).optional().default(''), limited_drop: z.boolean().optional().default(false), drop_number: z.string().max(120).optional().default(''), purchase_limit: z.number().int().nonnegative().max(10000).optional().default(0), upcoming_release: z.boolean().optional().default(false), release_date: z.string().max(40).optional().default(''), preorders_enabled: z.boolean().optional().default(false), member_exclusive: z.boolean().optional().default(false), member_early_access_days: z.number().int().min(0).max(365).optional().default(0), subscriber_exclusive: z.boolean().optional().default(false), subscriber_early_access_days: z.number().int().min(0).max(365).optional().default(0),
  price: z.number().finite(),
  quantity_in_stock: z.number().int().nonnegative(),
  cost_per_unit: z.number().finite(),
}).superRefine((data, issue) => {
  if (data.product_type === 'gift_card' && (data.price < 5 || data.price > 500 || Math.round(data.price * 100) % 500 !== 0)) {
    issue.addIssue({ code: 'custom', path: ['price'], message: 'Gift cards must be valued from $5 to $500 in $5 increments.' });
  }
});

const supplyInput = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  category: z.string().optional().default('containers'),
  cost_per_unit: z.number().finite(),
  quantity_in_stock: z.number().int().nonnegative(),
  unit_type: z.string().min(1),
  supplier: z.string().optional().default(''),
});

const waxInventoryInput = z.object({
  wax_type_id: z.string().min(1),
  wax_name: z.string().min(1),
  pounds: z.number().nonnegative().optional().default(0),
  total_price: z.number().nonnegative().optional().default(0),
  selected: z.boolean().optional().default(false),
});

const scentProfileInput = z.object({
  supplier: z.string().max(120).optional().default(''),
  supplier_sku: z.string().max(120).optional().default(''),
  name: z.string().min(1).max(160),
  scent_family: z.string().max(80).optional().default(''),
  top_notes: z.string().max(500).optional().default(''),
  middle_notes: z.string().max(500).optional().default(''),
  base_notes: z.string().max(500).optional().default(''),
  flashpoint_f: z.number().min(-100).max(1000).nullable().optional(),
  vanillin_content: z.string().max(80).optional().default(''),
  phthalate_free: z.boolean().optional().default(false),
  prop65_warning: z.boolean().optional().default(false),
  soy_performance: z.string().max(160).optional().default(''),
  recommended_load: z.string().max(80).optional().default(''),
  usage_notes: z.string().max(2000).optional().default(''),
  source_url: z.string().max(2000).optional().default(''),
  source_attribution: z.string().max(240).optional().default(''),
});

const employeeInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  picture_data: z.string().optional().default(''),
  commission_rate: z.number().min(0).max(1),
  active: z.boolean(),
});

const saleInput = z.object({
  product_id: z.string().min(1),
  employee_id: z.string().min(1).nullable(),
  quantity: z.number().int().positive(),
  sale_price: z.number().finite(),
  total_amount: z.number().finite(),
  commission_amount: z.number().finite(),
});

const recipeInput = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  yield_quantity: z.number().int().positive(),
  batch_size: z.number().positive(),
  difficulty_level: z.string().min(1),
  notes: z.string().optional().default(''),
});

const ingredientInput = z.object({
  recipe_id: z.string().min(1),
  supply_id: z.string().min(1),
  quantity: z.number().positive(),
  percentage: z.number().nonnegative(),
  notes: z.string().optional().default(''),
});
const batchLogCreateInput = z.object({
  batch_date: z.string().min(1),
  batch_name: z.string().min(1),
  candles_amount: z.number().int().nonnegative().optional().default(1),
  wax_type: z.string().optional().default(''),
  container_type: z.string().optional().default(''),
  container_size: z.string().optional().default(''),
  wax_weight_oz: z.number().nonnegative(),
  fragrance_load: z.number().min(0).max(100),
  fragrance_oil: z.string().optional().default(''),
  wick_type: z.string().optional().default(''),
  wick_size: z.string().optional().default(''),
  wick_count: z.number().int().positive().optional().default(1),
  vessel: z.string().optional().default(''),
  pour_temp_f: z.number().nonnegative().optional().default(0),
  room_temp_f: z.number().nonnegative().optional().default(0),
  room_humidity: z.number().min(0).max(100).optional().default(0),
  pricing_wax_cost: z.number().nonnegative().optional().default(0),
  pricing_wax_weight_lb: z.number().nonnegative().optional().default(0),
  pricing_fragrance_used_oz: z.number().nonnegative().optional().default(0),
  pricing_fragrance_cost_used: z.number().nonnegative().optional().default(0),
  pricing_fill_per_candle_oz: z.number().nonnegative().optional().default(0),
  pricing_jar_cost_each: z.number().nonnegative().optional().default(0),
  pricing_wick_cost_each: z.number().nonnegative().optional().default(0),
  pricing_label_cost_each: z.number().nonnegative().optional().default(0),
  pricing_other_cost_each: z.number().nonnegative().optional().default(0),
  pricing_labor_overhead_each: z.number().nonnegative().optional().default(0),
  pricing_material_cost_per_candle: z.number().nonnegative().optional().default(0),
  pricing_total_cost_per_candle: z.number().nonnegative().optional().default(0),
  pricing_wholesale_suggestion: z.number().nonnegative().optional().default(0),
  pricing_retail_suggestion: z.number().nonnegative().optional().default(0),
  pricing_premium_suggestion: z.number().nonnegative().optional().default(0),
  pricing_cogs_source: z.enum(['total']).optional().default('total'),
  pricing_price_source: z.enum(['wholesale', 'retail', 'premium']).optional().default('retail'),
  notes: z.string().optional().default(''),
  outcome: z.enum(['pending', 'pass', 'fail']).optional().default('pending'),
});
const batchLogUpdateInput = z.object({
  batch_date: z.string().min(1).optional(),
  batch_name: z.string().min(1).optional(),
  candles_amount: z.number().int().nonnegative().optional(),
  wax_type: z.string().optional(),
  container_type: z.string().optional(),
  container_size: z.string().optional(),
  wax_weight_oz: z.number().nonnegative().optional(),
  fragrance_load: z.number().min(0).max(100).optional(),
  fragrance_oil: z.string().optional(),
  wick_type: z.string().optional(),
  wick_size: z.string().optional(),
  wick_count: z.number().int().positive().optional(),
  vessel: z.string().optional(),
  pour_temp_f: z.number().nonnegative().optional(),
  room_temp_f: z.number().nonnegative().optional(),
  room_humidity: z.number().min(0).max(100).optional(),
  pricing_wax_cost: z.number().nonnegative().optional(),
  pricing_wax_weight_lb: z.number().nonnegative().optional(),
  pricing_fragrance_used_oz: z.number().nonnegative().optional(),
  pricing_fragrance_cost_used: z.number().nonnegative().optional(),
  pricing_fill_per_candle_oz: z.number().nonnegative().optional(),
  pricing_jar_cost_each: z.number().nonnegative().optional(),
  pricing_wick_cost_each: z.number().nonnegative().optional(),
  pricing_label_cost_each: z.number().nonnegative().optional(),
  pricing_other_cost_each: z.number().nonnegative().optional(),
  pricing_labor_overhead_each: z.number().nonnegative().optional(),
  pricing_material_cost_per_candle: z.number().nonnegative().optional(),
  pricing_total_cost_per_candle: z.number().nonnegative().optional(),
  pricing_wholesale_suggestion: z.number().nonnegative().optional(),
  pricing_retail_suggestion: z.number().nonnegative().optional(),
  pricing_premium_suggestion: z.number().nonnegative().optional(),
  pricing_cogs_source: z.enum(['total']).optional(),
  pricing_price_source: z.enum(['wholesale', 'retail', 'premium']).optional(),
  notes: z.string().optional(),
  outcome: z.enum(['pending', 'pass', 'fail']).optional(),
});
const moldCreateInput = z.object({
  name: z.string().min(1),
  weight_oz: z.number().positive(),
  image_data: z.string().optional().default(''),
});
const moldUpdateInput = z.object({
  name: z.string().min(1).optional(),
  weight_oz: z.number().positive().optional(),
  image_data: z.string().optional(),
});
const banAppealCreateInput = z.object({
  account_identifier: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal('')),
  name: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(3).max(200),
  details: z.string().trim().min(8).max(3000),
});
const banAppealMessageInput = z.object({
  message: z.string().trim().min(1).max(3000),
});
const banAppealStatusInput = z.object({
  status: z.enum(['open', 'in_review', 'resolved', 'rejected']),
});
const banAppealEvidenceInput = z
  .object({
    note: z.string().trim().max(5000).optional().default(''),
    image_data: z.string().max(12_000_000).optional().default(''),
  })
  .refine((data) => Boolean((data.note || '').trim()) || Boolean((data.image_data || '').trim()), {
    message: 'Evidence note or image is required',
  });

const useStockInput = z.object({
  amount: z.number().int().positive(),
});
const saleEmployeeUpdateInput = z.object({
  employee_id: z.string().min(1).nullable(),
});
const authRegisterInput = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  password_confirm: z.string().min(6),
});
const authLoginInput = z.object({
  identifier: z.string().min(2),
  password: z.string().min(6),
});
const authRequestAccessInput = z.object({
  account_name: z.string().min(2),
  join_code: z.string().min(4),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  password_confirm: z.string().min(6),
});
const authCreateUserInput = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().trim().min(2).max(40).optional().default('member'),
});
const superAdminLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const superAdminDbRowUpdateInput = z.object({
  pk: z.record(z.string(), z.unknown()),
  values: z.record(z.string(), z.unknown()),
});
const superAdminDbRowDeleteInput = z.object({
  pk: z.record(z.string(), z.unknown()),
});
const billingTierInput = z.object({
  tier: z.enum(['free', 'standard', 'pro', 'elite']),
});
const superAdminAccountTierInput = z.object({
  tier: z.enum(['free', 'standard', 'pro', 'elite']),
});
const billingCheckoutInput = z.object({
  tier: z.enum(['free', 'standard', 'pro', 'elite']),
  billing_cycle: z.enum(['monthly', 'yearly']),
  payment_method: z.enum(['free', 'card', 'apple_pay', 'google_pay', 'paypal']),
  source_id: z.string().trim().min(10).optional(),
  billing_terms_version: z.string().trim().min(1).max(100).optional(),
  billing_terms_accepted_at: z.string().datetime().optional(),
});
const billingPayPalOrderInput = z.object({
  tier: z.enum(['free', 'standard', 'pro', 'elite']),
  billing_cycle: z.enum(['monthly', 'yearly']),
  billing_terms_version: z.string().trim().min(1).max(100),
  billing_terms_accepted_at: z.string().datetime(),
});
const billingPayPalCaptureInput = z.object({
  order_id: z.string().trim().min(5),
});
const accountBillingProfileInput = z.object({
  billing_name: z.string().trim().max(120).optional().default(''),
  billing_email: z.string().trim().email().max(320).optional().or(z.literal('')).default(''),
  billing_phone: z.string().trim().max(40).optional().default(''),
  company_name: z.string().trim().max(120).optional().default(''),
  street_address_1: z.string().trim().max(200).optional().default(''),
  street_address_2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().max(120).optional().default(''),
  state_region: z.string().trim().max(120).optional().default(''),
  postal_code: z.string().trim().max(30).optional().default(''),
  country: z.string().trim().max(120).optional().default(''),
  preferred_payment_method: z.enum(['card', 'apple_pay', 'google_pay', 'paypal', 'manual']).optional().default('card'),
  paypal_email: z.string().trim().email().max(320).optional().or(z.literal('')).default(''),
  payment_profile_note: z.string().trim().max(500).optional().default(''),
});
const billingConfigInput = z.object({
  standard_monthly_usd: z.number().nonnegative(),
  standard_yearly_usd: z.number().nonnegative(),
  pro_monthly_usd: z.number().nonnegative(),
  pro_yearly_usd: z.number().nonnegative(),
  elite_monthly_usd: z.number().nonnegative(),
  elite_yearly_usd: z.number().nonnegative(),
  currency: z.string().trim().min(3).max(8).optional().default('USD'),
});
const teamRoleCreateInput = z.object({
  name: z.string().trim().min(2).max(40),
});
const teamRolePermissionsInput = z.object({
  permissions: z.record(z.string(), z.boolean()),
});
const storefrontUpdateInput = z.object({
  store_slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_-]{1,39}$/),
  store_title: z.string().trim().max(120).optional().default(''),
  store_description: z.string().trim().max(5000).optional().default(''),
  store_logo_data: z.string().max(12_000_000).optional().default(''),
  store_banner_data: z.string().max(12_000_000).optional().default(''),
  store_background_image_data: z.string().max(12_000_000).optional().default(''),
  store_custom_html: z.string().max(60_000_000).optional().default(''),
  store_preset_state: z.union([z.record(z.string(), z.unknown()), z.null()]).optional().default(null),
  store_custom_full_mode: z.boolean().optional().default(false),
  store_show_details: z.boolean().optional().default(true),
  store_product_ids: z.array(z.string().min(1)).max(500).optional().default([]),
});
const storefrontImageUploadInput = z.object({
  data_url: z.string().max(12_000_000),
});
const storefrontFontUploadInput = z.object({
  data_url: z.string().max(25_000_000),
  file_name: z.string().trim().min(3).max(200),
});
const publicStoreContactInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  street_address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
  zip: z.string().trim().min(1).max(20),
  phone: z.string().trim().min(1).max(40),
  message: z.string().trim().min(1).max(10_000),
});
const storeCustomerRegisterInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  password_confirm: z.string().min(8).max(200),
  referral_code: z.string().trim().max(80).optional().default(''),
});
const storeCustomerLoginInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
});
const storeCustomerProfileInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(''),
  marketing_opt_in: z.boolean().optional().default(false),
  reminder_opt_in: z.boolean().optional().default(false),
  birthday: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).optional().default(''),
  anniversary: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).optional().default(''),
  occasion_reminder_opt_in: z.boolean().optional().default(false),
});
const storeCustomerAddressInput = z.object({
  label: z.string().trim().max(60).optional().default(''),
  recipient_name: z.string().trim().min(2).max(120),
  street_address_1: z.string().trim().min(1).max(200),
  street_address_2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(1).max(120),
  state_region: z.string().trim().min(1).max(120),
  postal_code: z.string().trim().min(1).max(30),
  country: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(''),
  is_default: z.boolean().optional().default(false),
});
const storeOrderCreateInput = z.object({
  items: z.array(z.object({
    product_id: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
    customization: z.object({ size: z.string().max(120).optional().default(''), scent: z.string().max(120).optional().default(''), wick: z.string().max(120).optional().default(''), label: z.string().max(240).optional().default(''), label_date: z.string().max(40).optional().default(''), label_message: z.string().max(240).optional().default(''), label_logo_data: z.string().max(7000000).optional().default(''), label_style: z.enum(['classic', 'minimal', 'celebration']).optional().default('classic'), label_approval_status: z.enum(['pending_review', 'approved', 'changes_requested']).optional().default('pending_review'), label_production_notes: z.string().max(1000).optional().default(''), extras: z.array(z.string().max(120)).max(12).optional().default([]) }).optional(),
  })).min(1).max(100),
  shipping_address_id: z.string().min(1).optional(),
  delivery_method: z.enum(['shipping', 'pickup']).optional().default('shipping'),
  pickup_slot_at: z.string().datetime().optional().default(''),
  gift_card_code: z.string().trim().min(4).max(80).optional().default(''),
  gift_card_terms_accepted: z.boolean().optional().default(false),
  gift_card_delivery_method: z.enum(['digital', 'physical']).optional().default('digital'),
  customer_credit_id: z.string().min(1).optional().default(''),
  discount_code: z.string().trim().min(2).max(80).optional().default(''),
  customer_note: z.string().trim().max(2_000).optional().default(''),
});
const storeOrderSquarePaymentInput = z.object({
  order_id: z.string().min(1),
  source_id: z.string().trim().min(10),
});
const storeOrderPayPalInput = z.object({
  order_id: z.string().min(1),
});
const storefrontOrderUpdateInput = z.object({
  status: z.enum(['awaiting_payment', 'paid', 'in_production', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  fulfillment_status: z.enum(['unfulfilled', 'in_production', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled']).optional(),
  tracking_number: z.string().trim().max(160).optional(),
  staff_note: z.string().trim().max(5_000).optional(),
});
const contactMessageReadInput = z.object({
  is_read: z.boolean(),
});
const contactMessageWorkflowInput = z.object({
  workflow_status: z.enum([
    'new',
    'custom_request',
    'in_progress',
    'awaiting_payment',
    'order_shipped',
    'completed',
    'closed',
  ]),
  priority_level: z.enum(['none', 'low', 'normal', 'high', 'urgent']),
  admin_notes: z.string().max(5000).optional().default(''),
});

const TEAM_FEATURE_KEYS = [
  'products',
  'products_edit',
  'supplies',
  'supplies_edit',
  'recipes',
  'recipes_edit',
  'calculators',
  'calculators_edit',
  'batches',
  'batches_edit',
  'labels',
  'labels_edit',
  'storefront',
  'storefront_edit',
  'teams',
  'teams_access',
  'teams_access_edit',
  'teams_employees',
  'teams_employees_edit',
  'teams_roles',
  'teams_roles_edit',
  'teams_contacts',
  'teams_contacts_edit',
];
const accountStateInput = z
  .object({
    value: z.boolean(),
    reason: z.string().trim().min(3).max(200).optional(),
    evidence_note: z.string().trim().max(5000).optional(),
    evidence_image_data: z.string().max(12_000_000).optional(),
    evidence_images_data: z.array(z.string().max(12_000_000)).max(12).optional(),
    evidenceNote: z.string().trim().max(5000).optional(),
    evidenceImageData: z.string().max(12_000_000).optional(),
    evidenceImagesData: z.array(z.string().max(12_000_000)).max(12).optional(),
  })
  .transform((data) => ({
    ...data,
    evidence_note: data.evidence_note ?? data.evidenceNote ?? '',
    evidence_image_data: data.evidence_image_data ?? data.evidenceImageData ?? '',
    evidence_images_data: data.evidence_images_data ?? data.evidenceImagesData ?? [],
  }));

export {
  productInput,
  supplyInput,
  waxInventoryInput,
  scentProfileInput,
  employeeInput,
  saleInput,
  recipeInput,
  ingredientInput,
  batchLogCreateInput,
  batchLogUpdateInput,
  moldCreateInput,
  moldUpdateInput,
  banAppealCreateInput,
  banAppealMessageInput,
  banAppealStatusInput,
  banAppealEvidenceInput,
  useStockInput,
  saleEmployeeUpdateInput,
  authRegisterInput,
  authLoginInput,
  authRequestAccessInput,
  authCreateUserInput,
  superAdminLoginInput,
  superAdminDbRowUpdateInput,
  superAdminDbRowDeleteInput,
  billingTierInput,
  superAdminAccountTierInput,
  billingCheckoutInput,
  billingPayPalOrderInput,
  billingPayPalCaptureInput,
  accountBillingProfileInput,
  billingConfigInput,
  teamRoleCreateInput,
  teamRolePermissionsInput,
  storefrontUpdateInput,
  storefrontImageUploadInput,
  storefrontFontUploadInput,
  publicStoreContactInput,
  storeCustomerRegisterInput,
  storeCustomerLoginInput,
  storeCustomerProfileInput,
  storeCustomerAddressInput,
  storeOrderCreateInput,
  storeOrderSquarePaymentInput,
  storeOrderPayPalInput,
  storefrontOrderUpdateInput,
  contactMessageReadInput,
  contactMessageWorkflowInput,
  TEAM_FEATURE_KEYS,
  accountStateInput,
};

