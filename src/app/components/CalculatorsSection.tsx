import HotThrowTipsInfo from '../../components/HotThrowTipsInfo';
import WaxCalculator from '../../components/WaxCalculator';
import WickJarCalculator from '../../components/WickJarCalculator';
import type { CalculatorsTab } from '../config';

type Props = {
  calculatorsTab: CalculatorsTab;
  setCalculatorsTab: (tab: CalculatorsTab) => void;
};

export default function CalculatorsSection({ calculatorsTab, setCalculatorsTab }: Props) {
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setCalculatorsTab('wax')}
          className={`px-4 py-2 rounded-lg border ${
            calculatorsTab === 'wax' ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Wax Calculator
        </button>
        <button
          type="button"
          onClick={() => setCalculatorsTab('wick')}
          className={`px-4 py-2 rounded-lg border ${
            calculatorsTab === 'wick' ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Wick Calculator
        </button>
        <button
          type="button"
          onClick={() => setCalculatorsTab('hotThrowTips')}
          className={`px-4 py-2 rounded-lg border ${
            calculatorsTab === 'hotThrowTips'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Hot Throw Tips
        </button>
      </div>
      {calculatorsTab === 'wax' && <WaxCalculator />}
      {calculatorsTab === 'wick' && <WickJarCalculator />}
      {calculatorsTab === 'hotThrowTips' && <HotThrowTipsInfo />}
    </div>
  );
}
