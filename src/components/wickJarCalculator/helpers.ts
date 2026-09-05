import {
  WICK_COMMON_SIZES,
  WICK_MELT_DIAMETER_IN,
  type ContainerType,
  type SupplierSearch,
  type WaxType,
  type WickPoint,
} from './config';

export function buildSupplierHref(
  supplier: SupplierSearch,
  wickLengthInches: number,
  selectedWickSize: string
): string {
  const roundedLength = Math.max(1, Math.round(wickLengthInches || 0));
  const fullQuery = `${supplier.query} ${selectedWickSize} ${roundedLength} inch`;
  if (supplier.label === 'Amazon') {
    return `https://www.amazon.com/s?k=${encodeURIComponent(fullQuery)}`;
  }
  if (supplier.label === 'The Flaming Candle') {
    return `https://www.theflamingcandle.com/search?q=${encodeURIComponent(fullQuery)}`;
  }
  return `https://www.theflamingcandle.com/search?q=${encodeURIComponent(fullQuery)}`;
}

export function getWickCount(mouthInches: number): number {
  if (mouthInches <= 0) return 0;
  if (mouthInches <= 3.25) return 1;
  if (mouthInches <= 4.75) return 2;
  if (mouthInches <= 6.25) return 3;
  if (mouthInches <= 7.5) return 4;
  const scaled = Math.ceil(4 * (mouthInches / 7.5) ** 2);
  return Math.min(120, Math.max(5, scaled));
}

export function getWickFamilies(waxType: WaxType): string[] {
  if (waxType === 'Soy') return ['CD', 'ECO', 'HTP', 'Premier 700', 'Wooden Wick'];
  if (waxType === 'Coconut Wax') return ['HTP', 'CD', 'LX', 'Premier 700', 'Wooden Wick'];
  if (waxType === 'Paraffin') return ['HTP', 'LX', 'Premier 700', 'Zinc Core', 'Wooden Wick'];
  if (waxType === 'Gel Wax') return ['HTP', 'LX', 'Premier 700', 'Zinc Core'];
  return ['Square Braid', 'ECO', 'CD', 'Premier 700', 'Wooden Wick'];
}

export function getContainerTypeFactor(containerType: ContainerType): number {
  if (containerType === 'Tin') return 0.9;
  if (containerType === 'Ceramic') return 1.08;
  if (containerType === 'Concrete') return 1.12;
  return 1.0;
}

export function getHeightFactor(heightInches: number): number {
  if (heightInches <= 0) return 1;
  const delta = (heightInches - 4) * 0.03;
  return Math.min(1.12, Math.max(0.94, 1 + delta));
}

export function getWickSizeBand(targetCoverageInches: number): string {
  if (targetCoverageInches <= 0) return 'N/A';
  if (targetCoverageInches <= 1.75) return 'Small wick';
  if (targetCoverageInches <= 2.25) return 'Medium-small wick';
  if (targetCoverageInches <= 2.75) return 'Medium wick';
  if (targetCoverageInches <= 3.25) return 'Medium-large wick';
  return 'Large wick / consider more wicks';
}

export function getWaxTypeMeltAdjustment(wax: WaxType): number {
  if (wax === 'Soy') return 0.1;
  if (wax === 'Coconut Wax') return 0.05;
  if (wax === 'Paraffin') return -0.1;
  if (wax === 'Beeswax') return 0.15;
  return -0.05;
}

export function getRingPoints(count: number, radius: number, startAngle = -Math.PI / 2): WickPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index * 2 * Math.PI) / count;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export function getWickLayoutPoints(count: number): WickPoint[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0 }];
  if (count >= 5) {
    return [{ x: 0, y: 0 }, ...getRingPoints(count - 1, 0.56)];
  }
  return getRingPoints(count, 0.56);
}

export function getMinimumDistance(points: WickPoint[]): number {
  if (points.length < 2) return 0;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const distance = Math.hypot(dx, dy);
      if (distance < minDistance) minDistance = distance;
    }
  }
  return Number.isFinite(minDistance) ? minDistance : 0;
}

export function getRecommendedWickStrength(args: {
  blendPercentA: string;
  blendPercentB: string;
  blendWaxTypeA: WaxType;
  blendWaxTypeB: WaxType;
  effectiveWickSpacingInches: number;
  selectedWickFamily: string;
  targetMeltPoolPerWickInches: number;
  useWaxBlend: boolean;
  waxType: WaxType;
  wickCount: number;
}) {
  const {
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
  } = args;
  const sizes = WICK_COMMON_SIZES[selectedWickFamily] ?? [];
  if (sizes.length === 0) return '';
  const targetCoverage = targetMeltPoolPerWickInches || 0;
  if (targetCoverage <= 0) return sizes[0] ?? '';

  const waxAdjustment = useWaxBlend
    ? (() => {
        const aPct = Number(blendPercentA) || 0;
        const bPct = Number(blendPercentB) || 0;
        const total = Math.max(1, aPct + bPct);
        return (
          (getWaxTypeMeltAdjustment(blendWaxTypeA) * aPct +
            getWaxTypeMeltAdjustment(blendWaxTypeB) * bPct) /
          total
        );
      })()
    : getWaxTypeMeltAdjustment(waxType);

  const spacingFactor = (() => {
    if (effectiveWickSpacingInches <= 0) return 0;
    if (effectiveWickSpacingInches < 1.1) return -0.2;
    if (effectiveWickSpacingInches < 1.4) return -0.1;
    if (effectiveWickSpacingInches > 2.4) return 0.15;
    if (effectiveWickSpacingInches > 2.0) return 0.08;
    return 0;
  })();

  const countFactor =
    wickCount >= 10 ? -0.2 : wickCount >= 6 ? -0.12 : wickCount >= 4 ? -0.06 : 0;
  const packingFactor = wickCount <= 1 ? 0.82 : 0.74;
  const effectiveTargetCoverage =
    targetCoverage * packingFactor + waxAdjustment + spacingFactor + countFactor;

  const familyMeltTable = WICK_MELT_DIAMETER_IN[selectedWickFamily] ?? {};
  let bestSize = sizes[0] ?? '';
  let bestScore = Number.POSITIVE_INFINITY;
  for (const size of sizes) {
    const meltDiameter = familyMeltTable[size];
    const fallbackIndex = sizes.indexOf(size);
    const fallbackDiameter = 1.8 + fallbackIndex * 0.2;
    const candidateDiameter = Number.isFinite(meltDiameter) ? meltDiameter : fallbackDiameter;
    const score = Math.abs(candidateDiameter - effectiveTargetCoverage);
    if (score < bestScore) {
      bestScore = score;
      bestSize = size;
    }
  }
  return bestSize;
}
