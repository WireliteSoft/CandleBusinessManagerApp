import { useEffect, useState } from 'react';
import { localDb, type BatchLogRecord } from '../lib/localDb';

export default function BatchPublicDetails({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<BatchLogRecord | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await localDb.getBatchLog(batchId);
        if (!cancelled) setBatch(row);
      } catch {
        if (!cancelled) setError('Batch not found or unavailable.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  if (error) {
    return (
      <div className="min-h-screen app-theme flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Batch Details</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen app-theme flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Batch Details</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-theme p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{batch.batch_name}</h1>
        <p className="text-sm text-gray-600 mb-4">Batch Date: {batch.batch_date}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Candles Amount</p>
            <p className="font-medium text-gray-800">
              {batch.candles_amount > 0 ? batch.candles_amount : '-'}
            </p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Wax Type</p>
            <p className="font-medium text-gray-800">{batch.wax_type || '-'}</p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Wax Weight</p>
            <p className="font-medium text-gray-800">{batch.wax_weight_oz} oz</p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Fragrance Load</p>
            <p className="font-medium text-gray-800">{batch.fragrance_load}%</p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Fragrance Oil</p>
            <p className="font-medium text-gray-800">{batch.fragrance_oil || '-'}</p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Wick Type</p>
            <p className="font-medium text-gray-800">{batch.wick_type || '-'}</p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Wick Count</p>
            <p className="font-medium text-gray-800">{batch.wick_count}</p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Container</p>
            <p className="font-medium text-gray-800">
              {batch.container_type || '-'} {batch.container_size ? `(${batch.container_size})` : ''}
            </p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Pour Temp</p>
            <p className="font-medium text-gray-800">{batch.pour_temp_f} F</p>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <p className="text-gray-500">Room Conditions</p>
            <p className="font-medium text-gray-800">
              {batch.room_temp_f} F, {batch.room_humidity}% humidity
            </p>
          </div>
        </div>

        <div className="mt-4 rounded border border-gray-200 p-3">
          <p className="text-gray-500 text-sm">Notes</p>
          <p className="text-gray-800 text-sm whitespace-pre-wrap">{batch.notes || '-'}</p>
        </div>
        {(batch.pricing_total_cost_per_candle > 0 || batch.pricing_retail_suggestion > 0) && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Pricing Snapshot</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-3">
                <p className="text-gray-500">Cost Per Candle</p>
                <p className="font-medium text-gray-800">${batch.pricing_total_cost_per_candle.toFixed(2)}</p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-gray-500">Retail Suggestion</p>
                <p className="font-medium text-gray-800">${batch.pricing_retail_suggestion.toFixed(2)}</p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-gray-500">Selected COGS Source</p>
                <p className="font-medium text-gray-800">
                  Total Cost / Candle
                </p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-gray-500">Selected Price Source</p>
                <p className="font-medium text-gray-800">
                  {batch.pricing_price_source === 'premium'
                      ? 'Premium'
                      : 'Retail'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
