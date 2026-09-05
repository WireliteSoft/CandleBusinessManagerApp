import { useEffect, useMemo, useState } from 'react';
import { Store } from 'lucide-react';
import { localDb, type StorefrontConfig, type StorefrontProductSummary } from '../lib/localDb';
import { readFileAsDataUrl, readFileAsOptimizedDataUrl } from './storefrontBuilder/assetUtils';
import PresetFontEditor from './storefrontBuilder/PresetFontEditor';
import StorefrontSettingsPanel from './storefrontBuilder/StorefrontSettingsPanel';
import StorefrontOrdersPanel from './storefrontBuilder/StorefrontOrdersPanel';
import DiscountCodeManager from './storefrontBuilder/DiscountCodeManager';
import GalleryModerationPanel from './storefrontBuilder/GalleryModerationPanel';
import MembershipManager from './storefrontBuilder/MembershipManager';
import SubscriptionPlanManager from './storefrontBuilder/SubscriptionPlanManager';
import SubscriptionFulfillmentQueue from './storefrontBuilder/SubscriptionFulfillmentQueue';
import LaunchToolsManager from './storefrontBuilder/LaunchToolsManager';
import EventFavorManager from './storefrontBuilder/EventFavorManager';
import FeatureVisibilityManager from './storefrontBuilder/FeatureVisibilityManager';
import CustomOrderQuoteManager from './storefrontBuilder/CustomOrderQuoteManager';
import PickupManager from './storefrontBuilder/PickupManager';
import WorkshopManager from './storefrontBuilder/WorkshopManager';
import WorkshopPartyManager from './storefrontBuilder/WorkshopPartyManager';
import RefillProgramManager from './storefrontBuilder/RefillProgramManager';
import {
  ProductOrderPanel,
  ProductSelectionPanel,
  StorefrontPreviewPanel,
} from './storefrontBuilder/StorefrontOverviewPanels';
import {
  buildDefaultPresetModelsById,
  buildPresetHtml,
  EMPTY_CONFIG,
  extractPresetMetaFromHtml,
  FONT_FAMILY_OPTIONS,
  getDefaultPresetModel,
  HTML_PRESET_IDS,
  isHtmlPresetId,
  normalizeSlug,
  type HtmlEditorTab,
  type HtmlPresetId,
  type HtmlPresetModel,
  type PresetExtraSection,
  type PresetEditorTab,
  type PresetEmbeddedState,
  type SavedColor,
  type TextStyleConfig,
  type UploadedFont,
} from './storefrontBuilder/presetBuilder';

type Props = {
  readOnly?: boolean;
};

