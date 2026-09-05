type Props = {
  qrBatchUrl: string;
  qrImageUrl: string;
  selectedQrBatchId: string | null;
  setSelectedQrBatchId: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function BatchQrModal({
  qrBatchUrl,
  qrImageUrl,
  selectedQrBatchId,
  setSelectedQrBatchId,
}: Props) {
  if (!selectedQrBatchId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Batch QR Code</h3>
        <img src={qrImageUrl} alt="Batch QR code" className="mx-auto w-56 h-56 border border-gray-200 rounded" />
        <p className="text-xs text-gray-600 mt-3 break-all">{qrBatchUrl}</p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => window.open(qrBatchUrl, '_blank', 'noopener,noreferrer')}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Open Link
          </button>
          <button
            type="button"
            onClick={() => setSelectedQrBatchId(null)}
            className="flex-1 py-2 rounded-lg modal-cancel-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
