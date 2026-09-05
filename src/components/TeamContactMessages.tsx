import { useCallback, useEffect, useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { localDb, type StoreContactMessageRecord } from '../lib/localDb';

type Props = {
  readOnly?: boolean;
};

export default function TeamContactMessages({ readOnly = false }: Props) {
  const [rows, setRows] = useState<StoreContactMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [statusTab, setStatusTab] = useState<
    | 'new'
    | 'custom_request'
    | 'in_progress'
    | 'awaiting_payment'
    | 'order_shipped'
    | 'completed'
    | 'closed'
  >('new');
  const [savingWorkflowId, setSavingWorkflowId] = useState('');
  const [counts, setCounts] = useState({
    new: { total: 0, urgent: 0 },
    custom_request: { total: 0, urgent: 0 },
    in_progress: { total: 0, urgent: 0 },
    awaiting_payment: { total: 0, urgent: 0 },
    order_shipped: { total: 0, urgent: 0 },
    completed: { total: 0, urgent: 0 },
    closed: { total: 0, urgent: 0 },
  });

  const load = useCallback(async (targetStatus = statusTab) => {
    setLoading(true);
    setError('');
    try {
      const [data, countData] = await Promise.all([
        localDb.getTeamContactMessages({ status: targetStatus }),
        localDb.getTeamContactMessageCounts(),
      ]);
      setRows(data);
      setCounts(countData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (readOnly) return;
    if (!window.confirm('Delete this contact message?')) return;
    setDeletingId(id);
    try {
      await localDb.deleteTeamContactMessage(id);
      await load(statusTab);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete contact message');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-6 h-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-800">Contact Messages</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">
              Messages submitted from your public storefront contact form.
            </p>
            <div className="mt-2 flex flex-wrap rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setStatusTab('new')}
                className={`px-3 py-1.5 text-sm ${
                  statusTab === 'new'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  New ({counts.new.total})
                  {counts.new.urgent > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('custom_request')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                  statusTab === 'custom_request'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  Custom Request ({counts.custom_request.total})
                  {counts.custom_request.urgent > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('in_progress')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                  statusTab === 'in_progress'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  In Progress ({counts.in_progress.total})
                  {counts.in_progress.urgent > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('awaiting_payment')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                  statusTab === 'awaiting_payment'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  Awaiting Payment ({counts.awaiting_payment.total})
                  {counts.awaiting_payment.urgent > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('order_shipped')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                  statusTab === 'order_shipped'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  Order Shipped ({counts.order_shipped.total})
                  {counts.order_shipped.urgent > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('completed')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                  statusTab === 'completed'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  Completed ({counts.completed.total})
                  {counts.completed.urgent > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('closed')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                  statusTab === 'closed'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex items-center">
                  Closed ({counts.closed.total})
                  {counts.closed.urgent > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load(statusTab)}
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading ? <p className="text-sm text-gray-500">Loading messages...</p> : null}
        {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="text-sm text-gray-500">No contact messages yet.</p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-gray-600">Date:</span>{' '}
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                    <p className="text-lg font-semibold text-gray-800 mt-1">
                      <span className="text-sm text-gray-600 font-semibold mr-1">Name:</span>
                      {row.name}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-600">Email:</span> {row.email}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-600">Phone:</span> {row.phone}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-semibold text-gray-600">Address:</span>{' '}
                      {row.street_address}, {row.city}, {row.state} {row.zip}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-3">
                      <span className="font-semibold text-gray-600">Message:</span>{' '}
                      {row.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="font-semibold text-gray-600">IP:</span> {row.ip_address || 'n/a'}
                    </p>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 max-w-3xl">
                      <label className="text-xs text-gray-600">
                        Status
                        <select
                          value={row.workflow_status || 'new'}
                          disabled={readOnly || savingWorkflowId === row.id}
                          onChange={(e) => {
                            const value = e.target.value as StoreContactMessageRecord['workflow_status'];
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id
                                  ? {
                                      ...item,
                                      workflow_status: value,
                                      priority_level:
                                        value === 'completed' || value === 'closed'
                                          ? 'none'
                                          : item.priority_level === 'none'
                                          ? 'normal'
                                          : item.priority_level,
                                    }
                                  : item
                              )
                            );
                          }}
                          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-sm"
                        >
                          <option value="new">New</option>
                          <option value="custom_request">Custom Request</option>
                          <option value="in_progress">In Progress</option>
                          <option value="awaiting_payment">Awaiting Payment</option>
                          <option value="order_shipped">Order Shipped</option>
                          <option value="completed">Completed</option>
                          <option value="closed">Closed</option>
                        </select>
                      </label>
                      <label className="text-xs text-gray-600">
                        Priority
                        <select
                          value={row.priority_level || 'normal'}
                          disabled={
                            readOnly ||
                            savingWorkflowId === row.id ||
                            row.workflow_status === 'completed' ||
                            row.workflow_status === 'closed'
                          }
                          onChange={(e) => {
                            const value = e.target.value as StoreContactMessageRecord['priority_level'];
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, priority_level: value } : item
                              )
                            );
                          }}
                          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-sm"
                        >
                          <option value="none">None</option>
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </label>
                      <div className="text-xs text-gray-600 flex items-end">
                        <button
                          type="button"
                          disabled={readOnly || savingWorkflowId === row.id}
                          onClick={async () => {
                            try {
                              setSavingWorkflowId(row.id);
                              await localDb.updateTeamContactMessageWorkflow(
                                row.id,
                                row.workflow_status || 'new',
                                row.priority_level || 'normal',
                                row.admin_notes || ''
                              );
                              await load(statusTab);
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Failed to save status');
                            } finally {
                              setSavingWorkflowId('');
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingWorkflowId === row.id ? 'Saving...' : 'Save Status'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 max-w-3xl">
                      <label className="text-xs text-gray-600">
                        Admin Notes
                        <textarea
                          rows={3}
                          value={row.admin_notes || ''}
                          disabled={readOnly || savingWorkflowId === row.id}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, admin_notes: value } : item
                              )
                            );
                          }}
                          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-sm"
                          placeholder="Internal notes for this request..."
                        />
                      </label>
                    </div>
                    {row.read_at ? (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-semibold text-gray-600">Read At:</span>{' '}
                        {new Date(row.read_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        if (readOnly) return;
                        const reason = window.prompt(
                          'Ban this IP from the site. Optional reason:',
                          'Spam contact message'
                        );
                        if (reason === null) return;
                        try {
                          const result = await localDb.banTeamContactMessageIp(row.id, reason);
                          alert(`IP banned: ${result.ip_address}`);
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Failed to ban IP');
                        }
                      }}
                      disabled={readOnly}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Ban IP
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(row.id)}
                      disabled={readOnly || deletingId === row.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
