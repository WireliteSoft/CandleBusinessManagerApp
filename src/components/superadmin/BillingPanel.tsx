import type { BillingConfigRow } from './types';

type Props = {
  billingConfig: BillingConfigRow | null;
  billingForm: {
    standard_monthly_usd: string;
    standard_yearly_usd: string;
    pro_monthly_usd: string;
    pro_yearly_usd: string;
    elite_monthly_usd: string;
    elite_yearly_usd: string;
    currency: string;
  };
  setBillingForm: React.Dispatch<
    React.SetStateAction<{
      standard_monthly_usd: string;
      standard_yearly_usd: string;
      pro_monthly_usd: string;
      pro_yearly_usd: string;
      elite_monthly_usd: string;
      elite_yearly_usd: string;
      currency: string;
    }>
  >;
  onSave: () => Promise<void>;
};

export default function BillingPanel({ billingConfig, billingForm, setBillingForm, onSave }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Plan Pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Standard Monthly</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={billingForm.standard_monthly_usd}
            onChange={(e) => setBillingForm((prev) => ({ ...prev, standard_monthly_usd: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Standard Yearly</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={billingForm.standard_yearly_usd}
            onChange={(e) => setBillingForm((prev) => ({ ...prev, standard_yearly_usd: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Pro Monthly</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={billingForm.pro_monthly_usd}
            onChange={(e) => setBillingForm((prev) => ({ ...prev, pro_monthly_usd: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Pro Yearly</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={billingForm.pro_yearly_usd}
            onChange={(e) => setBillingForm((prev) => ({ ...prev, pro_yearly_usd: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Elite Monthly</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={billingForm.elite_monthly_usd}
            onChange={(e) => setBillingForm((prev) => ({ ...prev, elite_monthly_usd: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Elite Yearly</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={billingForm.elite_yearly_usd}
            onChange={(e) => setBillingForm((prev) => ({ ...prev, elite_yearly_usd: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Currency</label>
          <input
            type="text"
            value={billingForm.currency}
            onChange={(e) => setBillingForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800"
        >
          Save Pricing
        </button>
        {billingConfig?.updated_at && (
          <p className="text-xs text-gray-500">
            Last updated: {new Date(billingConfig.updated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
