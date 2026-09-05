import { Trash2 } from 'lucide-react';
import type { CartItemWithSupply } from '../../lib/localDb';

type Props = {
  addCartItemToInventory: (item: CartItemWithSupply) => Promise<void>;
  cartItems: CartItemWithSupply[];
  cartTotal: number;
  clearCart: () => Promise<void>;
  readOnly: boolean;
  removeFromCart: (id: string) => Promise<void>;
  toHref: (value: string) => string;
};

export default function CartView({
  addCartItemToInventory,
  cartItems,
  cartTotal,
  clearCart,
  readOnly,
  removeFromCart,
  toHref,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Shopping Cart</h3>
        {cartItems.length > 0 && (
          <button
            disabled={readOnly}
            onClick={() => void clearCart()}
            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Cart
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Your cart is empty. Add supplies from the supplies list.</div>
      ) : (
        <>
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{item.supplies.name}</h4>
                  <p className="text-sm text-gray-600">
                    {item.quantity} {item.supplies.unit_type} x ${item.supplies.cost_per_unit.toFixed(2)}
                  </p>
                  {item.supplies.description && (
                    <a
                      href={toHref(item.supplies.description)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-700 hover:underline break-words"
                    >
                      Purchase link
                    </a>
                  )}
                  {item.supplies.supplier && <p className="text-xs text-gray-500">Supplier: {item.supplies.supplier}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-blue-600">${(item.supplies.cost_per_unit * item.quantity).toFixed(2)}</span>
                  <button
                    disabled={readOnly}
                    onClick={() => void addCartItemToInventory(item)}
                    className="px-3 py-1.5 text-xs rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add quantity to inventory and remove from cart"
                  >
                    Add to Inventory
                  </button>
                  <button
                    disabled={readOnly}
                    onClick={() => void removeFromCart(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span className="text-blue-600">${cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
