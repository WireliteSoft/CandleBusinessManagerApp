import { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import WaxCalculationSummary from './waxCalculator/WaxCalculationSummary';
import WaxCalculatorForm from './waxCalculator/WaxCalculatorForm';
import WaxQuickGuide from './waxCalculator/WaxQuickGuide';
import { BLEND_HINTS, WAX_TYPES, type WaxType } from './waxCalculator/data';
import { formatRange, parseNumberRange, parseRangePercent } from './waxCalculator/helpers';

export default function WaxCalculator() {
  const [batchWeightOz, setBatchWeightOz] = useState('16');
  const [batchCount, setBatchCount] = useState('1');
  const [candlesPerBatch, setCandlesPerBatch] = useState('1');
  const [fragrancePercent, setFragrancePercent] = useState('8');
  const [fragranceMode, setFragranceMode] = useState(false);
  const [fragranceLiquidOzInput, setFragranceLiquidOzInput] = useState('1');
  const [waxTypeId, setWaxTypeId] = useState(WAX_TYPES[0].id);
  const [waxPricePerLb, setWaxPricePerLb] = useState('0');
  const [useWaxBlend, setUseWaxBlend] = useState(false);
  const [blendWaxTypeAId, setBlendWaxTypeAId] = useState('soy');
  const [blendWaxTypeBId, setBlendWaxTypeBId] = useState('paraffin');
  const [blendWaxPriceA, setBlendWaxPriceA] = useState('0');
  const [blendWaxPriceB, setBlendWaxPriceB] = useState('0');
  const [blendInputMode, setBlendInputMode] = useState<'percent' | 'weight'>('percent');
  const [blendPercentA, setBlendPercentA] = useState('70');
  const [blendPercentB, setBlendPercentB] = useState('30');
  const [blendWeightA, setBlendWeightA] = useState('10');
  const [blendWeightB, setBlendWeightB] = useState('40');
  const [blendDisplayId, setBlendDisplayId] = useState('custom-blend');
  const [blendHintIndex, setBlendHintIndex] = useState(0);

  const selectedWaxType = useMemo(
    () => WAX_TYPES.find((waxType) => waxType.id === waxTypeId) ?? WAX_TYPES[0],
    [waxTypeId]
  );
  const selectedBlendWaxA = useMemo(
    () => WAX_TYPES.find((waxType) => waxType.id === blendWaxTypeAId) ?? WAX_TYPES[0],
    [blendWaxTypeAId]
  );
  const selectedBlendWaxB = useMemo(
    () => WAX_TYPES.find((waxType) => waxType.id === blendWaxTypeBId) ?? WAX_TYPES[1] ?? WAX_TYPES[0],
    [blendWaxTypeBId]
  );
  const blendPercentInputA = useMemo(() => {
    const value = Number(blendPercentA);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [blendPercentA]);
  const blendPercentInputB = useMemo(() => {
    const value = Number(blendPercentB);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [blendPercentB]);
  const blendWeightInputA = useMemo(() => {
    const value = Number(blendWeightA);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [blendWeightA]);
  const blendWeightInputB = useMemo(() => {
    const value = Number(blendWeightB);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [blendWeightB]);
  const blendWeightTotal = useMemo(
    () => blendWeightInputA + blendWeightInputB,
    [blendWeightInputA, blendWeightInputB]
  );
  const blendA = useMemo(() => {
    if (blendInputMode === 'weight') {
      return blendWeightTotal > 0 ? (blendWeightInputA / blendWeightTotal) * 100 : 0;
    }
    return blendPercentInputA;
  }, [blendInputMode, blendPercentInputA, blendWeightInputA, blendWeightTotal]);
  const blendB = useMemo(() => {
    if (blendInputMode === 'weight') {
      return blendWeightTotal > 0 ? (blendWeightInputB / blendWeightTotal) * 100 : 0;
    }
    return blendPercentInputB;
  }, [blendInputMode, blendPercentInputB, blendWeightInputB, blendWeightTotal]);
  const blendTotal = useMemo(() => blendA + blendB, [blendA, blendB]);
  const blendSuggestedLoad = useMemo(() => {
    if (blendTotal <= 0) return 0;
    return (selectedBlendWaxA.defaultLoad * blendA + selectedBlendWaxB.defaultLoad * blendB) / blendTotal;
  }, [blendA, blendB, blendTotal, selectedBlendWaxA.defaultLoad, selectedBlendWaxB.defaultLoad]);
  const blendRange = useMemo(() => {
    const [aMin, aMax] = parseRangePercent(selectedBlendWaxA.recommendedRange);
    const [bMin, bMax] = parseRangePercent(selectedBlendWaxB.recommendedRange);
    return `${Math.min(aMin, bMin)}-${Math.max(aMax, bMax)}%`;
  }, [selectedBlendWaxA.recommendedRange, selectedBlendWaxB.recommendedRange]);
  const blendDisplayLabel = useMemo(
    () =>
      `${selectedBlendWaxA.name} ${blendA.toFixed(0)}% / ${selectedBlendWaxB.name} ${blendB.toFixed(0)}%`,
    [blendA, blendB, selectedBlendWaxA.name, selectedBlendWaxB.name]
  );
  const blendGuideRow = useMemo<WaxType | null>(() => {
    if (!useWaxBlend || blendTotal <= 0) return null;

    const [addMinA, addMaxA] = parseNumberRange(selectedBlendWaxA.fragranceAddTempF, [175, 185]);
    const [addMinB, addMaxB] = parseNumberRange(selectedBlendWaxB.fragranceAddTempF, [175, 185]);
    const [pourMinA, pourMaxA] = parseNumberRange(selectedBlendWaxA.pourTempF, [140, 160]);
    const [pourMinB, pourMaxB] = parseNumberRange(selectedBlendWaxB.pourTempF, [140, 160]);
    const [cureMinA, cureMaxA] = parseNumberRange(selectedBlendWaxA.cureTimeDays, [5, 10]);
    const [cureMinB, cureMaxB] = parseNumberRange(selectedBlendWaxB.cureTimeDays, [5, 10]);
    const [stirMinA, stirMaxA] = parseNumberRange(selectedBlendWaxA.stirTime, [2, 2]);
    const [stirMinB, stirMaxB] = parseNumberRange(selectedBlendWaxB.stirTime, [2, 2]);

    return {
      id: 'custom-blend-row',
      name: `Blend: ${selectedBlendWaxA.name} ${blendA.toFixed(0)}% / ${selectedBlendWaxB.name} ${blendB.toFixed(0)}%`,
      defaultLoad: blendSuggestedLoad,
      recommendedRange: blendRange,
      fragranceAddTempF: formatRange(Math.min(addMinA, addMinB), Math.max(addMaxA, addMaxB), 'F'),
      stirTime: formatRange(Math.min(stirMinA, stirMinB), Math.max(stirMaxA, stirMaxB), 'minutes'),
      waitBeforePour: 'After mixing, cool to pour temp',
      pourTempF: formatRange(Math.min(pourMinA, pourMinB), Math.max(pourMaxA, pourMaxB), 'F'),
      cureTimeDays: formatRange(Math.min(cureMinA, cureMinB), Math.max(cureMaxA, cureMaxB), 'days'),
    };
  }, [blendA, blendB, blendRange, blendSuggestedLoad, blendTotal, selectedBlendWaxA, selectedBlendWaxB, useWaxBlend]);
  const quickGuideRows = useMemo(
    () => (blendGuideRow ? [blendGuideRow, ...WAX_TYPES] : WAX_TYPES),
    [blendGuideRow]
  );
  const activeBlendHint = useMemo(
    () => BLEND_HINTS[blendHintIndex] ?? BLEND_HINTS[0],
    [blendHintIndex]
  );

  useEffect(() => {
    if (!useWaxBlend) return;
    const intervalId = window.setInterval(() => {
      setBlendHintIndex((prev) => (prev + 1) % BLEND_HINTS.length);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [useWaxBlend]);

  const batchInputOz = useMemo(() => {
    const value = Number(batchWeightOz);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [batchWeightOz]);
  const fragranceLiquidOzPerBatch = useMemo(() => {
    const value = Number(fragranceLiquidOzInput);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [fragranceLiquidOzInput]);

  const fragranceLoad = useMemo(() => {
    const value = Number(fragrancePercent);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [fragrancePercent]);
  const parsedWaxPricePerLb = useMemo(() => {
    const value = Number(waxPricePerLb);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [waxPricePerLb]);
  const parsedBlendWaxPriceA = useMemo(() => {
    const value = Number(blendWaxPriceA);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [blendWaxPriceA]);
  const parsedBlendWaxPriceB = useMemo(() => {
    const value = Number(blendWaxPriceB);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [blendWaxPriceB]);

  const parsedBatchCount = useMemo(() => {
    const value = Number(batchCount);
    if (!Number.isFinite(value) || value < 1) return 1;
    return Math.floor(value);
  }, [batchCount]);
  const parsedCandlesPerBatch = useMemo(() => {
    const value = Number(candlesPerBatch);
    if (!Number.isFinite(value) || value < 1) return 1;
    return Math.floor(value);
  }, [candlesPerBatch]);
  const candleCount = useMemo(
    () => parsedBatchCount * parsedCandlesPerBatch,
    [parsedBatchCount, parsedCandlesPerBatch]
  );

  const waxPerBatchOz = useMemo(() => {
    if (fragranceMode) {
      const ratio = fragranceLoad / 100;
      return ratio > 0 ? fragranceLiquidOzPerBatch / ratio : 0;
    }
    const ratio = 1 + fragranceLoad / 100;
    return ratio > 0 ? (batchInputOz / ratio) * parsedCandlesPerBatch : 0;
  }, [batchInputOz, fragranceLoad, fragranceLiquidOzPerBatch, fragranceMode, parsedCandlesPerBatch]);

  const fragrancePerBatchOz = useMemo(() => {
    if (fragranceMode) return fragranceLiquidOzPerBatch;
    return waxPerBatchOz * (fragranceLoad / 100);
  }, [fragranceLoad, fragranceLiquidOzPerBatch, fragranceMode, waxPerBatchOz]);

  const waxPerCandleOz = useMemo(
    () => (parsedCandlesPerBatch > 0 ? waxPerBatchOz / parsedCandlesPerBatch : 0),
    [parsedCandlesPerBatch, waxPerBatchOz]
  );
  const fragrancePerCandleOz = useMemo(
    () => (parsedCandlesPerBatch > 0 ? fragrancePerBatchOz / parsedCandlesPerBatch : 0),
    [fragrancePerBatchOz, parsedCandlesPerBatch]
  );

  const waxWeightOz = useMemo(() => waxPerBatchOz * parsedBatchCount, [parsedBatchCount, waxPerBatchOz]);
  const waxWeightLb = useMemo(() => waxWeightOz / 16, [waxWeightOz]);
  const fragranceWeightOz = useMemo(
    () => fragrancePerBatchOz * parsedBatchCount,
    [fragrancePerBatchOz, parsedBatchCount]
  );
  const blendWaxBreakdown = useMemo(() => {
    if (!useWaxBlend || blendTotal <= 0) return [];
    const ratioA = blendA / blendTotal;
    const ratioB = blendB / blendTotal;
    return [
      {
        key: 'a',
        name: selectedBlendWaxA.name,
        percent: ratioA * 100,
        totalOz: waxWeightOz * ratioA,
        totalLb: waxWeightLb * ratioA,
        perCandleOz: waxPerCandleOz * ratioA,
        pricePerLb: parsedBlendWaxPriceA,
        totalCost: waxWeightLb * ratioA * parsedBlendWaxPriceA,
      },
      {
        key: 'b',
        name: selectedBlendWaxB.name,
        percent: ratioB * 100,
        totalOz: waxWeightOz * ratioB,
        totalLb: waxWeightLb * ratioB,
        perCandleOz: waxPerCandleOz * ratioB,
        pricePerLb: parsedBlendWaxPriceB,
        totalCost: waxWeightLb * ratioB * parsedBlendWaxPriceB,
      },
    ];
  }, [
    blendA,
    blendB,
    blendTotal,
    parsedBlendWaxPriceA,
    parsedBlendWaxPriceB,
    selectedBlendWaxA.name,
    selectedBlendWaxB.name,
    useWaxBlend,
    waxPerCandleOz,
    waxWeightLb,
    waxWeightOz,
  ]);
  const waxCostTotal = useMemo(() => {
    if (useWaxBlend) {
      return blendWaxBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
    }
    return waxWeightLb * parsedWaxPricePerLb;
  }, [blendWaxBreakdown, parsedWaxPricePerLb, useWaxBlend, waxWeightLb]);
  const waxCostPerCandle = useMemo(
    () => (candleCount > 0 ? waxCostTotal / candleCount : 0),
    [candleCount, waxCostTotal]
  );

  const totalBlendWeightOz = useMemo(
    () => (waxPerBatchOz + fragrancePerBatchOz) * parsedBatchCount,
    [fragrancePerBatchOz, parsedBatchCount, waxPerBatchOz]
  );

  function onWaxTypeChange(nextWaxTypeId: string) {
    const waxType = WAX_TYPES.find((item) => item.id === nextWaxTypeId);
    setWaxTypeId(nextWaxTypeId);
    if (waxType) {
      setFragrancePercent(String(waxType.defaultLoad));
    }
  }

  function applyActiveHintBlend() {
    setBlendInputMode('percent');
    setBlendWaxTypeAId(activeBlendHint.waxAId);
    setBlendWaxTypeBId(activeBlendHint.waxBId);
    setBlendPercentA(String(activeBlendHint.percentA));
    setBlendPercentB(String(activeBlendHint.percentB));
    setBlendDisplayId('custom-blend');
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-6 h-6 text-orange-600" />
        <h2 className="text-2xl font-bold text-gray-800">Wax Calculator</h2>
      </div>

      <WaxCalculatorForm
        activeBlendHint={activeBlendHint}
        applyActiveHintBlend={applyActiveHintBlend}
        batchCount={batchCount}
        batchWeightOz={batchWeightOz}
        blendDisplayId={blendDisplayId}
        blendDisplayLabel={blendDisplayLabel}
        blendInputMode={blendInputMode}
        blendPercentA={blendPercentA}
        blendPercentB={blendPercentB}
        blendWaxPriceA={blendWaxPriceA}
        blendWaxPriceB={blendWaxPriceB}
        blendRange={blendRange}
        blendSuggestedLoad={blendSuggestedLoad}
        blendTotal={blendTotal}
        blendWeightA={blendWeightA}
        blendWaxTypeAId={blendWaxTypeAId}
        blendWeightB={blendWeightB}
        blendWaxTypeBId={blendWaxTypeBId}
        candlesPerBatch={candlesPerBatch}
        fragranceLiquidOzInput={fragranceLiquidOzInput}
        fragranceMode={fragranceMode}
        fragrancePercent={fragrancePercent}
        onWaxTypeChange={onWaxTypeChange}
        selectedWaxTypeName={selectedWaxType.name}
        selectedWaxTypeRange={selectedWaxType.recommendedRange}
        setBatchCount={setBatchCount}
        setBatchWeightOz={setBatchWeightOz}
        setBlendDisplayId={setBlendDisplayId}
        setBlendInputMode={setBlendInputMode}
        setBlendPercentA={setBlendPercentA}
        setBlendPercentB={setBlendPercentB}
        setBlendWaxPriceA={setBlendWaxPriceA}
        setBlendWaxPriceB={setBlendWaxPriceB}
        setBlendWeightA={setBlendWeightA}
        setBlendWeightB={setBlendWeightB}
        setBlendWaxTypeAId={setBlendWaxTypeAId}
        setBlendWaxTypeBId={setBlendWaxTypeBId}
        setCandlesPerBatch={setCandlesPerBatch}
        setFragranceLiquidOzInput={setFragranceLiquidOzInput}
        setFragranceMode={setFragranceMode}
        setFragrancePercent={setFragrancePercent}
        setUseWaxBlend={setUseWaxBlend}
        setWaxPricePerLb={setWaxPricePerLb}
        useWaxBlend={useWaxBlend}
        waxPricePerLb={waxPricePerLb}
        waxTypeId={waxTypeId}
      />

      <WaxCalculationSummary
        blendWaxBreakdown={blendWaxBreakdown}
        candleCount={candleCount}
        fragranceMode={fragranceMode}
        fragrancePerCandleOz={fragrancePerCandleOz}
        fragranceWeightOz={fragranceWeightOz}
        parsedBatchCount={parsedBatchCount}
        parsedCandlesPerBatch={parsedCandlesPerBatch}
        totalBlendWeightOz={totalBlendWeightOz}
        useWaxBlend={useWaxBlend}
        waxCostPerCandle={waxCostPerCandle}
        waxCostTotal={waxCostTotal}
        waxWeightLb={waxWeightLb}
        waxPerCandleOz={waxPerCandleOz}
        waxWeightOz={waxWeightOz}
      />

      <WaxQuickGuide quickGuideRows={quickGuideRows} useWaxBlend={useWaxBlend} waxTypeId={waxTypeId} />

    </div>
  );
}
