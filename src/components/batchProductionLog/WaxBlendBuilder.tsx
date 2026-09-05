import { BLENDABLE_WAX_TYPE_OPTIONS } from './config';

type Props = {
  activeBlendHintText: string;
  applyActiveHintBlend: () => void;
  blendPercentA: string;
  blendPercentB: string;
  blendWaxA: (typeof BLENDABLE_WAX_TYPE_OPTIONS)[number];
  blendWaxB: (typeof BLENDABLE_WAX_TYPE_OPTIONS)[number];
  readOnly: boolean;
  setBlendPercentA: React.Dispatch<React.SetStateAction<string>>;
  setBlendPercentB: React.Dispatch<React.SetStateAction<string>>;
  setBlendWaxA: React.Dispatch<React.SetStateAction<(typeof BLENDABLE_WAX_TYPE_OPTIONS)[number]>>;
  setBlendWaxB: React.Dispatch<React.SetStateAction<(typeof BLENDABLE_WAX_TYPE_OPTIONS)[number]>>;
};

export default function WaxBlendBuilder({
  activeBlendHintText,
  applyActiveHintBlend,
  blendPercentA,
  blendPercentB,
  blendWaxA,
  blendWaxB,
  readOnly,
  setBlendPercentA,
  setBlendPercentB,
  setBlendWaxA,
  setBlendWaxB,
}: Props) {
  return (
    <div className="mt-4 rounded-lg border p-4 wax-blend-builder-card">
      <h4 className="text-sm font-semibold mb-3">Custom Wax Blend Builder</h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wax A</label>
          <select value={blendWaxA} onChange={(e) => setBlendWaxA(e.target.value as (typeof BLENDABLE_WAX_TYPE_OPTIONS)[number])} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            {BLENDABLE_WAX_TYPE_OPTIONS.map((waxType) => (
              <option key={waxType} value={waxType}>
                {waxType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wax A %</label>
          <input type="number" min="0" step="1" value={blendPercentA} onChange={(e) => setBlendPercentA(e.target.value)} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wax B</label>
          <select value={blendWaxB} onChange={(e) => setBlendWaxB(e.target.value as (typeof BLENDABLE_WAX_TYPE_OPTIONS)[number])} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            {BLENDABLE_WAX_TYPE_OPTIONS.map((waxType) => (
              <option key={waxType} value={waxType}>
                {waxType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wax B %</label>
          <input type="number" min="0" step="1" value={blendPercentB} onChange={(e) => setBlendPercentB(e.target.value)} disabled={readOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-700 space-y-1">
        <p>
          Blend total: <span className="font-medium">{(Number(blendPercentA || 0) + Number(blendPercentB || 0)).toFixed(0)}%</span>
        </p>
        <div className="mt-2 rounded-md border p-3 wax-blend-hint-box">
          <p className="text-base font-medium wax-blend-hint-text">{activeBlendHintText}</p>
          <button type="button" onClick={applyActiveHintBlend} disabled={readOnly} className="mt-2 px-3 py-1.5 text-sm rounded-md border transition-colors wax-blend-apply-btn">
            Apply This Blend
          </button>
        </div>
      </div>
    </div>
  );
}
