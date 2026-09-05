import BatchDetailsForm from './BatchDetailsForm';
import BatchPricingSnapshot from './BatchPricingSnapshot';
import WaxBlendBuilder from './WaxBlendBuilder';
import type {
  BLENDABLE_WAX_TYPE_OPTIONS,
  BatchForm,
} from './config';

type BlendHint = {
  text: string;
};

type BlendableWaxType = (typeof BLENDABLE_WAX_TYPE_OPTIONS)[number];

type Props = {
  activeBlendHint: BlendHint;
  applyActiveHintBlend: () => void;
  blendLabel: string;
  blendPercentA: string;
  blendPercentB: string;
  blendWaxA: BlendableWaxType;
  blendWaxB: BlendableWaxType;
  derivedFillPerCandle: number;
  derivedFragranceUsed: number;
  editingBatchId: string | null;
  form: BatchForm;
  getPricingCardClass: (selected: boolean) => string;
  pricing: {
    materialCostPerCandle: number;
    totalCostPerCandle: number;
    wholesaleSuggestion: number;
    retailSuggestion: number;
    premiumSuggestion: number;
  };
  readOnly: boolean;
  resetForm: (nextBatchDate?: string) => void;
  saveBatch: () => Promise<void>;
  setBlendPercentA: React.Dispatch<React.SetStateAction<string>>;
  setBlendPercentB: React.Dispatch<React.SetStateAction<string>>;
  setBlendWaxA: React.Dispatch<React.SetStateAction<BlendableWaxType>>;
  setBlendWaxB: React.Dispatch<React.SetStateAction<BlendableWaxType>>;
  setForm: React.Dispatch<React.SetStateAction<BatchForm>>;
  setUseWaxBlend: React.Dispatch<React.SetStateAction<boolean>>;
  useWaxBlend: boolean;
  wickSizeOptions: string[];
};

export default function BatchEntryPanel({
  activeBlendHint,
  applyActiveHintBlend,
  blendLabel,
  blendPercentA,
  blendPercentB,
  blendWaxA,
  blendWaxB,
  derivedFillPerCandle,
  derivedFragranceUsed,
  editingBatchId,
  form,
  getPricingCardClass,
  pricing,
  readOnly,
  resetForm,
  saveBatch,
  setBlendPercentA,
  setBlendPercentB,
  setBlendWaxA,
  setBlendWaxB,
  setForm,
  setUseWaxBlend,
  useWaxBlend,
  wickSizeOptions,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Log New Batch</h3>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={useWaxBlend}
            onChange={(e) => {
              if (readOnly) return;
              const checked = e.target.checked;
              setUseWaxBlend(checked);
              if (!checked) {
                setForm((prev) => ({ ...prev, wax_type: '' }));
              } else {
                setForm((prev) => ({ ...prev, wax_type: blendLabel }));
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            disabled={readOnly}
          />
          Use Wax Blend
        </label>
      </div>
      <BatchDetailsForm
        blendLabel={blendLabel}
        form={form}
        readOnly={readOnly}
        setForm={setForm}
        useWaxBlend={useWaxBlend}
        wickSizeOptions={wickSizeOptions}
      />
      <BatchPricingSnapshot
        derivedFillPerCandle={derivedFillPerCandle}
        derivedFragranceUsed={derivedFragranceUsed}
        form={form}
        getPricingCardClass={getPricingCardClass}
        pricing={pricing}
        readOnly={readOnly}
        setForm={setForm}
      />
      {useWaxBlend && (
        <WaxBlendBuilder
          activeBlendHintText={activeBlendHint.text}
          applyActiveHintBlend={applyActiveHintBlend}
          blendPercentA={blendPercentA}
          blendPercentB={blendPercentB}
          blendWaxA={blendWaxA}
          blendWaxB={blendWaxB}
          readOnly={readOnly}
          setBlendPercentA={setBlendPercentA}
          setBlendPercentB={setBlendPercentB}
          setBlendWaxA={setBlendWaxA}
          setBlendWaxB={setBlendWaxB}
        />
      )}
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveBatch()}
            disabled={readOnly}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingBatchId ? 'Update Batch' : 'Save Batch'}
          </button>
          {editingBatchId && (
            <button
              type="button"
              onClick={() => resetForm(form.batch_date)}
              disabled={readOnly}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
