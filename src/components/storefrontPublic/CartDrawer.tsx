import { Minus, Plus, Trash2, X } from 'lucide-react';
import type { CartDetail } from './helpers';

type Props = {
  cartDetail: CartDetail;
  cartOpen: boolean;
  checkout: () => void;
  clearCart: () => void;
  onClose: () => void;
  removeLine: (productId: string) => void;
  updateLineQty: (productId: string, delta: number) => void;
};

export default function CartDrawer({
  cartDetail,
  cartOpen,
  checkout,
  clearCart,
  onClose,
  removeLine,
  updateLineQty,
}: Props) {
  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35">
      <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Your Cart</h3>
          <button type="button" onClick={onClose} className="p-2 rounded border border-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        {cartDetail.items.length === 0 ? (
          <p className="text-sm text-gray-500">Your cart is empty.</p>
        ) : (
          <>
            <div className="space-y-3">
              {cartDetail.items.map((item) => (
                <div key={item.product.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        ${Number(item.product.price).toFixed(2)} each
                      </p>
                      {item.customization ? <p className="mt-1 text-xs text-pink-700">{[item.customization.size, item.customization.scent, item.customization.wick, item.customization.label && `Label: ${item.customization.label}`, item.customization.extras.join(', ')].filter(Boolean).join(' | ')}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(item.product.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => updateLineQty(item.product.id, -1)}
                        className="px-2 py-1 hover:bg-gray-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-1 text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateLineQty(item.product.id, 1)}
                        className="px-2 py-1 hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-semibold text-gray-800">${item.lineTotal.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Subtotal</span><span className="text-gray-800">${cartDetail.subtotal.toFixed(2)}</span></div>
              {cartDetail.discount ? <div className="flex justify-between text-sm mb-2 text-emerald-700"><span>Mix & Match ({cartDetail.discountPercent}% off)</span><span>-${cartDetail.discount.toFixed(2)}</span></div> : <p className="mb-2 text-xs text-emerald-700">Add 3 items for 20% off, 6 for 40%, or 12 for 60%.</p>}
              <div className="flex justify-between mb-3">
                <span className="text-gray-700">Total</span>
                <span className="font-bold text-gray-900">${cartDetail.total.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={checkout}
                  className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Checkout
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  className="px-3 py-2 rounded-lg border border-gray-300"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Checkout copies order summary so customer can send it to seller for payment.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
