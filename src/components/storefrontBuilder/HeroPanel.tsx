import type { PanelProps } from './presetTabPanels.types';

export default function HeroPanel({
  presetModel,
  readOnly,
  renderFontEditor,
  selectablePresetImages,
  setPresetModel,
  handlePresetHeroImage,
}: PanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">Hero Section</h4>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Eyebrow</label>
        <input
          value={presetModel.eyebrow}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, eyebrow: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('eyebrow')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Hero Line 1</label>
        <input
          value={presetModel.heroLine1}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, heroLine1: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('heroLine1')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Hero Line 2</label>
        <input
          value={presetModel.heroLine2}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, heroLine2: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('heroLine2')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Hero Line 3</label>
        <input
          value={presetModel.heroLine3}
          disabled={readOnly}
          onChange={(e) => setPresetModel((prev) => ({ ...prev, heroLine3: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('heroLine3')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Primary Button Text
        </label>
        <input
          value={presetModel.primaryButtonText}
          disabled={readOnly}
          onChange={(e) =>
            setPresetModel((prev) => ({ ...prev, primaryButtonText: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('primaryButtonText')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Secondary Button Text
        </label>
        <input
          value={presetModel.secondaryButtonText}
          disabled={readOnly}
          onChange={(e) =>
            setPresetModel((prev) => ({ ...prev, secondaryButtonText: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('secondaryButtonText')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Hero Description</label>
        <textarea
          rows={3}
          value={presetModel.heroDescription}
          disabled={readOnly}
          onChange={(e) =>
            setPresetModel((prev) => ({ ...prev, heroDescription: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {renderFontEditor('heroDescription')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Hero Image (right slot)
        </label>
        {selectablePresetImages.length > 0 ? (
          <div className="rounded border border-gray-200 p-2 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {selectablePresetImages.map((src, index) => {
                const isSelected = (presetModel.heroImage || '') === src;
                return (
                  <label
                    key={`${src}-${index}`}
                    className={`relative rounded border p-1 bg-white cursor-pointer ${
                      isSelected ? 'border-indigo-500 ring-1 ring-indigo-400' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Hero option ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={readOnly}
                        onChange={(e) =>
                          setPresetModel((prev) => ({
                            ...prev,
                            heroImage: e.target.checked ? src : '',
                          }))
                        }
                        className="h-3.5 w-3.5"
                      />
                      Use this image
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No uploaded images available yet.</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Upload New Hero Image
        </label>
        <input
          type="file"
          accept="image/*"
          disabled={readOnly}
          onChange={(e) => void handlePresetHeroImage(e.target.files?.[0] || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        {presetModel.heroImage ? (
          <img
            src={presetModel.heroImage}
            alt="Hero slot"
            className="mt-2 max-h-28 w-auto object-contain rounded border border-gray-200"
          />
        ) : null}
      </div>
    </div>
  );
}
