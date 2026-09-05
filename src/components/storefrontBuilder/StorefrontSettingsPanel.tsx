import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { StorefrontConfig } from '../../lib/localDb';
import {
  ColorsPanel,
  ContentPanel,
  FooterPanel,
  HeaderPanel,
  HeroPanel,
  NavigationPanel,
} from './PresetTabPanels';
import type {
  HtmlEditorTab,
  HtmlPresetId,
  HtmlPresetModel,
  PresetEditorTab,
  SavedColor,
  UploadedFont,
} from './presetBuilder';
import { getDefaultPresetModel, normalizeSlug } from './presetBuilder';

type Props = {
  addPresetExtraSection: () => void;
  applyCarouselImagesToAllPresets: () => void;
  applyPresetToHtml: () => void;
  config: StorefrontConfig;
  handleBackgroundFile: (file: File | null) => Promise<void>;
  handleBannerFile: (file: File | null) => Promise<void>;
  handleCollectionCarouselFiles: (files: FileList | null) => Promise<void>;
  handleLogoFile: (file: File | null) => Promise<void>;
  handlePresetBodyImage: (
    key: 'sectionAboutImage' | 'whyUsImage' | 'contactImage',
    file: File | null
  ) => Promise<void>;
  handlePresetExtraSectionImage: (index: number, file: File | null) => Promise<void>;
  handlePresetFontFile: (file: File | null) => Promise<void>;
  handlePresetHeroImage: (file: File | null) => Promise<void>;
  htmlEditorTab: HtmlEditorTab;
  onSave: () => Promise<void>;
  presetEditorTab: PresetEditorTab;
  presetModel: HtmlPresetModel;
  presetModelsById: Record<HtmlPresetId, HtmlPresetModel>;
  presetPreviewHtml: string;
  previewPreset: () => void;
  publicUrl: string;
  readOnly: boolean;
  removeAllPresetSections: () => void;
  removeCollectionCarouselImage: (index: number) => void;
  removePresetExtraSection: (index: number) => void;
  removeSavedColor: (colorValue: string) => void;
  removeUploadedFont: (url: string) => void;
  renderFontEditor: (fieldKey: string) => ReactNode;
  resetPresetEdits: () => void;
  restoreCorePresetSections: () => void;
  saving: boolean;
  savedColors: SavedColor[];
  selectablePresetImages: string[];
  selectedPresetId: HtmlPresetId;
  setConfig: Dispatch<SetStateAction<StorefrontConfig>>;
  setHtmlEditorTab: Dispatch<SetStateAction<HtmlEditorTab>>;
  setPresetEditorTab: Dispatch<SetStateAction<PresetEditorTab>>;
  setPresetModel: Dispatch<SetStateAction<HtmlPresetModel>>;
  setPresetModelsById: Dispatch<SetStateAction<Record<HtmlPresetId, HtmlPresetModel>>>;
  setPresetPreviewHtml: Dispatch<SetStateAction<string>>;
  setSelectedPresetId: Dispatch<SetStateAction<HtmlPresetId>>;
  storeOrigin: string;
  updatePresetExtraSection: (index: number, patch: Partial<HtmlPresetModel['extraSections'][number]>) => void;
  uploadedFonts: UploadedFont[];
};

