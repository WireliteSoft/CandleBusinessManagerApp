import type { AccountRow } from './types';

type Props = {
  accounts: AccountRow[];
  dbAccountScope: string;
  dbColumns: string[];
  dbLimit: string;
  dbLoading: boolean;
  dbPkColumns: string[];
  dbRows: Array<Record<string, unknown>>;
  dbSelectedTable: string;
  dbTables: string[];
  editDbRow: (row: Record<string, unknown>) => Promise<void>;
  deleteDbRow: (row: Record<string, unknown>) => Promise<void>;
  loadDbRows: () => Promise<void>;
  loadDbTables: () => Promise<void>;
  setDbAccountScope: React.Dispatch<React.SetStateAction<string>>;
  setDbLimit: React.Dispatch<React.SetStateAction<string>>;
  setDbSelectedTable: React.Dispatch<React.SetStateAction<string>>;
};

export default function DbExplorerPanel(props: Props) {
  const {
    accounts,
    dbAccountScope,
    dbColumns,
    dbLimit,
    dbLoading,
    dbPkColumns,
    dbRows,
    dbSelectedTable,
    dbTables,
    editDbRow,
    deleteDbRow,
    loadDbRows,
    loadDbTables,
    setDbAccountScope,
    setDbLimit,
    setDbSelectedTable,
  } = props;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 overflow-x-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Database Explorer</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Database Source</label>
          <select
            value={dbAccountScope}
            onChange={(e) => setDbAccountScope(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Master DB</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                Account DB: {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Table</label>
          <select
            value={dbSelectedTable}
            onChange={(e) => setDbSelectedTable(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {dbTables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Row Limit</label>
          <input
            type="number"
            min="1"
            max="500"
            value={dbLimit}
            onChange={(e) => setDbLimit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => void loadDbTables()}
            className="px-3 py-2 rounded border border-gray-300 text-sm"
          >
            Refresh Tables
          </button>
          <button
            type="button"
            onClick={() => void loadDbRows()}
            className="px-3 py-2 rounded bg-gray-800 text-white text-sm"
          >
            Load Data
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Edit/Delete uses table primary key columns: {dbPkColumns.join(', ') || 'none'}
      </p>
      {dbLoading ? (
        <p className="text-sm text-gray-500">Loading table rows...</p>
      ) : (
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200">
              {dbColumns.map((col) => (
                <th key={col} className="text-left py-2 px-2 text-xs font-semibold text-gray-700">
                  {col}
                </th>
              ))}
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dbRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                {dbColumns.map((col) => (
                  <td key={col} className="py-2 px-2 text-xs text-gray-700 align-top max-w-[280px]">
                    <div className="whitespace-pre-wrap break-words">
                      {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                    </div>
                  </td>
                ))}
                <td className="py-2 px-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => void editDbRow(row)}
                    className="px-2 py-1 rounded border border-blue-300 text-blue-700 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteDbRow(row)}
                    className="px-2 py-1 rounded border border-red-300 text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {dbRows.length === 0 && (
              <tr>
                <td colSpan={dbColumns.length + 1} className="py-4 text-sm text-gray-500">
                  No rows loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
