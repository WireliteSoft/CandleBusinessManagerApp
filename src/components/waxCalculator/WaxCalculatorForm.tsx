import type { Dispatch, SetStateAction } from 'react';
import { BLENDABLE_WAX_TYPES, WAX_TYPES } from './data';

type BlendHint = {
  text: string;
};

type Props = {
  activeBlendHint: BlendHint;
  applyActiveHintBlend: () => void;
  batchCount: string;
  batchWeightOz: string;
  blendDisplayId: string;
  blendDisplayLabel: string;
  blendInputMode: 'percent' | 'weight';
  blendPercentA: string;
  blendPercentB: string;
  blendWaxPriceA: string;
  blendWaxPriceB: string;
  blendRange: string;
  blendSuggestedLoad: number;
  blendTotal: number;
  blendWeightA: string;
  blendWaxTypeAId: string;
  blendWeightB: string;
  blendWaxTypeBId: string;
  candlesPerBatch: string;
  fragranceLiquidOzInput: string;
  fragranceMode: boolean;
  fragrancePercent: string;
  onWaxTypeChange: (nextWaxTypeId: string) => void;
  selectedWaxTypeName: string;
  selectedWaxTypeRange: string;
  setBatchCount: Dispatch<SetStateAction<string>>;
  setBatchWeightOz: Dispatch<SetStateAction<string>>;
  setBlendDisplayId: Dispatch<SetStateAction<string>>;
  setBlendInputMode: Dispatch<SetStateAction<'percent' | 'weight'>>;
  setBlendPercentA: Dispatch<SetStateAction<string>>;
  setBlendPercentB: Dispatch<SetStateAction<string>>;
  setBlendWaxPriceA: Dispatch<SetStateAction<string>>;
  setBlendWaxPriceB: Dispatch<SetStateAction<string>>;
  setBlendWeightA: Dispatch<SetStateAction<string>>;
  setBlendWeightB: Dispatch<SetStateAction<string>>;
  setBlendWaxTypeAId: Dispatch<SetStateAction<string>>;
  setBlendWaxTypeBId: Dispatch<SetStateAction<string>>;
  setCandlesPerBatch: Dispatch<SetStateAction<string>>;
  setFragranceLiquidOzInput: Dispatch<SetStateAction<string>>;
  setFragranceMode: Dispatch<SetStateAction<boolean>>;
  setFragrancePercent: Dispatch<SetStateAction<string>>;
  setUseWaxBlend: Dispatch<SetStateAction<boolean>>;
  setWaxPricePerLb: Dispatch<SetStateAction<string>>;
  useWaxBlend: boolean;
  waxPricePerLb: string;
  waxTypeId: string;
};

