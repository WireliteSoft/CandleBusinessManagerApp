import type { WickPoint } from './config';

type Props = {
  estimatedCenterSpacingCm: number;
  estimatedCenterSpacingInches: number;
  estimatedWallClearanceCm: number;
  estimatedWallClearanceInches: number;
  effectiveWickSpacingCm: number;
  effectiveWickSpacingInches: number;
  mouthWidthInches: number;
  previewWickCount: number;
  previewWickPoints: WickPoint[];
  wickCount: number;
};

export default function WickPreviewPanel({
  estimatedCenterSpacingCm,
  estimatedCenterSpacingInches,
  estimatedWallClearanceCm,
  estimatedWallClearanceInches,
  effectiveWickSpacingCm,
  effectiveWickSpacingInches,
  mouthWidthInches,
  previewWickCount,
  previewWickPoints,
  wickCount,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Wick Placement Preview (Max 10)</h3>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <svg viewBox="0 0 180 180" className="w-44 h-44 shrink-0">
          <circle cx="90" cy="90" r="70" fill="var(--wick-preview-fill)" stroke="var(--wick-preview-stroke)" strokeWidth="4" />
          {previewWickPoints.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={90 + point.x * 56}
              cy={90 + point.y * 56}
              r="3.5"
              fill="var(--wick-preview-dot)"
            />
          ))}
        </svg>

        <div className="text-sm text-gray-700 space-y-1">
          <p>
            Showing layout for <strong>{previewWickCount}</strong> {previewWickCount === 1 ? 'wick' : 'wicks'}.
          </p>
          {wickCount > 10 && (
            <p className="text-gray-600">
              Recommended count is <strong>{wickCount}</strong>. Preview is capped at 10 for readability.
            </p>
          )}
          {previewWickCount === 0 && (
            <p className="text-gray-600">Enter a valid container size to generate a wick placement map.</p>
          )}
          <p className="text-gray-600">Use this as a spacing/thickness starting point, then tune by burn tests.</p>
          {previewWickCount > 1 && mouthWidthInches > 0 && (
            <>
              <p className="text-gray-600 mt-2">
                Est. minimum center spacing: <strong>{estimatedCenterSpacingInches.toFixed(2)} in</strong> ({estimatedCenterSpacingCm.toFixed(2)} cm)
              </p>
              <p className="text-gray-600">
                Spacing used for thickness recommendation: <strong>{effectiveWickSpacingInches.toFixed(2)} in</strong> ({effectiveWickSpacingCm.toFixed(2)} cm)
              </p>
              <p className="text-gray-600">
                Est. outer wick to jar wall: <strong>{estimatedWallClearanceInches.toFixed(2)} in</strong> ({estimatedWallClearanceCm.toFixed(2)} cm)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
