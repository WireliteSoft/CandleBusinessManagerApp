import { type BatchForm, type PricingPriceSource } from './config';

type PricingValues = {
  materialCostPerCandle: number;
  premiumSuggestion: number;
  retailSuggestion: number;
  totalCostPerCandle: number;
  wholesaleSuggestion: number;
};

type Props = {
  derivedFillPerCandle: number;
  derivedFragranceUsed: number;
  form: BatchForm;
  getPricingCardClass: (selected: boolean) => string;
  pricing: PricingValues;
  readOnly: boolean;
  setForm: React.Dispatch<React.SetStateAction<BatchForm>>;
};

export default function BatchPricingSnapshot({
  derivedFillPerCandle,
  derivedFragranceUsed,
  form,
  getPricingCardClass,
  pricing,
  readOnly,
  setForm,
}: Props) {
  const setPriceSource = (source: PricingPriceSource) => {
    setForm((prev) => ({ ...prev, pricing_price_source: source }));
  };

  return (
    <div className="mt-6 rounded-lg border p-4 pricing-snapshot-card">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h4 className="text-base font-semibold text-gray-800">Batch Pricing Snapshot</h4>
          <p className="text-sm text-gray-600">
            Save calculator pricing with this batch so product creation can use the batch cost and suggested price.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              pricing_fill_per_candle_oz: derivedFillPerCandle,
              pricing_fragrance_used_oz: derivedFragranceUsed,
            }))
          }
          disabled={readOnly}
          className="px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed pricing-snapshot-btn"
        >
          Pull From Batch
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wax Cost ($)</label>
          <input type="number" min="0" step="0.01" value={form.pricing_wax_cost} onChange={(e) => setForm((prev) => ({ ...prev, pricing_wax_cost: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wax Package Size (lb)</label>
          <input type="number" min="0" step="0.1" value={form.pricing_wax_weight_lb} onChange={(e) => setForm((prev) => ({ ...prev, pricing_wax_weight_lb: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance Used (oz)</label>
          <input type="number" min="0" step="0.1" value={form.pricing_fragrance_used_oz} onChange={(e) => setForm((prev) => ({ ...prev, pricing_fragrance_used_oz: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance Cost Used ($)</label>
          <input type="number" min="0" step="0.01" value={form.pricing_fragrance_cost_used} onChange={(e) => setForm((prev) => ({ ...prev, pricing_fragrance_cost_used: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fill Per Candle (oz)</label>
          <input type="number" min="0" step="0.1" value={form.pricing_fill_per_candle_oz} onChange={(e) => setForm((prev) => ({ ...prev, pricing_fill_per_candle_oz: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-gray-700 pricing-snapshot-shortcut">
          <p className="font-medium text-gray-800">Batch-derived shortcut</p>
          <p>Fill per candle: {derivedFillPerCandle.toFixed(2)} oz</p>
          <p>Total fragrance used: {derivedFragranceUsed.toFixed(2)} oz</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jar Cost Each ($)</label>
          <input type="number" min="0" step="0.01" value={form.pricing_jar_cost_each} onChange={(e) => setForm((prev) => ({ ...prev, pricing_jar_cost_each: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wick Cost Each ($)</label>
          <input type="number" min="0" step="0.01" value={form.pricing_wick_cost_each} onChange={(e) => setForm((prev) => ({ ...prev, pricing_wick_cost_each: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Label Cost Each ($)</label>
          <input type="number" min="0" step="0.01" value={form.pricing_label_cost_each} onChange={(e) => setForm((prev) => ({ ...prev, pricing_label_cost_each: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Other Cost Each ($)</label>
          <input type="number" min="0" step="0.01" value={form.pricing_other_cost_each} onChange={(e) => setForm((prev) => ({ ...prev, pricing_other_cost_each: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Labor / Overhead Each ($)</label>
          <input type="number" min="0" step="0.01" value={form.pricing_labor_overhead_each} onChange={(e) => setForm((prev) => ({ ...prev, pricing_labor_overhead_each: Number(e.target.value || 0) }))} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
        <div className={getPricingCardClass(true)}>
          <label className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Total Cost / Candle</p>
              <p className="text-xl font-semibold text-gray-900">${pricing.totalCostPerCandle.toFixed(2)}</p>
              <p className="text-[11px] text-gray-500 mt-1">Use this for COGS</p>
            </div>
            <input type="checkbox" checked onChange={() => undefined} disabled={readOnly} className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          </label>
        </div>
        {(['retail', 'premium'] as const).map((source) => (
          <div key={source} className={getPricingCardClass(form.pricing_price_source === source)}>
            <label className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">{source[0].toUpperCase() + source.slice(1)}</p>
                <p className="text-xl font-semibold text-gray-900">
                  $
                  {(source === 'retail' ? pricing.retailSuggestion : pricing.premiumSuggestion).toFixed(2)}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Use this for sale price</p>
              </div>
              <input
                type="checkbox"
                checked={form.pricing_price_source === source}
                onChange={(e) => {
                  if (!e.target.checked || readOnly) return;
                  setPriceSource(source);
                }}
                disabled={readOnly}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
