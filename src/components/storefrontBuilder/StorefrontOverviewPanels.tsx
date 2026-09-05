import type { StorefrontConfig, StorefrontProductSummary } from '../../lib/localDb';

type PreviewPanelProps = {
  config: StorefrontConfig;
  publicUrl: string;
};

export function StorefrontPreviewPanel({ config, publicUrl }: PreviewPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
      {config.store_banner_data ? (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Banner Image Preview</p>
          <img
            src={config.store_banner_data}
            alt="Store banner"
            className="max-w-full h-auto max-h-72 object-contain rounded-lg border border-gray-200"
          />
        </div>
      ) : null}
      {config.store_background_image_data ? (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Background Image Preview</p>
          <img
            src={config.store_background_image_data}
            alt="Store background"
            className="max-w-full h-auto max-h-48 object-contain rounded-lg border border-gray-200 opacity-80"
          />
        </div>
      ) : null}
      <div className="flex items-start gap-4">
        {config.store_logo_data ? (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Logo Preview</p>
            <img
              src={config.store_logo_data}
              alt="Store logo"
              className="w-20 h-20 rounded-full object-cover border border-gray-200"
            />
          </div>
        ) : null}
        <div>
          <h4 className="text-xl font-bold text-gray-800">
            {config.store_title.trim() || 'Your Store Title'}
          </h4>
          <p className="text-sm text-gray-600 mt-2">
            {config.store_description.trim() || 'Your store description will appear here.'}
          </p>
          {publicUrl ? <p className="text-xs text-gray-500 mt-3 break-all">{publicUrl}</p> : null}
        </div>
      </div>
    </div>
  );
}

type ProductSelectionPanelProps = {
  config: StorefrontConfig;
  products: StorefrontProductSummary[];
  readOnly: boolean;
  onToggleStoreProduct: (productId: string) => void;
};

export function ProductSelectionPanel({
  config,
  products,
  readOnly,
  onToggleStoreProduct,
}: ProductSelectionPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Store Product Cards</h3>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500">No products found. Add products in Products tab first.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((product) => {
            const selected = config.store_product_ids.includes(product.id);
            return (
              <label
                key={product.id}
                className={`rounded-lg border p-3 flex items-start gap-3 ${
                  selected ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={readOnly}
                  onChange={() => onToggleStoreProduct(product.id)}
                  className="mt-1 h-4 w-4"
                />
                <div className="flex-1">
                  {product.image_data ? (
                    <div className="mb-2">
                      <p className="text-[11px] font-semibold text-gray-600 mb-1">Product Image</p>
                      <img
                        src={product.image_data}
                        alt={product.name}
                        className="max-w-full h-auto max-h-40 object-contain rounded border border-gray-200"
                      />
                    </div>
                  ) : null}
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {product.description || 'No description'}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    ${product.price.toFixed(2)} • Stock: {product.quantity_in_stock}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ProductOrderPanelProps = {
  dragProductId: string | null;
  readOnly: boolean;
  selectedProducts: StorefrontProductSummary[];
  setDragProductId: React.Dispatch<React.SetStateAction<string | null>>;
  onMoveProductBefore: (sourceId: string, targetId: string) => void;
};

export function ProductOrderPanel({
  dragProductId,
  readOnly,
  selectedProducts,
  setDragProductId,
  onMoveProductBefore,
}: ProductOrderPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Selected Product Order</h3>
      <p className="text-sm text-gray-600 mb-4">
        Drag cards to reorder how they appear on your public store.
      </p>
      {selectedProducts.length === 0 ? (
        <p className="text-sm text-gray-500">Select at least one product above to set ordering.</p>
      ) : (
        <div className="space-y-2">
          {selectedProducts.map((product, index) => (
            <div
              key={product.id}
              draggable={!readOnly}
              onDragStart={() => setDragProductId(product.id)}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
              }}
              onDrop={() => {
                if (!dragProductId || readOnly) return;
                onMoveProductBefore(dragProductId, product.id);
                setDragProductId(null);
              }}
              onDragEnd={() => setDragProductId(null)}
              className={`rounded-lg border px-3 py-2 flex items-center justify-between ${
                dragProductId === product.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
              } ${readOnly ? '' : 'cursor-move'}`}
            >
              <div>
                <p className="font-medium text-gray-800">
                  {index + 1}. {product.name}
                </p>
                <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p>
              </div>
              <span className="text-xs text-gray-400">drag</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
