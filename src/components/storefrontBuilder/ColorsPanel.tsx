import type { PanelProps } from './presetTabPanels.types';

export default function ColorsPanel({
  presetModel,
  readOnly,
  setPresetModel,
}: Pick<PanelProps, 'presetModel' | 'readOnly' | 'setPresetModel'>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">Color Theme</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Background Color
          </label>
          <input
            type="color"
            value={presetModel.bgColor}
            disabled={readOnly}
            onChange={(e) => setPresetModel((prev) => ({ ...prev, bgColor: e.target.value }))}
            className="w-full h-10 p-1 border border-gray-300 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Text Color</label>
          <input
            type="color"
            value={presetModel.textColor}
            disabled={readOnly}
            onChange={(e) => setPresetModel((prev) => ({ ...prev, textColor: e.target.value }))}
            className="w-full h-10 p-1 border border-gray-300 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Muted Text Color
          </label>
          <input
            type="color"
            value={presetModel.mutedColor}
            disabled={readOnly}
            onChange={(e) => setPresetModel((prev) => ({ ...prev, mutedColor: e.target.value }))}
            className="w-full h-10 p-1 border border-gray-300 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Accent Color</label>
          <input
            type="color"
            value={presetModel.accentColor}
            disabled={readOnly}
            onChange={(e) =>
              setPresetModel((prev) => ({ ...prev, accentColor: e.target.value }))
            }
            className="w-full h-10 p-1 border border-gray-300 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Panel Color</label>
          <input
            type="color"
            value={presetModel.panelColor}
            disabled={readOnly}
            onChange={(e) => setPresetModel((prev) => ({ ...prev, panelColor: e.target.value }))}
            className="w-full h-10 p-1 border border-gray-300 rounded-lg bg-white"
          />
        </div>
      </div>
    </div>
  );
}