export default function WaxCalculatorForm({
  activeBlendHint,
  applyActiveHintBlend,
  batchCount,
  batchWeightOz,
  blendDisplayId,
  blendDisplayLabel,
  blendInputMode,
  blendPercentA,
  blendPercentB,
  blendWaxPriceA,
  blendWaxPriceB,
  blendRange,
  blendSuggestedLoad,
  blendTotal,
  blendWeightA,
  blendWaxTypeAId,
  blendWeightB,
  blendWaxTypeBId,
  candlesPerBatch,
  fragranceLiquidOzInput,
  fragranceMode,
  fragrancePercent,
  onWaxTypeChange,
  selectedWaxTypeName,
  selectedWaxTypeRange,
  setBatchCount,
  setBatchWeightOz,
  setBlendDisplayId,
  setBlendInputMode,
  setBlendPercentA,
  setBlendPercentB,
  setBlendWaxPriceA,
  setBlendWaxPriceB,
  setBlendWeightA,
  setBlendWeightB,
  setBlendWaxTypeAId,
  setBlendWaxTypeBId,
  setCandlesPerBatch,
  setFragranceLiquidOzInput,
  setFragranceMode,
  setFragrancePercent,
  setUseWaxBlend,
  setWaxPricePerLb,
  useWaxBlend,
  waxPricePerLb,
  waxTypeId,
}: Props) {
  const blendWaxTypeAName =
    BLENDABLE_WAX_TYPES.find((waxType) => waxType.id === blendWaxTypeAId)?.name ?? 'Wax A';
  const blendWaxTypeBName =
    BLENDABLE_WAX_TYPES.find((waxType) => waxType.id === blendWaxTypeBId)?.name ?? 'Wax B';

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Wax + Fragrance Weight Calculator</h3>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={useWaxBlend}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setUseWaxBlend(isChecked);
                if (isChecked) {
                  if (blendWaxTypeAId === 'gel-wax') setBlendWaxTypeAId('soy');
                  if (blendWaxTypeBId === 'gel-wax') setBlendWaxTypeBId('paraffin');
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            Use Wax Blend
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={fragranceMode}
              onChange={(e) => setFragranceMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            FO Mode
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {useWaxBlend ? 'Wax Blend' : 'Wax Type'}
          </label>
          <select
            value={useWaxBlend ? blendDisplayId : waxTypeId}
            onChange={(e) => {
              if (useWaxBlend) {
                setBlendDisplayId(e.target.value);
                return;
              }
              onWaxTypeChange(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {useWaxBlend ? (
              <option value="custom-blend">{blendDisplayLabel}</option>
            ) : (
              WAX_TYPES.map((waxType) => (
                <option key={waxType.id} value={waxType.id}>
                  {waxType.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Batch Count</label>
          <input
            type="number"
            min="1"
            step="1"
            value={batchCount}
            onChange={(e) => setBatchCount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="How many batches"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Candles Per Batch</label>
          <input
            type="number"
            min="1"
            step="1"
            value={candlesPerBatch}
            onChange={(e) => setCandlesPerBatch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Candles in each batch"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {fragranceMode ? 'FO Per Batch (fl oz)' : 'Final Weight Per Candle (oz)'}
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={fragranceMode ? fragranceLiquidOzInput : batchWeightOz}
            onChange={(e) =>
              fragranceMode ? setFragranceLiquidOzInput(e.target.value) : setBatchWeightOz(e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder={
              fragranceMode
                ? 'Enter fragrance oil amount (fl oz) per batch'
                : 'Enter per-candle final fill weight'
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance Load</label>
          <select
            value={fragrancePercent}
            onChange={(e) => setFragrancePercent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="7">7%</option>
            <option value="8">8%</option>
            <option value="9">9%</option>
            <option value="10">10%</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            {useWaxBlend
              ? `Recommended for blend: ${blendRange} (suggested ${blendSuggestedLoad.toFixed(1)}%)`
              : `Recommended for ${selectedWaxTypeName}: ${selectedWaxTypeRange}`}
          </p>
        </div>
      </div>
      {!useWaxBlend && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedWaxTypeName} Price Per lb
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={waxPricePerLb}
              onChange={(e) => setWaxPricePerLb(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter wax price per lb"
            />
          </div>
        </div>
      )}
      {useWaxBlend && (
        <div className="mt-4 rounded-lg border p-4 wax-blend-builder-card">
          <h4 className="text-sm font-semibold mb-3">Custom Wax Blend Builder</h4>
          <div className="mb-3 inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setBlendInputMode('percent')}
              className={`px-3 py-2 text-sm ${
                blendInputMode === 'percent'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              Percent Mode
            </button>
            <button
              type="button"
              onClick={() => setBlendInputMode('weight')}
              className={`px-3 py-2 text-sm border-l border-gray-300 ${
                blendInputMode === 'weight'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              Weight Mode (lb)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wax A</label>
              <select
                value={blendWaxTypeAId}
                onChange={(e) => setBlendWaxTypeAId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {BLENDABLE_WAX_TYPES.map((waxType) => (
                  <option key={waxType.id} value={waxType.id}>
                    {waxType.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {blendInputMode === 'weight' ? 'Wax A Weight (lb)' : 'Wax A %'}
              </label>
              <input
                type="number"
                min="0"
                step={blendInputMode === 'weight' ? '0.1' : '1'}
                value={blendInputMode === 'weight' ? blendWeightA : blendPercentA}
                onChange={(e) =>
                  blendInputMode === 'weight'
                    ? setBlendWeightA(e.target.value)
                    : setBlendPercentA(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wax B</label>
              <select
                value={blendWaxTypeBId}
                onChange={(e) => setBlendWaxTypeBId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {BLENDABLE_WAX_TYPES.map((waxType) => (
                  <option key={waxType.id} value={waxType.id}>
                    {waxType.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {blendInputMode === 'weight' ? 'Wax B Weight (lb)' : 'Wax B %'}
              </label>
              <input
                type="number"
                min="0"
                step={blendInputMode === 'weight' ? '0.1' : '1'}
                value={blendInputMode === 'weight' ? blendWeightB : blendPercentB}
                onChange={(e) =>
                  blendInputMode === 'weight'
                    ? setBlendWeightB(e.target.value)
                    : setBlendPercentB(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {blendWaxTypeAName} Price Per lb
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={blendWaxPriceA}
                onChange={(e) => setBlendWaxPriceA(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter Wax A price per lb"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {blendWaxTypeBName} Price Per lb
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={blendWaxPriceB}
                onChange={(e) => setBlendWaxPriceB(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter Wax B price per lb"
              />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-700 space-y-1">
            {blendInputMode === 'weight' ? (
              <p>
                Derived percentages from entered weights. Example: `10 lb` + `40 lb` becomes
                `20% / 80%`.
              </p>
            ) : null}
            <p>
              Blend total: <span className="font-medium">{blendTotal.toFixed(0)}%</span>{' '}
              {blendTotal === 100 ? '(OK)' : '(set A + B to 100%)'}
            </p>
            <p>
              Suggested FO load for this blend:{' '}
              <span className="font-medium">{blendSuggestedLoad.toFixed(1)}%</span>
            </p>
            <p>
              Recommended range for blend: <span className="font-medium">{blendRange}</span>
            </p>
            <div className="mt-2 rounded-md border p-3 wax-blend-hint-box">
              <p className="text-base font-medium wax-blend-hint-text">{activeBlendHint.text}</p>
              <button
                type="button"
                onClick={applyActiveHintBlend}
                className="mt-2 px-3 py-1.5 text-sm rounded-md border transition-colors wax-blend-apply-btn"
              >
                Apply This Blend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
