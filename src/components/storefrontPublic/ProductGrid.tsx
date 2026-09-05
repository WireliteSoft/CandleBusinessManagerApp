import { useState } from "react";
import type { PublicStorefrontConfig } from "../../lib/localDb";
import type { ProductDescriptionField } from "./helpers";
import BackInStockAlertModal from "./BackInStockAlertModal";
import WaitlistModal from "./WaitlistModal";

type Props = {
  addToCart: (productId: string) => void;
  onCustomizeProduct: (productId: string) => void;
  onViewProduct: (productId: string) => void;
  onSaveFavorite: (productId: string) => void;
  onReviewProduct: (productId: string) => void;
  productDescriptionMap: Map<string, ProductDescriptionField[] | null>;
  store: PublicStorefrontConfig;
};

const SCENT_OPTIONS = [
  "fruity",
  "woody",
  "bakery",
  "floral",
  "citrus",
  "clean",
  "strong",
  "subtle",
];
const ROOMS = [
  "bedroom",
  "bathroom",
  "kitchen",
  "office",
  "patio",
  "living room",
];
const MOODS = [
  "relax",
  "energize",
  "romantic",
  "cozy",
  "fresh",
  "focus",
  "sleep",
  "party",
];

export default function ProductGrid({
  addToCart,
  onCustomizeProduct,
  onViewProduct,
  onSaveFavorite,
  onReviewProduct,
  productDescriptionMap,
  store,
}: Props) {
  const [filters, setFilters] = useState<string[]>([]);
  const [roomFilter, setRoomFilter] = useState("");
  const [moodFilter, setMoodFilter] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [alertProductId, setAlertProductId] = useState("");
  const [waitlistProductId, setWaitlistProductId] = useState("");
  const visibleProducts = store.products.filter(
    (product) =>
      product.product_type !== 'gift_card' &&
      filters.every((filter) => {
        const searchable =
          `${product.scent_family} ${product.fragrance_notes} ${product.scent_strength} ${product.description}`.toLowerCase();
        return searchable.includes(filter);
      }) &&
      (!roomFilter ||
        `${product.room} ${product.description}`
          .toLowerCase()
          .includes(roomFilter)) &&
      (!moodFilter ||
        `${product.mood} ${product.description}`
          .toLowerCase()
          .includes(moodFilter)),
  );
  const comparedProducts = store.products.filter((product) =>
    comparisonIds.includes(product.id),
  );
  const alertProduct =
    store.products.find((product) => product.id === alertProductId) || null;
  const waitlistProduct =
    store.products.find((product) => product.id === waitlistProductId) || null;
  const hasFilters = Boolean(filters.length || roomFilter || moodFilter);
  const toggleFilter = (filter: string) =>
    setFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
  const toggleComparison = (id: string) =>
    setComparisonIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  const clearFilters = () => {
    setFilters([]);
    setRoomFilter("");
    setMoodFilter("");
  };

  const filterButton = (
    label: string,
    active: boolean,
    onClick: () => void,
  ) => (
    <button
      type="button"
      key={label}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${active ? "border-pink-600 bg-pink-600 text-white" : "border-gray-300 text-gray-700 hover:border-pink-300 hover:bg-pink-50"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Products</h2>
          <p className="mt-1 text-sm text-gray-500">
            {visibleProducts.length} of {store.products.length} products shown
          </p>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-pink-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      {store.products.length === 0 ? (
        <p className="text-sm text-gray-500">
          No storefront products published yet.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[255px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-6">
            <div>
              <h3 className="font-semibold text-gray-800">Scent Finder</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose the scent qualities you want to explore.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SCENT_OPTIONS.map((option) =>
                  filterButton(option, filters.includes(option), () =>
                    toggleFilter(option),
                  ),
                )}
              </div>
            </div>
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h3 className="font-semibold text-gray-800">Shop by room</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROOMS.map((room) =>
                  filterButton(room, roomFilter === room, () =>
                    setRoomFilter((current) => (current === room ? "" : room)),
                  ),
                )}
              </div>
            </div>
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h3 className="font-semibold text-gray-800">Shop by mood</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {MOODS.map((mood) =>
                  filterButton(mood, moodFilter === mood, () =>
                    setMoodFilter((current) => (current === mood ? "" : mood)),
                  ),
                )}
              </div>
            </div>
          </aside>
          <div>
            {visibleProducts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No products match those filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleProducts.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    {product.image_data ? (
                      <div className="mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded border border-gray-200 bg-white/70">
                        <img
                          src={product.image_data}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : null}
                    {product.limited_drop || product.upcoming_release || product.member_exclusive || product.subscriber_exclusive ? (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {product.upcoming_release ? (
                          <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-bold text-pink-800">
                            {product.preorders_enabled
                              ? "Preorder"
                              : "Coming Soon"}
                          </span>
                        ) : null}
                        {product.member_exclusive ? <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-800">Members only</span> : null}
                        {product.subscriber_exclusive ? <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-800">Subscribers only</span> : null}
                        {product.limited_drop ? (
                          <>
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                              Limited Drop
                            </span>
                            {product.drop_number ? (
                              <span className="rounded-full border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-900">
                                {product.drop_number}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    <h3 className="font-semibold text-gray-800">
                      {product.name}
                    </h3>
                    {productDescriptionMap.get(product.id) ? (
                      <div className="mt-2 space-y-1.5">
                        {productDescriptionMap.get(product.id)?.map((field) => (
                          <div
                            key={`${product.id}-${field.label}`}
                            className="text-sm leading-snug"
                          >
                            <span className="font-semibold text-gray-700">
                              {field.label}:
                            </span>{" "}
                            <span className="text-gray-600">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                        {product.description || "No description"}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-bold text-gray-900">
                        ${Number(product.price || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.upcoming_release
                          ? product.release_date
                            ? `Expected: ${product.release_date}`
                            : product.preorders_enabled
                              ? "Preorder open"
                              : "Coming soon"
                          : product.product_type === 'gift_card' ? 'Digital delivery' : `Stock: ${product.quantity_in_stock}`}
                      </p>
                    </div>
                    {product.limited_drop && product.purchase_limit > 0 ? (
                      <p className="mt-2 text-xs font-medium text-amber-800">
                        Limit {product.purchase_limit} per customer
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onViewProduct(product.id)}
                      className="mt-3 w-full rounded-lg border border-pink-300 px-3 py-2 text-pink-700 hover:bg-pink-50"
                    >
                      View details
                    </button>
                    <button type="button" onClick={() => onSaveFavorite(product.id)} className="mt-2 w-full rounded-lg border border-pink-300 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50">Save to favorites</button>
                    <button type="button" onClick={() => onReviewProduct(product.id)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Reviews</button>
                    {product.upcoming_release ? (
                      product.preorders_enabled || Number(product.member_early_access_days) > 0 ? (
                        <button
                          type="button"
                          onClick={() => addToCart(product.id)}
                          className="mt-2 w-full rounded-lg bg-pink-600 px-3 py-2 text-white hover:bg-pink-700"
                        >
                          {product.preorders_enabled ? 'Preorder now' : 'Member early access'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setWaitlistProductId(product.id)}
                          className="mt-2 w-full rounded-lg bg-pink-600 px-3 py-2 text-white hover:bg-pink-700"
                        >
                          Join waitlist
                        </button>
                      )
                    ) : product.product_type === 'gift_card' || product.quantity_in_stock > 0 ? (
                      <button
                        type="button"
                        onClick={() => product.product_type === 'custom' ? onCustomizeProduct(product.id) : addToCart(product.id)}
                        className="mt-2 w-full rounded-lg bg-pink-600 px-3 py-2 text-white hover:bg-pink-700"
                      >
                        {product.product_type === 'custom' ? 'Build your candle' : product.product_type === 'gift_card' ? 'Buy gift card' : 'Add to Cart'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAlertProductId(product.id)}
                        className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-2 text-white hover:bg-gray-800"
                      >
                        Notify when back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleComparison(product.id)}
                      className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm font-semibold ${comparisonIds.includes(product.id) ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700"}`}
                    >
                      {comparisonIds.includes(product.id)
                        ? "Selected for comparison"
                        : comparisonIds.length >= 3
                          ? "Comparison full"
                          : "Compare"}
                    </button>
                  </article>
                ))}
              </div>
            )}
            {comparisonIds.length ? (
              <div className="sticky bottom-4 z-20 mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setComparisonOpen(true)}
                  className="rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  Compare {comparisonIds.length} product
                  {comparisonIds.length === 1 ? "" : "s"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {comparisonOpen ? (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 p-4">
          <section className="app-theme mx-auto my-8 w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Scent comparison
              </h2>
              <button
                type="button"
                onClick={() => setComparisonOpen(false)}
                className="text-sm font-semibold text-pink-700"
              >
                Close
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-gray-500">Detail</th>
                    {comparedProducts.map((product) => (
                      <th key={product.id} className="p-3 text-gray-900">
                        {product.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "Price",
                        (p: (typeof comparedProducts)[number]) =>
                          `$${Number(p.price).toFixed(2)}`,
                      ],
                      [
                        "Scent family",
                        (p: (typeof comparedProducts)[number]) =>
                          p.scent_family,
                      ],
                      [
                        "Notes",
                        (p: (typeof comparedProducts)[number]) =>
                          p.fragrance_notes,
                      ],
                      [
                        "Strength",
                        (p: (typeof comparedProducts)[number]) =>
                          p.scent_strength,
                      ],
                      [
                        "Mood",
                        (p: (typeof comparedProducts)[number]) => p.mood,
                      ],
                      [
                        "Best room",
                        (p: (typeof comparedProducts)[number]) => p.room,
                      ],
                      [
                        "Burn time",
                        (p: (typeof comparedProducts)[number]) => p.burn_time,
                      ],
                      [
                        "Wax",
                        (p: (typeof comparedProducts)[number]) => p.wax_type,
                      ],
                      [
                        "Wick",
                        (p: (typeof comparedProducts)[number]) => p.wick_type,
                      ],
                    ] as const
                  ).map(([label, read]) => (
                    <tr key={label} className="border-b">
                      <th className="p-3 text-gray-500">{label}</th>
                      {comparedProducts.map((product) => (
                        <td key={product.id} className="p-3 text-gray-800">
                          {read(product) || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
      {alertProduct ? (
        <BackInStockAlertModal
          product={alertProduct}
          slug={store.store_slug}
          onClose={() => setAlertProductId("")}
        />
      ) : null}
      {waitlistProduct ? (
        <WaitlistModal
          product={waitlistProduct}
          slug={store.store_slug}
          onClose={() => setWaitlistProductId("")}
        />
      ) : null}
    </div>
  );
}
