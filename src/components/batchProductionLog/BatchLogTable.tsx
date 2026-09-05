import { PackagePlus, Pencil, QrCode, Trash2 } from 'lucide-react';
import type { BatchLogRecord } from '../../lib/localDb';
import type { BatchOutcome } from './config';

type Props = {
  canCreateProducts: boolean;
  createProductFromBatch: (item: BatchLogRecord) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  logs: BatchLogRecord[];
  productCreationStatus: string;
  readOnly: boolean;
  setSelectedQrBatchId: React.Dispatch<React.SetStateAction<string | null>>;
  startEditing: (log: BatchLogRecord) => void;
  updateCandlesAmount: (id: string, candles_amount: number) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  updateOutcome: (id: string, outcome: BatchOutcome) => Promise<void>;
};

export default function BatchLogTable({
  canCreateProducts,
  createProductFromBatch,
  deleteBatch,
  logs,
  productCreationStatus,
  readOnly,
  setSelectedQrBatchId,
  startEditing,
  updateCandlesAmount,
  updateNotes,
  updateOutcome,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Batch Log</h3>
      {productCreationStatus ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {productCreationStatus}
        </div>
      ) : null}
      <table className="w-full min-w-[1280px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Date</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Batch</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Candles</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Wax</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Container Type</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Container Size</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Wax oz</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">FO %</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">FO</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Wick</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Wick Size</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Wick Count</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Pour F</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Room F</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Hum %</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Outcome</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Notes</th>
            <th className="text-right py-2 px-2 text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={18} className="py-6 text-center text-sm text-gray-500">
                No batch logs yet.
              </td>
            </tr>
          ) : (
            logs.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 align-top">
                <td className="py-2 px-2 text-sm text-gray-700">{item.batch_date}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.batch_name}</td>
                <td className="py-2 px-2 text-sm text-gray-700">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.candles_amount}
                    onChange={(e) =>
                      void updateCandlesAmount(item.id, Math.max(0, Number(e.target.value || 0)))
                    }
                    disabled={readOnly}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.wax_type || '-'}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.container_type || '-'}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.container_size || '-'}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.wax_weight_oz}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.fragrance_load}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.fragrance_oil || '-'}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.wick_type || '-'}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.wick_size || '-'}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.wick_count}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.pour_temp_f}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.room_temp_f}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{item.room_humidity}</td>
                <td className="py-2 px-2 text-sm">
                  <select
                    value={item.outcome}
                    onChange={(e) => void updateOutcome(item.id, e.target.value as BatchOutcome)}
                    disabled={readOnly}
                    className="px-2 py-1 text-xs rounded border border-gray-300"
                  >
                    <option value="pending">pending</option>
                    <option value="pass">pass</option>
                    <option value="fail">fail</option>
                  </select>
                </td>
                <td className="py-2 px-2 text-sm text-gray-700">
                  <textarea
                    rows={2}
                    value={item.notes}
                    onChange={(e) => void updateNotes(item.id, e.target.value)}
                    disabled={readOnly}
                    className="w-full min-w-[220px] px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </td>
                <td className="py-2 px-2 text-sm text-right">
                  <div className="inline-flex items-center gap-1">
                    {canCreateProducts && (
                      <button
                        type="button"
                        onClick={() => void createProductFromBatch(item)}
                        disabled={readOnly}
                        title="Create Product"
                        aria-label="Create Product"
                        className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PackagePlus className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      disabled={readOnly}
                      title="Edit Batch"
                      aria-label="Edit Batch"
                      className="p-2 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedQrBatchId(item.id)}
                      title="Batch QR"
                      aria-label="Batch QR"
                      className="p-2 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteBatch(item.id)}
                      disabled={readOnly}
                      title="Delete Batch"
                      aria-label="Delete Batch"
                      className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
