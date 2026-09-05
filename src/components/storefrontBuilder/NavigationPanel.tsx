import type { PanelProps } from './presetTabPanels.types';

export default function NavigationPanel({
  presetModel,
  readOnly,
  renderFontEditor,
  setPresetModel,
}: Omit<PanelProps, 'selectablePresetImages' | 'handlePresetHeroImage'>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">Navigation Section</h4>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Nav Label: About</label>
        <input
          value={presetModel.navAbout}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, navAbout: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('navAbout')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Nav Label: Collection
        </label>
        <input
          value={presetModel.navCollection}
          disabled={readOnly}
          onChange={(e) =>
            setPresetModel((prev) => ({ ...prev, navCollection: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('navCollection')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Nav Label: Why Us</label>
        <input
          value={presetModel.navWhyUs}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, navWhyUs: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('navWhyUs')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Nav Label: Contact</label>
        <input
          value={presetModel.navContact}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, navContact: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('navContact')}
      </div>
    </div>
  );
}
