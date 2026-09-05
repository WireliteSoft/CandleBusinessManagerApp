import { useMemo, useState } from 'react';
import { DollarSign, PackageCheck } from 'lucide-react';
import { calculatePricing, parseNonNegativeNumber, parsePositiveWholeNumber } from '../lib/pricing';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits);
}

export default function PricingCalculator() {
  const [waxCost, setWaxCost] = useState('39');
  const [waxWeightLb, setWaxWeightLb] = useState('10');
  const [fragranceUsedOz, setFragranceUsedOz] = useState('2');
  const [fragranceCostUsed, setFragranceCostUsed] = useState('3.49');
  const [candlesMade, setCandlesMade] = useState('8');
  const [fillPerCandleOz, setFillPerCandleOz] = useState('8');
  const [jarCostEach, setJarCostEach] = useState('0');
  const [wickCostEach, setWickCostEach] = useState('0');
  const [labelCostEach, setLabelCostEach] = useState('0');
  const [otherCostEach, setOtherCostEach] = useState('0');
  const [laborOverheadEach, setLaborOverheadEach] = useState('0');

  const waxCostValue = useMemo(() => parseNonNegativeNumber(waxCost), [waxCost]);
  const waxWeightLbValue = useMemo(() => parseNonNegativeNumber(waxWeightLb), [waxWeightLb]);
  const fragranceUsedOzValue = useMemo(
    () => parseNonNegativeNumber(fragranceUsedOz),
    [fragranceUsedOz]
  );
  const fragranceCostUsedValue = useMemo(
    () => parseNonNegativeNumber(fragranceCostUsed),
    [fragranceCostUsed]
  );
  const candlesMadeValue = useMemo(() => parsePositiveWholeNumber(candlesMade), [candlesMade]);
  const fillPerCandleOzValue = useMemo(
    () => parseNonNegativeNumber(fillPerCandleOz),
    [fillPerCandleOz]
  );
  const jarCostEachValue = useMemo(() => parseNonNegativeNumber(jarCostEach), [jarCostEach]);
  const wickCostEachValue = useMemo(() => parseNonNegativeNumber(wickCostEach), [wickCostEach]);
  const labelCostEachValue = useMemo(() => parseNonNegativeNumber(labelCostEach), [labelCostEach]);
  const otherCostEachValue = useMemo(() => parseNonNegativeNumber(otherCostEach), [otherCostEach]);
  const laborOverheadEachValue = useMemo(
    () => parseNonNegativeNumber(laborOverheadEach),
    [laborOverheadEach]
  );

  const pricing = useMemo(
    () =>
      calculatePricing({
        waxCost: waxCostValue,
        waxWeightLb: waxWeightLbValue,
        fragranceUsedOz: fragranceUsedOzValue,
        fragranceCostUsed: fragranceCostUsedValue,
        candlesMade: candlesMadeValue,
        fillPerCandleOz: fillPerCandleOzValue,
        jarCostEach: jarCostEachValue,
        wickCostEach: wickCostEachValue,
        labelCostEach: labelCostEachValue,
        otherCostEach: otherCostEachValue,
        laborOverheadEach: laborOverheadEachValue,
      }),
    [
      candlesMadeValue,
      fillPerCandleOzValue,
      fragranceCostUsedValue,
      fragranceUsedOzValue,
      jarCostEachValue,
      labelCostEachValue,
      laborOverheadEachValue,
      otherCostEachValue,
      waxCostValue,
      waxWeightLbValue,
      wickCostEachValue,
    ]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-6 h-6 text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-800">Pricing Calculator</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Cost Inputs</h3>
          <p className="text-sm text-gray-600">
            Uses finished fill weight. Fragrance cost should be the total used for this production run.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wax Cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={waxCost}
              onChange={(e) => setWaxCost(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wax Package Size (lb)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={waxWeightLb}
              onChange={(e) => setWaxWeightLb(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance Used (oz)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={fragranceUsedOz}
              onChange={(e) => setFragranceUsedOz(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance Cost Used ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fragranceCostUsed}
              onChange={(e) => setFragranceCostUsed(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Candles Made</label>
            <input
              type="number"
              min="1"
              step="1"
              value={candlesMade}
              onChange={(e) => setCandlesMade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fill Per Candle (oz)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={fillPerCandleOz}
              onChange={(e) => setFillPerCandleOz(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jar Cost Each ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={jarCostEach}
              onChange={(e) => setJarCostEach(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wick Cost Each ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={wickCostEach}
              onChange={(e) => setWickCostEach(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label Cost Each ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={labelCostEach}
              onChange={(e) => setLabelCostEach(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Other Cost Each ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={otherCostEach}
              onChange={(e) => setOtherCostEach(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Labor / Overhead Each ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={laborOverheadEach}
              onChange={(e) => setLaborOverheadEach(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Material Cost / Candle</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(pricing.materialCostPerCandle)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Cost / Candle</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(pricing.totalCostPerCandle)}</p>
          <p className="text-xs text-gray-500 mt-2">Includes labor and overhead.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Batch Material Cost</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(pricing.materialsCostTotal)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Estimated FO / EO Load</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(pricing.fragranceLoadPercent, 1)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PackageCheck className="w-5 h-5 text-sky-600" />
          <h3 className="text-lg font-semibold text-gray-800">Production Breakdown</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Wax Cost Per Ounce</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.waxCostPerOz)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Total Fill Produced</p>
            <p className="font-semibold text-gray-900 mt-1">{formatNumber(pricing.totalFillOz, 1)} oz</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Estimated Wax Used</p>
            <p className="font-semibold text-gray-900 mt-1">{formatNumber(pricing.waxUsedOz, 1)} oz</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Wax Cost Used</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.waxCostUsed)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Fragrance Cost Used</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(fragranceCostUsedValue)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Jar Cost Total</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.jarCostTotal)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Wick Cost Total</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.wickCostTotal)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Labels Total</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.labelCostTotal)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Other Cost Total</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.otherCostTotal)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Packaging + Other Total</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.packagingCostTotal)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Labor + Overhead Total</p>
            <p className="font-semibold text-gray-900 mt-1">{formatCurrency(pricing.laborOverheadTotal)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sale Price Suggestions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm font-medium text-sky-700">Standard Retail</p>
            <p className="text-3xl font-bold text-sky-900 mt-2">{formatCurrency(pricing.retailSuggestion)}</p>
            <p className="text-xs text-sky-800 mt-2">About 3.5x total cost for a balanced retail margin.</p>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm font-medium text-violet-700">Premium Retail</p>
            <p className="text-3xl font-bold text-violet-900 mt-2">{formatCurrency(pricing.premiumSuggestion)}</p>
            <p className="text-xs text-violet-800 mt-2">About 4.5x total cost for stronger margins or luxury positioning.</p>
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          These are starting-point suggestions, not fixed rules. Local market, jar style, branding, and shipping can justify pricing above or below these numbers.
        </div>
      </div>
    </div>
  );
}
