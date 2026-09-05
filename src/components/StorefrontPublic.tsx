import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Menu, ShoppingCart } from "lucide-react";
import { localDb, type PublicStorefrontConfig } from "../lib/localDb";
import CarouselViewerModal from "./storefrontPublic/CarouselViewerModal";
import CartDrawer from "./storefrontPublic/CartDrawer";
import ContactForm from "./storefrontPublic/ContactForm";
import ProductGrid from "./storefrontPublic/ProductGrid";
import ThemeControls from "./storefrontPublic/ThemeControls";
import CustomerAccountModal from "./storefrontPublic/CustomerAccountModal";
import StoreCheckoutModal from "./storefrontPublic/StoreCheckoutModal";
import ProductDetailsModal from "./storefrontPublic/ProductDetailsModal";
import CandleCareModal from "./storefrontPublic/CandleCareModal";
import LaunchTools from "./storefrontPublic/LaunchTools";
import CustomCandleModal from "./storefrontPublic/CustomCandleModal";
import CustomScentRequestModal from "./storefrontPublic/CustomScentRequestModal";
import EventFavorModal from "./storefrontPublic/EventFavorModal";
import QuoteApprovalModal from "./storefrontPublic/QuoteApprovalModal";
import WorkshopBookingModal from "./storefrontPublic/WorkshopBookingModal";
import WorkshopPartyRequestModal from "./storefrontPublic/WorkshopPartyRequestModal";
import RefillRequestModal from "./storefrontPublic/RefillRequestModal";
import ScentPollBanner from "./storefrontPublic/ScentPollBanner";
import FragranceOilCatalogModal from "./storefrontPublic/FragranceOilCatalogModal";
import GiftPackRequestModal from "./storefrontPublic/GiftPackRequestModal";
import CollectionRequestModal from "./storefrontPublic/CollectionRequestModal";
import SamplePackModal from "./storefrontPublic/SamplePackModal";
import ScentPortfolioModal from "./storefrontPublic/ScentPortfolioModal";
import MysteryBoxModal from "./storefrontPublic/MysteryBoxModal";
import GiftCardPurchaseModal from "./storefrontPublic/GiftCardPurchaseModal";
import GiftRegistryModal from "./storefrontPublic/GiftRegistryModal";
import ProductReviewModal from "./storefrontPublic/ProductReviewModal";
import PublicGallery from "./storefrontPublic/PublicGallery";
import SubscriptionPlans from "./storefrontPublic/SubscriptionPlans";
import type { GiftPackOilSelection } from "./storefrontPublic/FragranceOilCatalogModal";
import {
  DARK_THEME_STORAGE_KEY,
  DARK_THEMES,
  LIGHT_THEME_STORAGE_KEY,
  LIGHT_THEMES,
  THEME_MODE_STORAGE_KEY,
  getCartStorageKey,
  getRecentlyViewedStorageKey,
  parseStructuredProductDescription,
  type CartLine,
  type CandleCustomization,
  type DarkTheme,
  type LightTheme,
  type ProductDescriptionField,
  type ThemeMode,
  mixMatchDiscountPercent,
} from "./storefrontPublic/helpers";

type Props = {
  slug: string;
};

type StoreMenuHelpKey = 'discoverCategory' | 'giftingCategory' | 'servicesCategory' | 'accountCategory' | 'care' | 'customScent' | 'giftPack' | 'collection' | 'giftCards' | 'registry' | 'samplePack' | 'scentPacks' | 'mysteryBox' | 'eventFavors' | 'workshops' | 'privateParties' | 'refill' | 'account';

