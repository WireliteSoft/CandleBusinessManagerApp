import { useEffect, useState } from 'react';
import { localDb, type StoreCustomerAddress } from '../../lib/localDb';

type Subscription = Awaited<ReturnType<typeof localDb.getStoreCustomerSubscriptions>>[number];

export default function CustomerSubscriptions({ slug, token, addresses }: { slug: string; token: string; addresses: StoreCustomerAddress[] }) {
  const [rows, setRows] = useState<Subscription[]>([]);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    try {
      setRows(await localDb.getStoreCustomerSubscriptions(slug, token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load subscriptions.');
    }
  }

  useEffect(() => {
    void localDb.getStoreCustomerSubscriptions(slug, token)
      .then(setRows)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load subscriptions.'));
  }, [slug, token]);

  async function update(subscription: Subscription, action: 'skip' | 'pause' | 'resume' | 'cancel' | 'address', shippingAddressId?: string) {
    setBusyId(subscription.id);
    setMessage('');
    try {
      await localDb.updateStoreCustomerSubscription(slug, token, subscription.id, { action, shipping_address_id: shippingAddressId });
      setMessage(action === 'cancel' ? 'Subscription cancelled.' : 'Subscription updated.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update subscription.');
    } finally {
      setBusyId('');
    }
  }

  if (!rows.length && !message) return null;
  return <section className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
    <h3 className="font-bold text-slate-900">Subscriptions</h3>
    <p className="mt-1 text-slate-600">Manage shipment timing and delivery address. Payment changes are handled by the subscription payment provider.</p>
    {message ? <p className="mt-3 rounded-lg bg-slate-100 p-2">{message}</p> : null}
    <div className="mt-3 space-y-3">
      {rows.map((subscription) => <article key={subscription.id} className="rounded-lg border border-slate-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{subscription.plan_name}</p><p className="capitalize">{subscription.cadence} | {subscription.candle_count} candle{subscription.candle_count === 1 ? '' : 's'} | {subscription.status.replace(/_/g, ' ')}</p>{subscription.next_shipment_at ? <p className="mt-1 text-xs">Next shipment: {new Date(subscription.next_shipment_at).toLocaleDateString()}</p> : null}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">{subscription.payment_status}</span></div>
        {subscription.status !== 'cancelled' ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busyId === subscription.id} onClick={() => void update(subscription, 'skip')} className="rounded border px-2 py-1 font-semibold hover:bg-slate-50">Skip next</button>{subscription.status === 'active' ? <button type="button" disabled={busyId === subscription.id} onClick={() => void update(subscription, 'pause')} className="rounded border px-2 py-1 font-semibold hover:bg-slate-50">Pause</button> : <button type="button" disabled={busyId === subscription.id} onClick={() => void update(subscription, 'resume')} className="rounded border px-2 py-1 font-semibold hover:bg-slate-50">Resume</button>}<button type="button" disabled={busyId === subscription.id} onClick={() => { if (window.confirm('Cancel this subscription?')) void update(subscription, 'cancel'); }} className="rounded border border-red-300 px-2 py-1 font-semibold text-red-700 hover:bg-red-50">Cancel</button></div> : null}
        {addresses.length ? <label className="mt-3 block text-xs font-semibold text-slate-700">Delivery address<select value={subscription.shipping_address_id || ''} disabled={busyId === subscription.id || subscription.status === 'cancelled'} onChange={(event) => void update(subscription, 'address', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900">{addresses.map((address) => <option key={address.id} value={address.id}>{address.label || 'Address'}: {address.street_address_1}, {address.city}</option>)}</select></label> : <p className="mt-3 text-xs text-amber-700">Add a shipping address before changing subscription delivery.</p>}
      </article>)}
    </div>
  </section>;
}
