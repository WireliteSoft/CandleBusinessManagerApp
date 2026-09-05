import type {
  HtmlPresetId,
  HtmlPresetModel,
  PresetEmbeddedState,
  TextStyleConfig,
} from './presetBuilder.types';

export * from './presetBuilder.types';
export * from './presetBuilder.defaults';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInlineTextStyleAttr(style?: TextStyleConfig): string {
  if (!style) return '';
  const css: string[] = [];
  if (style.fontFamily?.trim()) css.push(`font-family:${style.fontFamily.trim()}`);
  if (style.fontSize?.trim()) css.push(`font-size:${style.fontSize.trim()}`);
  if (style.fontWeight?.trim()) css.push(`font-weight:${style.fontWeight.trim()}`);
  if (style.fontStyle?.trim()) css.push(`font-style:${style.fontStyle.trim()}`);
  if (style.color?.trim()) css.push(`color:${style.color.trim()}`);
  if (style.lineHeight?.trim()) css.push(`line-height:${style.lineHeight.trim()}`);
  if (style.letterSpacing?.trim()) css.push(`letter-spacing:${style.letterSpacing.trim()}`);
  if (css.length === 0) return '';
  return ` style="${escapeHtml(css.join(';'))}"`;
}

function formatSectionBodyHtml(input: string, styleAttr = ''): string {
  const normalized = String(input || '').replace(/\r\n/g, '\n');
  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  return paragraphs
    .map(
      (paragraph, index) =>
        `<p class="preset-store-body-paragraph${
          index === 0 ? ' preset-store-body-paragraph-first' : ''
        }"${styleAttr}>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`
    )
    .join('');
}

