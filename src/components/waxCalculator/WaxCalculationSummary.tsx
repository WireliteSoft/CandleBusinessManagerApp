import { GRAMS_PER_OUNCE } from './data';

type BlendBreakdownItem = {
  key: string;
  name: string;
  percent: number;
  totalOz: number;
  totalLb: number;
  perCandleOz: number;
  pricePerLb: number;
  totalCost: number;
};

type Props = {
  blendWaxBreakdown: BlendBreakdownItem[];
  candleCount: number;
  fragranceMode: boolean;
  fragrancePerCandleOz: number;
  fragranceWeightOz: number;
  parsedBatchCount: number;
  parsedCandlesPerBatch: number;
  totalBlendWeightOz: number;
  useWaxBlend: boolean;
  waxCostPerCandle: number;
  waxCostTotal: number;
  waxWeightLb: number;
  waxPerCandleOz: number;
  waxWeightOz: number;
};

export default function WaxCalculationSummary({
  blendWaxBreakdown,
  candleCount,
  fragranceMode,
  fragrancePerCandleOz,
  fragranceWeightOz,
  parsedBatchCount,
  parsedCandlesPerBatch,
  totalBlendWeightOz,
  useWaxBlend,
  waxCostPerCandle,
  waxCostTotal,
  waxWeightLb,
  waxPerCandleOz,
  waxWeightOz,
}: Props) {
  return (
    <>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-gray-200 p-4 bg-orange-50/50 wax-summary-card wax-summary-card-wax">
          <p className="text-gray-600">Wax Weight Needed (Batch Total)</p>
          <p className="text-xl font-semibold text-gray-900">{waxWeightOz.toFixed(2)} oz</p>
          <p className="text-xs text-gray-500 mt-1">
            {(waxWeightOz * GRAMS_PER_OUNCE).toFixed(1)} g
          </p>
          <p className="text-xs text-gray-500 mt-1">{waxWeightLb.toFixed(2)} lb</p>
          <p className="text-xs text-gray-500 mt-1">Per candle: {waxPerCandleOz.toFixed(2)} oz</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 bg-amber-50/60 wax-summary-card wax-summary-card-fragrance">
          <p className="text-gray-600">Fragrance Weight Needed (Batch Total)</p>
          <p className="text-xl font-semibold text-gray-900">{fragranceWeightOz.toFixed(2)} oz</p>
          <p className="text-xs text-gray-500 mt-1">
            {(fragranceWeightOz * GRAMS_PER_OUNCE).toFixed(1)} g
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Per candle: {fragrancePerCandleOz.toFixed(2)} oz
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 bg-emerald-50/60">
          <p className="text-gray-600">Wax Cost Needed</p>
          <p className="text-xl font-semibold text-gray-900">${waxCostTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Per candle: ${waxCostPerCandle.toFixed(2)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        {parsedBatchCount} batch{parsedBatchCount === 1 ? '' : 'es'} x {parsedCandlesPerBatch}{' '}
        candle{parsedCandlesPerBatch === 1 ? '' : 's'} = {candleCount} total candle
        {candleCount === 1 ? '' : 's'}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        Total blend weight for {parsedBatchCount} batch{parsedBatchCount === 1 ? '' : 'es'}:{' '}
        {totalBlendWeightOz.toFixed(2)} oz ({(totalBlendWeightOz * GRAMS_PER_OUNCE).toFixed(1)} g)
      </p>
      {fragranceMode && (
        <p className="mt-2 text-xs text-gray-500">
          Fragrance mode estimates wax from FO input using your selected load %. FO fl oz is
          treated approximately as oz for planning.
        </p>
      )}
      {useWaxBlend && blendWaxBreakdown.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Blend Wax Weight Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blendWaxBreakdown.map((item) => (
              <div key={item.key} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-semibold text-gray-800">
                  {item.name} ({item.percent.toFixed(0)}%)
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Add: <span className="font-medium">{item.totalOz.toFixed(2)} oz</span> (
                  {(item.totalOz * GRAMS_PER_OUNCE).toFixed(1)} g)
                </p>
                <p className="text-xs text-gray-500 mt-1">{item.totalLb.toFixed(2)} lb used</p>
                <p className="text-xs text-gray-500 mt-1">
                  Per candle: {item.perCandleOz.toFixed(2)} oz
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Price: ${item.pricePerLb.toFixed(2)}/lb
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  Wax cost: ${item.totalCost.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