export default function StorefrontSettingsPanel({
  addPresetExtraSection,
  applyCarouselImagesToAllPresets,
  applyPresetToHtml,
  config,
  handleBackgroundFile,
  handleBannerFile,
  handleCollectionCarouselFiles,
  handleLogoFile,
  handlePresetBodyImage,
  handlePresetExtraSectionImage,
  handlePresetFontFile,
  handlePresetHeroImage,
  htmlEditorTab,
  onSave,
  presetEditorTab,
  presetModel,
  presetModelsById,
  presetPreviewHtml,
  previewPreset,
  publicUrl,
  readOnly,
  removeAllPresetSections,
  removeCollectionCarouselImage,
  removePresetExtraSection,
  removeSavedColor,
  removeUploadedFont,
  renderFontEditor,
  resetPresetEdits,
  restoreCorePresetSections,
  saving,
  savedColors,
  selectablePresetImages,
  selectedPresetId,
  setConfig,
  setHtmlEditorTab,
  setPresetEditorTab,
  setPresetModel,
  setPresetModelsById,
  setPresetPreviewHtml,
  setSelectedPresetId,
  storeOrigin,
  updatePresetExtraSection,
  uploadedFonts,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Store Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Name (URL slug)</label>
          <input
            type="text"
            value={config.store_slug}
            onChange={(e) => setConfig((prev) => ({ ...prev, store_slug: normalizeSlug(e.target.value) }))}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="their_store_name"
          />
          <p className="text-xs text-gray-500 mt-1">Example URL: {storeOrigin}/store/their_store_name</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Title</label>
          <input
            type="text"
            value={config.store_title}
            onChange={(e) => setConfig((prev) => ({ ...prev, store_title: e.target.value }))}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Kacha Maton Candle Co."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
          <textarea
            rows={3}
            value={config.store_description}
            onChange={(e) => setConfig((prev) => ({ ...prev, store_description: e.target.value }))}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Tell customers what makes your candles unique."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo Image</label>
          <input
            type="file"
            accept="image/*"
            disabled={readOnly}
            onChange={(e) => void handleLogoFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
          <input
            type="file"
            accept="image/*"
            disabled={readOnly}
            onChange={(e) => void handleBannerFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Page Background Image</label>
          <input
            type="file"
            accept="image/*"
            disabled={readOnly}
            onChange={(e) => void handleBackgroundFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Custom HTML (below products)</label>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden mb-3">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setHtmlEditorTab('raw')}
              className={`px-3 py-2 text-sm ${htmlEditorTab === 'raw' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Raw HTML
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setHtmlEditorTab('preset')}
              className={`px-3 py-2 text-sm border-l border-gray-200 ${htmlEditorTab === 'preset' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Preset Builder
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setHtmlEditorTab('fonts')}
              className={`px-3 py-2 text-sm border-l border-gray-200 ${htmlEditorTab === 'fonts' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Fonts
            </button>
          </div>
          {htmlEditorTab === 'raw' ? (
            <>
              <textarea
                rows={10}
                value={config.store_custom_html}
                onChange={(e) => setConfig((prev) => ({ ...prev, store_custom_html: e.target.value }))}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="<section><h2>About Our Candles</h2><p>...</p></section>"
              />
              <p className="text-xs text-gray-500 mt-1">This HTML will render below products, or full-page in takeover mode.</p>
            </>
          ) : htmlEditorTab === 'fonts' ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Uploaded Fonts</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Font File (TTF, OTF, WOFF, WOFF2)</label>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                  disabled={readOnly}
                  onChange={(e) => void handlePresetFontFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Uploaded fonts are stored in your account folder and available in all Font Editor family dropdowns.</p>
              </div>
              {uploadedFonts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {uploadedFonts.map((font) => (
                    <div key={font.url} className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-700">{font.family}</p>
                        <button type="button" disabled={readOnly} onClick={() => removeUploadedFont(font.url)} className="px-2 py-1 rounded border border-red-300 text-red-700 text-xs hover:bg-red-50 disabled:opacity-60">
                          Remove
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 break-all">{font.originalName || font.url}</p>
                      <p className="text-sm text-gray-700" style={{ fontFamily: `'${font.family}'` }}>
                        The quick brown fox jumps over the lazy dog.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No fonts uploaded yet.</p>
              )}
              <div className="pt-2 border-t border-gray-200">
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Saved Colors</h5>
                {savedColors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {savedColors.map((color) => (
                      <div key={color.id || color.value} className="inline-flex items-center gap-1">
                        <span className="h-7 w-7 rounded border border-gray-300 inline-block" style={{ backgroundColor: color.value }} title={color.value} />
                        <button type="button" disabled={readOnly} onClick={() => removeSavedColor(color.value)} className="text-[11px] px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No saved colors yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preset</label>
                  <select
                    value={selectedPresetId}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = e.target.value as HtmlPresetId;
                      const updated = {
                        ...presetModelsById,
                        [selectedPresetId]: presetModel,
                      };
                      const nextModel = updated[next] ?? getDefaultPresetModel(next);
                      setPresetModelsById(updated);
                      setSelectedPresetId(next);
                      setPresetModel(nextModel);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="luxury-signature">Luxury Signature</option>
                    <option value="minimal-clean">Minimal Clean</option>
                    <option value="coastal-breeze">Coastal Breeze</option>
                    <option value="botanical-spa">Botanical Spa</option>
                    <option value="autumn-harvest">Autumn Harvest</option>
                    <option value="midnight-glam">Midnight Glam</option>
                    <option value="winter-frost">Winter Frost</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button type="button" onClick={previewPreset} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100">
                    Preview Preset
                  </button>
                  <button type="button" onClick={resetPresetEdits} disabled={readOnly} className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-60">
                    Reset To Preset Defaults
                  </button>
                  <button type="button" onClick={applyPresetToHtml} disabled={readOnly} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                    Apply Preset To Custom HTML
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['header', 'Header'],
                    ['navigation', 'Navigation'],
                    ['hero', 'Hero'],
                    ['content', 'Content Sections'],
                    ['footer', 'Footer'],
                    ['colors', 'Colors'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPresetEditorTab(id as PresetEditorTab)}
                      className={`px-3 py-2 rounded-lg text-sm border ${presetEditorTab === id ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {presetEditorTab === 'header' ? <HeaderPanel presetModel={presetModel} readOnly={readOnly} renderFontEditor={renderFontEditor} setPresetModel={setPresetModel} /> : null}
                {presetEditorTab === 'navigation' ? <NavigationPanel presetModel={presetModel} readOnly={readOnly} renderFontEditor={renderFontEditor} setPresetModel={setPresetModel} /> : null}
                {presetEditorTab === 'hero' ? (
                  <HeroPanel
                    presetModel={presetModel}
                    readOnly={readOnly}
                    renderFontEditor={renderFontEditor}
                    selectablePresetImages={selectablePresetImages}
                    setPresetModel={setPresetModel}
                    handlePresetHeroImage={handlePresetHeroImage}
                  />
                ) : null}
                {presetEditorTab === 'content' ? (
                  <ContentPanel
                    presetModel={presetModel}
                    readOnly={readOnly}
                    renderFontEditor={renderFontEditor}
                    setPresetModel={setPresetModel}
                    restoreCorePresetSections={restoreCorePresetSections}
                    removeAllPresetSections={removeAllPresetSections}
                    addPresetExtraSection={addPresetExtraSection}
                    handlePresetBodyImage={handlePresetBodyImage}
                    applyCarouselImagesToAllPresets={applyCarouselImagesToAllPresets}
                    handleCollectionCarouselFiles={handleCollectionCarouselFiles}
                    removeCollectionCarouselImage={removeCollectionCarouselImage}
                    updatePresetExtraSection={updatePresetExtraSection}
                    removePresetExtraSection={removePresetExtraSection}
                    handlePresetExtraSectionImage={handlePresetExtraSectionImage}
                  />
                ) : null}
                {presetEditorTab === 'footer' ? <FooterPanel presetModel={presetModel} readOnly={readOnly} renderFontEditor={renderFontEditor} setPresetModel={setPresetModel} /> : null}
                {presetEditorTab === 'colors' ? <ColorsPanel presetModel={presetModel} readOnly={readOnly} setPresetModel={setPresetModel} /> : null}
              </div>
              <p className="text-xs text-gray-500">Tip: edit fields, click "Apply Preset To Custom HTML", then Save Storefront.</p>
              {presetPreviewHtml ? (
                <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">Preset Preview</p>
                    <button type="button" onClick={() => setPresetPreviewHtml('')} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">
                      Close Preview
                    </button>
                  </div>
                  <iframe title="Preset Preview" srcDoc={presetPreviewHtml} className="w-full h-[520px] bg-white" />
                </div>
              ) : null}
            </div>
          )}
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(config.store_show_details)}
              onChange={(e) => setConfig((prev) => ({ ...prev, store_show_details: e.target.checked }))}
              disabled={readOnly}
              className="h-4 w-4"
            />
            Show Store Details on Public Page (logo, title, store slug, description)
          </label>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || readOnly}
          className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Storefront'}
        </button>
        {publicUrl && (
          <button type="button" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')} className="px-4 py-2 rounded-lg border border-pink-300 text-pink-700">
            Open Public Store
          </button>
        )}
      </div>
    </div>
  );
}
