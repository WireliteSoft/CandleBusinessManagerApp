import { DollarSign, Edit2, Package, Trash2 } from 'lucide-react';
import type { Product } from './config';

type Props = {
  favoriteIdSet: Set<string>;
  filteredProducts: Product[];
  handleDelete: (id: string) => Promise<void>;
  openEditForm: (product: Product) => void;
  openSaleForm: (product: Product) => void;
  readOnly: boolean;
  toggleFavorite: (productId: string, checked: boolean) => void;
};

export default function ProductListView({
  favoriteIdSet,
  filteredProducts,
  handleDelete,
  openEditForm,
  openSaleForm,
  readOnly,
  toggleFavorite,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
        <div className="col-span-6 md:col-span-4">Product</div>
        <div className="hidden md:block md:col-span-2 text-right">COGS</div>
        <div className="col-span-3 md:col-span-2 text-right">Price</div>
        <div className="col-span-3 md:col-span-2 text-right">Stock</div>
        <div className="hidden md:block md:col-span-2 text-right">Actions</div>
      </div>
      {filteredProducts.map((product) => (
        <div
          key={product.id}
          className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center"
        >
          <div className="col-span-6 md:col-span-4 flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
              {product.image_data ? (
                <img src={product.image_data} alt={product.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <Package className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
              {product.description ? <p className="text-xs text-gray-500 truncate">{product.description}</p> : null}
            </div>
          </div>
          <div className="hidden md:block md:col-span-2 text-right text-sm text-gray-700">${product.cost_per_unit.toFixed(2)}</div>
          <div className="col-span-3 md:col-span-2 text-right text-sm font-semibold text-amber-600">${product.price.toFixed(2)}</div>
          <div className="col-span-3 md:col-span-2 text-right text-sm">
            <span className={`font-medium ${product.quantity_in_stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
              {product.quantity_in_stock}
            </span>
          </div>
          <div className="col-span-12 md:col-span-2 flex md:justify-end gap-2">
            <label className="flex items-center gap-1 px-2 text-xs rounded border border-gray-200 text-gray-600 bg-gray-50">
              <input
                type="checkbox"
                checked={favoriteIdSet.has(product.id)}
                onChange={(e) => toggleFavorite(product.id, e.target.checked)}
              />
              Fav
            </label>
            <button
              disabled={readOnly}
              onClick={() => openSaleForm(product)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Record Sale"
            >
              <DollarSign className="w-4 h-4" />
            </button>
            <button
              disabled={readOnly}
              onClick={() => openEditForm(product)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              disabled={readOnly}
              onClick={() => void handleDelete(product.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
