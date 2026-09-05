import { useEffect, useMemo, useState } from 'react';
import { WAX_TYPES, areWaxTypesCompatible } from './waxCalculator/data';
import { localDb } from '../lib/localDb';

const CANDLE_SIZES_OZ = Array.from({ length: 8 }, (_, i) => (i + 1) * 4);
const BLEND_CALCULATOR_WAX_TYPES = WAX_TYPES.filter((waxType) => waxType.id !== 'gel-wax');

type WaxPlannerInputMap = Record<
  string,
  {
    pounds: string;
    totalPrice: string;
  }
>;

function buildInitialWaxInputs(): WaxPlannerInputMap {
  return WAX_TYPES.reduce<WaxPlannerInputMap>((acc, waxType) => {
    acc[waxType.id] = { pounds: '', totalPrice: '' };
    return acc;
  }, {});
}

export default function WaxPlanner() {
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [selectedWaxIds, setSelectedWaxIds] = useState<string[]>(['soy']);
  const [waxInputs, setWaxInputs] = useState<WaxPlannerInputMap>(() => ({
    ...buildInitialWaxInputs(),
    soy: { pounds: '1', totalPrice: '0' },
  }));
  const [blendWaxTypeAId, setBlendWaxTypeAId] = useState('soy');
  const [blendWaxTypeBId, setBlendWaxTypeBId] = useState('paraffin');
  const [blendPercentA, setBlendPercentA] = useState('75');
  const [blendPercentB, setBlendPercentB] = useState('25');
  const [targetBlendLb, setTargetBlendLb] = useState('10');
  const [plannedBySize, setPlannedBySize] = useState<Record<number, string>>({});

  const selectedWaxRows = useMemo(
    () =>
      WAX_TYPES.filter((waxType) => selectedWaxIds.includes(waxType.id)).map((waxType) => {
        const poundsInput = Number(waxInputs[waxType.id]?.pounds || '0');
        const totalPriceInput = Number(waxInputs[waxType.id]?.totalPrice || '0');
        const pounds = Number.isFinite(poundsInput) && poundsInput > 0 ? poundsInput : 0;
        const totalPrice = Number.isFinite(totalPriceInput) && totalPriceInput > 0 ? totalPriceInput : 0;
        const ounces = pounds * 16;
        const pricePerLb = pounds > 0 ? totalPrice / pounds : 0;

        return {
          id: waxType.id,
          name: waxType.name,
          pounds,
          ounces,
          totalPrice,
          pricePerLb,
        };
      }),
    [selectedWaxIds, waxInputs]
  );

  const totalWaxLb = useMemo(
    () => selectedWaxRows.reduce((sum, row) => sum + row.pounds, 0),
    [selectedWaxRows]
  );
  const totalWaxOz = useMemo(
    () => selectedWaxRows.reduce((sum, row) => sum + row.ounces, 0),
    [selectedWaxRows]
  );
  const totalWaxCost = useMemo(
    () => selectedWaxRows.reduce((sum, row) => sum + row.totalPrice, 0),
    [selectedWaxRows]
  );
  const waxInventoryMap = useMemo(
    () => new Map(selectedWaxRows.map((row) => [row.id, row])),
    [selectedWaxRows]
  );
  const blendWaxA = useMemo(
    () =>
      BLEND_CALCULATOR_WAX_TYPES.find((waxType) => waxType.id === blendWaxTypeAId)
      ?? BLEND_CALCULATOR_WAX_TYPES[0],
    [blendWaxTypeAId]
  );
  const blendWaxB = useMemo(
    () =>
      BLEND_CALCULATOR_WAX_TYPES.find((waxType) => waxType.id === blendWaxTypeBId)
      ?? BLEND_CALCULATOR_WAX_TYPES[1]
      ?? BLEND_CALCULATOR_WAX_TYPES[0],
    [blendWaxTypeBId]
  );
  const compatibleWaxTypeBOptions = useMemo(
    () =>
      BLEND_CALCULATOR_WAX_TYPES.filter((waxType) =>
        areWaxTypesCompatible(blendWaxTypeAId, waxType.id)
      ),
    [blendWaxTypeAId]
  );
  const blendIsCompatible = useMemo(
    () => areWaxTypesCompatible(blendWaxTypeAId, blendWaxTypeBId),
    [blendWaxTypeAId, blendWaxTypeBId]
  );
  const parsedBlendPercentA = useMemo(() => {
    const value = Number(blendPercentA);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, [blendPercentA]);
  const parsedBlendPercentB = useMemo(() => {
    const value = Number(blendPercentB);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, [blendPercentB]);
  const blendPercentTotal = useMemo(
    () => parsedBlendPercentA + parsedBlendPercentB,
    [parsedBlendPercentA, parsedBlendPercentB]
  );
  const parsedTargetBlendLb = useMemo(() => {
    const value = Number(targetBlendLb);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, [targetBlendLb]);
  const requiredBlendWaxALb = useMemo(
    () => (blendPercentTotal > 0 ? (parsedTargetBlendLb * parsedBlendPercentA) / blendPercentTotal : 0),
    [blendPercentTotal, parsedBlendPercentA, parsedTargetBlendLb]
  );
  const requiredBlendWaxBLb = useMemo(
    () => (blendPercentTotal > 0 ? (parsedTargetBlendLb * parsedBlendPercentB) / blendPercentTotal : 0),
    [blendPercentTotal, parsedBlendPercentB, parsedTargetBlendLb]
  );
  const blendInventoryWaxA = waxInventoryMap.get(blendWaxTypeAId);
  const blendInventoryWaxB = waxInventoryMap.get(blendWaxTypeBId);
  const blendWaxACost = useMemo(
    () => (blendInventoryWaxA && blendInventoryWaxA.pounds > 0 ? blendInventoryWaxA.pricePerLb * requiredBlendWaxALb : 0),
    [blendInventoryWaxA, requiredBlendWaxALb]
  );
  const blendWaxBCost = useMemo(
    () => (blendInventoryWaxB && blendInventoryWaxB.pounds > 0 ? blendInventoryWaxB.pricePerLb * requiredBlendWaxBLb : 0),
    [blendInventoryWaxB, requiredBlendWaxBLb]
  );
  const blendTotalCost = useMemo(() => blendWaxACost + blendWaxBCost, [blendWaxACost, blendWaxBCost]);
  const blendWaxAShortLb = useMemo(
    () => Math.max(0, requiredBlendWaxALb - (blendInventoryWaxA?.pounds ?? 0)),
    [blendInventoryWaxA?.pounds, requiredBlendWaxALb]
  );
  const blendWaxBShortLb = useMemo(
    () => Math.max(0, requiredBlendWaxBLb - (blendInventoryWaxB?.pounds ?? 0)),
    [blendInventoryWaxB?.pounds, requiredBlendWaxBLb]
  );

  const rows = useMemo(
    () =>
      CANDLE_SIZES_OZ.map((sizeOz) => {
        const exactCandles = sizeOz > 0 ? totalWaxOz / sizeOz : 0;
        const fullCandles = Math.floor(exactCandles);
        const remainderOz = Math.max(0, totalWaxOz - fullCandles * sizeOz);
        const plannedCountInput = Number(plannedBySize[sizeOz] || '0');
        const plannedCount =
          Number.isFinite(plannedCountInput) && plannedCountInput > 0
            ? Math.floor(plannedCountInput)
            : 0;
        const plannedWaxOz = plannedCount * sizeOz;

        return {
          sizeOz,
          fullCandles,
          exactCandles,
          remainderOz,
          plannedWaxOz,
        };
      }),
    [plannedBySize, totalWaxOz]
  );

  const plannedWaxOzTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.plannedWaxOz, 0),
    [rows]
  );
  const waxDiffOz = totalWaxOz - plannedWaxOzTotal;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await localDb.getWaxInventory();
        if (cancelled) return;
        const nextInputs = buildInitialWaxInputs();
        const nextSelectedWaxIds: string[] = [];

        rows.forEach((row) => {
          if (!nextInputs[row.wax_type_id]) return;
          nextInputs[row.wax_type_id] = {
            pounds: row.pounds > 0 ? String(row.pounds) : '',
            totalPrice: row.total_price > 0 ? String(row.total_price) : '',
          };
          if (row.selected) {
            nextSelectedWaxIds.push(row.wax_type_id);
          }
        });

        setWaxInputs((prev) => ({
          ...prev,
          ...nextInputs,
        }));
        setSelectedWaxIds(nextSelectedWaxIds.length > 0 ? nextSelectedWaxIds : ['soy']);
      } catch (error) {
        console.error('Failed to load wax inventory:', error);
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (blendIsCompatible) return;
    const fallbackWaxB = compatibleWaxTypeBOptions.find((waxType) => waxType.id !== blendWaxTypeAId)
      ?? compatibleWaxTypeBOptions[0];
    if (fallbackWaxB) {
      setBlendWaxTypeBId(fallbackWaxB.id);
    }
  }, [blendIsCompatible, blendWaxTypeAId, compatibleWaxTypeBOptions]);

  useEffect(() => {
    if (inventoryLoading) return;
    const timeoutId = window.setTimeout(() => {
      const payloads = WAX_TYPES.map((waxType) => {
        const poundsInput = Number(waxInputs[waxType.id]?.pounds || '0');
        const totalPriceInput = Number(waxInputs[waxType.id]?.totalPrice || '0');
        const pounds = Number.isFinite(poundsInput) && poundsInput > 0 ? poundsInput : 0;
        const totalPrice = Number.isFinite(totalPriceInput) && totalPriceInput > 0 ? totalPriceInput : 0;
        const selected = selectedWaxIds.includes(waxType.id);
        return { waxType, pounds, totalPrice, selected };
      });

      void Promise.all(
        payloads.map(({ waxType, pounds, totalPrice, selected }) =>
          localDb.upsertWaxInventory(waxType.id, {
            wax_type_id: waxType.id,
            wax_name: waxType.name,
            pounds,
            total_price: totalPrice,
            selected,
          })
        )
      ).catch((error) => {
        console.error('Failed to save wax inventory:', error);
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [inventoryLoading, selectedWaxIds, waxInputs]);

  function toggleWaxType(waxTypeId: string, checked: boolean) {
    setSelectedWaxIds((prev) => {
      if (checked) {
        return prev.includes(waxTypeId) ? prev : [...prev, waxTypeId];
      }
      return prev.filter((id) => id !== waxTypeId);
    });
  }

  function setWaxInput(waxTypeId: string, field: 'pounds' | 'totalPrice', value: string) {
    setWaxInputs((prev) => ({
      ...prev,
      [waxTypeId]: {
        ...prev[waxTypeId],
        [field]: value,
      },
    }));
  }

  function setPlannedCount(sizeOz: number, value: string) {
    setPlannedBySize((prev) => ({
      ...prev,
      [sizeOz]: value,
    }));
  }

  return (
    <div>
      {inventoryLoading && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6 text-sm text-gray-600">
          Loading wax inventory...
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Wax Inventory Purchased</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select the waxes you have already purchased, then enter how many pounds you have and what each wax stash cost overall.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {WAX_TYPES.map((waxType) => {
            const isSelected = selectedWaxIds.includes(waxType.id);
            return (
              <div key={waxType.id} className="rounded-lg border border-gray-200 p-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleWaxType(waxType.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {waxType.name}
                </label>
                {isSelected && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Wax Amount (lbs)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={waxInputs[waxType.id]?.pounds || ''}
                        onChange={(e) => setWaxInput(waxType.id, 'pounds', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total Price For This Wax</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={waxInputs[waxType.id]?.totalPrice || ''}
                        onChange={(e) => setWaxInput(waxType.id, 'totalPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Wax</p>
            <p className="text-2xl font-bold text-gray-800">{totalWaxLb.toFixed(2)} lb</p>
            <p className="text-sm text-gray-600 mt-1">{totalWaxOz.toFixed(2)} oz</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Wax Cost</p>
            <p className="text-2xl font-bold text-gray-800">${totalWaxCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Selected Wax Types</p>
            <p className="text-2xl font-bold text-gray-800">{selectedWaxRows.length}</p>
          </div>
        </div>
        <div className="mt-4 text-sm space-y-1">
          <p className="text-gray-700">Planned wax needed: {plannedWaxOzTotal.toFixed(2)} oz</p>
          {waxDiffOz >= 0 ? (
            <p className="text-green-700">Wax remaining: {waxDiffOz.toFixed(2)} oz</p>
          ) : (
            <p className="text-red-700">Wax short: {Math.abs(waxDiffOz).toFixed(2)} oz</p>
          )}
        </div>
        {selectedWaxRows.length > 0 && (
          <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Wax Type</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">lbs</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">oz</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Total Price</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Avg Price/lb</th>
                </tr>
              </thead>
              <tbody>
                {selectedWaxRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2 px-3 text-sm font-medium text-gray-800">{row.name}</td>
                    <td className="py-2 px-3 text-sm text-right text-gray-700">{row.pounds.toFixed(2)}</td>
                    <td className="py-2 px-3 text-sm text-right text-gray-700">{row.ounces.toFixed(2)}</td>
                    <td className="py-2 px-3 text-sm text-right text-gray-800">${row.totalPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-sm text-right text-gray-700">${row.pricePerLb.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Wax Blend Calculator</h3>
        <p className="text-sm text-gray-600 mb-4">
          Build a target blend using any wax types. Incompatible pairings are blocked automatically, such as soy with gel wax.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wax A</label>
            <select
              value={blendWaxTypeAId}
              onChange={(e) => setBlendWaxTypeAId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {BLEND_CALCULATOR_WAX_TYPES.map((waxType) => (
                <option key={waxType.id} value={waxType.id}>
                  {waxType.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wax A %</label>
            <input
              type="number"
              min="0"
              step="1"
              value={blendPercentA}
              onChange={(e) => setBlendPercentA(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wax B</label>
            <select
              value={blendWaxTypeBId}
              onChange={(e) => setBlendWaxTypeBId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {BLEND_CALCULATOR_WAX_TYPES.map((waxType) => (
                <option
                  key={waxType.id}
                  value={waxType.id}
                  disabled={!areWaxTypesCompatible(blendWaxTypeAId, waxType.id)}
                >
                  {waxType.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wax B %</label>
            <input
              type="number"
              min="0"
              step="1"
              value={blendPercentB}
              onChange={(e) => setBlendPercentB(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Blend (lbs)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={targetBlendLb}
              onChange={(e) => setTargetBlendLb(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 text-sm space-y-1">
          <p className="text-gray-700">
            Blend total: <span className="font-medium">{blendPercentTotal.toFixed(0)}%</span>{' '}
            {blendPercentTotal === 100 ? '(OK)' : '(set A + B to 100%)'}
          </p>
          {!blendIsCompatible && (
            <p className="text-red-700">
              {blendWaxA.name} cannot be blended with {blendWaxB.name}.
            </p>
          )}
          <p className="text-gray-700">
            Required {blendWaxA.name}: <span className="font-medium">{requiredBlendWaxALb.toFixed(2)} lb</span>
          </p>
          <p className="text-gray-700">
            Required {blendWaxB.name}: <span className="font-medium">{requiredBlendWaxBLb.toFixed(2)} lb</span>
          </p>
          <p className="text-gray-700">
            Estimated blend cost from purchased inventory pricing:{' '}
            <span className="font-medium">${blendTotalCost.toFixed(2)}</span>
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full min-w-[540px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Blend Wax</th>
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Required lb</th>
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Inventory lb</th>
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Short lb</th>
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3 text-sm font-medium text-gray-800">{blendWaxA.name}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-700">{requiredBlendWaxALb.toFixed(2)}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-700">{(blendInventoryWaxA?.pounds ?? 0).toFixed(2)}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-700">{blendWaxAShortLb.toFixed(2)}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-800">${blendWaxACost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-sm font-medium text-gray-800">{blendWaxB.name}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-700">{requiredBlendWaxBLb.toFixed(2)}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-700">{(blendInventoryWaxB?.pounds ?? 0).toFixed(2)}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-700">{blendWaxBShortLb.toFixed(2)}</td>
                <td className="py-2 px-3 text-sm text-right text-gray-800">${blendWaxBCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {(!blendInventoryWaxA || !blendInventoryWaxB) && (
          <p className="mt-3 text-xs text-gray-500">
            Blend cost uses the purchased inventory section above. If a wax is not selected there yet, its estimated blend cost stays at $0.00 until inventory is entered.
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Candle Size</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Planned Qty</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Planned Wax</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Full Candles</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Exact Candles</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Wax Left Over</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sizeOz} className="border-b border-gray-100">
                <td className="py-3 px-2 text-sm font-medium text-gray-800">{row.sizeOz} oz</td>
                <td className="py-3 px-2 text-sm text-right">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={plannedBySize[row.sizeOz] || ''}
                    onChange={(e) => setPlannedCount(row.sizeOz, e.target.value)}
                    className="w-24 text-right px-2 py-1 border border-gray-300 rounded"
                    placeholder="0"
                  />
                </td>
                <td className="py-3 px-2 text-sm text-right text-gray-700">{row.plannedWaxOz.toFixed(2)} oz</td>
                <td className="py-3 px-2 text-sm text-right text-gray-800">{row.fullCandles}</td>
                <td className="py-3 px-2 text-sm text-right text-gray-600">{row.exactCandles.toFixed(2)}</td>
                <td className="py-3 px-2 text-sm text-right text-gray-600">{row.remainderOz.toFixed(2)} oz</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
