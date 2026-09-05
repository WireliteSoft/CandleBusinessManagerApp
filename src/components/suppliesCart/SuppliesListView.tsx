import { Edit2, MinusCircle, Package2, ShoppingCart, Trash2 } from 'lucide-react';
import type { Supply } from './config';

type Props = {
  addToCart: (supplyId: string) => Promise<void>;
  favoriteSupplyIdSet: Set<string>;
  filteredSupplies: Supply[];
  handleDelete: (id: string) => Promise<void>;
  handleUseStock: (supply: Supply) => Promise<void>;
  linkPreviewImages: Record<string, string | null>;
  openEditForm: (supply: Supply) => void;
  readOnly: boolean;
  toHref: (value: string) => string;
  toggleFavoriteSupply: (supplyId: string, checked: boolean) => void;
};

export default function SuppliesListView({
  addToCart,
  favoriteSupplyIdSet,
  filteredSupplies,
  handleDelete,
  handleUseStock,
  linkPreviewImages,
  openEditForm,
  readOnly,
  toHref,
  toggleFavoriteSupply,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
        <div className="col-span-6 md:col-span-4">Supply</div>
        <div className="hidden md:block md:col-span-2 text-right">Category</div>
        <div className="col-span-3 md:col-span-2 text-right">Cost</div>
        <div className="col-span-3 md:col-span-2 text-right">Stock</div>
        <div className="hidden md:block md:col-span-2 text-right">Actions</div>
      </div>
      {filteredSupplies.map((supply) => {
        const href = toHref(supply.description);
        const preview = href ? linkPreviewImages[href] : null;
        return (
          <div
            key={supply.id}
            className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center"
          >
            <div className="col-span-6 md:col-span-4 flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {preview ? (
                  <img src={preview} alt={`${supply.name} preview`} className="max-w-full max-h-full object-contain" />
                ) : (
                  <Package2 className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{supply.name}</p>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline truncate block">
                    {supply.description}
                  </a>
                ) : (
                  <p className="text-xs text-gray-500 truncate">{supply.supplier || 'No supplier'}</p>
                )}
              </div>
            </div>
            <div className="hidden md:block md:col-span-2 text-right text-sm text-gray-700">{supply.category || 'other'}</div>
            <div className="col-span-3 md:col-span-2 text-right text-sm font-semibold text-blue-600">${supply.cost_per_unit.toFixed(2)}</div>
            <div className="col-span-3 md:col-span-2 text-right text-sm">
              <span className={`font-medium ${supply.quantity_in_stock < 20 ? 'text-red-600' : 'text-green-600'}`}>
                {supply.quantity_in_stock}
              </span>
            </div>
            <div className="col-span-12 md:col-span-2 flex md:justify-end gap-2">
              <label className="flex items-center gap-1 px-2 text-xs rounded border border-gray-200 text-gray-600 bg-gray-50">
                <input
                  type="checkbox"
                  checked={favoriteSupplyIdSet.has(supply.id)}
                  onChange={(e) => toggleFavoriteSupply(supply.id, e.target.checked)}
                />
                Fav
              </label>
              <button
                disabled={readOnly}
                onClick={() => void handleUseStock(supply)}
                className="p-2 text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Use Stock"
              >
                <MinusCircle className="w-4 h-4" />
              </button>
              <button
                disabled={readOnly}
                onClick={() => void addToCart(supply.id)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add to Cart"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
              <button
                disabled={readOnly}
                onClick={() => openEditForm(supply)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                disabled={readOnly}
                onClick={() => void handleDelete(supply.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
