import { useEffect, useMemo, useState } from 'react';
import { FlameKindling } from 'lucide-react';
import {
  BLENDABLE_WAX_TYPES,
  CM_PER_INCH,
  CONTAINER_TYPES,
  WAX_TYPES,
  WICK_COMMON_SIZES,
  WICK_SUPPLIER_SEARCH,
  type ContainerType,
  type WaxType,
} from './wickJarCalculator/config';
import {
  getContainerTypeFactor,
  getHeightFactor,
  getMinimumDistance,
  getRecommendedWickStrength,
  getWickCount,
  getWickFamilies,
  getWickLayoutPoints,
  getWickSizeBand,
} from './wickJarCalculator/helpers';
import WickPreviewPanel from './wickJarCalculator/WickPreviewPanel';
import WickRecommendationsPanel from './wickJarCalculator/WickRecommendationsPanel';
import WickSummaryPanel from './wickJarCalculator/WickSummaryPanel';

export default function WickJarCalculator() {
  const [waxType, setWaxType] = useState<WaxType>('Soy');
  const [useWaxBlend, setUseWaxBlend] = useState(false);
  const [blendWaxTypeA, setBlendWaxTypeA] = useState<WaxType>('Soy');
  const [blendWaxTypeB, setBlendWaxTypeB] = useState<WaxType>('Paraffin');
  const [blendPercentA, setBlendPercentA] = useState('70');
  const [blendPercentB, setBlendPercentB] = useState('30');
  const [containerType, setContainerType] = useState<ContainerType>('Glass');
  const [mouthWidthInchesInput, setMouthWidthInchesInput] = useState('3');
  const [containerHeightInchesInput, setContainerHeightInchesInput] = useState('3.5');
  const [selectedWickFamily, setSelectedWickFamily] = useState('CD');
  const [selectedWickSize, setSelectedWickSize] = useState('');

  const mouthWidthInches = useMemo(() => {
    const value = Number(mouthWidthInchesInput);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value;
  }, [mouthWidthInchesInput]);

  const containerHeightInches = useMemo(() => {
    const value = Number(containerHeightInchesInput);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value;
  }, [containerHeightInchesInput]);

  const mouthWidthCm = useMemo(() => mouthWidthInches * CM_PER_INCH, [mouthWidthInches]);
  const containerHeightCm = useMemo(
    () => containerHeightInches * CM_PER_INCH,
    [containerHeightInches]
  );
  const adjustedWidthForHeat = useMemo(() => {
    const containerFactor = getContainerTypeFactor(containerType);
    const heightFactor = getHeightFactor(containerHeightInches);
    return mouthWidthInches * containerFactor * heightFactor;
  }, [containerHeightInches, containerType, mouthWidthInches]);
  const wickCount = useMemo(() => getWickCount(adjustedWidthForHeat), [adjustedWidthForHeat]);
  const blendTotal = useMemo(() => {
    const a = Number(blendPercentA) || 0;
    const b = Number(blendPercentB) || 0;
    return a + b;
  }, [blendPercentA, blendPercentB]);
  const blendLabel = useMemo(() => {
    const a = Number(blendPercentA) || 0;
    const b = Number(blendPercentB) || 0;
    return `${blendWaxTypeA} ${a.toFixed(0)}% / ${blendWaxTypeB} ${b.toFixed(0)}%`;
  }, [blendPercentA, blendPercentB, blendWaxTypeA, blendWaxTypeB]);
  const wickFamilies = useMemo(() => {
    if (!useWaxBlend) return getWickFamilies(waxType);
    const combined = [...getWickFamilies(blendWaxTypeA), ...getWickFamilies(blendWaxTypeB)];
    return combined.filter((family, idx) => combined.indexOf(family) === idx);
  }, [blendWaxTypeA, blendWaxTypeB, useWaxBlend, waxType]);
  const commonSizesForFamily = useMemo(
    () => WICK_COMMON_SIZES[selectedWickFamily] ?? [],
    [selectedWickFamily]
  );
  const selectedWickSuppliers = useMemo(
    () => WICK_SUPPLIER_SEARCH[selectedWickFamily] ?? [],
    [selectedWickFamily]
  );
  const wickLengthEachInches = useMemo(() => {
    if (containerHeightInches <= 0) return 0;
    return containerHeightInches + 0.5;
  }, [containerHeightInches]);
  const wickLengthEachCm = useMemo(
    () => wickLengthEachInches * CM_PER_INCH,
    [wickLengthEachInches]
  );
  const targetMeltPoolPerWickInches = useMemo(() => {
    if (wickCount <= 0) return 0;
    // Equivalent per-wick melt-pool coverage diameter from total jar area split by wick count.
    return adjustedWidthForHeat / Math.sqrt(wickCount);
  }, [adjustedWidthForHeat, wickCount]);
  const targetMeltPoolPerWickCm = useMemo(
    () => targetMeltPoolPerWickInches * CM_PER_INCH,
    [targetMeltPoolPerWickInches]
  );
  const wickSizeBand = useMemo(
    () => getWickSizeBand(targetMeltPoolPerWickInches),
    [targetMeltPoolPerWickInches]
  );
  const previewWickCount = useMemo(() => Math.min(10, wickCount), [wickCount]);
  const previewWickPoints = useMemo(
    () => getWickLayoutPoints(previewWickCount),
    [previewWickCount]
  );
  const estimatedCenterSpacingInches = useMemo(() => {
    if (previewWickPoints.length < 2 || mouthWidthInches <= 0) return 0;
    const minNormalizedDistance = getMinimumDistance(previewWickPoints);
    return minNormalizedDistance * (mouthWidthInches / 2);
  }, [mouthWidthInches, previewWickPoints]);
  const estimatedCenterSpacingCm = useMemo(
    () => estimatedCenterSpacingInches * CM_PER_INCH,
    [estimatedCenterSpacingInches]
  );
  const effectiveWickSpacingInches = estimatedCenterSpacingInches;
  const effectiveWickSpacingCm = effectiveWickSpacingInches * CM_PER_INCH;
  const estimatedWallClearanceInches = useMemo(() => {
    if (previewWickPoints.length === 0 || mouthWidthInches <= 0) return 0;
    const maxRadiusNormalized = previewWickPoints.reduce(
      (maxRadius, point) => Math.max(maxRadius, Math.hypot(point.x, point.y)),
      0
    );
    return (mouthWidthInches / 2) * (1 - maxRadiusNormalized);
  }, [mouthWidthInches, previewWickPoints]);
  const estimatedWallClearanceCm = useMemo(
    () => estimatedWallClearanceInches * CM_PER_INCH,
    [estimatedWallClearanceInches]
  );
  const wickStrengthRecommendation = useMemo(
    () =>
      getRecommendedWickStrength({
        blendPercentA,
        blendPercentB,
        blendWaxTypeA,
        blendWaxTypeB,
        effectiveWickSpacingInches,
        selectedWickFamily,
        targetMeltPoolPerWickInches,
        useWaxBlend,
        waxType,
        wickCount,
      }),
    [
      blendPercentA,
      blendPercentB,
      blendWaxTypeA,
      blendWaxTypeB,
      effectiveWickSpacingInches,
      selectedWickFamily,
      targetMeltPoolPerWickInches,
      useWaxBlend,
      waxType,
      wickCount,
    ]
  );

  useEffect(() => {
    if (!wickFamilies.includes(selectedWickFamily)) {
      const nextFamily = wickFamilies[0] ?? '';
      setSelectedWickFamily(nextFamily);
      const firstSize = WICK_COMMON_SIZES[nextFamily]?.[0] ?? '';
      setSelectedWickSize(firstSize);
      return;
    }
    if (!selectedWickSize) {
      const firstSize = WICK_COMMON_SIZES[selectedWickFamily]?.[0] ?? '';
      setSelectedWickSize(firstSize);
    }
  }, [selectedWickFamily, selectedWickSize, wickFamilies]);

  useEffect(() => {
    const sizes = WICK_COMMON_SIZES[selectedWickFamily] ?? [];
    if (!sizes.includes(selectedWickSize)) {
      setSelectedWickSize(wickStrengthRecommendation || (sizes[0] ?? ''));
      return;
    }
    if (wickStrengthRecommendation && selectedWickSize !== wickStrengthRecommendation) {
      setSelectedWickSize(wickStrengthRecommendation);
    }
  }, [selectedWickFamily, selectedWickSize, wickStrengthRecommendation]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FlameKindling className="w-6 h-6 text-rose-600" />
        <h2 className="text-2xl font-bold text-gray-800">Wick / Jar Size Calculator</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={useWaxBlend}
              onChange={(e) => setUseWaxBlend(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            Use Wax Blend
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {useWaxBlend ? 'Wax Blend' : 'Wax Type'}
            </label>
            <select
              value={useWaxBlend ? blendLabel : waxType}
              onChange={(e) => {
                if (!useWaxBlend) setWaxType(e.target.value as WaxType);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              {useWaxBlend ? (
                <option value={blendLabel}>{blendLabel}</option>
              ) : (
                WAX_TYPES.map((wax) => (
                  <option key={wax} value={wax}>
                    {wax}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Container Type</label>
            <select
              value={containerType}
              onChange={(e) => setContainerType(e.target.value as ContainerType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              {CONTAINER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Container Width (inches)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={mouthWidthInchesInput}
              onChange={(e) => setMouthWidthInchesInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Ex: 3.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Container Height (inches)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={containerHeightInchesInput}
              onChange={(e) => setContainerHeightInchesInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Ex: 3.5"
            />
          </div>
        </div>
        {useWaxBlend && (
          <div className="mt-4 rounded-lg border p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Custom Wax Blend Builder</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wax A</label>
                <select
                  value={blendWaxTypeA}
                  onChange={(e) => setBlendWaxTypeA(e.target.value as WaxType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {BLENDABLE_WAX_TYPES.map((wax) => (
                    <option key={wax} value={wax}>
                      {wax}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wax B</label>
                <select
                  value={blendWaxTypeB}
                  onChange={(e) => setBlendWaxTypeB(e.target.value as WaxType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {BLENDABLE_WAX_TYPES.map((wax) => (
                    <option key={wax} value={wax}>
                      {wax}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Blend total: <span className="font-medium">{blendTotal.toFixed(0)}%</span>{' '}
              {blendTotal === 100 ? '(OK)' : '(set A + B to 100%)'}
            </p>
          </div>
        )}

        <WickSummaryPanel
          containerHeightCm={containerHeightCm}
          containerHeightInches={containerHeightInches}
          containerType={containerType}
          effectiveWickSpacingCm={effectiveWickSpacingCm}
          effectiveWickSpacingInches={effectiveWickSpacingInches}
          mouthWidthCm={mouthWidthCm}
          mouthWidthInches={mouthWidthInches}
          targetMeltPoolPerWickCm={targetMeltPoolPerWickCm}
          targetMeltPoolPerWickInches={targetMeltPoolPerWickInches}
          wickCount={wickCount}
          wickLengthEachCm={wickLengthEachCm}
          wickLengthEachInches={wickLengthEachInches}
          wickSizeBand={wickSizeBand}
          wickStrengthRecommendation={wickStrengthRecommendation}
        />
      </div>

      <WickPreviewPanel
        estimatedCenterSpacingCm={estimatedCenterSpacingCm}
        estimatedCenterSpacingInches={estimatedCenterSpacingInches}
        estimatedWallClearanceCm={estimatedWallClearanceCm}
        estimatedWallClearanceInches={estimatedWallClearanceInches}
        effectiveWickSpacingCm={effectiveWickSpacingCm}
        effectiveWickSpacingInches={effectiveWickSpacingInches}
        mouthWidthInches={mouthWidthInches}
        previewWickCount={previewWickCount}
        previewWickPoints={previewWickPoints}
        wickCount={wickCount}
      />

      <WickRecommendationsPanel
        commonSizesForFamily={commonSizesForFamily}
        selectedWickFamily={selectedWickFamily}
        selectedWickSize={selectedWickSize}
        selectedWickSuppliers={selectedWickSuppliers}
        setSelectedWickFamily={setSelectedWickFamily}
        setSelectedWickSize={setSelectedWickSize}
        wickFamilies={wickFamilies}
        wickLengthEachInches={wickLengthEachInches}
      />
    </div>
  );
}
