import { toRowDates } from './http.js';

export function normalizeBatchLogRow(row) {
  const normalized = toRowDates(row);
  return {
    ...normalized,
    candles_amount: Number(normalized.candles_amount ?? 0),
    wax_weight_oz: Number(normalized.wax_weight_oz),
    fragrance_load: Number(normalized.fragrance_load),
    wick_count: Number(normalized.wick_count ?? 1),
    pour_temp_f: Number(normalized.pour_temp_f),
    room_temp_f: Number(normalized.room_temp_f),
    room_humidity: Number(normalized.room_humidity),
    pricing_wax_cost: Number(normalized.pricing_wax_cost ?? 0),
    pricing_wax_weight_lb: Number(normalized.pricing_wax_weight_lb ?? 0),
    pricing_fragrance_used_oz: Number(normalized.pricing_fragrance_used_oz ?? 0),
    pricing_fragrance_cost_used: Number(normalized.pricing_fragrance_cost_used ?? 0),
    pricing_fill_per_candle_oz: Number(normalized.pricing_fill_per_candle_oz ?? 0),
    pricing_jar_cost_each: Number(normalized.pricing_jar_cost_each ?? 0),
    pricing_wick_cost_each: Number(normalized.pricing_wick_cost_each ?? 0),
    pricing_label_cost_each: Number(normalized.pricing_label_cost_each ?? 0),
    pricing_other_cost_each: Number(normalized.pricing_other_cost_each ?? 0),
    pricing_labor_overhead_each: Number(normalized.pricing_labor_overhead_each ?? 0),
    pricing_material_cost_per_candle: Number(normalized.pricing_material_cost_per_candle ?? 0),
    pricing_total_cost_per_candle: Number(normalized.pricing_total_cost_per_candle ?? 0),
    pricing_wholesale_suggestion: Number(normalized.pricing_wholesale_suggestion ?? 0),
    pricing_retail_suggestion: Number(normalized.pricing_retail_suggestion ?? 0),
    pricing_premium_suggestion: Number(normalized.pricing_premium_suggestion ?? 0),
    pricing_cogs_source: 'total',
    pricing_price_source:
      normalized.pricing_price_source === 'wholesale' ||
      normalized.pricing_price_source === 'premium'
        ? normalized.pricing_price_source
        : 'retail',
  };
}

export function normalizeMoldRow(row) {
  const normalized = toRowDates(row);
  return {
    ...normalized,
    weight_oz: Number(normalized.weight_oz),
  };
}
