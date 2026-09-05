import type { WaxType } from './data';

type Props = {
  quickGuideRows: WaxType[];
  useWaxBlend: boolean;
  waxTypeId: string;
};

export default function WaxQuickGuide({ quickGuideRows, useWaxBlend, waxTypeId }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Wax Type Quick Guide</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Wax Type</th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">
                Recommended Fragrance Load
              </th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">
                Add Fragrance At
              </th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Stir Time</th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">
                Wait After Mixing
              </th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Pour At</th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Cure Time</th>
            </tr>
          </thead>
          <tbody>
            {quickGuideRows.map((waxType) => {
              const isSelected = useWaxBlend
                ? waxType.id === 'custom-blend-row'
                : waxType.id === waxTypeId;
              const cellTextClass = isSelected ? 'text-black' : 'text-gray-700';
              const nameTextClass = isSelected ? 'text-black' : 'text-gray-800';

              return (
                <tr
                  key={waxType.id}
                  className={`border-b border-gray-100 ${isSelected ? 'bg-green-200' : ''}`}
                >
                  <td className={`py-2 px-2 text-sm font-medium ${nameTextClass}`}>{waxType.name}</td>
                  <td className={`py-2 px-2 text-sm ${cellTextClass}`}>{waxType.recommendedRange}</td>
                  <td className={`py-2 px-2 text-sm ${cellTextClass}`}>{waxType.fragranceAddTempF}</td>
                  <td className={`py-2 px-2 text-sm ${cellTextClass}`}>{waxType.stirTime}</td>
                  <td className={`py-2 px-2 text-sm ${cellTextClass}`}>{waxType.waitBeforePour}</td>
                  <td className={`py-2 px-2 text-sm ${cellTextClass}`}>{waxType.pourTempF}</td>
                  <td className={`py-2 px-2 text-sm ${cellTextClass}`}>{waxType.cureTimeDays}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-sm font-semibold text-amber-900 mb-2">Fragrance Mixing Workflow</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
          <li>Heat wax to the listed fragrance add range (usually 180-185 F).</li>
          <li>Reduce or remove heat before adding fragrance oil.</li>
          <li>Stir for the full mix time (about 2 minutes) for even binding.</li>
          <li>After mixing, let wax cool to the listed pour temperature, then pour.</li>
        </ul>
      </div>
    </div>
  );
}
