import type { ReactNode } from 'react';
import type { HtmlPresetModel } from './presetBuilder';

export type PanelProps = {
  presetModel: HtmlPresetModel;
  readOnly: boolean;
  renderFontEditor: (fieldKey: string) => ReactNode;
  selectablePresetImages: string[];
  setPresetModel: React.Dispatch<React.SetStateAction<HtmlPresetModel>>;
  handlePresetHeroImage: (file: File | null) => Promise<void>;
};

export type BodyImageKey = 'sectionAboutImage' | 'whyUsImage' | 'contactImage';

export type ContentPanelProps = {
  presetModel: HtmlPresetModel;
  readOnly: boolean;
  renderFontEditor: (fieldKey: string) => ReactNode;
  setPresetModel: React.Dispatch<React.SetStateAction<HtmlPresetModel>>;
  restoreCorePresetSections: () => void;
  removeAllPresetSections: () => void;
  addPresetExtraSection: () => void;
  handlePresetBodyImage: (key: BodyImageKey, file: File | null) => Promise<void>;
  applyCarouselImagesToAllPresets: () => void;
  handleCollectionCarouselFiles: (files: FileList | null) => Promise<void>;
  removeCollectionCarouselImage: (index: number) => void;
  updatePresetExtraSection: (
    index: number,
    patch: Partial<HtmlPresetModel['extraSections'][number]>
  ) => void;
  removePresetExtraSection: (index: number) => void;
  handlePresetExtraSectionImage: (index: number, file: File | null) => Promise<void>;
};
