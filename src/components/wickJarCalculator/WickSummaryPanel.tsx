type Props = {
  containerHeightCm: number;
  containerHeightInches: number;
  containerType: string;
  effectiveWickSpacingCm: number;
  effectiveWickSpacingInches: number;
  mouthWidthCm: number;
  mouthWidthInches: number;
  targetMeltPoolPerWickCm: number;
  targetMeltPoolPerWickInches: number;
  wickCount: number;
  wickLengthEachCm: number;
  wickLengthEachInches: number;
  wickSizeBand: string;
  wickStrengthRecommendation: string;
};

function SummaryCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-gray-200 bg-rose-50/50 p-4 wick-summary-card">{children}</div>;
}

export default function WickSummaryPanel({
  containerHeightCm,
  containerHeightInches,
  containerType,
  effectiveWickSpacingCm,
  effectiveWickSpacingInches,
  mouthWidthCm,
  mouthWidthInches,
  targetMeltPoolPerWickCm,
  targetMeltPoolPerWickInches,
  wickCount,
  wickLengthEachCm,
  wickLengthEachInches,
  wickSizeBand,
  wickStrengthRecommendation,
}: Props) {
  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-6 gap-4">
      <SummaryCard>
        <p className="text-sm text-gray-600">Container Type</p>
        <p className="text-xl font-semibold text-gray-900">{containerType}</p>
      </SummaryCard>
      <SummaryCard>
        <p className="text-sm text-gray-600">Container Width</p>
        <p className="text-xl font-semibold text-gray-900">{mouthWidthInches.toFixed(2)} in</p>
        <p className="text-xs text-gray-500 mt-1">{mouthWidthCm.toFixed(2)} cm</p>
      </SummaryCard>
      <SummaryCard>
        <p className="text-sm text-gray-600">Container Height</p>
        <p className="text-xl font-semibold text-gray-900">{containerHeightInches.toFixed(2)} in</p>
        <p className="text-xs text-gray-500 mt-1">{containerHeightCm.toFixed(2)} cm</p>
      </SummaryCard>
      <SummaryCard>
        <p className="text-sm text-gray-600">Recommended Wick Count</p>
        <p className="text-xl font-semibold text-gray-900">{wickCount}</p>
        <p className="text-xs text-gray-500 mt-1">
          {wickCount === 1 ? 'Auto: single wick' : `Auto: ${wickCount}-wick layout`}
        </p>
        {wickCount >= 6 && (
          <p className="text-xs text-gray-500 mt-1">
            Large-format candle: test in small batches before full pour.
          </p>
        )}
        {wickCount >= 12 && (
          <p className="text-xs text-gray-500 mt-1">
            Oversized estimate uses area scaling; tune final count with staged burn tests.
          </p>
        )}
      </SummaryCard>
      <SummaryCard>
        <p className="text-sm text-gray-600">Wick Length (Each)</p>
        <p className="text-xl font-semibold text-gray-900">{wickLengthEachInches.toFixed(2)} in</p>
        <p className="text-xs text-gray-500 mt-1">{wickLengthEachCm.toFixed(2)} cm</p>
        <p className="text-xs text-gray-500 mt-1">Based on container height + 0.5 in.</p>
      </SummaryCard>
      <SummaryCard>
        <p className="text-sm text-gray-600">Target Melt Pool / Wick</p>
        <p className="text-xl font-semibold text-gray-900">{targetMeltPoolPerWickInches.toFixed(2)} in</p>
        <p className="text-xs text-gray-500 mt-1">{targetMeltPoolPerWickCm.toFixed(2)} cm target per wick</p>
        <p className="text-xs text-gray-500 mt-1">{wickSizeBand}</p>
        <p className="text-xs text-gray-500 mt-1">
          Recommended wick thickness: <strong>{wickStrengthRecommendation || 'N/A'}</strong>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Spacing used: <strong>{effectiveWickSpacingInches.toFixed(2)} in</strong> ({effectiveWickSpacingCm.toFixed(2)} cm)
        </p>
      </SummaryCard>
    </div>
  );
}
