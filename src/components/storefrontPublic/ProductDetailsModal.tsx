import { X } from "lucide-react";
import type { StorefrontProductSummary } from "../../lib/localDb";

type Props = {
  product: StorefrontProductSummary | null;
  relatedProducts: StorefrontProductSummary[];
  alsoBoughtProducts: StorefrontProductSummary[];
  recentlyViewedProducts: StorefrontProductSummary[];
  onClose: () => void;
  onAddToCart: (productId: string) => void;
  onSelectProduct: (productId: string) => void;
  onOpenCare: () => void;
};

export default function ProductDetailsModal({
  product,
  relatedProducts,
  alsoBoughtProducts,
  recentlyViewedProducts,
  onClose,
  onAddToCart,
  onSelectProduct,
  onOpenCare,
}: Props) {
  if (!product) return null;
  const details = [
    ["Scent family", product.scent_family],
    ["Notes", product.fragrance_notes],
    ["Sweetness", product.sweetness],
    ["Strength", product.scent_strength],
    ["Warmth", product.warmth],
    ["Freshness", product.freshness],
    ["Season", product.season],
    ["Mood", product.mood],
    ["Best room", product.room],
    ["Burn time", product.burn_time],
    ["Wax", product.wax_type],
    ["Wick", product.wick_type],
    ["Batch", product.batch_number],
  ].filter(([, value]) => Boolean(value));
  const hasStory = Boolean(
    product.inspiration ||
    product.making_process ||
    product.fragrance_notes ||
    product.wax_type ||
    product.wick_type ||
    product.batch_number,
  );
  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="app-theme mx-auto my-8 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-pink-700">
              Product details
            </p>
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close product details"
          >
            <X />
          </button>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {product.image_data ? (
            <img
              src={product.image_data}
              alt={product.name}
              className="h-72 w-full rounded-xl border border-gray-200 object-contain"
            />
          ) : (
            <div className="h-72 rounded-xl bg-gray-100" />
          )}
          <div>
            <p className="whitespace-pre-wrap text-gray-700">
              {product.description || "No product description yet."}
            </p>
            <p className="mt-4 text-2xl font-bold text-gray-900">
              ${Number(product.price).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {product.upcoming_release
                ? product.release_date
                  ? `Expected release: ${product.release_date}`
                  : "Coming soon"
                : `${product.quantity_in_stock} in stock`}
            </p>
              {product.product_type === 'custom' ? <p className="mt-4 rounded-lg bg-pink-50 p-3 text-sm text-pink-900">Use the Build your candle button in the catalog to choose your size, scent, wick, label, and extras.</p> : product.upcoming_release && !product.preorders_enabled ? (
              <p className="mt-4 rounded-lg bg-pink-50 p-3 text-sm text-pink-900">
                This release is not available to preorder yet. Join the waitlist
                from the catalog to be notified.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product.id);
                  onClose();
                }}
                className="mt-5 w-full rounded-lg bg-pink-600 px-4 py-3 font-semibold text-white hover:bg-pink-700"
              >
                {product.upcoming_release ? "Preorder now" : "Add to Cart"}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenCare}
              className="mt-2 w-full rounded-lg border border-pink-200 px-4 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
            >
              Care for this candle
            </button>
          </div>
        </div>
        {details.length ? (
          <dl className="mt-6 grid gap-3 border-t border-gray-200 pt-5 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-gray-800">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {hasStory ? (
          <section className="mt-6 border-t border-gray-200 pt-5">
            <h3 className="font-bold text-gray-900">Behind the Candle</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {product.inspiration ? (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Inspiration
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                    {product.inspiration}
                  </p>
                </div>
              ) : null}
              {product.making_process ? (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Process
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                    {product.making_process}
                  </p>
                </div>
              ) : null}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fragrance notes
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {product.fragrance_notes || "Not recorded"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Materials
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {[
                    product.wax_type && `Wax: ${product.wax_type}`,
                    product.wick_type && `Wick: ${product.wick_type}`,
                    product.batch_number && `Batch: ${product.batch_number}`,
                  ]
                    .filter(Boolean)
                    .join(" | ") || "Not recorded"}
                </p>
              </div>
            </div>
          </section>
        ) : null}
        {relatedProducts.length ? (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <h3 className="font-bold text-gray-900">Similar scents</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {relatedProducts.map((related) => (
                <button
                  type="button"
                  key={related.id}
                  onClick={() => onSelectProduct(related.id)}
                  className="rounded-lg border border-gray-200 p-3 text-left hover:border-pink-300 hover:bg-pink-50"
                >
                  <p className="font-semibold text-gray-900">{related.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {related.scent_family || related.mood || "Related scent"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {alsoBoughtProducts.length ? (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <h3 className="font-bold text-gray-900">Customers also bought</h3>
            <p className="mt-1 text-sm text-gray-500">
              Based on verified purchases from this store.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {alsoBoughtProducts.map((related) => (
                <button
                  type="button"
                  key={related.id}
                  onClick={() => onSelectProduct(related.id)}
                  className="rounded-lg border border-gray-200 p-3 text-left hover:border-pink-300 hover:bg-pink-50"
                >
                  <p className="font-semibold text-gray-900">{related.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    ${Number(related.price).toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {recentlyViewedProducts.length ? (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <h3 className="font-bold text-gray-900">Recently viewed</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {recentlyViewedProducts.map((related) => (
                <button
                  type="button"
                  key={related.id}
                  onClick={() => onSelectProduct(related.id)}
                  className="rounded-lg border border-gray-200 p-3 text-left hover:border-pink-300 hover:bg-pink-50"
                >
                  <p className="font-semibold text-gray-900">{related.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    ${Number(related.price).toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
