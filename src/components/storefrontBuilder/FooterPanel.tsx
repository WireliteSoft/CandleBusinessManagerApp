import type { PanelProps } from './presetTabPanels.types';

export default function FooterPanel({
  presetModel,
  readOnly,
  renderFontEditor,
  setPresetModel,
}: Omit<PanelProps, 'selectablePresetImages' | 'handlePresetHeroImage'>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">Footer Section</h4>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Footer Text</label>
        <input
          value={presetModel.footerText}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, footerText: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('footerText')}
      </div>
    </div>
  );
}
