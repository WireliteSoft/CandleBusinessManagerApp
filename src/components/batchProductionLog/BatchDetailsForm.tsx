import {
  WAX_TYPE_OPTIONS,
  WICK_TYPE_OPTIONS,
  type BatchForm,
} from './config';

type Props = {
  blendLabel: string;
  form: BatchForm;
  readOnly: boolean;
  setForm: React.Dispatch<React.SetStateAction<BatchForm>>;
  useWaxBlend: boolean;
  wickSizeOptions: string[];
};

export default function BatchDetailsForm({
  blendLabel,
  form,
  readOnly,
  setForm,
  useWaxBlend,
  wickSizeOptions,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Batch Date</label>
        <input
          type="date"
          value={form.batch_date}
          onChange={(e) => setForm((prev) => ({ ...prev, batch_date: e.target.value }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Batch Name</label>
        <input
          type="text"
          value={form.batch_name}
          onChange={(e) => setForm((prev) => ({ ...prev, batch_name: e.target.value }))}
          disabled={readOnly}
          placeholder="Ex: Spring Batch #7"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Candles Amount</label>
        <input
          type="number"
          min="0"
          step="1"
          value={form.candles_amount}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              candles_amount: Math.max(0, Number(e.target.value || 0)),
            }))
          }
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {useWaxBlend ? 'Wax Blend' : 'Wax Type'}
        </label>
        <select
          value={useWaxBlend ? blendLabel : form.wax_type}
          onChange={(e) => {
            if (!useWaxBlend) {
              setForm((prev) => ({ ...prev, wax_type: e.target.value }));
            }
          }}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          {useWaxBlend ? (
            <option value={blendLabel}>{blendLabel}</option>
          ) : (
            <>
              <option value="">Select wax type</option>
              {form.wax_type &&
                !WAX_TYPE_OPTIONS.includes(
                  form.wax_type as (typeof WAX_TYPE_OPTIONS)[number]
                ) && <option value={form.wax_type}>{form.wax_type}</option>}
              {WAX_TYPE_OPTIONS.map((waxType) => (
                <option key={waxType} value={waxType}>
                  {waxType}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Container Type</label>
        <input
          type="text"
          value={form.container_type}
          onChange={(e) => setForm((prev) => ({ ...prev, container_type: e.target.value }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Container Size</label>
        <input
          type="text"
          value={form.container_size}
          onChange={(e) => setForm((prev) => ({ ...prev, container_size: e.target.value }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wax Weight (oz)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={form.wax_weight_oz}
          onChange={(e) => setForm((prev) => ({ ...prev, wax_weight_oz: Number(e.target.value || 0) }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance Load (%)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={form.fragrance_load}
          onChange={(e) => setForm((prev) => ({ ...prev, fragrance_load: Number(e.target.value || 0) }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fragrance Oil</label>
        <input
          type="text"
          value={form.fragrance_oil}
          onChange={(e) => setForm((prev) => ({ ...prev, fragrance_oil: e.target.value }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wick Type</label>
        <select
          value={form.wick_type}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              wick_type: e.target.value,
              wick_size: '',
            }))
          }
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select wick type</option>
          {WICK_TYPE_OPTIONS.map((wickType) => (
            <option key={wickType} value={wickType}>
              {wickType}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wick Size</label>
        <select
          value={form.wick_size}
          onChange={(e) => setForm((prev) => ({ ...prev, wick_size: e.target.value }))}
          disabled={!form.wick_type || readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">{form.wick_type ? 'Select wick size' : 'Choose wick type first'}</option>
          {wickSizeOptions.map((wickSize) => (
            <option key={wickSize} value={wickSize}>
              {wickSize}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wick Count</label>
        <input
          type="number"
          min="1"
          step="1"
          value={form.wick_count}
          onChange={(e) => setForm((prev) => ({ ...prev, wick_count: Math.max(1, Number(e.target.value || 1)) }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Vessel</label>
        <input
          type="text"
          value={form.vessel}
          onChange={(e) => setForm((prev) => ({ ...prev, vessel: e.target.value }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pour Temp (F)</label>
        <input
          type="number"
          min="0"
          step="1"
          value={form.pour_temp_f}
          onChange={(e) => setForm((prev) => ({ ...prev, pour_temp_f: Number(e.target.value || 0) }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Room Temp (F)</label>
        <input
          type="number"
          min="0"
          step="1"
          value={form.room_temp_f}
          onChange={(e) => setForm((prev) => ({ ...prev, room_temp_f: Number(e.target.value || 0) }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Humidity (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={form.room_humidity}
          onChange={(e) => setForm((prev) => ({ ...prev, room_humidity: Number(e.target.value || 0) }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div className="md:col-span-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
}
