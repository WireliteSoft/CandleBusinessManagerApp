import { DollarSign, Edit2, Trash2 } from 'lucide-react';
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

export default function ProductCardsView({
  favoriteIdSet,
  filteredProducts,
  handleDelete,
  openEditForm,
  openSaleForm,
  readOnly,
  toggleFavorite,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredProducts.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          {product.image_data ? (
            <div className="w-full h-40 rounded-lg border border-gray-200 mb-3 bg-white flex items-center justify-center overflow-hidden">
              <img src={product.image_data} alt={product.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : null}
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
            <div className="flex gap-2">
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
          {product.description && <p className="text-gray-600 text-sm mb-3">{product.description}</p>}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">COGS (unit):</span>
              <span className="font-medium">${product.cost_per_unit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-semibold text-amber-600">${product.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In Stock:</span>
              <span className={`font-medium ${product.quantity_in_stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                {product.quantity_in_stock} units
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Gross Profit / Unit:</span>
              <span className="font-medium text-green-600">${(product.price - product.cost_per_unit).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Margin %:</span>
              <span className="font-medium">
                {product.price > 0 ? (((product.price - product.cost_per_unit) / product.price) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Potential Profit (stock):</span>
              <span className="font-medium text-green-600">
                ${((product.price - product.cost_per_unit) * product.quantity_in_stock).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