const STORE_MENU_HELP: Record<StoreMenuHelpKey, { title: string; description: string; details: string[] }> = {
  discoverCategory: { title: 'Shop and discover', description: 'Explore candle products, scents, collections, and personalized shopping tools.', details: ['Build gifts, sample packs, and saved scent collections.', 'Find candle care guidance and surprise or curated scent options.'] },
  giftingCategory: { title: 'Gifting and events', description: 'Choose options for gifting candles or planning a candle-focused celebration.', details: ['Purchase gift cards or create a gift registry.', 'Request custom event favors for a celebration or gathering.'] },
  servicesCategory: { title: 'Services', description: 'Request workshop, party, and refill services offered by the store.', details: ['Book candle-making experiences or request a private party.', 'Request an eligible container refill when the program is available.'] },
  accountCategory: { title: 'Your account', description: 'Manage the storefront information and benefits connected to your customer account.', details: ['Review orders, payment-related balances, rewards, and saved details.', 'Access saved collections, registries, and account preferences.'] },
  care: { title: 'Candle Care', description: 'Find practical guidance for getting the best performance from your candles.', details: ['Review burning, trimming, and safety guidance.', 'Use care information for products you already own.'] },
  customScent: { title: 'Create a Scent', description: 'Submit a request for a candle built around your preferred fragrance direction.', details: ['Choose scent notes and candle preferences.', 'The store reviews the request before creating a quote.'] },
  giftPack: { title: 'Create Gift Pack', description: 'Build a multi-candle gift pack from the available fragrance oil library.', details: ['Choose the pack size before selecting scents.', 'Mix and match fragrances for a personal gift.'] },
  collection: { title: 'Create Collection', description: 'Save a personal group of scent ideas to your customer account.', details: ['Build a collection using the fragrance library.', 'Return later to review or use your saved selections.'] },
  giftCards: { title: 'Gift Cards', description: 'Purchase a pre-made digital or physical gift card for yourself or someone else.', details: ['Choose values from $5 to $500.', 'Gift cards apply their eligible checkout discount when redeemed.'] },
  registry: { title: 'Gift Registry', description: 'Create and manage a candle registry for an upcoming celebration or event.', details: ['Save products you would like to receive.', 'Sign in to create, view, or update a registry.'] },
  samplePack: { title: 'Build Sample Pack', description: 'Create a discovery set of available 2.5 oz sample candles.', details: ['Choose a pack of 2, 4, 6, or 8 samples.', 'Select exactly the required number of scents.'] },
  scentPacks: { title: 'Scent Packs', description: 'Shop curated groups of available scents based on a fragrance mood or theme.', details: ['Browse pre-selected scent directions.', 'Add matching in-stock products to the cart.'] },
  mysteryBox: { title: 'Mystery Candle Box', description: 'Order a surprise selection prepared by the store.', details: ['Choose a mystery-box option.', 'The exact candle selection is revealed when it arrives.'] },
  eventFavors: { title: 'Event Favors', description: 'Request custom candle favors for weddings, showers, parties, or business events.', details: ['Share event details, quantities, and timing.', 'The store follows up with a custom quote.'] },
  workshops: { title: 'Workshops', description: 'Reserve seats for an upcoming candle-making workshop.', details: ['Choose an available workshop date and party size.', 'The store confirms the reservation and any required deposit.'] },
  privateParties: { title: 'Private Parties', description: 'Plan a private candle-making event for groups, celebrations, or corporate activities.', details: ['Request your preferred date, group size, and event type.', 'The store reviews availability and sends details.'] },
  refill: { title: 'Refill Program', description: 'Request a refill for an eligible candle container.', details: ['Share the container condition and requested scent.', 'Eligibility is confirmed before the refill discount is applied.'] },
  account: { title: 'Account', description: 'Access your customer details and storefront history.', details: ['View orders, gift cards, credits, rewards, and saved details.', 'Manage your address, registry, collections, and account preferences.'] },
};

