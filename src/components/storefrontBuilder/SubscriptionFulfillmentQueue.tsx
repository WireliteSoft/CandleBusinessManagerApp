import { useEffect, useState } from 'react';
import { localDb } from '../../lib/localDb';

const statuses = ['pending', 'in_production', 'ready', 'shipped', 'cancelled'] as const;

export default function SubscriptionFulfillmentQueue() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof localDb.getStorefrontSubscriptionFulfillment>>>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = () => void localDb.getStorefrontSubscriptionFulfillment().then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load subscription fulfillment.'));
  useEffect(load, []);

  async function update(id: string, status: typeof statuses[number]) {
    setBusyId(id);
    setError('');
    try {
      await localDb.updateStorefrontSubscriptionFulfillment(id, { status });
      load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update fulfillment.');
    } finally {
      setBusyId('');
    }
  }

  return <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-md"><h3 className="text-lg font-semibold text-gray-800">Subscription fulfillment queue</h3><p className="mt-1 text-sm text-gray-600">Manage shipment progress after the subscription payment is confirmed by the provider.</p>{error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}{rows.length ? <div className="mt-4 space-y-2">{rows.map((row) => <div key={row.id} className="rounded border p-3 text-sm"><strong>{row.plan_name}</strong> for {row.customer_name} ({row.customer_email})<br />Due: {new Date(row.shipment_due_at).toLocaleDateString()} | Payment: {row.payment_status}<label className="mt-3 block font-semibold">Fulfillment status<select value={row.status} disabled={busyId === row.id} onChange={(event) => void update(row.id, event.target.value as typeof statuses[number])} className="mt-1 block rounded border p-2 font-normal">{statuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label></div>)}</div> : <p className="mt-4 text-sm text-gray-500">No subscription fulfillment records yet.</p>}</section>;
}
