import type { StorefrontConfig } from '../../lib/localDb';

export type HtmlEditorTab = 'raw' | 'preset' | 'fonts';
export type PresetEditorTab = 'header' | 'navigation' | 'hero' | 'content' | 'footer' | 'colors';
export type HtmlPresetId =
  | 'luxury-signature'
  | 'minimal-clean'
  | 'coastal-breeze'
  | 'botanical-spa'
  | 'autumn-harvest'
  | 'midnight-glam'
  | 'winter-frost';
export type PresetExtraSection = {
  id: string;
  title: string;
  body: string;
  image: string;
  enabled: boolean;
};
export type TextStyleConfig = {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  lineHeight?: string;
  letterSpacing?: string;
};
export type UploadedFont = {
  family: string;
  url: string;
  originalName?: string;
};
export type SavedColor = {
  id: string;
  value: string;
};
export type HtmlPresetModel = {
  pageTitle: string;
  metaDescription: string;
  brandName: string;
  brandSubtitle: string;
  navAbout: string;
  navCollection: string;
  navWhyUs: string;
  navContact: string;
  eyebrow: string;
  heroLine1: string;
  heroLine2: string;
  heroLine3: string;
  heroDescription: string;
  heroImage?: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  sectionAboutTitle: string;
  sectionAboutBody: string;
  sectionAboutImage: string;
  showAboutSection: boolean;
  sectionCollectionTitle: string;
  sectionCollectionBody: string;
  collectionCarouselImages: string[];
  collectionCarouselImage1: string;
  collectionCarouselImage2: string;
  collectionCarouselImage3: string;
  collectionCarouselImage4: string;
  collectionCarouselImage5: string;
  showCollectionSection: boolean;
  extraSections: PresetExtraSection[];
  whyUsTitle: string;
  whyUsBody: string;
  whyUsImage: string;
  showWhyUsSection: boolean;
  contactTitle: string;
  contactBody: string;
  contactImage: string;
  showContactSection: boolean;
  textStyles: Record<string, TextStyleConfig>;
  uploadedFonts: UploadedFont[];
  savedColors: SavedColor[];
  footerText: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  panelColor: string;
};
export type PresetEmbeddedState = {
  presetId: HtmlPresetId;
  model: HtmlPresetModel;
  presetModels?: Partial<Record<HtmlPresetId, HtmlPresetModel>>;
};

export function isHtmlPresetId(value: unknown): value is HtmlPresetId {
  return (
    value === 'luxury-signature' ||
    value === 'minimal-clean' ||
    value === 'coastal-breeze' ||
    value === 'botanical-spa' ||
    value === 'autumn-harvest' ||
    value === 'midnight-glam' ||
    value === 'winter-frost'
  );
}

export const HTML_PRESET_IDS: HtmlPresetId[] = [
  'luxury-signature',
  'minimal-clean',
  'coastal-breeze',
  'botanical-spa',
  'autumn-harvest',
  'midnight-glam',
  'winter-frost',
];

export const FONT_FAMILY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Theme Default', value: '' },
  { label: 'Serif', value: `Georgia, "Times New Roman", serif` },
  { label: 'Sans', value: `Arial, "Helvetica Neue", sans-serif` },
  { label: 'Modern Sans', value: `"Trebuchet MS", "Segoe UI", sans-serif` },
  { label: 'Classic', value: `"Palatino Linotype", "Book Antiqua", Palatino, serif` },
  { label: 'Monospace', value: `"Courier New", monospace` },
];

export const EMPTY_CONFIG: StorefrontConfig = {
  store_slug: '',
  store_title: '',
  store_description: '',
  store_logo_data: '',
  store_banner_data: '',
  store_background_image_data: '',
  store_custom_html: '',
  store_preset_state: null,
  store_custom_full_mode: false,
  store_show_details: true,
  store_product_ids: [],
};

export function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}