export default function StorefrontPublic({ slug }: Props) {
  const [store, setStore] = useState<PublicStorefrontConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [customerAccountOpen, setCustomerAccountOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [carouselViewerSrc, setCarouselViewerSrc] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [careProductId, setCareProductId] = useState<string | null>(null);
  const [customProductId, setCustomProductId] = useState("");
  const [customScentOpen, setCustomScentOpen] = useState(false);
  const [eventFavorOpen, setEventFavorOpen] = useState(false);
  const [quoteCode, setQuoteCode] = useState(() => new URLSearchParams(window.location.search).get('quote') || '');
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [workshopPartyOpen, setWorkshopPartyOpen] = useState(false);
  const [refillOpen, setRefillOpen] = useState(false);
  const [refillAvailable, setRefillAvailable] = useState(false);
  const [fragranceLibraryOpen, setFragranceLibraryOpen] = useState(false);
  const [giftPackSelections, setGiftPackSelections] = useState<GiftPackOilSelection[]>([]);
  const [giftPackSize, setGiftPackSize] = useState(4);
  const [collectionLibraryOpen, setCollectionLibraryOpen] = useState(false);
  const [collectionSelections, setCollectionSelections] = useState<GiftPackOilSelection[]>([]);
  const [collectionSize, setCollectionSize] = useState(3);
  const [samplePackOpen, setSamplePackOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [activeMenuHelp, setActiveMenuHelp] = useState<StoreMenuHelpKey>('care');
  const [openMenuCategory, setOpenMenuCategory] = useState<'discover' | 'gifting' | 'services' | 'account' | null>('discover');
  const [mysteryBoxOpen, setMysteryBoxOpen] = useState(false);
  const [giftCardPurchaseOpen, setGiftCardPurchaseOpen] = useState(false);
  const [giftCardTermsAccepted, setGiftCardTermsAccepted] = useState(false);
  const [giftCardDeliveryMethod, setGiftCardDeliveryMethod] = useState<'digital' | 'physical'>('digital');
  const [giftRegistryOpen, setGiftRegistryOpen] = useState(false);
  const [sharedRegistry, setSharedRegistry] = useState<{ title: string; event_date: string; message: string; products: Array<{ id: string; name: string; price: number }> } | null>(null);
  const [reviewProductId, setReviewProductId] = useState('');
  const [alsoBoughtProducts, setAlsoBoughtProducts] = useState<
    PublicStorefrontConfig["products"]
  >([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const resumeCarouselRef = useRef<null | (() => void)>(null);
  const [contactForm, setContactForm] = useState({
    inquiry_type: 'General inquiry',
    name: "",
    email: "",
    street_address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    message: "",
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState("");
  const [contactSlotEl, setContactSlotEl] = useState<HTMLElement | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return saved === "dark" ? "dark" : "light";
  });
  const [lightTheme, setLightTheme] = useState<LightTheme>(() => {
    const saved = window.localStorage.getItem(LIGHT_THEME_STORAGE_KEY);
    return LIGHT_THEMES.includes(saved as LightTheme)
      ? (saved as LightTheme)
      : "classic";
  });
  const [darkTheme, setDarkTheme] = useState<DarkTheme>(() => {
    const saved = window.localStorage.getItem(DARK_THEME_STORAGE_KEY);
    return DARK_THEMES.includes(saved as DarkTheme)
      ? (saved as DarkTheme)
      : "midnight";
  });

  useEffect(() => {
    if (!mainMenuOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [mainMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await localDb.getPublicStorefront(slug);
        if (cancelled) return;
        setStore(data);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Store not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    void localDb.getPublicRefillProgram(slug).then(() => setRefillAvailable(true)).catch(() => setRefillAvailable(false));
  }, [slug]);

  useEffect(() => {
    const shareCode = new URLSearchParams(window.location.search).get('registry');
    if (!shareCode) return;
    void localDb.getPublicGiftRegistry(slug, shareCode).then(setSharedRegistry).catch(() => setSharedRegistry(null));
  }, [slug]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(getCartStorageKey(slug));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const safe = parsed
        .map((row) => ({
          productId: String(row?.productId || ""),
          quantity: Math.max(1, Number(row?.quantity || 1)),
          customization:
            row?.customization && typeof row.customization === "object"
              ? row.customization
              : undefined,
        }))
        .filter((row) => row.productId);
      setCartLines(safe);
    } catch {
      // ignore corrupted cart cache
    }
  }, [slug]);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(getRecentlyViewedStorageKey(slug)) || "[]",
      );
      setRecentlyViewedIds(
        Array.isArray(saved)
          ? saved.map(String).filter(Boolean).slice(0, 6)
          : [],
      );
    } catch {
      setRecentlyViewedIds([]);
    }
  }, [slug]);

  useEffect(() => {
    window.localStorage.setItem(
      getCartStorageKey(slug),
      JSON.stringify(cartLines),
    );
  }, [cartLines, slug]);
  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);
  useEffect(() => {
    window.localStorage.setItem(LIGHT_THEME_STORAGE_KEY, lightTheme);
  }, [lightTheme]);
  useEffect(() => {
    window.localStorage.setItem(DARK_THEME_STORAGE_KEY, darkTheme);
  }, [darkTheme]);
  useEffect(() => {
    const activeThemeName = themeMode === "light" ? lightTheme : darkTheme;
    document.documentElement.setAttribute("data-theme-mode", themeMode);
    document.documentElement.setAttribute("data-theme-name", activeThemeName);
  }, [darkTheme, lightTheme, themeMode]);

  useEffect(() => {
    const timers: number[] = [];
    const carousels = Array.from(
      document.querySelectorAll<HTMLElement>(".swiper-container.two"),
    );
    const imageClickListeners: Array<{
      el: HTMLImageElement;
      fn: (e: Event) => void;
    }> = [];

    carousels.forEach((container, idx) => {
      if (container.dataset.carouselInit === "1") return;
      const wrapper = container.querySelector<HTMLElement>(".swiper-wrapper");
      const slides = wrapper
        ? Array.from(wrapper.querySelectorAll<HTMLElement>(".swiper-slide"))
        : [];
      const pagination =
        container.querySelector<HTMLElement>(".swiper-pagination");
      if (!wrapper || slides.length === 0 || !pagination) return;
      container.dataset.carouselInit = "1";
      let active = 0;
      const len = slides.length;
      let timerId: number | null = null;
      const bullets = slides.map((_, i) => {
        const b = document.createElement("span");
        b.className = "swiper-pagination-bullet";
        b.addEventListener("click", () => {
          active = i;
          render();
        });
        pagination.appendChild(b);
        return b;
      });

      const render = () => {
        slides.forEach((slide, i) => {
          let rel = i - active;
          if (rel > len / 2) rel -= len;
          if (rel < -len / 2) rel += len;
          const abs = Math.abs(rel);
          const x = rel * 120;
          const rotate = rel * -18;
          const scale = rel === 0 ? 1 : Math.max(0.72, 1 - abs * 0.12);
          slide.style.zIndex = String(100 - abs);
          slide.style.opacity = abs > 2 ? "0" : String(1 - abs * 0.25);
          slide.style.transform = `translate(-50%, -50%) translateX(${x}px) rotateY(${rotate}deg) scale(${scale})`;
        });
        bullets.forEach((b, i) =>
          b.classList.toggle("swiper-pagination-bullet-active", i === active),
        );
      };

      const stopAuto = () => {
        if (timerId !== null) {
          window.clearInterval(timerId);
          timerId = null;
        }
      };
      const startAuto = () => {
        if (timerId !== null || len <= 1) return;
        timerId = window.setInterval(
          () => {
            active = (active + 1) % len;
            render();
          },
          3000 + idx * 150,
        );
        timers.push(timerId);
      };

      slides.forEach((slide) => {
        const img = slide.querySelector("img");
        if (!img) return;
        const onImageClick = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          stopAuto();
          resumeCarouselRef.current = startAuto;
          setCarouselViewerSrc(img.src);
        };
        img.style.cursor = "zoom-in";
        img.addEventListener("click", onImageClick);
        imageClickListeners.push({ el: img, fn: onImageClick });
      });

      render();
      startAuto();
    });

    return () => {
      timers.forEach((t) => window.clearInterval(t));
      imageClickListeners.forEach(({ el, fn }) => {
        el.removeEventListener("click", fn);
      });
      carousels.forEach((c) => {
        c.dataset.carouselInit = "";
        const p = c.querySelector(".swiper-pagination");
        if (p) p.innerHTML = "";
      });
    };
  }, [store?.store_custom_html]);

  useEffect(() => {
    if (carouselViewerSrc) return;
    if (resumeCarouselRef.current) {
      resumeCarouselRef.current();
      resumeCarouselRef.current = null;
    }
  }, [carouselViewerSrc]);

  useEffect(() => {
    if (!selectedProductId) {
      setAlsoBoughtProducts([]);
      return;
    }
    let cancelled = false;
    void localDb
      .getStoreAlsoBought(slug, selectedProductId)
      .then((products) => {
        if (!cancelled) setAlsoBoughtProducts(products);
      })
      .catch(() => {
        if (!cancelled) setAlsoBoughtProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProductId, slug]);

  useEffect(() => {
    if (!selectedProductId) return;
    setRecentlyViewedIds((current) => {
      const next = [
        selectedProductId,
        ...current.filter((id) => id !== selectedProductId),
      ].slice(0, 6);
      window.localStorage.setItem(
        getRecentlyViewedStorageKey(slug),
        JSON.stringify(next),
      );
      return next;
    });
  }, [selectedProductId, slug]);

  const cartDetail = useMemo(() => {
    if (!store)
      return {
        items: [],
        count: 0,
        subtotal: 0,
        discount: 0,
        discountPercent: 0,
        total: 0,
      };
    const productMap = new Map(
      store.products.map((product) => [product.id, product]),
    );
    const items = cartLines
      .map((line) => {
        const product = productMap.get(line.productId);
        if (!product) return null;
        const qty = Math.max(1, Math.floor(line.quantity));
        const unitPrice = Number(product.price || 0);
        return {
          product,
          quantity: qty,
          lineTotal: unitPrice * qty,
          customization: line.customization,
        };
      })
      .filter(
        (
          item,
        ): item is {
          product: PublicStorefrontConfig["products"][number];
          quantity: number;
          lineTotal: number;
          customization: CandleCustomization | undefined;
        } => Boolean(item),
      );
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountPercent = mixMatchDiscountPercent(count);
    const discount = Math.round(subtotal * discountPercent) / 100;
    return {
      items,
      count,
      subtotal,
      discount,
      discountPercent,
      total: subtotal - discount,
    };
  }, [cartLines, store]);
  const shouldUseFullCustomMode = useMemo(() => {
    if (!store?.store_custom_html) return false;
    if (store.store_custom_full_mode) return true;
    return /<\s*(html|head|body)\b/i.test(store.store_custom_html);
  }, [store?.store_custom_full_mode, store?.store_custom_html]);
  const productDescriptionMap = useMemo(() => {
    if (!store) return new Map<string, ProductDescriptionField[] | null>();
    return new Map(
      store.products.map((product) => [
        product.id,
        parseStructuredProductDescription(product.description || ""),
      ]),
    );
  }, [store]);

  function addToCart(productId: string, customization?: CandleCustomization) {
    setCartLines((prev) => {
      const existing = prev.find(
        (item) =>
          item.productId === productId &&
          JSON.stringify(item.customization || null) ===
            JSON.stringify(customization || null),
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { productId, quantity: 1, customization }];
    });
    setCartOpen(true);
  }

  function updateLineQty(productId: string, delta: number) {
    setCartLines((prev) =>
      prev
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(1, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setCartLines((prev) => prev.filter((line) => line.productId !== productId));
  }

  function clearCart() {
    setCartLines([]);
    setGiftCardTermsAccepted(false);
  }

  function checkout() {
    if (!cartDetail.items.length) return;
    if (!window.localStorage.getItem(`candles.store.customer.${slug}`)) {
      setCustomerAccountOpen(true);
      return;
    }
    setCheckoutOpen(true);
  }

  async function submitContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (contactSubmitting) return;
    setContactSubmitting(true);
    setContactStatus("");
    try {
      await localDb.submitPublicStoreContact(slug, { ...contactForm, message: `[${contactForm.inquiry_type}] ${contactForm.message}` });
      setContactStatus("Message sent successfully.");
      setContactForm({
        inquiry_type: 'General inquiry',
        name: "",
        email: "",
        street_address: "",
        city: "",
        state: "",
        zip: "",
        phone: "",
        message: "",
      });
    } catch (err) {
      setContactStatus(
        err instanceof Error ? err.message : "Failed to send message.",
      );
    } finally {
      setContactSubmitting(false);
    }
  }

  useEffect(() => {
    const panel = document.querySelector<HTMLElement>(
      "#contact .preset-store-panel",
    );
    if (panel) {
      setContactSlotEl(panel);
      return;
    }
    const section = document.querySelector<HTMLElement>("#contact");
    setContactSlotEl(section);
  }, [store?.store_custom_html, shouldUseFullCustomMode, store?.store_slug]);

  const contactFormContent = (
    <ContactForm
      contactForm={contactForm}
      contactStatus={contactStatus}
      contactSubmitting={contactSubmitting}
      onSubmit={submitContact}
      setContactForm={setContactForm}
    />
  );

  if (loading) {
    return (
      <div className="min-h-screen app-theme flex items-center justify-center">
        Loading store...
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen app-theme flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800">Store Not Found</h1>
          <p className="text-sm text-gray-600 mt-2">
            This storefront does not exist or is not published yet.
          </p>
        </div>
      </div>
    );
  }

  const selectedProduct =
    store.products.find((product) => product.id === selectedProductId) || null;
  const relatedProducts = selectedProduct
    ? store.products
        .filter((product) => product.id !== selectedProduct.id)
        .map((product) => {
          const selectedNotes =
            selectedProduct.fragrance_notes
              ?.split(",")
              .map((note) => note.trim().toLowerCase())
              .filter(Boolean) || [];
          const productNotes = product.fragrance_notes?.toLowerCase() || "";
          const score =
            Number(
              Boolean(
                selectedProduct.scent_family &&
                product.scent_family === selectedProduct.scent_family,
              ),
            ) +
            Number(
              Boolean(
                selectedProduct.mood && product.mood === selectedProduct.mood,
              ),
            ) +
            Number(
              Boolean(
                selectedProduct.room && product.room === selectedProduct.room,
              ),
            ) +
            Number(selectedNotes.some((note) => productNotes.includes(note)));
          return { product, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ product }) => product)
    : [];
  const recentlyViewedProducts = recentlyViewedIds
    .filter((id) => id !== selectedProductId)
    .map((id) => store.products.find((product) => product.id === id))
    .filter((product): product is PublicStorefrontConfig["products"][number] =>
      Boolean(product),
    )
    .slice(0, 3);

  return (
    <div
      className="min-h-screen app-theme"
      style={
        store.store_background_image_data
          ? {
              backgroundImage: `url(${store.store_background_image_data})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      <div className="fixed left-4 top-20 z-50 flex items-start gap-2">
        <div className="relative">
          <button type="button" onClick={() => setMainMenuOpen((open) => !open)} className="store-customer-trigger inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-3 text-slate-800 shadow-lg hover:bg-slate-50"><Menu className="h-4 w-4" /> Menu</button>
          {mainMenuOpen ? <div className="absolute left-0 mt-2 flex items-start gap-3">
            <div onMouseOver={(event) => { const key = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-menu-help]')?.dataset.menuHelp as StoreMenuHelpKey | undefined; if (key) setActiveMenuHelp(key); }} onFocusCapture={(event) => { const key = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-menu-help]')?.dataset.menuHelp as StoreMenuHelpKey | undefined; if (key) setActiveMenuHelp(key); }} className="store-customer-modal max-h-[calc(100vh-14rem)] w-56 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <button type="button" data-menu-help="discoverCategory" aria-expanded={openMenuCategory === 'discover'} onClick={() => setOpenMenuCategory((category) => category === 'discover' ? null : 'discover')} className="store-menu-category flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-900">Shop and discover <span>{openMenuCategory === 'discover' ? '-' : '+'}</span></button>
              {openMenuCategory === 'discover' ? <div className="mb-2 border-l-2 border-pink-300 pl-2">
                <button type="button" data-menu-help="care" onClick={() => { setCareProductId(""); setMainMenuOpen(false); }} className="store-main-menu-item">Candle Care</button>
                <button type="button" data-menu-help="customScent" onClick={() => { setCustomScentOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Create a Scent</button>
                <button type="button" data-menu-help="giftPack" onClick={() => { setFragranceLibraryOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Create Gift Pack</button>
                <button type="button" data-menu-help="collection" onClick={() => { setCollectionLibraryOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Create Collection</button>
                {store.products.some((product) => product.product_type === "sample" && product.quantity_in_stock > 0) ? <button type="button" data-menu-help="samplePack" onClick={() => { setSamplePackOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Build Sample Pack</button> : null}
                <button type="button" data-menu-help="scentPacks" onClick={() => { setPortfolioOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Scent Packs</button>
                <button type="button" data-menu-help="mysteryBox" onClick={() => { setMysteryBoxOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Mystery Candle Box</button>
              </div> : null}
              <button type="button" data-menu-help="giftingCategory" aria-expanded={openMenuCategory === 'gifting'} onClick={() => setOpenMenuCategory((category) => category === 'gifting' ? null : 'gifting')} className="store-menu-category flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-900">Gifting and events <span>{openMenuCategory === 'gifting' ? '-' : '+'}</span></button>
              {openMenuCategory === 'gifting' ? <div className="mb-2 border-l-2 border-pink-300 pl-2">
                <button type="button" data-menu-help="giftCards" onClick={() => { setGiftCardPurchaseOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Gift Cards</button>
                <button type="button" data-menu-help="registry" onClick={() => { if (window.localStorage.getItem(`candles.store.customer.${slug}`)) setGiftRegistryOpen(true); else setCustomerAccountOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Gift Registry</button>
                <button type="button" data-menu-help="eventFavors" onClick={() => { setEventFavorOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Event Favors</button>
              </div> : null}
              <button type="button" data-menu-help="servicesCategory" aria-expanded={openMenuCategory === 'services'} onClick={() => setOpenMenuCategory((category) => category === 'services' ? null : 'services')} className="store-menu-category flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-900">Services <span>{openMenuCategory === 'services' ? '-' : '+'}</span></button>
              {openMenuCategory === 'services' ? <div className="mb-2 border-l-2 border-pink-300 pl-2">
                <button type="button" data-menu-help="workshops" onClick={() => { setWorkshopOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Workshops</button>
                <button type="button" data-menu-help="privateParties" onClick={() => { setWorkshopPartyOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Private Parties</button>
                {refillAvailable ? <button type="button" data-menu-help="refill" onClick={() => { setRefillOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Refill Program</button> : null}
              </div> : null}
              <button type="button" data-menu-help="accountCategory" aria-expanded={openMenuCategory === 'account'} onClick={() => setOpenMenuCategory((category) => category === 'account' ? null : 'account')} className="store-menu-category flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-900">Your account <span>{openMenuCategory === 'account' ? '-' : '+'}</span></button>
              {openMenuCategory === 'account' ? <div className="border-l-2 border-pink-300 pl-2">
                <button type="button" data-menu-help="account" onClick={() => { setCustomerAccountOpen(true); setMainMenuOpen(false); }} className="store-main-menu-item">Account</button>
              </div> : null}
            </div>
            <aside aria-live="polite" className="store-customer-modal w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h2 className="text-lg font-bold text-slate-900">{STORE_MENU_HELP[activeMenuHelp].title}</h2>
              <p className="mt-2 text-sm text-slate-700">{STORE_MENU_HELP[activeMenuHelp].description}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">{STORE_MENU_HELP[activeMenuHelp].details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            </aside>
          </div> : null}
        </div>
        <button
          type="button"
          onClick={() => setCartOpen((prev) => !prev)}
          className="bg-pink-600 hover:bg-pink-700 text-white rounded-full px-4 py-3 shadow-lg inline-flex items-center gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          Cart ({cartDetail.count})
        </button>
      </div>
      <ThemeControls
        darkTheme={darkTheme}
        lightTheme={lightTheme}
        setDarkTheme={setDarkTheme}
        setLightTheme={setLightTheme}
        setThemeMode={setThemeMode}
        themeMode={themeMode}
      />
      <ScentPollBanner slug={slug} />
      {store.store_banner_data ? (
        <img
          src={store.store_banner_data}
          alt={store.store_title || store.account_name}
          className="w-full h-64 object-cover"
        />
      ) : (
        <div className="w-full h-44 bg-gradient-to-r from-pink-500 to-rose-500" />
      )}
      <main className="max-w-[1500px] mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
          {store.store_show_details !== false ? (
            <>
              <div className="flex items-center gap-4">
                {store.store_logo_data ? (
                  <img
                    src={store.store_logo_data}
                    alt="Store logo"
                    className="w-20 h-20 rounded-full object-cover border border-gray-200"
                  />
                ) : null}
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {store.store_title || store.account_name}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    /store/{store.store_slug}
                  </p>
                </div>
              </div>
              <p className="text-base text-gray-700 mt-5 whitespace-pre-wrap">
                {store.store_description || "Welcome to our candle storefront."}
              </p>
            </>
          ) : null}
          {store.store_custom_html?.trim() && !shouldUseFullCustomMode ? (
            <div
              className={`rounded-lg border border-gray-200 p-4 bg-transparent ${
                store.store_show_details !== false ? "mt-10" : "mt-0"
              }`}
            >
              <div
                dangerouslySetInnerHTML={{ __html: store.store_custom_html }}
              />
            </div>
          ) : null}
          <ProductGrid
            addToCart={addToCart}
            onSaveFavorite={(productId) => { const token = window.localStorage.getItem(`candles.store.customer.${slug}`); if (!token) { setCustomerAccountOpen(true); return; } void localDb.saveStoreCustomerFavorite(slug, token, productId).then(() => window.alert('Saved to your favorites.')).catch((error) => window.alert(error instanceof Error ? error.message : 'Unable to save favorite.')); }}
            onReviewProduct={(productId) => { if (!window.localStorage.getItem(`candles.store.customer.${slug}`)) { setCustomerAccountOpen(true); return; } setReviewProductId(productId); }}
            onCustomizeProduct={setCustomProductId}
            onViewProduct={setSelectedProductId}
            productDescriptionMap={productDescriptionMap}
            store={store}
          />
          <PublicGallery slug={slug} />
          <SubscriptionPlans slug={slug} />
          {sharedRegistry ? <section className="app-theme mt-8 rounded-2xl border border-pink-300 bg-pink-50 p-5"><h2 className="text-xl font-bold text-slate-900">{sharedRegistry.title}</h2>{sharedRegistry.event_date ? <p className="mt-1 text-sm text-slate-600">Event date: {sharedRegistry.event_date}</p> : null}{sharedRegistry.message ? <p className="mt-3 text-slate-700">{sharedRegistry.message}</p> : null}<div className="mt-4 grid gap-3 sm:grid-cols-2">{sharedRegistry.products.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"><span><strong>{product.name}</strong><br />${Number(product.price).toFixed(2)}</span><button type="button" onClick={() => addToCart(product.id)} className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white">Add to cart</button></div>)}</div></section> : null}
          <LaunchTools slug={slug} products={store.products} />
          {!contactSlotEl ? contactFormContent : null}
        </div>
        {store.store_custom_html?.trim() && shouldUseFullCustomMode ? (
          <div
            className="mt-10"
            dangerouslySetInnerHTML={{ __html: store.store_custom_html }}
          />
        ) : null}
        {contactSlotEl ? createPortal(contactFormContent, contactSlotEl) : null}
      </main>

      <CartDrawer
        cartDetail={cartDetail}
        cartOpen={cartOpen}
        checkout={checkout}
        clearCart={clearCart}
        onClose={() => setCartOpen(false)}
        removeLine={removeLine}
        updateLineQty={updateLineQty}
      />

      <CarouselViewerModal
        carouselViewerSrc={carouselViewerSrc}
        onClose={() => setCarouselViewerSrc("")}
      />
      <ProductDetailsModal
        product={selectedProduct}
        relatedProducts={relatedProducts}
        alsoBoughtProducts={alsoBoughtProducts}
        recentlyViewedProducts={recentlyViewedProducts}
        onClose={() => setSelectedProductId("")}
        onAddToCart={addToCart}
        onSelectProduct={setSelectedProductId}
        onOpenCare={() => setCareProductId(selectedProductId)}
      />
      {store.products.find((product) => product.id === customProductId) ? (
        <CustomCandleModal
          product={store.products.find(
            (product) => product.id === customProductId,
          )!}
          onClose={() => setCustomProductId("")}
          onAdd={(customization) => addToCart(customProductId, customization)}
        />
      ) : null}
      {careProductId !== null && (
        <CandleCareModal
          product={
            store.products.find((product) => product.id === careProductId) ||
            null
          }
          onClose={() => setCareProductId(null)}
        />
      )}
      {customScentOpen ? (
        <CustomScentRequestModal
          slug={slug}
          onClose={() => setCustomScentOpen(false)}
        />
      ) : null}
      {eventFavorOpen ? <EventFavorModal slug={slug} onClose={() => setEventFavorOpen(false)} /> : null}
      {quoteCode ? <QuoteApprovalModal slug={slug} code={quoteCode} onClose={() => { setQuoteCode(''); const url = new URL(window.location.href); url.searchParams.delete('quote'); window.history.replaceState({}, '', url); }} /> : null}
      {workshopOpen ? <WorkshopBookingModal slug={slug} onClose={() => setWorkshopOpen(false)} /> : null}
      {workshopPartyOpen ? <WorkshopPartyRequestModal slug={slug} onClose={() => setWorkshopPartyOpen(false)} /> : null}
      {refillOpen ? <RefillRequestModal slug={slug} onClose={() => setRefillOpen(false)} /> : null}
      {fragranceLibraryOpen ? (
        <FragranceOilCatalogModal
          slug={slug}
          onClose={() => setFragranceLibraryOpen(false)}
          onCreateGiftPack={(items, packSize) => {
            setGiftPackSelections(items);
            setGiftPackSize(packSize);
            setFragranceLibraryOpen(false);
          }}
        />
      ) : null}
      {giftPackSelections.length ? (
        <GiftPackRequestModal
          slug={slug}
          items={giftPackSelections}
          packSize={giftPackSize}
          onClose={() => setGiftPackSelections([])}
        />
      ) : null}
      {collectionLibraryOpen ? (
        <FragranceOilCatalogModal
          slug={slug}
          purpose="collection"
          onClose={() => setCollectionLibraryOpen(false)}
          onCreateGiftPack={(items, size) => { setCollectionSelections(items); setCollectionSize(size); setCollectionLibraryOpen(false); }}
        />
      ) : null}
      {collectionSelections.length ? <CollectionRequestModal slug={slug} items={collectionSelections} collectionSize={collectionSize} onClose={() => setCollectionSelections([])} /> : null}
      {samplePackOpen ? <SamplePackModal products={store.products} onClose={() => setSamplePackOpen(false)} onAdd={addToCart} /> : null}
      {portfolioOpen ? <ScentPortfolioModal products={store.products} onClose={() => setPortfolioOpen(false)} onAdd={addToCart} /> : null}
      {mysteryBoxOpen ? <MysteryBoxModal products={store.products} onClose={() => setMysteryBoxOpen(false)} onAdd={addToCart} /> : null}
      {giftCardPurchaseOpen ? <GiftCardPurchaseModal products={store.products} onClose={() => setGiftCardPurchaseOpen(false)} onAdd={(productId, deliveryMethod) => { setGiftCardTermsAccepted(true); setGiftCardDeliveryMethod(deliveryMethod); addToCart(productId); }} /> : null}
      {giftRegistryOpen ? <GiftRegistryModal slug={slug} token={window.localStorage.getItem(`candles.store.customer.${slug}`) || ''} products={store.products} onClose={() => setGiftRegistryOpen(false)} /> : null}
      {reviewProductId && store.products.find((product) => product.id === reviewProductId) ? <ProductReviewModal slug={slug} token={window.localStorage.getItem(`candles.store.customer.${slug}`) || ''} product={store.products.find((product) => product.id === reviewProductId)!} onClose={() => setReviewProductId('')} /> : null}
      <CustomerAccountModal
        slug={slug}
        open={customerAccountOpen}
        onClose={() => setCustomerAccountOpen(false)}
      />
      <StoreCheckoutModal
        slug={slug}
        token={
          window.localStorage.getItem(`candles.store.customer.${slug}`) || ""
        }
        cart={cartDetail}
        giftCardTermsAccepted={giftCardTermsAccepted}
        giftCardDeliveryMethod={giftCardDeliveryMethod}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onPaid={() => {
          clearCart();
          setCheckoutOpen(false);
          setCartOpen(false);
          alert("Payment complete. Your order has been confirmed.");
        }}
      />
    </div>
  );
}
