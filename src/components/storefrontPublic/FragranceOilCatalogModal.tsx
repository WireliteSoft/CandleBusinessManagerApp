import { useEffect, useState } from "react";
import { localDb } from "../../lib/localDb";

type Oil = {
  id: string;
  name: string;
  image_url: string;
  source_url: string;
  discontinued: boolean;
  variants: Array<{ sku: string; price: number; label: string }>;
};

export type GiftPackOilSelection = {
  name: string;
  size: string;
  wickCount: string;
  wickType: string;
};

export default function FragranceOilCatalogModal({
  slug,
  onClose,
  onCreateGiftPack,
  purpose = "gift-pack",
}: {
  slug: string;
  onClose: () => void;
  onCreateGiftPack: (items: GiftPackOilSelection[], packSize: number) => void;
  purpose?: "gift-pack" | "collection";
}) {
  const [oils, setOils] = useState<Oil[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, GiftPackOilSelection>>({});
  const selectionOptions = purpose === "collection" ? [3, 4, 6, 12] : [4, 6, 8];
  const [packSize, setPackSize] = useState(selectionOptions[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const id = window.setTimeout(() => {
      void localDb
        .getStoreFragranceOils(slug, query)
        .then(setOils)
        .finally(() => setLoading(false));
    }, 180);

    return () => window.clearTimeout(id);
  }, [slug, query]);

  const toggle = (oil: Oil) => {
    setSelected((current) => {
      if (current[oil.id]) {
        const remaining = { ...current };
        delete remaining[oil.id];
        return remaining;
      }

      return Object.keys(current).length < packSize
        ? {
            ...current,
            [oil.id]: {
              name: oil.name,
              size: "8 oz",
              wickCount: "1 wick",
              wickType: "Wood wick",
            },
          }
        : current;
    });
  };

  const changePackSize = (nextSize: number) => {
    setPackSize(nextSize);
    setSelected((current) =>
      Object.fromEntries(Object.entries(current).slice(0, nextSize)),
    );
  };

  const updateRequest = (
    oilId: string,
    field: keyof Omit<GiftPackOilSelection, "name">,
    value: string,
  ) => {
    setSelected((current) => ({
      ...current,
      [oilId]: { ...current[oilId], [field]: value },
    }));
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="app-theme fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-4">
      <section className="store-customer-modal fragrance-oil-catalog mx-auto my-5 flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Fragrance Oil Library
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {purpose === "collection" ? "Choose the fragrances and candle details for your custom collection." : "Select candle choices for a custom gift pack."}
            </p>
            <p className="fragrance-oil-shipping-notice mt-3 rounded-lg px-3 py-2 text-sm font-semibold">
              {purpose === "collection" ? "Custom collections can take up to 2 weeks to ship." : "Custom gift packs can take up to 2 weeks to ship."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
          >
            Close
          </button>
        </div>
        <fieldset className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">{purpose === "collection" ? "Collection size" : "Gift pack size"}</legend>
          <div className="flex flex-wrap gap-2">
            {selectionOptions.map((count) => (
              <label key={count} className={`fragrance-oil-pack-size cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${packSize === count ? "fragrance-oil-pack-size-selected" : ""}`}>
                <input type="radio" name="gift-pack-size" value={count} checked={packSize === count} onChange={() => changePackSize(count)} className="fragrance-oil-checkbox mr-2" />
                {count} candles
              </label>
            ))}
          </div>
        </fieldset>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search fragrance oils"
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-sm text-gray-600">Loading fragrance oils...</p>
          ) : null}
          {!loading &&
            oils.map((oil) => {
              const request = selected[oil.id];

              return (
                <article
                  key={oil.id}
                  className={`fragrance-oil-card rounded-xl border p-2 ${request ? "fragrance-oil-card-selected" : ""}`}
                >
                  <label className="flex w-full cursor-pointer items-start gap-2 text-left">
                    <input
                      type="checkbox"
                      checked={Boolean(request)}
                      onChange={() => toggle(oil)}
                      className="fragrance-oil-checkbox mt-0.5 h-4 w-4 shrink-0 rounded"
                      aria-label={`Select ${oil.name}`}
                    />
                    <div className="fragrance-oil-image h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      {oil.image_url ? (
                        <img
                          src={oil.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{oil.name}</p>
                      {oil.discontinued ? (
                        <p className="fragrance-oil-discontinued mt-1 text-xs font-semibold">
                          Discontinued
                        </p>
                      ) : null}
                    </div>
                  </label>
                  {request ? (
                    <div className="fragrance-oil-config mt-2 grid grid-cols-3 gap-1.5 border-t pt-2">
                      <label className="text-xs font-medium text-gray-700">
                        Size
                        <select
                          value={request.size}
                          onChange={(event) =>
                            updateRequest(oil.id, "size", event.target.value)
                          }
                          className="fragrance-oil-select mt-1 w-full rounded border px-1 py-1 text-xs"
                        >
                          <option>4 oz</option>
                          <option>8 oz</option>
                          <option>10 oz</option>
                          <option>16 oz</option>
                        </select>
                      </label>
                      <label className="text-xs font-medium text-gray-700">
                        Wicks
                        <select
                          value={request.wickCount}
                          onChange={(event) =>
                            updateRequest(
                              oil.id,
                              "wickCount",
                              event.target.value,
                            )
                          }
                          className="fragrance-oil-select mt-1 w-full rounded border px-1 py-1 text-xs"
                        >
                          <option>1 wick</option>
                          <option>2 wicks</option>
                          <option>3 wicks</option>
                        </select>
                      </label>
                      <label className="text-xs font-medium text-gray-700">
                        Wick type
                        <select
                          value={request.wickType}
                          onChange={(event) =>
                            updateRequest(
                              oil.id,
                              "wickType",
                              event.target.value,
                            )
                          }
                          className="fragrance-oil-select mt-1 w-full rounded border px-1 py-1 text-xs"
                        >
                          <option>Cotton wick</option>
                          <option>Wood wick</option>
                        </select>
                      </label>
                    </div>
                  ) : null}
                </article>
              );
            })}
        </div>
        <div className="fragrance-oil-floating-action fixed bottom-4 left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-xl">
          <p className="text-sm text-gray-600">{selectedCount} of {packSize} selected</p>
          <button
            disabled={selectedCount !== packSize}
            type="button"
            onClick={() => {
              onCreateGiftPack(Object.values(selected), packSize);
              onClose();
            }}
            className="rounded-lg bg-pink-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {selectedCount === packSize ? `Continue to ${purpose === "collection" ? "collection" : "gift pack"} details` : `Select ${packSize - selectedCount} more candle${packSize - selectedCount === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>
    </div>
  );
}
