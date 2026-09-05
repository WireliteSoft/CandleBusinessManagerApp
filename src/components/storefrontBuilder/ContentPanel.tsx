import type { ContentPanelProps } from './presetTabPanels.types';

export default function ContentPanel({
  presetModel,
  readOnly,
  renderFontEditor,
  setPresetModel,
  restoreCorePresetSections,
  removeAllPresetSections,
  addPresetExtraSection,
  handlePresetBodyImage,
  applyCarouselImagesToAllPresets,
  handleCollectionCarouselFiles,
  removeCollectionCarouselImage,
  updatePresetExtraSection,
  removePresetExtraSection,
  handlePresetExtraSectionImage,
}: ContentPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">Content Sections</h4>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={readOnly}
          onClick={restoreCorePresetSections}
          className="px-3 py-1 rounded border border-emerald-300 text-emerald-700 text-xs hover:bg-emerald-50 disabled:opacity-60"
        >
          Restore Core Sections
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={removeAllPresetSections}
          className="px-3 py-1 rounded border border-red-300 text-red-700 text-xs hover:bg-red-50 disabled:opacity-60"
        >
          Remove All Sections
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={addPresetExtraSection}
          className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60"
        >
          Add Section
        </button>
      </div>

      <div className="rounded border border-gray-200 p-3 bg-gray-50 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">About Section</p>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={presetModel.showAboutSection}
              disabled={readOnly}
              onChange={(e) =>
                setPresetModel((prev) => ({ ...prev, showAboutSection: e.target.checked }))
              }
              className="h-4 w-4"
            />
            Show on public page
          </label>
        </div>
        {presetModel.showAboutSection ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Title: About
              </label>
              <input
                value={presetModel.sectionAboutTitle}
                disabled={readOnly}
                onChange={(e) =>
                  setPresetModel((prev) => ({ ...prev, sectionAboutTitle: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('sectionAboutTitle')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Body: About
              </label>
              <textarea
                rows={3}
                value={presetModel.sectionAboutBody}
                disabled={readOnly}
                onChange={(e) =>
                  setPresetModel((prev) => ({ ...prev, sectionAboutBody: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('sectionAboutBody')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">About Image</label>
              <input
                type="file"
                accept="image/*"
                disabled={readOnly}
                onChange={(e) =>
                  void handlePresetBodyImage('sectionAboutImage', e.target.files?.[0] || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {presetModel.sectionAboutImage ? (
                <img
                  src={presetModel.sectionAboutImage}
                  alt="About section"
                  className="mt-2 max-h-28 w-auto object-contain rounded border border-gray-200"
                />
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">Section hidden. Content is kept.</p>
        )}
      </div>

      <div className="rounded border border-gray-200 p-3 bg-gray-50 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">Collection Section</p>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={presetModel.showCollectionSection}
              disabled={readOnly}
              onChange={(e) =>
                setPresetModel((prev) => ({ ...prev, showCollectionSection: e.target.checked }))
              }
              className="h-4 w-4"
            />
            Show on public page
          </label>
        </div>
        {presetModel.showCollectionSection ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Title: Collection
              </label>
              <input
                value={presetModel.sectionCollectionTitle}
                disabled={readOnly}
                onChange={(e) =>
                  setPresetModel((prev) => ({ ...prev, sectionCollectionTitle: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('sectionCollectionTitle')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Body: Collection
              </label>
              <textarea
                rows={3}
                value={presetModel.sectionCollectionBody}
                disabled={readOnly}
                onChange={(e) =>
                  setPresetModel((prev) => ({ ...prev, sectionCollectionBody: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('sectionCollectionBody')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Collection Carousel Images (Max 20)
              </label>
              <div className="mb-2 flex items-center justify-end">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={applyCarouselImagesToAllPresets}
                  className="px-2 py-1 rounded border border-indigo-300 text-indigo-700 text-xs hover:bg-indigo-50 disabled:opacity-60"
                >
                  Apply Carousel Images To All Presets
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={readOnly || presetModel.collectionCarouselImages.length >= 20}
                onChange={(e) => void handleCollectionCarouselFiles(e.target.files)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Uploaded: {presetModel.collectionCarouselImages.length}/20
              </p>
              {presetModel.collectionCarouselImages.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {presetModel.collectionCarouselImages.map((src, index) => (
                    <div
                      key={`${src.slice(0, 24)}-${index}`}
                      className="relative border border-gray-200 rounded p-1 bg-white"
                    >
                      <img
                        src={src}
                        alt={`Carousel ${index + 1}`}
                        className="w-full h-16 object-contain"
                      />
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => removeCollectionCarouselImage(index)}
                        className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white w-5 h-5 text-[10px] leading-5"
                        title="Remove image"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">Section hidden. Content is kept.</p>
        )}
      </div>

      <div className="rounded border border-gray-200 p-3 bg-gray-50 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">Why Us Section</p>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={presetModel.showWhyUsSection}
              disabled={readOnly}
              onChange={(e) =>
                setPresetModel((prev) => ({ ...prev, showWhyUsSection: e.target.checked }))
              }
              className="h-4 w-4"
            />
            Show on public page
          </label>
        </div>
        {presetModel.showWhyUsSection ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Title: Why Us
              </label>
              <input
                value={presetModel.whyUsTitle}
                disabled={readOnly}
                onChange={(e) => setPresetModel((prev) => ({ ...prev, whyUsTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('whyUsTitle')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Body: Why Us
              </label>
              <textarea
                rows={3}
                value={presetModel.whyUsBody}
                disabled={readOnly}
                onChange={(e) => setPresetModel((prev) => ({ ...prev, whyUsBody: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('whyUsBody')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Why Us Image</label>
              <input
                type="file"
                accept="image/*"
                disabled={readOnly}
                onChange={(e) =>
                  void handlePresetBodyImage('whyUsImage', e.target.files?.[0] || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {presetModel.whyUsImage ? (
                <img
                  src={presetModel.whyUsImage}
                  alt="Why us section"
                  className="mt-2 max-h-28 w-auto object-contain rounded border border-gray-200"
                />
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">Section hidden. Content is kept.</p>
        )}
      </div>

      <div className="rounded border border-gray-200 p-3 bg-gray-50 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">Contact Section</p>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={presetModel.showContactSection}
              disabled={readOnly}
              onChange={(e) =>
                setPresetModel((prev) => ({ ...prev, showContactSection: e.target.checked }))
              }
              className="h-4 w-4"
            />
            Show on public page
          </label>
        </div>
        {presetModel.showContactSection ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Title: Contact
              </label>
              <input
                value={presetModel.contactTitle}
                disabled={readOnly}
                onChange={(e) => setPresetModel((prev) => ({ ...prev, contactTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('contactTitle')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Body: Contact
              </label>
              <textarea
                rows={3}
                value={presetModel.contactBody}
                disabled={readOnly}
                onChange={(e) => setPresetModel((prev) => ({ ...prev, contactBody: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {renderFontEditor('contactBody')}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Image</label>
              <input
                type="file"
                accept="image/*"
                disabled={readOnly}
                onChange={(e) =>
                  void handlePresetBodyImage('contactImage', e.target.files?.[0] || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              {presetModel.contactImage ? (
                <img
                  src={presetModel.contactImage}
                  alt="Contact section"
                  className="mt-2 max-h-28 w-auto object-contain rounded border border-gray-200"
                />
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">Section hidden. Content is kept.</p>
        )}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-xs font-semibold text-gray-700">
            Extra Sections (About Me, FAQ, etc.)
          </h5>
        </div>
        {presetModel.extraSections.length > 0 ? (
          <div className="mt-2 space-y-3">
            {presetModel.extraSections.map((section, index) => (
              <div key={section.id || index} className="rounded border border-gray-200 p-3 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Extra Section {index + 1}</p>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={section.enabled !== false}
                        disabled={readOnly}
                        onChange={(e) => updatePresetExtraSection(index, { enabled: e.target.checked })}
                        className="h-4 w-4"
                      />
                      Show on public page
                    </label>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => removePresetExtraSection(index)}
                      className="px-2 py-1 rounded border border-red-300 text-red-700 text-xs hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {section.enabled === false ? (
                  <p className="text-xs text-gray-500">Section hidden. Content is kept.</p>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Section Anchor ID</label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 text-sm">
                        {section.id}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Section Title</label>
                      <input
                        value={section.title}
                        disabled={readOnly}
                        onChange={(e) => updatePresetExtraSection(index, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      {renderFontEditor('extraSectionTitle')}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Section Body</label>
                      <textarea
                        rows={3}
                        value={section.body}
                        disabled={readOnly}
                        onChange={(e) => updatePresetExtraSection(index, { body: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      {renderFontEditor('extraSectionBody')}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Section Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={readOnly}
                        onChange={(e) =>
                          void handlePresetExtraSectionImage(index, e.target.files?.[0] || null)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      {section.image ? (
                        <img
                          src={section.image}
                          alt={`Extra section ${index + 1}`}
                          className="mt-2 max-h-28 w-auto object-contain rounded border border-gray-200"
                        />
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            No extra sections yet. Click Add Section to create one.
          </p>
        )}
      </div>
    </div>
  );
}
