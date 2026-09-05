import { Edit2, MinusCircle, ShoppingCart, Trash2 } from 'lucide-react';
import type { Supply } from './config';

type Props = {
  addToCart: (supplyId: string) => Promise<void>;
  clearPreviewForHref: (href: string) => void;
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

export default function SuppliesGridView({
  addToCart,
  clearPreviewForHref,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredSupplies.map((supply) => (
        <div key={supply.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold text-gray-800">{supply.name}</h3>
            <div className="flex gap-2">
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
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                disabled={readOnly}
                onClick={() => void handleDelete(supply.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {supply.description && (
            <>
              {linkPreviewImages[toHref(supply.description)] && (
                <img
                  src={linkPreviewImages[toHref(supply.description)] || undefined}
                  alt={`${supply.name} preview`}
                  className="w-full h-40 object-contain rounded-lg mb-3 border border-gray-200"
                  loading="lazy"
                  onError={() => clearPreviewForHref(toHref(supply.description))}
                />
              )}
              <a
                href={toHref(supply.description)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 text-sm mb-3 block hover:underline break-words"
              >
                {supply.description}
              </a>
            </>
          )}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Cost per unit:</span>
              <span className="font-semibold text-blue-600">${supply.cost_per_unit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unit type:</span>
              <span className="font-medium">{supply.unit_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In stock:</span>
              <span className={`font-medium ${supply.quantity_in_stock < 20 ? 'text-red-600' : 'text-green-600'}`}>
                {supply.quantity_in_stock}
              </span>
            </div>
            {supply.supplier && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Supplier:</span>
                <span className="font-medium text-gray-800">{supply.supplier}</span>
              </div>
            )}
            <button
              disabled={readOnly}
              onClick={() => void handleUseStock(supply)}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-orange-100 text-orange-800 py-2 rounded-lg hover:bg-orange-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MinusCircle className="w-4 h-4" />
              Use Stock
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
