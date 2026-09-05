import MoldsLibrary from '../../components/MoldsLibrary';
import SuppliesCart from '../../components/SuppliesCart';
import WaxPlanner from '../../components/WaxPlanner';
import ScentProfiles from '../../components/ScentProfiles';
import type { SuppliesTab } from '../config';

type Props = {
  canEditFeature: (featureKey: string) => boolean;
  renderReadOnlyNotice: () => React.JSX.Element;
  setSuppliesTab: (tab: SuppliesTab) => void;
  suppliesTab: SuppliesTab;
};

export default function SuppliesSection({
  canEditFeature,
  renderReadOnlyNotice,
  setSuppliesTab,
  suppliesTab,
}: Props) {
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setSuppliesTab('scentProfiles')}
          className={`px-4 py-2 rounded-lg border ${
            suppliesTab === 'scentProfiles' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Scent Profiles
        </button>
        <button
          type="button"
          onClick={() => setSuppliesTab('supplies')}
          className={`px-4 py-2 rounded-lg border ${
            suppliesTab === 'supplies' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Supplies
        </button>
        <button
          type="button"
          onClick={() => setSuppliesTab('molds')}
          className={`px-4 py-2 rounded-lg border ${
            suppliesTab === 'molds' ? 'bg-cyan-600 text-white border-cyan-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Molds
        </button>
        <button
          type="button"
          onClick={() => setSuppliesTab('waxPlanner')}
          className={`px-4 py-2 rounded-lg border ${
            suppliesTab === 'waxPlanner' ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Wax Planner
        </button>
      </div>
      {!canEditFeature('supplies') && renderReadOnlyNotice()}
      {suppliesTab === 'supplies' && <SuppliesCart readOnly={!canEditFeature('supplies')} />}
      {suppliesTab === 'scentProfiles' && <ScentProfiles readOnly={!canEditFeature('supplies')} />}
      {suppliesTab === 'molds' && <MoldsLibrary readOnly={!canEditFeature('supplies')} />}
      {suppliesTab === 'waxPlanner' && <WaxPlanner />}
    </div>
  );
}
