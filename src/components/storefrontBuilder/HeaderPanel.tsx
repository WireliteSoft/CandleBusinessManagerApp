import type { PanelProps } from './presetTabPanels.types';

export default function HeaderPanel({
  presetModel,
  readOnly,
  renderFontEditor,
  setPresetModel,
}: Omit<PanelProps, 'selectablePresetImages' | 'handlePresetHeroImage'>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">Header Section</h4>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Page Title</label>
        <input
          value={presetModel.pageTitle}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, pageTitle: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Meta Description</label>
        <input
          value={presetModel.metaDescription}
          disabled={readOnly}
          onChange={(e) =>
            setPresetModel((prev) => ({ ...prev, metaDescription: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Brand Name</label>
        <input
          value={presetModel.brandName}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, brandName: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('brandName')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Brand Subtitle</label>
        <input
          value={presetModel.brandSubtitle}
          disabled={readOnly}
          onChange={(e) =>
            setPresetModel((prev) => ({ ...prev, brandSubtitle: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('brandSubtitle')}
      </div>
    </div>
  );
}
