import { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { localDb, type BatchLogRecord } from '../lib/localDb';
import { calculatePricing } from '../lib/pricing';
import BatchEntryPanel from './batchProductionLog/BatchEntryPanel';
import BatchLogTable from './batchProductionLog/BatchLogTable';
import {
  BLENDABLE_WAX_TYPE_OPTIONS,
  BLEND_HINTS,
  INITIAL_FORM,
  WICK_SIZE_OPTIONS_BY_TYPE,
  WICK_TYPE_OPTIONS,
  type BatchForm,
  type BatchOutcome,
  type PricingPriceSource,
} from './batchProductionLog/config';
import BatchQrModal from './batchProductionLog/BatchQrModal';

type Props = {
  readOnly?: boolean;
  canCreateProducts?: boolean;
  onProductCreated?: () => void;
};

export default function BatchProductionLog({
  readOnly = false,
  canCreateProducts = false,
  onProductCreated,
}: Props) {
  const [form, setForm] = useState<BatchForm>(INITIAL_FORM);
  const [logs, setLogs] = useState<BatchLogRecord[]>([]);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [useWaxBlend, setUseWaxBlend] = useState(false);
  const [blendWaxA, setBlendWaxA] = useState<(typeof BLENDABLE_WAX_TYPE_OPTIONS)[number]>('Soy');
  const [blendWaxB, setBlendWaxB] = useState<(typeof BLENDABLE_WAX_TYPE_OPTIONS)[number]>('Paraffin');
  const [blendPercentA, setBlendPercentA] = useState('75');
  const [blendPercentB, setBlendPercentB] = useState('25');
  const [blendHintIndex, setBlendHintIndex] = useState(0);
  const [selectedQrBatchId, setSelectedQrBatchId] = useState<string | null>(null);
  const [productCreationStatus, setProductCreationStatus] = useState<string>('');

  const blendALabel = Number(blendPercentA || 0).toFixed(0);
  const blendBLabel = Number(blendPercentB || 0).toFixed(0);
  const blendLabel = `${blendWaxA} ${blendALabel}% / ${blendWaxB} ${blendBLabel}%`;
  const activeBlendHint = BLEND_HINTS[blendHintIndex] ?? BLEND_HINTS[0];
  const pricing = useMemo(
    () =>
      calculatePricing({
        waxCost: form.pricing_wax_cost,
        waxWeightLb: form.pricing_wax_weight_lb,
        fragranceUsedOz: form.pricing_fragrance_used_oz,
        fragranceCostUsed: form.pricing_fragrance_cost_used,
        candlesMade: form.candles_amount,
        fillPerCandleOz: form.pricing_fill_per_candle_oz,
        jarCostEach: form.pricing_jar_cost_each,
        wickCostEach: form.pricing_wick_cost_each,
        labelCostEach: form.pricing_label_cost_each,
        otherCostEach: form.pricing_other_cost_each,
        laborOverheadEach: form.pricing_labor_overhead_each,
      }),
    [form]
  );
  const wickSizeOptions = useMemo(
    () =>
      form.wick_type
        ? WICK_SIZE_OPTIONS_BY_TYPE[form.wick_type as (typeof WICK_TYPE_OPTIONS)[number]] ?? []
        : [],
    [form.wick_type]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await localDb.getBatchLogs();
        if (!cancelled) setLogs(rows);
      } catch (error) {
        console.error('Failed to load batch logs:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!useWaxBlend) return;
    const intervalId = window.setInterval(() => {
      setBlendHintIndex((prev) => (prev + 1) % BLEND_HINTS.length);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [useWaxBlend]);

  useEffect(() => {
    if (!useWaxBlend) return;
    setForm((prev) => ({ ...prev, wax_type: blendLabel }));
  }, [blendLabel, useWaxBlend]);

  useEffect(() => {
    setForm((prev) => {
      const next = {
        ...prev,
        pricing_material_cost_per_candle: pricing.materialCostPerCandle,
        pricing_total_cost_per_candle: pricing.totalCostPerCandle,
        pricing_wholesale_suggestion: pricing.wholesaleSuggestion,
        pricing_retail_suggestion: pricing.retailSuggestion,
        pricing_premium_suggestion: pricing.premiumSuggestion,
      };
      if (
        prev.pricing_material_cost_per_candle === next.pricing_material_cost_per_candle &&
        prev.pricing_total_cost_per_candle === next.pricing_total_cost_per_candle &&
        prev.pricing_wholesale_suggestion === next.pricing_wholesale_suggestion &&
        prev.pricing_retail_suggestion === next.pricing_retail_suggestion &&
        prev.pricing_premium_suggestion === next.pricing_premium_suggestion
      ) {
        return prev;
      }
      return next;
    });
  }, [
    pricing.materialCostPerCandle,
    pricing.premiumSuggestion,
    pricing.retailSuggestion,
    pricing.totalCostPerCandle,
    pricing.wholesaleSuggestion,
  ]);

  useEffect(() => {
    if (!form.wick_type) {
      if (form.wick_size) {
        setForm((prev) => ({ ...prev, wick_size: '' }));
      }
      return;
    }
    if (wickSizeOptions.includes(form.wick_size)) return;
    setForm((prev) => ({ ...prev, wick_size: '' }));
  }, [form.wick_size, form.wick_type, wickSizeOptions]);

  function applyActiveHintBlend() {
    if (readOnly) return;
    setBlendWaxA(activeBlendHint.waxA);
    setBlendWaxB(activeBlendHint.waxB);
    setBlendPercentA(String(activeBlendHint.percentA));
    setBlendPercentB(String(activeBlendHint.percentB));
  }

  function getSelectedPriceValue(
    source: PricingPriceSource,
    values: Pick<
      BatchLogRecord,
      'pricing_wholesale_suggestion' | 'pricing_retail_suggestion' | 'pricing_premium_suggestion'
    >
  ) {
    if (source === 'wholesale') return values.pricing_wholesale_suggestion;
    if (source === 'premium') return values.pricing_premium_suggestion;
    return values.pricing_retail_suggestion;
  }

  function getPricingCardClass(selected: boolean) {
    return selected
      ? 'pricing-select-card pricing-select-card-active'
      : 'pricing-select-card';
  }

  function resetForm(nextBatchDate = new Date().toISOString().slice(0, 10)) {
    setEditingBatchId(null);
    setUseWaxBlend(false);
    setForm({
      ...INITIAL_FORM,
      batch_date: nextBatchDate,
    });
  }

  function startEditing(log: BatchLogRecord) {
    if (readOnly) return;
    setEditingBatchId(log.id);
    setUseWaxBlend(false);
    setForm({
      batch_date: log.batch_date,
      batch_name: log.batch_name,
      candles_amount: log.candles_amount,
      wax_type: log.wax_type,
      container_type: log.container_type,
      container_size: log.container_size,
      wax_weight_oz: log.wax_weight_oz,
      fragrance_load: log.fragrance_load,
      fragrance_oil: log.fragrance_oil,
      wick_type: log.wick_type,
      wick_size: log.wick_size,
      wick_count: log.wick_count,
      vessel: log.vessel,
      pour_temp_f: log.pour_temp_f,
      room_temp_f: log.room_temp_f,
      room_humidity: log.room_humidity,
      pricing_wax_cost: log.pricing_wax_cost,
      pricing_wax_weight_lb: log.pricing_wax_weight_lb,
      pricing_fragrance_used_oz: log.pricing_fragrance_used_oz,
      pricing_fragrance_cost_used: log.pricing_fragrance_cost_used,
      pricing_fill_per_candle_oz: log.pricing_fill_per_candle_oz,
      pricing_jar_cost_each: log.pricing_jar_cost_each,
      pricing_wick_cost_each: log.pricing_wick_cost_each,
      pricing_label_cost_each: log.pricing_label_cost_each,
      pricing_other_cost_each: log.pricing_other_cost_each,
      pricing_labor_overhead_each: log.pricing_labor_overhead_each,
      pricing_material_cost_per_candle: log.pricing_material_cost_per_candle,
      pricing_total_cost_per_candle: log.pricing_total_cost_per_candle,
      pricing_wholesale_suggestion: log.pricing_wholesale_suggestion,
      pricing_retail_suggestion: log.pricing_retail_suggestion,
      pricing_premium_suggestion: log.pricing_premium_suggestion,
      pricing_cogs_source: log.pricing_cogs_source,
      pricing_price_source: log.pricing_price_source,
      notes: log.notes,
      outcome: log.outcome,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveBatch() {
    if (readOnly) return;
    if (!form.batch_name.trim()) return;
    try {
      const payload = {
        ...form,
        batch_name: form.batch_name.trim(),
      };
      if (editingBatchId) {
        const updated = await localDb.updateBatchLog(editingBatchId, payload);
        setLogs((prev) => prev.map((item) => (item.id === editingBatchId ? updated : item)));
        resetForm(updated.batch_date);
        return;
      }
      const created = await localDb.createBatchLog(payload);
      setLogs((prev) => [created, ...prev]);
      resetForm(created.batch_date);
    } catch (error) {
      console.error('Failed to save batch log:', error);
    }
  }

  async function updateOutcome(id: string, outcome: BatchOutcome) {
    if (readOnly) return;
    try {
      const updated = await localDb.updateBatchLog(id, { outcome });
      setLogs((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      console.error('Failed to update batch outcome:', error);
    }
  }

  async function updateNotes(id: string, notes: string) {
    if (readOnly) return;
    setLogs((prev) => prev.map((item) => (item.id === id ? { ...item, notes } : item)));
    try {
      const updated = await localDb.updateBatchLog(id, { notes });
      setLogs((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      console.error('Failed to update batch notes:', error);
    }
  }

  async function updateCandlesAmount(id: string, candles_amount: number) {
    if (readOnly) return;
    setLogs((prev) => prev.map((item) => (item.id === id ? { ...item, candles_amount } : item)));
    try {
      const updated = await localDb.updateBatchLog(id, { candles_amount });
      setLogs((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      console.error('Failed to update candle amount:', error);
    }
  }

  async function deleteBatch(id: string) {
    if (readOnly) return;
    const previous = logs;
    setLogs((prev) => prev.filter((item) => item.id !== id));
    try {
      await localDb.deleteBatchLog(id);
    } catch (error) {
      console.error('Failed to delete batch log:', error);
      setLogs(previous);
    }
  }

  async function createProductFromBatch(item: BatchLogRecord) {
    if (readOnly || !canCreateProducts) return;

    let sourceBatch = item;
    try {
      sourceBatch = await localDb.getBatchLog(item.id);
    } catch (error) {
      console.error('Failed to load latest batch before product creation:', error);
    }

    const batchPricing = calculatePricing({
      waxCost: sourceBatch.pricing_wax_cost,
      waxWeightLb: sourceBatch.pricing_wax_weight_lb,
      fragranceUsedOz: sourceBatch.pricing_fragrance_used_oz,
      fragranceCostUsed: sourceBatch.pricing_fragrance_cost_used,
      candlesMade: sourceBatch.candles_amount,
      fillPerCandleOz: sourceBatch.pricing_fill_per_candle_oz,
      jarCostEach: sourceBatch.pricing_jar_cost_each,
      wickCostEach: sourceBatch.pricing_wick_cost_each,
      labelCostEach: sourceBatch.pricing_label_cost_each,
      otherCostEach: sourceBatch.pricing_other_cost_each,
      laborOverheadEach: sourceBatch.pricing_labor_overhead_each,
    });
    const productCostPerUnit =
      sourceBatch.pricing_total_cost_per_candle > 0
        ? sourceBatch.pricing_total_cost_per_candle
        : batchPricing.totalCostPerCandle;
    const productSuggestedRetail =
      getSelectedPriceValue(sourceBatch.pricing_price_source, {
        pricing_wholesale_suggestion:
          sourceBatch.pricing_wholesale_suggestion > 0
            ? sourceBatch.pricing_wholesale_suggestion
            : batchPricing.wholesaleSuggestion,
        pricing_retail_suggestion:
          sourceBatch.pricing_retail_suggestion > 0
            ? sourceBatch.pricing_retail_suggestion
            : batchPricing.retailSuggestion,
        pricing_premium_suggestion:
          sourceBatch.pricing_premium_suggestion > 0
            ? sourceBatch.pricing_premium_suggestion
            : batchPricing.premiumSuggestion,
      });
    const hasAttachedPricing =
      sourceBatch.pricing_wax_cost > 0 ||
      sourceBatch.pricing_wax_weight_lb > 0 ||
      sourceBatch.pricing_fragrance_used_oz > 0 ||
      sourceBatch.pricing_fragrance_cost_used > 0 ||
      sourceBatch.pricing_fill_per_candle_oz > 0 ||
      sourceBatch.pricing_jar_cost_each > 0 ||
      sourceBatch.pricing_wick_cost_each > 0 ||
      sourceBatch.pricing_label_cost_each > 0 ||
      sourceBatch.pricing_other_cost_each > 0 ||
      sourceBatch.pricing_labor_overhead_each > 0 ||
      sourceBatch.pricing_total_cost_per_candle > 0 ||
      sourceBatch.pricing_retail_suggestion > 0;

    if (!hasAttachedPricing) {
      setProductCreationStatus(
        `No pricing is saved on "${sourceBatch.batch_name}" yet. Click Edit, complete the Batch Pricing Snapshot, then update the batch before creating a product from it.`
      );
      return;
    }

    const descriptionParts = [
      sourceBatch.batch_date ? `Batch Date: ${sourceBatch.batch_date}` : '',
      sourceBatch.wax_type ? `Wax: ${sourceBatch.wax_type}` : '',
      sourceBatch.container_type || sourceBatch.container_size
        ? `Container: ${sourceBatch.container_type || 'Container'}${
            sourceBatch.container_size ? ` (${sourceBatch.container_size})` : ''
          }`
        : '',
      Number.isFinite(sourceBatch.wax_weight_oz) ? `Wax Weight: ${sourceBatch.wax_weight_oz} oz` : '',
      Number.isFinite(sourceBatch.fragrance_load) ? `FO Load: ${sourceBatch.fragrance_load}%` : '',
      sourceBatch.fragrance_oil ? `Fragrance Oil: ${sourceBatch.fragrance_oil}` : '',
      sourceBatch.wick_type
        ? `Wick: ${sourceBatch.wick_type}${sourceBatch.wick_size ? ` ${sourceBatch.wick_size}` : ''}${
            sourceBatch.wick_count ? ` x${sourceBatch.wick_count}` : ''
          }`
        : '',
      productCostPerUnit > 0
        ? `Cost Per Unit: $${productCostPerUnit.toFixed(2)}`
        : '',
      productSuggestedRetail > 0
        ? `Suggested Retail: $${productSuggestedRetail.toFixed(2)}`
        : '',
      sourceBatch.notes ? `Notes: ${sourceBatch.notes}` : '',
    ].filter(Boolean);

    try {
      await localDb.createProduct({
        name: sourceBatch.batch_name.trim() || 'Batch Product',
        description: descriptionParts.join('\n'),
        image_data: '',
        price: productSuggestedRetail || 0,
        quantity_in_stock: Math.max(0, Math.floor(sourceBatch.candles_amount || 0)),
        cost_per_unit: productCostPerUnit || 0,
      });
      setProductCreationStatus(`Created a product in Products from batch "${sourceBatch.batch_name}".`);
      onProductCreated?.();
    } catch (error) {
      console.error('Failed to create product from batch:', error);
      setProductCreationStatus(`Failed to create a product from batch "${sourceBatch.batch_name}".`);
    }
  }

  const qrBatchUrl = selectedQrBatchId
    ? `${window.location.origin}${window.location.pathname}?batchId=${selectedQrBatchId}`
    : '';
  const qrImageUrl = selectedQrBatchId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        qrBatchUrl
      )}`
    : '';
  const derivedFillPerCandle = Number(
    (Math.max(0, form.wax_weight_oz) * (1 + Math.max(0, form.fragrance_load) / 100)).toFixed(2)
  );
  const derivedFragranceUsed = Number(
    (Math.max(0, form.candles_amount) * Math.max(0, form.wax_weight_oz) * (Math.max(0, form.fragrance_load) / 100)).toFixed(2)
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ClipboardList className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-800">Batch Production Log</h2>
      </div>

      <BatchEntryPanel
        activeBlendHint={activeBlendHint}
        applyActiveHintBlend={applyActiveHintBlend}
        blendLabel={blendLabel}
        blendPercentA={blendPercentA}
        blendPercentB={blendPercentB}
        blendWaxA={blendWaxA}
        blendWaxB={blendWaxB}
        derivedFillPerCandle={derivedFillPerCandle}
        derivedFragranceUsed={derivedFragranceUsed}
        editingBatchId={editingBatchId}
        form={form}
        getPricingCardClass={getPricingCardClass}
        pricing={pricing}
        readOnly={readOnly}
        resetForm={resetForm}
        saveBatch={saveBatch}
        setBlendPercentA={setBlendPercentA}
        setBlendPercentB={setBlendPercentB}
        setBlendWaxA={setBlendWaxA}
        setBlendWaxB={setBlendWaxB}
        setForm={setForm}
        setUseWaxBlend={setUseWaxBlend}
        useWaxBlend={useWaxBlend}
        wickSizeOptions={wickSizeOptions}
      />

      <BatchLogTable
        canCreateProducts={canCreateProducts}
        createProductFromBatch={createProductFromBatch}
        deleteBatch={deleteBatch}
        logs={logs}
        productCreationStatus={productCreationStatus}
        readOnly={readOnly}
        setSelectedQrBatchId={setSelectedQrBatchId}
        startEditing={startEditing}
        updateCandlesAmount={updateCandlesAmount}
        updateNotes={updateNotes}
        updateOutcome={updateOutcome}
      />

      <BatchQrModal
        qrBatchUrl={qrBatchUrl}
        qrImageUrl={qrImageUrl}
        selectedQrBatchId={selectedQrBatchId}
        setSelectedQrBatchId={setSelectedQrBatchId}
      />
    </div>
  );
}