function decodePresetMeta(encoded: string): PresetEmbeddedState | null {
  try {
    const decoded = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(decoded) as PresetEmbeddedState;
    if (!parsed || !parsed.presetId || !parsed.model) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function extractPresetMetaFromHtml(html: string): PresetEmbeddedState | null {
  const match = String(html || '').match(/<!--\s*CBM_PRESET_META:([A-Za-z0-9+/=]+)\s*-->/);
  if (!match?.[1]) return null;
  return decodePresetMeta(match[1]);
}

export function buildPresetHtml(presetId: HtmlPresetId, model: HtmlPresetModel): string {
  const escapedHeroImage = escapeHtml(String(model.heroImage || ''));
  const uploadedFonts = (model.uploadedFonts || [])
    .filter((font) => font?.family && font?.url)
    .map((font) => ({
      family: escapeHtml(String(font.family)),
      url: escapeHtml(String(font.url)),
    }));
  const uploadedFontCss = uploadedFonts
    .map(
      (font) =>
        `@font-face{font-family:'${font.family.replace(/'/g, "\\'")}';src:url('${font.url}') format('${font.url.toLowerCase().endsWith('.woff2') ? 'woff2' : font.url.toLowerCase().endsWith('.woff') ? 'woff' : font.url.toLowerCase().endsWith('.otf') ? 'opentype' : 'truetype'}');font-display:swap;}`
    )
    .join('');
  const safe = Object.fromEntries(
    Object.entries(model).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map((item) => escapeHtml(String(item)))
        : escapeHtml(String(value)),
    ])
  ) as unknown as HtmlPresetModel;
  const safeExtraSections = (model.extraSections || []).map((section, index) => ({
    id: escapeHtml(
      String(section?.id || section?.title || `section-${index + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
    ),
    title: escapeHtml(String(section?.title || 'Custom Section')),
    body: String(section?.body || ''),
    image: escapeHtml(String(section?.image || '')),
    enabled: section?.enabled !== false,
  }));
  const aboutTitleStyle = buildInlineTextStyleAttr(model.textStyles?.sectionAboutTitle);
  const aboutBodyStyle = buildInlineTextStyleAttr(model.textStyles?.sectionAboutBody);
  const collectionTitleStyle = buildInlineTextStyleAttr(model.textStyles?.sectionCollectionTitle);
  const collectionBodyStyle = buildInlineTextStyleAttr(model.textStyles?.sectionCollectionBody);
  const whyUsTitleStyle = buildInlineTextStyleAttr(model.textStyles?.whyUsTitle);
  const whyUsBodyStyle = buildInlineTextStyleAttr(model.textStyles?.whyUsBody);
  const contactTitleStyle = buildInlineTextStyleAttr(model.textStyles?.contactTitle);
  const contactBodyStyle = buildInlineTextStyleAttr(model.textStyles?.contactBody);
  const extraTitleStyle = buildInlineTextStyleAttr(model.textStyles?.extraSectionTitle);
  const extraBodyStyle = buildInlineTextStyleAttr(model.textStyles?.extraSectionBody);
  const brandNameStyle = buildInlineTextStyleAttr(model.textStyles?.brandName);
  const brandSubtitleStyle = buildInlineTextStyleAttr(model.textStyles?.brandSubtitle);
  const navAboutStyle = buildInlineTextStyleAttr(model.textStyles?.navAbout);
  const navCollectionStyle = buildInlineTextStyleAttr(model.textStyles?.navCollection);
  const navWhyUsStyle = buildInlineTextStyleAttr(model.textStyles?.navWhyUs);
  const navContactStyle = buildInlineTextStyleAttr(model.textStyles?.navContact);
  const heroEyebrowStyle = buildInlineTextStyleAttr(model.textStyles?.eyebrow);
  const heroLine1Style = buildInlineTextStyleAttr(model.textStyles?.heroLine1);
  const heroLine2Style = buildInlineTextStyleAttr(model.textStyles?.heroLine2);
  const heroLine3Style = buildInlineTextStyleAttr(model.textStyles?.heroLine3);
  const heroDescriptionStyle = buildInlineTextStyleAttr(model.textStyles?.heroDescription);
  const primaryButtonStyle = buildInlineTextStyleAttr(model.textStyles?.primaryButtonText);
  const secondaryButtonStyle = buildInlineTextStyleAttr(model.textStyles?.secondaryButtonText);
  const footerTextStyle = buildInlineTextStyleAttr(model.textStyles?.footerText);
  const navLinks: Array<{ href: string; label: string; styleAttr: string }> = [];
  if (model.showAboutSection) {
    navLinks.push({ href: '#about', label: safe.navAbout, styleAttr: navAboutStyle });
  }
  if (model.showCollectionSection) {
    navLinks.push({
      href: '#collection',
      label: safe.navCollection,
      styleAttr: navCollectionStyle,
    });
  }
  if (model.showWhyUsSection) {
    navLinks.push({ href: '#why-us', label: safe.navWhyUs, styleAttr: navWhyUsStyle });
  }
  if (model.showContactSection) {
    navLinks.push({ href: '#contact', label: safe.navContact, styleAttr: navContactStyle });
  }
  for (const section of safeExtraSections.filter((item) => item.enabled)) {
    if (section.id && section.title) {
      navLinks.push({ href: `#${section.id}`, label: section.title, styleAttr: navAboutStyle });
    }
  }
  const navLinksHtml = navLinks
    .map(
      (link) =>
        `<a href="${link.href}"${link.styleAttr}>${escapeHtml(String(link.label || 'Link'))}</a>`
    )
    .join('');
  const customSectionHtml = safeExtraSections
    .filter((section) => section.enabled)
    .map(
      (section) => `<section id="${section.id}" class="preset-store-section">
    <div class="preset-store-container">
      <div class="preset-store-panel">
        <h2${extraTitleStyle}>${section.title}</h2>
        ${formatSectionBodyHtml(section.body, extraBodyStyle)}
        ${section.image ? `<img class="preset-store-section-image" src="${section.image}" alt="${section.title}" />` : ''}
      </div>
    </div>
  </section>`
    )
    .join('');
  const aboutSectionHtml = model.showAboutSection
    ? `<section id="about" class="preset-store-section">
    <div class="preset-store-container">
      <div class="preset-store-panel">
        <h2${aboutTitleStyle}>${safe.sectionAboutTitle}</h2>
        ${formatSectionBodyHtml(model.sectionAboutBody, aboutBodyStyle)}
        ${safe.sectionAboutImage ? `<img class="preset-store-section-image" src="${safe.sectionAboutImage}" alt="${safe.sectionAboutTitle}" />` : ''}
      </div>
    </div>
  </section>`
    : '';
  const collectionImages = [
    ...((model.collectionCarouselImages || []).filter(Boolean) as string[]),
    model.collectionCarouselImage1,
    model.collectionCarouselImage2,
    model.collectionCarouselImage3,
    model.collectionCarouselImage4,
    model.collectionCarouselImage5,
  ]
    .map((image) => String(image || '').trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((image) => escapeHtml(image));
  const collectionSectionHtml = model.showCollectionSection
    ? `<section id="collection" class="preset-store-section">
    <div class="preset-store-container">
      <div class="preset-store-panel">
        <h2${collectionTitleStyle}>${safe.sectionCollectionTitle}</h2>
        ${formatSectionBodyHtml(model.sectionCollectionBody, collectionBodyStyle)}
        <div class="swiper-container two">
          <div class="swiper-wrapper">
            ${
              collectionImages.length > 0
                ? collectionImages
                    .map(
                      (image) =>
                        `<div class="swiper-slide"><div class="slider-image"><img src="${image}" alt="${safe.sectionCollectionTitle}" /></div></div>`
                    )
                    .join('')
                : '<div class="swiper-slide"><div class="slider-image"><div style="height:170px;display:flex;align-items:center;justify-content:center;border-radius:14px;border:1px dashed #999;color:#888;background:#fff">Upload collection images in preset editor</div></div></div>'
            }
          </div>
          <div class="swiper-pagination"></div>
        </div>
      </div>
    </div>
  </section>`
    : '';
  const whyUsSectionHtml = model.showWhyUsSection
    ? `<section id="why-us" class="preset-store-section">
    <div class="preset-store-container">
      <div class="preset-store-panel">
        <h2${whyUsTitleStyle}>${safe.whyUsTitle}</h2>
        ${formatSectionBodyHtml(model.whyUsBody, whyUsBodyStyle)}
        ${safe.whyUsImage ? `<img class="preset-store-section-image" src="${safe.whyUsImage}" alt="${safe.whyUsTitle}" />` : ''}
      </div>
    </div>
  </section>`
    : '';
  const contactSectionHtml = model.showContactSection
    ? `<section id="contact" class="preset-store-section">
    <div class="preset-store-container">
      <div class="preset-store-panel">
        <h2${contactTitleStyle}>${safe.contactTitle}</h2>
        ${formatSectionBodyHtml(model.contactBody, contactBodyStyle)}
        ${safe.contactImage ? `<img class="preset-store-section-image" src="${safe.contactImage}" alt="${safe.contactTitle}" />` : ''}
      </div>
    </div>
  </section>`
    : '';
  const heroStyle =
    presetId === 'minimal-clean'
      ? 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02))'
      : 'radial-gradient(circle at top, rgba(212, 175, 55, 0.09), transparent 40%)';

  return `<section>
<style>
  ${uploadedFontCss}
  :root {
    --bg: ${safe.bgColor};
    --text: ${safe.textColor};
    --muted: ${safe.mutedColor};
    --accent: ${safe.accentColor};
    --panel: ${safe.panelColor};
  }
  .preset-store-wrap {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.6;
  }
  .preset-store-wrap * { box-sizing: border-box; }
  .preset-store-container { width: calc(100% - 40px); max-width: none; margin: 0 auto; }
  .preset-store-topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 16px 0;
    border-bottom: 1px solid color-mix(in oklab, var(--accent), #000 75%);
    background: color-mix(in oklab, var(--bg), #000 20%);
  }
  .preset-store-nav { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
  .preset-store-brand-title { color: var(--accent); font-weight: 700; letter-spacing: 0.2em; }
  .preset-store-brand-sub { color: var(--muted); font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px; }
  .preset-store-links { display: flex; gap: 14px; flex-wrap: wrap; color: var(--muted); font-size: 14px; }
  .preset-store-links a { color: inherit; text-decoration: none; }
  .preset-store-links a:hover { color: var(--accent); }
  .preset-store-hero { padding: 70px 0; background: ${heroStyle}; }
  .preset-store-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 30px; align-items: center; }
  .preset-store-eyebrow { color: var(--accent); font-size: 12px; text-transform: uppercase; letter-spacing: 0.24em; }
  .preset-store-h1 { margin: 12px 0; font-size: clamp(2rem, 5vw, 4.2rem); line-height: .95; font-weight: 600; }
  .preset-store-h1 .accent { color: var(--accent); }
  .preset-store-hero p { color: var(--muted); margin: 0; max-width: 680px; }
  .preset-store-actions { display: flex; gap: 12px; margin-top: 22px; flex-wrap: wrap; }
  .preset-store-btn {
    display: inline-block; border-radius: 999px; padding: 11px 20px; text-transform: uppercase;
    letter-spacing: .08em; font-size: 13px; text-decoration: none; border: 1px solid var(--accent);
  }
  .preset-store-btn.primary { background: var(--accent); color: #111; font-weight: 700; }
  .preset-store-btn.secondary { color: var(--accent); }
  .preset-store-card {
    background: color-mix(in oklab, var(--panel), #000 8%);
    border: 1px solid color-mix(in oklab, var(--accent), #000 75%);
    border-radius: 24px;
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .preset-store-hero-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .preset-store-hero-empty {
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .preset-store-section { padding: 65px 0; }
  .preset-store-panel {
    background: color-mix(in oklab, var(--panel), #000 6%);
    border: 1px solid color-mix(in oklab, var(--accent), #000 80%);
    border-radius: 20px;
    padding: 24px;
  }
  .preset-store-section h2 { font-size: clamp(1.4rem, 3vw, 2.1rem); margin: 0 0 8px; }
  .preset-store-section p { margin: 0; color: var(--muted); }
  .preset-store-body-paragraph {
    display: block;
    margin: 0 0 1.35em !important;
    color: var(--muted);
    line-height: 1.65;
  }
  .preset-store-body-paragraph:last-child { margin-bottom: 0 !important; }
  .preset-store-body-paragraph-first::first-letter {
    font-size: 1.65em;
    font-weight: 700;
    color: inherit;
    line-height: 1;
    padding-right: 1px;
  }
  .preset-store-section-image {
    display: block;
    width: 100%;
    max-height: 280px;
    margin-top: 14px;
    object-fit: contain;
    border-radius: 14px;
    border: 1px solid color-mix(in oklab, var(--accent), #000 80%);
    background: color-mix(in oklab, var(--panel), #fff 8%);
  }
  .swiper-container.two {
    position: relative;
    width: 100%;
    height: 320px;
    margin-top: 14px;
    perspective: 1200px;
    overflow: hidden;
  }
  .swiper-container.two .swiper-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .swiper-container.two .swiper-slide {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 260px;
    transform-style: preserve-3d;
    transition: transform .45s ease, opacity .45s ease;
    will-change: transform, opacity;
  }
  .swiper-container.two .swiper-slide img {
    display: block;
    width: 100%;
    height: 170px;
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid color-mix(in oklab, var(--accent), #000 80%);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    background: #fff;
  }
  .swiper-container.two .swiper-pagination {
    position: absolute;
    bottom: 8px;
    left: 0;
    width: 100%;
    text-align: center;
  }
  .swiper-container.two .swiper-pagination-bullet {
    width: 26px;
    height: 10px;
    border-radius: 10px;
    border: 1px solid var(--accent);
    background: transparent;
    display: inline-block;
    margin: 0 5px;
    cursor: pointer;
  }
  .swiper-container.two .swiper-pagination-bullet-active {
    width: 12px;
    height: 12px;
    border: none;
    border-radius: 50%;
    background: var(--accent);
  }
  .preset-store-footer {
    padding: 24px 0; text-align: center; color: var(--muted);
    border-top: 1px solid color-mix(in oklab, var(--accent), #000 75%);
    font-size: 13px;
  }
  @media (max-width: 900px) {
    .preset-store-grid { grid-template-columns: 1fr; }
  }
</style>

<div class="preset-store-wrap">
  <header class="preset-store-topbar">
    <div class="preset-store-container preset-store-nav">
      <div>
        <div class="preset-store-brand-title"${brandNameStyle}>${safe.brandName}</div>
        <div class="preset-store-brand-sub"${brandSubtitleStyle}>${safe.brandSubtitle}</div>
      </div>
      <nav class="preset-store-links">${navLinksHtml}</nav>
    </div>
  </header>
  <section class="preset-store-hero">
    <div class="preset-store-container preset-store-grid">
      <div>
        <div class="preset-store-eyebrow"${heroEyebrowStyle}>${safe.eyebrow}</div>
        <h1 class="preset-store-h1">
          <span${heroLine1Style}>${safe.heroLine1}</span><br />
          <span class="accent"${heroLine2Style}>${safe.heroLine2}</span><br />
          <span${heroLine3Style}>${safe.heroLine3}</span>
        </h1>
        <p${heroDescriptionStyle}>${safe.heroDescription}</p>
        <div class="preset-store-actions">
          <a class="preset-store-btn primary"${primaryButtonStyle}>${safe.primaryButtonText}</a>
          <a class="preset-store-btn secondary"${secondaryButtonStyle}>${safe.secondaryButtonText}</a>
        </div>
      </div>
      <div class="preset-store-card">
        ${
          escapedHeroImage
            ? `<img class="preset-store-hero-image" src="${escapedHeroImage}" alt="${safe.brandName} hero image" />`
            : '<div class="preset-store-hero-empty">Hero image slot</div>'
        }
      </div>
    </div>
  </section>
  ${aboutSectionHtml}
  ${collectionSectionHtml}
  ${whyUsSectionHtml}
  ${contactSectionHtml}
  ${customSectionHtml}
  <footer class="preset-store-footer"${footerTextStyle}>
    &copy; ${new Date().getFullYear()} ${safe.brandName}. ${safe.footerText}
  </footer>
</div>
</section>`;
}
