export type PricingInputs = {
  waxCost: number;
  waxWeightLb: number;
  fragranceUsedOz: number;
  fragranceCostUsed: number;
  candlesMade: number;
  fillPerCandleOz: number;
  jarCostEach: number;
  wickCostEach: number;
  labelCostEach: number;
  otherCostEach: number;
  laborOverheadEach: number;
};

export function parseNonNegativeNumber(input: string | number): number {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function parsePositiveWholeNumber(input: string | number): number {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

export function roundSuggestedPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 10) return Math.ceil(value * 2) / 2;
  return Math.ceil(value);
}

export function calculatePricing(inputs: PricingInputs) {
  const waxCost = parseNonNegativeNumber(inputs.waxCost);
  const waxWeightLb = parseNonNegativeNumber(inputs.waxWeightLb);
  const fragranceUsedOz = parseNonNegativeNumber(inputs.fragranceUsedOz);
  const fragranceCostUsed = parseNonNegativeNumber(inputs.fragranceCostUsed);
  const candlesMade = parsePositiveWholeNumber(inputs.candlesMade);
  const fillPerCandleOz = parseNonNegativeNumber(inputs.fillPerCandleOz);
  const jarCostEach = parseNonNegativeNumber(inputs.jarCostEach);
  const wickCostEach = parseNonNegativeNumber(inputs.wickCostEach);
  const labelCostEach = parseNonNegativeNumber(inputs.labelCostEach);
  const otherCostEach = parseNonNegativeNumber(inputs.otherCostEach);
  const laborOverheadEach = parseNonNegativeNumber(inputs.laborOverheadEach);

  const waxCostPerOz = waxWeightLb > 0 ? waxCost / (waxWeightLb * 16) : 0;
  const totalFillOz = candlesMade * fillPerCandleOz;
  const waxUsedOz = Math.max(totalFillOz - fragranceUsedOz, 0);
  const waxCostUsed = waxUsedOz * waxCostPerOz;
  const jarCostTotal = jarCostEach * candlesMade;
  const wickCostTotal = wickCostEach * candlesMade;
  const labelCostTotal = labelCostEach * candlesMade;
  const otherCostTotal = otherCostEach * candlesMade;
  const packagingCostEach = jarCostEach + wickCostEach + labelCostEach + otherCostEach;
  const packagingCostTotal = packagingCostEach * candlesMade;
  const laborOverheadTotal = laborOverheadEach * candlesMade;
  const materialsCostTotal = waxCostUsed + fragranceCostUsed + packagingCostTotal;
  const totalBatchCost = materialsCostTotal + laborOverheadTotal;
  const materialCostPerCandle = candlesMade > 0 ? materialsCostTotal / candlesMade : 0;
  const totalCostPerCandle = candlesMade > 0 ? totalBatchCost / candlesMade : 0;
  const fragranceLoadPercent = waxUsedOz > 0 ? (fragranceUsedOz / waxUsedOz) * 100 : 0;
  const wholesaleSuggestion = roundSuggestedPrice(totalCostPerCandle * 2);
  const retailSuggestion = roundSuggestedPrice(totalCostPerCandle * 3.5);
  const premiumSuggestion = roundSuggestedPrice(totalCostPerCandle * 4.5);

  return {
    waxCost,
    waxWeightLb,
    fragranceUsedOz,
    fragranceCostUsed,
    candlesMade,
    fillPerCandleOz,
    jarCostEach,
    wickCostEach,
    labelCostEach,
    otherCostEach,
    laborOverheadEach,
    waxCostPerOz,
    totalFillOz,
    waxUsedOz,
    waxCostUsed,
    jarCostTotal,
    wickCostTotal,
    labelCostTotal,
    otherCostTotal,
    packagingCostEach,
    packagingCostTotal,
    laborOverheadTotal,
    materialsCostTotal,
    totalBatchCost,
    materialCostPerCandle,
    totalCostPerCandle,
    fragranceLoadPercent,
    wholesaleSuggestion,
    retailSuggestion,
    premiumSuggestion,
  };
}
