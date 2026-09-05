import type { BatchLogRecord } from '../../lib/localDb';

export type BatchOutcome = 'pending' | 'pass' | 'fail';
export type PricingPriceSource = 'wholesale' | 'retail' | 'premium';

export const WAX_TYPE_OPTIONS = ['Soy', 'Coconut Wax', 'Paraffin', 'Beeswax', 'Gel Wax'] as const;

export const WICK_TYPE_OPTIONS = [
  'CD',
  'ECO',
  'HTP',
  'LX',
  'Premier 700',
  'Zinc Core',
  'Square Braid',
  'Wooden Wick',
] as const;

export const WICK_SIZE_OPTIONS_BY_TYPE: Record<(typeof WICK_TYPE_OPTIONS)[number], string[]> = {
  CD: ['CD 4', 'CD 6', 'CD 8', 'CD 10', 'CD 12'],
  ECO: ['ECO 2', 'ECO 4', 'ECO 6', 'ECO 8', 'ECO 10'],
  HTP: ['HTP 41', 'HTP 52', 'HTP 62', 'HTP 73', 'HTP 83'],
  LX: ['LX 8', 'LX 10', 'LX 12', 'LX 14', 'LX 16'],
  'Premier 700': ['700-7', '700-9', '700-11', '700-13', '700-15', '700-17', '700-19'],
  'Zinc Core': ['44-24-18', '51-32-18', '60-44-18', '62-52-18'],
  'Square Braid': ['#1/0', '#2/0', '#3/0', '#4/0', '#5/0'],
  'Wooden Wick': ['0.02 in (Thin)', '0.04 in (Medium)', '0.06 in (Thick)'],
};

export const BLENDABLE_WAX_TYPE_OPTIONS = WAX_TYPE_OPTIONS.filter((waxType) => waxType !== 'Gel Wax');

export const BLEND_HINTS = [
  {
    waxA: 'Soy',
    waxB: 'Paraffin',
    percentA: 75,
    percentB: 25,
    text: 'Common blend: Soy 75% / Paraffin 25%',
  },
  {
    waxA: 'Soy',
    waxB: 'Paraffin',
    percentA: 60,
    percentB: 40,
    text: 'Common blend: Soy 60% / Paraffin 40%',
  },
  {
    waxA: 'Soy',
    waxB: 'Coconut Wax',
    percentA: 80,
    percentB: 20,
    text: 'Common blend: Soy 80% / Coconut Wax 20%',
  },
] as const;

export type BatchForm = Omit<BatchLogRecord, 'id' | 'created_at' | 'updated_at'>;

export const INITIAL_FORM: BatchForm = {
  batch_date: new Date().toISOString().slice(0, 10),
  batch_name: '',
  candles_amount: 1,
  wax_type: '',
  container_type: '',
  container_size: '',
  wax_weight_oz: 0,
  fragrance_load: 8,
  fragrance_oil: '',
  wick_type: '',
  wick_size: '',
  wick_count: 1,
  vessel: '',
  pour_temp_f: 0,
  room_temp_f: 0,
  room_humidity: 0,
  pricing_wax_cost: 0,
  pricing_wax_weight_lb: 0,
  pricing_fragrance_used_oz: 0,
  pricing_fragrance_cost_used: 0,
  pricing_fill_per_candle_oz: 0,
  pricing_jar_cost_each: 0,
  pricing_wick_cost_each: 0,
  pricing_label_cost_each: 0,
  pricing_other_cost_each: 0,
  pricing_labor_overhead_each: 0,
  pricing_material_cost_per_candle: 0,
  pricing_total_cost_per_candle: 0,
  pricing_wholesale_suggestion: 0,
  pricing_retail_suggestion: 0,
  pricing_premium_suggestion: 0,
  pricing_cogs_source: 'total',
  pricing_price_source: 'retail',
  notes: '',
  outcome: 'pending',
};
