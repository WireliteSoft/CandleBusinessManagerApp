import type { FormEvent } from 'react';
import type { Employee, Product, ProductSaleData } from './config';

type Props = {
  employees: Employee[];
  onClose: () => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  readOnly: boolean;
  saleData: ProductSaleData;
  saleProduct: Product;
  setSaleData: React.Dispatch<React.SetStateAction<ProductSaleData>>;
};

export default function ProductSaleModal({
  employees,
  onClose,
  onSubmit,
  readOnly,
  saleData,
  saleProduct,
  setSaleData,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Record Sale: {saleProduct.name}</h3>
        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee (Optional)</label>
              <select
                value={saleData.employee_id}
                onChange={(e) => setSaleData({ ...saleData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">No employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({(emp.commission_rate * 100).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                max={saleProduct.quantity_in_stock}
                required
                value={saleData.quantity}
                onChange={(e) => setSaleData({ ...saleData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">Available: {saleProduct.quantity_in_stock} units</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Price per unit:</span>
                <span className="font-medium">${saleProduct.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-amber-600">${(saleProduct.price * parseInt(saleData.quantity || '0')).toFixed(2)}</span>
              </div>
              {saleData.employee_id && (
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>Commission:</span>
                  <span>
                    $
                    {(
                      saleProduct.price *
                      parseInt(saleData.quantity || '0') *
                      (employees.find((e) => e.id === saleData.employee_id)?.commission_rate || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              disabled={readOnly}
              type="submit"
              className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Record Sale
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