const STOREFRONT_TABS = [
  { id: 'design', label: 'Design' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
  { id: 'requests', label: 'Requests' },
  { id: 'services', label: 'Local Services' },
] as const;

type StorefrontTab = (typeof STOREFRONT_TABS)[number]['id'];

const STOREFRONT_TAB_HELP: Record<StorefrontTab, { title: string; description: string; sections: string[] }> = {
  design: {
    title: 'Design help',
    description: 'Set how your public storefront looks and confirm the live result before sharing it.',
    sections: ['Store settings: name, URL, theme, images, and page content.', 'Preview: open and verify the public storefront.'],
  },
  catalog: {
    title: 'Catalog help',
    description: 'Choose which inventory products appear in the storefront and control their display order.',
    sections: ['Product selection: publish or hide products from customer shopping.', 'Product order: drag products into the order customers should see.'],
  },
  orders: {
    title: 'Orders help',
    description: 'Handle customer purchases and create storewide discount rules.',
    sections: ['Orders: review fulfillment, tracking, customer notes, and label approvals.', 'Discount codes: create, limit, activate, or end promotional codes.'],
  },
  customers: {
    title: 'Customer help',
    description: 'Manage loyalty, memberships, subscriptions, and customer content.',
    sections: ['Gallery: approve customer collection and custom-candle posts.', 'Memberships: configure benefits and customer enrollment.', 'Subscriptions: define plans and process subscription fulfillment.'],
  },
  requests: {
    title: 'Request help',
    description: 'Review customer requests that need a quote, decision, or production follow-up.',
    sections: ['Launch tools: scent polls and custom scent requests.', 'Event favors: quote event-size candle favors.', 'Custom orders: manage quotes and production stages.'],
  },
  services: {
    title: 'Local services help',
    description: 'Configure optional local services and manage the customer requests they create.',
    sections: ['Feature visibility: show or hide customer-facing request tools.', 'Pickup: set local pickup rules and time slots.', 'Workshops, private parties, and refills: create slots and process service requests.'],
  },
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function StorefrontBuilder({ readOnly = false }: Props) {
  const [config, setConfig] = useState<StorefrontConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<StorefrontProductSummary[]>([]);
  const [dragProductId, setDragProductId] = useState<string | null>(null);
  const [htmlEditorTab, setHtmlEditorTab] = useState<HtmlEditorTab>('raw');
  const [selectedPresetId, setSelectedPresetId] = useState<HtmlPresetId>('luxury-signature');
  const [presetModel, setPresetModel] = useState<HtmlPresetModel>(() =>
    getDefaultPresetModel('luxury-signature')
  );
  const [presetModelsById, setPresetModelsById] = useState<Record<HtmlPresetId, HtmlPresetModel>>(
    () => buildDefaultPresetModelsById()
  );
  const [presetEditorTab, setPresetEditorTab] = useState<PresetEditorTab>('header');
  const [presetPreviewHtml, setPresetPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState<StorefrontTab>('design');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, productRows] = await Promise.all([
          localDb.getStorefront(),
          localDb.getStorefrontProducts(),
        ]);
        if (!cancelled) {
          const availableProductIds = new Set(productRows.map((product) => product.id));
          setConfig({
            ...data,
            store_product_ids: (data.store_product_ids || []).filter((id) =>
              availableProductIds.has(id)
            ),
          });
          setProducts(productRows);
          const dbPresetState = data.store_preset_state;
          const embedded =
            dbPresetState &&
            typeof dbPresetState === 'object' &&
            isHtmlPresetId((dbPresetState as PresetEmbeddedState).presetId) &&
            (dbPresetState as PresetEmbeddedState).model
              ? (dbPresetState as PresetEmbeddedState)
              : extractPresetMetaFromHtml(data.store_custom_html || '');
          if (embedded) {
            const merged = {
              ...getDefaultPresetModel(embedded.presetId),
              ...embedded.model,
            };
            const defaults = buildDefaultPresetModelsById();
            const normalizedMap = { ...defaults };
            const embeddedModels = embedded.presetModels;
            if (embeddedModels && typeof embeddedModels === 'object') {
              for (const presetId of HTML_PRESET_IDS) {
                const maybe = embeddedModels[presetId];
                if (maybe && typeof maybe === 'object') {
                  normalizedMap[presetId] = {
                    ...getDefaultPresetModel(presetId),
                    ...maybe,
                  };
                }
              }
            }
            normalizedMap[embedded.presetId] = merged;
            setPresetModelsById(normalizedMap);
            setSelectedPresetId(embedded.presetId);
            setPresetModel(merged);
          }
        }
      } catch (error) {
        console.error('Failed to load storefront config:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPresetModelsById((prev) => {
      if (prev[selectedPresetId] === presetModel) return prev;
      return {
        ...prev,
        [selectedPresetId]: presetModel,
      };
    });
  }, [selectedPresetId, presetModel]);

  const publicUrl = useMemo(() => {
    if (!config.store_slug.trim()) return '';
    return `${window.location.origin}/store/${config.store_slug.trim()}`;
  }, [config.store_slug]);

  const selectablePresetImages = useMemo(() => {
    const extraImages = (presetModel.extraSections || []).map((section) => section.image || '');
    const all = [
      presetModel.sectionAboutImage || '',
      presetModel.whyUsImage || '',
      presetModel.contactImage || '',
      presetModel.heroImage || '',
      ...presetModel.collectionCarouselImages,
      ...extraImages,
    ].filter((src) => Boolean(src));
    return Array.from(new Set(all));
  }, [presetModel]);
  const uploadedFonts = useMemo(() => {
    const byUrl = new Map<string, UploadedFont>();
    Object.values(presetModelsById).forEach((model) => {
      (model.uploadedFonts || []).forEach((font) => {
        if (font?.url && !byUrl.has(font.url)) {
          byUrl.set(font.url, font);
        }
      });
    });
    (presetModel.uploadedFonts || []).forEach((font) => {
      if (font?.url && !byUrl.has(font.url)) {
        byUrl.set(font.url, font);
      }
    });
    return Array.from(byUrl.values());
  }, [presetModel.uploadedFonts, presetModelsById]);
  const savedColors = useMemo(() => {
    const byValue = new Map<string, SavedColor>();
    Object.values(presetModelsById).forEach((model) => {
      (model.savedColors || []).forEach((color) => {
        const key = String(color.value || '').toLowerCase();
        if (key && !byValue.has(key)) {
          byValue.set(key, color);
        }
      });
    });
    (presetModel.savedColors || []).forEach((color) => {
      const key = String(color.value || '').toLowerCase();
      if (key && !byValue.has(key)) {
        byValue.set(key, color);
      }
    });
    return Array.from(byValue.values());
  }, [presetModel.savedColors, presetModelsById]);

  function getDefaultTextStyle(fieldKey: string): TextStyleConfig {
    const baseSerif = `Georgia, "Times New Roman", serif`;
    const baseSans = `Arial, "Helvetica Neue", sans-serif`;
    switch (fieldKey) {
      case 'brandName':
        return {
          fontFamily: baseSerif,
          fontWeight: '700',
          color: presetModel.accentColor,
          letterSpacing: '0.2em',
        };
      case 'brandSubtitle':
        return {
          fontFamily: baseSerif,
          fontSize: '12px',
          color: presetModel.mutedColor,
          letterSpacing: '0.2em',
        };
      case 'navAbout':
      case 'navCollection':
      case 'navWhyUs':
      case 'navContact':
        return {
          fontFamily: baseSans,
          fontSize: '14px',
          color: presetModel.mutedColor,
        };
      case 'eyebrow':
        return {
          fontFamily: baseSans,
          fontSize: '12px',
          color: presetModel.accentColor,
          letterSpacing: '0.24em',
        };
      case 'heroLine1':
      case 'heroLine2':
      case 'heroLine3':
        return {
          fontFamily: baseSerif,
          fontWeight: '700',
          color: fieldKey === 'heroLine2' ? presetModel.accentColor : presetModel.textColor,
          lineHeight: '0.95',
        };
      case 'heroDescription':
        return {
          fontFamily: baseSerif,
          color: presetModel.mutedColor,
          lineHeight: '1.6',
        };
      case 'primaryButtonText':
        return {
          fontFamily: baseSans,
          fontSize: '13px',
          fontWeight: '700',
          color: '#111111',
          letterSpacing: '0.08em',
        };
      case 'secondaryButtonText':
        return {
          fontFamily: baseSans,
          fontSize: '13px',
          color: presetModel.accentColor,
          letterSpacing: '0.08em',
        };
      case 'sectionAboutTitle':
      case 'sectionCollectionTitle':
      case 'whyUsTitle':
      case 'contactTitle':
      case 'extraSectionTitle':
        return {
          fontFamily: baseSerif,
          fontWeight: '700',
          color: presetModel.textColor,
        };
      case 'sectionAboutBody':
      case 'sectionCollectionBody':
      case 'whyUsBody':
      case 'contactBody':
      case 'extraSectionBody':
        return {
          fontFamily: baseSerif,
          color: presetModel.mutedColor,
          lineHeight: '1.65',
        };
      case 'footerText':
        return {
          fontFamily: baseSans,
          fontSize: '13px',
          color: presetModel.mutedColor,
        };
      default:
        return {
          fontFamily: baseSerif,
          color: presetModel.textColor,
        };
    }
  }

  function getTextStyle(fieldKey: string): TextStyleConfig {
    return {
      ...getDefaultTextStyle(fieldKey),
      ...(presetModel.textStyles?.[fieldKey] || {}),
    };
  }

  function updateTextStyle(fieldKey: string, patch: Partial<TextStyleConfig>) {
    setPresetModel((prev) => ({
      ...prev,
      textStyles: {
        ...(prev.textStyles || {}),
        [fieldKey]: {
          ...(prev.textStyles?.[fieldKey] || {}),
          ...patch,
        },
      },
    }));
  }

  function saveCurrentColorToPalette(colorValue: string) {
    const normalized = String(colorValue || '').trim().toLowerCase();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return;
    const newColor: SavedColor = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      value: normalized,
    };
    setPresetModelsById((prev) => {
      const next = { ...prev };
      for (const presetId of HTML_PRESET_IDS) {
        const existing = next[presetId].savedColors || [];
        if (!existing.some((item) => item.value.toLowerCase() === normalized)) {
          next[presetId] = {
            ...next[presetId],
            savedColors: [...existing, newColor],
          };
        }
      }
      return next;
    });
    setPresetModel((prev) => {
      const existing = prev.savedColors || [];
      if (existing.some((item) => item.value.toLowerCase() === normalized)) return prev;
      return {
        ...prev,
        savedColors: [...existing, newColor],
      };
    });
  }

  function removeSavedColor(colorValue: string) {
    const normalized = String(colorValue || '').trim().toLowerCase();
    if (!normalized) return;
    setPresetModelsById((prev) => {
      const next = { ...prev };
      for (const presetId of HTML_PRESET_IDS) {
        next[presetId] = {
          ...next[presetId],
          savedColors: (next[presetId].savedColors || []).filter(
            (item) => item.value.toLowerCase() !== normalized
          ),
        };
      }
      return next;
    });
    setPresetModel((prev) => ({
      ...prev,
      savedColors: (prev.savedColors || []).filter(
        (item) => item.value.toLowerCase() !== normalized
      ),
    }));
  }

  function renderFontEditor(fieldKey: string) {
    const style = getTextStyle(fieldKey);
    const uploadedFontOptions = uploadedFonts
      .filter((font) => font?.family)
      .map((font) => ({
        label: `Uploaded: ${font.family}`,
        value: `'${font.family.replace(/'/g, "\\'")}'`,
      }));
    const allFontOptions = [...FONT_FAMILY_OPTIONS, ...uploadedFontOptions];
    return (
      <PresetFontEditor
        colorFallback={presetModel.textColor}
        fieldKey={fieldKey}
        fontOptions={allFontOptions}
        readOnly={readOnly}
        savedColors={savedColors}
        style={style}
        onResetColor={(targetFieldKey) => updateTextStyle(targetFieldKey, { color: '' })}
        onSaveColor={saveCurrentColorToPalette}
        onStyleChange={updateTextStyle}
      />
    );
  }

  async function save() {
    if (readOnly) return;
    if (!config.store_slug.trim()) {
      alert('Store name is required.');
      return;
    }
    setSaving(true);
    try {
      const resolvedHtml =
        htmlEditorTab === 'preset'
          ? buildPresetHtml(selectedPresetId, presetModel)
          : config.store_custom_html;
      const persistedPresetModels = {
        ...presetModelsById,
        [selectedPresetId]: presetModel,
      };
      const availableProductIds = new Set(products.map((product) => product.id));
      const payload: StorefrontConfig = {
        ...config,
        store_slug: normalizeSlug(config.store_slug),
        store_custom_html: resolvedHtml,
        store_product_ids: (config.store_product_ids || []).filter((id) =>
          availableProductIds.has(id)
        ),
        store_preset_state:
          htmlEditorTab === 'preset'
            ? { presetId: selectedPresetId, model: presetModel, presetModels: persistedPresetModels }
            : config.store_preset_state,
        store_custom_full_mode: false,
      };
      const saved = await localDb.saveStorefront(payload);
      // Backward-compatible merge in case API is not restarted and omits new fields.
      setConfig((prev) => ({
        ...prev,
        ...saved,
        store_background_image_data:
          saved.store_background_image_data ?? prev.store_background_image_data,
        store_custom_html: saved.store_custom_html ?? prev.store_custom_html,
        store_preset_state: saved.store_preset_state ?? prev.store_preset_state,
        store_custom_full_mode:
          typeof saved.store_custom_full_mode === 'boolean'
            ? saved.store_custom_full_mode
            : prev.store_custom_full_mode,
        store_show_details:
          typeof saved.store_show_details === 'boolean'
            ? saved.store_show_details
            : prev.store_show_details,
      }));
      setPresetModelsById(persistedPresetModels);
    } catch (error) {
      console.error('Failed to save storefront config:', error);
      alert(error instanceof Error ? error.message : 'Failed to save storefront settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(file: File | null) {
    if (!file || readOnly) return;
    const data = await readFileAsDataUrl(file);
    setConfig((prev) => ({ ...prev, store_logo_data: data }));
  }

  async function handleBannerFile(file: File | null) {
    if (!file || readOnly) return;
    const data = await readFileAsDataUrl(file);
    setConfig((prev) => ({ ...prev, store_banner_data: data }));
  }

  async function handleBackgroundFile(file: File | null) {
    if (!file || readOnly) return;
    const data = await readFileAsDataUrl(file);
    setConfig((prev) => ({ ...prev, store_background_image_data: data }));
  }

  async function handlePresetBodyImage(
    key: 'sectionAboutImage' | 'whyUsImage' | 'contactImage',
    file: File | null
  ) {
    if (!file || readOnly) return;
    try {
      const data = await readFileAsOptimizedDataUrl(file);
      const url = await localDb.uploadStorefrontImage(data);
      setPresetModel((prev) => ({ ...prev, [key]: url }));
    } catch (error) {
      console.error('Failed to upload preset image:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image.');
    }
  }

  async function handlePresetHeroImage(file: File | null) {
    if (!file || readOnly) return;
    try {
      const data = await readFileAsOptimizedDataUrl(file);
      const url = await localDb.uploadStorefrontImage(data);
      setPresetModel((prev) => ({ ...prev, heroImage: url }));
    } catch (error) {
      console.error('Failed to upload hero image:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image.');
    }
  }

  async function handlePresetFontFile(file: File | null) {
    if (!file || readOnly) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await localDb.uploadStorefrontFont(dataUrl, file.name);
      const newFont: UploadedFont = {
        family: uploaded.family,
        url: uploaded.url,
        originalName: uploaded.original_name,
      };
      setPresetModelsById((prev) => {
        const next = { ...prev };
        for (const presetId of HTML_PRESET_IDS) {
          const existing = next[presetId].uploadedFonts || [];
          next[presetId] = {
            ...next[presetId],
            uploadedFonts: existing.some((font) => font.url === newFont.url)
              ? existing
              : [...existing, newFont],
          };
        }
        return next;
      });
      setPresetModel((prev) => ({
        ...prev,
        uploadedFonts: prev.uploadedFonts?.some((font) => font.url === newFont.url)
          ? prev.uploadedFonts
          : [...(prev.uploadedFonts || []), newFont],
      }));
    } catch (error) {
      console.error('Failed to upload font file:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload font.');
    }
  }

  function removeUploadedFont(url: string) {
    if (readOnly) return;
    setPresetModelsById((prev) => {
      const next = { ...prev };
      for (const presetId of HTML_PRESET_IDS) {
        next[presetId] = {
          ...next[presetId],
          uploadedFonts: (next[presetId].uploadedFonts || []).filter((font) => font.url !== url),
        };
      }
      return next;
    });
    setPresetModel((prev) => ({
      ...prev,
      uploadedFonts: (prev.uploadedFonts || []).filter((font) => font.url !== url),
    }));
  }

  async function handleCollectionCarouselFiles(files: FileList | null) {
    if (!files || readOnly) return;
    const maxRemaining = Math.max(0, 20 - presetModel.collectionCarouselImages.length);
    const list = Array.from(files).slice(0, maxRemaining);
    try {
      const uploadedUrls: string[] = [];
      for (const file of list) {
        const data = await readFileAsOptimizedDataUrl(file);
        const url = await localDb.uploadStorefrontImage(data);
        uploadedUrls.push(url);
      }
      setPresetModel((prev) => ({
        ...prev,
        collectionCarouselImages: [...prev.collectionCarouselImages, ...uploadedUrls].slice(0, 20),
      }));
    } catch (error) {
      console.error('Failed to upload carousel images:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload one or more images.');
    }
  }

  function removeCollectionCarouselImage(index: number) {
    if (readOnly) return;
    setPresetModel((prev) => ({
      ...prev,
      collectionCarouselImages: prev.collectionCarouselImages.filter((_, i) => i !== index),
    }));
  }

  function applyCarouselImagesToAllPresets() {
    if (readOnly) return;
    const sharedImages = [...presetModel.collectionCarouselImages];
    if (sharedImages.length === 0) {
      alert('Upload at least one carousel image first.');
      return;
    }
    setPresetModelsById((prev) => {
      const next = { ...prev };
      for (const presetId of HTML_PRESET_IDS) {
        next[presetId] = {
          ...next[presetId],
          collectionCarouselImages: [...sharedImages],
        };
      }
      return next;
    });
    alert('Carousel images applied to all presets.');
  }

  function addPresetExtraSection() {
    if (readOnly) return;
    setPresetModel((prev) => ({
      ...prev,
      extraSections: [
        ...prev.extraSections,
        {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: `New Section ${prev.extraSections.length + 1}`,
          body: '',
          image: '',
          enabled: true,
        },
      ],
    }));
  }

  function updatePresetExtraSection(index: number, patch: Partial<PresetExtraSection>) {
    setPresetModel((prev) => ({
      ...prev,
      extraSections: prev.extraSections.map((section, i) =>
        i === index ? { ...section, ...patch } : section
      ),
    }));
  }

  function removePresetExtraSection(index: number) {
    if (readOnly) return;
    setPresetModel((prev) => ({
      ...prev,
      extraSections: prev.extraSections.filter((_, i) => i !== index),
    }));
  }

  function removeAllPresetSections() {
    if (readOnly) return;
    setPresetModel((prev) => ({
      ...prev,
      showAboutSection: false,
      showCollectionSection: false,
      showWhyUsSection: false,
      showContactSection: false,
      extraSections: prev.extraSections.map((section) => ({ ...section, enabled: false })),
    }));
  }

  function restoreCorePresetSections() {
    if (readOnly) return;
    setPresetModel((prev) => ({
      ...prev,
      showAboutSection: true,
      showCollectionSection: true,
      showWhyUsSection: true,
      showContactSection: true,
      extraSections: prev.extraSections.map((section) => ({ ...section, enabled: true })),
    }));
  }

  async function handlePresetExtraSectionImage(index: number, file: File | null) {
    if (!file || readOnly) return;
    try {
      const data = await readFileAsOptimizedDataUrl(file);
      const url = await localDb.uploadStorefrontImage(data);
      updatePresetExtraSection(index, { image: url });
    } catch (error) {
      console.error('Failed to upload preset section image:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image.');
    }
  }

  function applyPresetToHtml() {
    if (readOnly) return;
    const generatedHtml = buildPresetHtml(selectedPresetId, presetModel);
    const persistedPresetModels = {
      ...presetModelsById,
      [selectedPresetId]: presetModel,
    };
    setConfig((prev) => ({
      ...prev,
      store_custom_html: generatedHtml,
      store_preset_state: {
        presetId: selectedPresetId,
        model: presetModel,
        presetModels: persistedPresetModels,
      },
      store_custom_full_mode: false,
    }));
  }

  function resetPresetEdits() {
    if (readOnly) return;
    const nextDefault = {
      ...getDefaultPresetModel(selectedPresetId),
      uploadedFonts: [...(presetModel.uploadedFonts || [])],
    };
    setPresetModelsById((prev) => ({
      ...prev,
      [selectedPresetId]: nextDefault,
    }));
    setPresetModel(nextDefault);
    setPresetPreviewHtml('');
  }

  function previewPreset() {
    const generatedHtml = buildPresetHtml(selectedPresetId, presetModel);
    setPresetPreviewHtml(
      `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(
        presetModel.pageTitle || 'Storefront Preset Preview'
      )}</title><meta name="description" content="${escapeHtml(
        presetModel.metaDescription || ''
      )}" /><style>body{margin:0}</style></head><body>${generatedHtml}</body></html>`
    );
  }

  function toggleStoreProduct(productId: string) {
    if (readOnly) return;
    setConfig((prev) => {
      const exists = prev.store_product_ids.includes(productId);
      return {
        ...prev,
        store_product_ids: exists
          ? prev.store_product_ids.filter((id) => id !== productId)
          : [...prev.store_product_ids, productId],
      };
    });
  }

  function moveProductBefore(sourceId: string, targetId: string) {
    if (readOnly || sourceId === targetId) return;
    setConfig((prev) => {
      const ids = [...prev.store_product_ids];
      const sourceIndex = ids.indexOf(sourceId);
      const targetIndex = ids.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      ids.splice(sourceIndex, 1);
      ids.splice(targetIndex, 0, sourceId);
      return { ...prev, store_product_ids: ids };
    });
  }

  const selectedProducts = config.store_product_ids
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is StorefrontProductSummary => Boolean(product));

  if (loading) {
    return <div className="text-center py-8">Loading storefront...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Store className="w-6 h-6 text-pink-600" />
        <h2 className="text-2xl font-bold text-gray-800">Storefront Setup</h2>
      </div>

      <div role="tablist" aria-label="Storefront setup sections" className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {STOREFRONT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-pink-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm text-slate-700">
        <h3 className="font-bold text-slate-900">{STOREFRONT_TAB_HELP[activeTab].title}</h3>
        <p className="mt-1">{STOREFRONT_TAB_HELP[activeTab].description}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {STOREFRONT_TAB_HELP[activeTab].sections.map((section) => <li key={section}>{section}</li>)}
        </ul>
      </section>

      <div role="tabpanel" hidden={activeTab !== 'design'}>
      <StorefrontSettingsPanel
        addPresetExtraSection={addPresetExtraSection}
        applyCarouselImagesToAllPresets={applyCarouselImagesToAllPresets}
        applyPresetToHtml={applyPresetToHtml}
        config={config}
        handleBackgroundFile={handleBackgroundFile}
        handleBannerFile={handleBannerFile}
        handleCollectionCarouselFiles={handleCollectionCarouselFiles}
        handleLogoFile={handleLogoFile}
        handlePresetBodyImage={handlePresetBodyImage}
        handlePresetExtraSectionImage={handlePresetExtraSectionImage}
        handlePresetFontFile={handlePresetFontFile}
        handlePresetHeroImage={handlePresetHeroImage}
        htmlEditorTab={htmlEditorTab}
        onSave={save}
        presetEditorTab={presetEditorTab}
        presetModel={presetModel}
        presetModelsById={presetModelsById}
        presetPreviewHtml={presetPreviewHtml}
        previewPreset={previewPreset}
        publicUrl={publicUrl}
        readOnly={readOnly}
        removeAllPresetSections={removeAllPresetSections}
        removeCollectionCarouselImage={removeCollectionCarouselImage}
        removePresetExtraSection={removePresetExtraSection}
        removeSavedColor={removeSavedColor}
        removeUploadedFont={removeUploadedFont}
        renderFontEditor={renderFontEditor}
        resetPresetEdits={resetPresetEdits}
        restoreCorePresetSections={restoreCorePresetSections}
        saving={saving}
        savedColors={savedColors}
        selectablePresetImages={selectablePresetImages}
        selectedPresetId={selectedPresetId}
        setConfig={setConfig}
        setHtmlEditorTab={setHtmlEditorTab}
        setPresetEditorTab={setPresetEditorTab}
        setPresetModel={setPresetModel}
        setPresetModelsById={setPresetModelsById}
        setPresetPreviewHtml={setPresetPreviewHtml}
        setSelectedPresetId={setSelectedPresetId}
        storeOrigin={window.location.origin}
        updatePresetExtraSection={updatePresetExtraSection}
        uploadedFonts={uploadedFonts}
      />

      <StorefrontPreviewPanel config={config} publicUrl={publicUrl} />
      </div>

      <div role="tabpanel" hidden={activeTab !== 'catalog'}>
      <ProductSelectionPanel
        config={config}
        products={products}
        readOnly={readOnly}
        onToggleStoreProduct={toggleStoreProduct}
      />

      <ProductOrderPanel
        dragProductId={dragProductId}
        readOnly={readOnly}
        selectedProducts={selectedProducts}
        setDragProductId={setDragProductId}
        onMoveProductBefore={moveProductBefore}
      />
      </div>

      <div role="tabpanel" hidden={activeTab !== 'orders'}>
      <StorefrontOrdersPanel readOnly={readOnly} />
      <DiscountCodeManager readOnly={readOnly} />
      </div>

      <div role="tabpanel" hidden={activeTab !== 'customers'}>
      <GalleryModerationPanel readOnly={readOnly} />
      <MembershipManager readOnly={readOnly} />
      <SubscriptionPlanManager readOnly={readOnly} />
      <SubscriptionFulfillmentQueue />
      </div>

      <div role="tabpanel" hidden={activeTab !== 'requests'}>
      <LaunchToolsManager readOnly={readOnly} />
      <EventFavorManager readOnly={readOnly} />
      <CustomOrderQuoteManager readOnly={readOnly} />
      </div>

      <div role="tabpanel" hidden={activeTab !== 'services'}>
      <FeatureVisibilityManager readOnly={readOnly} />
      <PickupManager readOnly={readOnly} />
      <WorkshopManager readOnly={readOnly} />
      <WorkshopPartyManager readOnly={readOnly} />
      <RefillProgramManager readOnly={readOnly} />
      </div>
    </div>
  );
}

