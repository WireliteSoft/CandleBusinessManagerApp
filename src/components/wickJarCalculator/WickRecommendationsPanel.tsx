import { Ruler } from 'lucide-react';
import { WICK_SUPPLIER_SEARCH, type SupplierSearch } from './config';
import { buildSupplierHref } from './helpers';

type Props = {
  commonSizesForFamily: string[];
  selectedWickFamily: string;
  selectedWickSize: string;
  selectedWickSuppliers: SupplierSearch[];
  setSelectedWickFamily: (value: string) => void;
  setSelectedWickSize: (value: string) => void;
  wickFamilies: string[];
  wickLengthEachInches: number;
};

export default function WickRecommendationsPanel({
  commonSizesForFamily,
  selectedWickFamily,
  selectedWickSize,
  selectedWickSuppliers,
  setSelectedWickFamily,
  setSelectedWickSize,
  wickFamilies,
  wickLengthEachInches,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Ruler className="w-5 h-5 text-rose-600" />
        <h3 className="text-lg font-semibold text-gray-800">Recommended Starting Wick Types</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wick Type</label>
          <select
            value={selectedWickFamily}
            onChange={(e) => setSelectedWickFamily(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          >
            {wickFamilies.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Common Wick Thickness/Size</label>
          <select
            value={selectedWickSize}
            onChange={(e) => setSelectedWickSize(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          >
            {commonSizesForFamily.length === 0 ? (
              <option value="">No sizes listed</option>
            ) : (
              commonSizesForFamily.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      <div className="mb-4 rounded-lg border border-gray-200 p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Shop Selected Wick Size</p>
        <div className="flex flex-wrap gap-2">
          {selectedWickSuppliers.map((supplier) => (
            <a
              key={`${selectedWickFamily}-${supplier.label}`}
              href={buildSupplierHref(supplier, wickLengthEachInches, selectedWickSize)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-sm rounded-md border border-rose-300 text-rose-700 hover:text-rose-800 hover:border-rose-400"
            >
              {supplier.label}
            </a>
          ))}
        </div>
      </div>
      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
        {wickFamilies.map((family) => {
          const supplier = (WICK_SUPPLIER_SEARCH[family] ?? [])[0];
          const href = supplier
            ? buildSupplierHref(supplier, wickLengthEachInches, selectedWickSize)
            : 'https://www.amazon.com/s?k=candle+wick';
          return (
            <li key={family}>
              <span>{family}</span>{' '}
              <a href={href} target="_blank" rel="noreferrer" className="text-rose-700 hover:text-rose-800 underline">
                {supplier?.label ?? 'Amazon'}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-gray-500">
        Use this as a starting point only. Final wick choice should be confirmed with real burn tests.
      </p>
    </div>
  );
}
