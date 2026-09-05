import type { AppealHistoryRow } from './types';

type Props = {
  appealHistory: AppealHistoryRow[];
};

export default function AppealHistoryPanel({ appealHistory }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6 overflow-x-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Completed Ban Appeals (Selected Account)
      </h2>
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Completed</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Outcome</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Ban Reason</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Appeal Reason</th>
            <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Details</th>
          </tr>
        </thead>
        <tbody>
          {appealHistory.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-100">
              <td className="py-2 px-2 text-sm text-gray-700">
                {new Date(entry.completed_at).toLocaleString()}
              </td>
              <td className="py-2 px-2 text-sm text-gray-700">{entry.appeal_status}</td>
              <td className="py-2 px-2 text-sm text-gray-700">{entry.ban_reason || '-'}</td>
              <td className="py-2 px-2 text-sm text-gray-700">{entry.appeal_reason}</td>
              <td className="py-2 px-2 text-sm text-gray-700">{entry.appeal_details}</td>
            </tr>
          ))}
          {appealHistory.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-sm text-gray-500">
                No completed appeal history for the selected account.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
