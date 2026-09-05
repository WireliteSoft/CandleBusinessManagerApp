import { BLOCK_REASONS, CUSTOM_REASON_VALUE, type ReasonModalState } from './types';

type Props = {
  onBanEvidenceFileSelected: (files: FileList | null) => Promise<void>;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  reasonModal: ReasonModalState;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setReasonModal: React.Dispatch<React.SetStateAction<ReasonModalState>>;
};

export default function ReasonModal({
  onBanEvidenceFileSelected,
  onCancel,
  onConfirm,
  reasonModal,
  setReasonModal,
}: Props) {
  if (!reasonModal.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-5 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800">
          Select reason to {reasonModal.action === 'ban' ? 'ban' : 'disable'} account
        </h3>
        <div className="mt-3 space-y-2">
          {BLOCK_REASONS.map((reason) => (
            <label key={reason} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="blockReason"
                checked={reasonModal.reason === reason}
                onChange={() => setReasonModal((prev) => ({ ...prev, reason }))}
              />
              {reason}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="blockReason"
              checked={reasonModal.reason === CUSTOM_REASON_VALUE}
              onChange={() => setReasonModal((prev) => ({ ...prev, reason: CUSTOM_REASON_VALUE }))}
            />
            Custom reason
          </label>
          {reasonModal.reason === CUSTOM_REASON_VALUE && (
            <input
              type="text"
              value={reasonModal.customReason}
              onChange={(e) => setReasonModal((prev) => ({ ...prev, customReason: e.target.value }))}
              placeholder="Type custom reason"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              maxLength={200}
            />
          )}
          {reasonModal.action === 'ban' && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Optional Ban Evidence</p>
              <textarea
                value={reasonModal.evidenceNote}
                onChange={(e) => setReasonModal((prev) => ({ ...prev, evidenceNote: e.target.value }))}
                placeholder="Optional: add evidence notes for this ban"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[70px]"
                maxLength={5000}
              />
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void onBanEvidenceFileSelected(e.target.files)}
                  className="text-sm"
                />
              </div>
              {reasonModal.evidenceImagesData.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {reasonModal.evidenceImagesData.map((image, idx) => (
                    <img
                      key={`${idx}`}
                      src={image}
                      alt={`Ban evidence preview ${idx + 1}`}
                      className="w-20 h-20 object-cover border border-gray-300 rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => void onConfirm()}
            className="px-3 py-2 rounded bg-red-700 text-white"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded border border-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
