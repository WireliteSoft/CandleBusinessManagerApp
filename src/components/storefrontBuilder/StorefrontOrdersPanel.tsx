import { useEffect, useState } from 'react';
import { PackageCheck, RefreshCw } from 'lucide-react';
import { localDb, type StorefrontOrderRecord } from '../../lib/localDb';

type Props = { readOnly: boolean };

const fulfillmentOptions = [
  ['unfulfilled', 'Unfulfilled'],
  ['in_production', 'In production'],
  ['ready_for_pickup', 'Ready for pickup'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
];
const orderStatusOptions = [
  ['awaiting_payment', 'Awaiting payment'], ['paid', 'Paid'], ['in_production', 'In production'],
  ['ready_for_pickup', 'Ready for pickup'], ['shipped', 'Shipped'], ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'], ['refunded', 'Refunded'],
];

function availableOrderStatuses(order: StorefrontOrderRecord) {
  if (order.status === 'cancelled' || order.status === 'refunded') return [[order.status, order.status[0].toUpperCase() + order.status.slice(1)]];
  if (order.payment_status !== 'paid') return [['awaiting_payment', 'Awaiting payment'], ['cancelled', 'Cancelled']];
  return orderStatusOptions.filter(([value]) => !['awaiting_payment', 'refunded'].includes(value));
}

export default function StorefrontOrdersPanel({ readOnly }: Props) {
  const [orders, setOrders] = useState<StorefrontOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [labelItems, setLabelItems] = useState<Array<{ id: string; product_name: string; customization: Record<string, string> }>>([]);
  const [labelOrderId, setLabelOrderId] = useState('');

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      setOrders(await localDb.getStorefrontOrders());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load storefront orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function updateOrder(order: StorefrontOrderRecord, values: { status?: string; fulfillment_status?: string; tracking_number?: string; staff_note?: string }) {
    setSavingId(order.id);
    setError('');
    try {
      const updated = await localDb.updateStorefrontOrder(order.id, values);
      setOrders((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update order.');
    } finally {
      setSavingId('');
    }
  }

  async function refundOrder(order: StorefrontOrderRecord) {
    if (!window.confirm(`Refund ${order.order_number} for $${Number(order.total_amount).toFixed(2)}? This sends a full refund through the original payment provider and cannot be undone.`)) return;
    setSavingId(order.id);
    setError('');
    try {
      const updated = await localDb.refundStorefrontOrder(order.id);
      setOrders((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      if (updated.refund_pending) setError('The refund was submitted to Square and is pending provider confirmation.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to refund order.');
    } finally {
      setSavingId('');
    }
  }

  async function deleteCancelledOrder(order: StorefrontOrderRecord) {
    if (!window.confirm(`Delete cancelled order ${order.order_number}? This permanently removes its order details.`)) return;
    setSavingId(order.id);
    setError('');
    try {
      await localDb.deleteStorefrontOrder(order.id);
      setOrders((current) => current.filter((item) => item.id !== order.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete cancelled order.');
    } finally {
      setSavingId('');
    }
  }

  async function openLabelReview(order: StorefrontOrderRecord) {
    setSavingId(order.id); setError('');
    try { const detail = await localDb.getStorefrontOrder(order.id); const items = detail.items.map((item) => { try { return { ...item, customization: JSON.parse(item.customization_json || '{}') as Record<string, string> }; } catch { return { ...item, customization: {} }; } }).filter((item) => item.customization.label_approval_status); setLabelItems(items); setLabelOrderId(order.id); if (!items.length) setError('This order has no custom labels to review.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load custom labels.'); } finally { setSavingId(''); }
  }

  async function saveLabel(item: { id: string; customization: Record<string, string> }, status: 'pending_review' | 'approved' | 'changes_requested', notes: string) {
    if (!labelOrderId) return; setSavingId(item.id); setError('');
    try { const result = await localDb.reviewStorefrontOrderLabel(labelOrderId, item.id, { label_approval_status: status, label_production_notes: notes }); setLabelItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, customization: result.customization } : entry)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save label review.'); } finally { setSavingId(''); }
  }

  return (
    <section className="mt-6 bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800"><PackageCheck className="w-5 h-5" /> Store Orders</h3>
          <p className="mt-1 text-sm text-gray-600">Review paid orders and update production, pickup, or shipment progress.</p>
        </div>
        <button type="button" onClick={() => void loadOrders()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      {error ? <p className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {labelItems.length ? <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="flex justify-between gap-3"><div><h4 className="font-semibold text-gray-800">Custom label review</h4><p className="text-xs text-gray-600">Approve the label or request changes before production.</p></div><button type="button" onClick={() => { setLabelItems([]); setLabelOrderId(''); }} className="text-sm font-semibold text-pink-700">Close</button></div>{labelItems.map((item) => <div key={item.id} className="mt-3 rounded border border-amber-200 bg-white p-3"><div className="flex gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{item.product_name}: {item.customization.label || 'Untitled label'}</p>{item.customization.label_logo_data ? <img src={item.customization.label_logo_data} alt="Customer label artwork" className="mt-2 h-16 max-w-28 object-contain" /> : null}<p className="mt-1 text-xs">{item.customization.label_date || ''} {item.customization.label_message || ''}</p></div><select defaultValue={item.customization.label_approval_status || 'pending_review'} onChange={(event) => void saveLabel(item, event.target.value as 'pending_review' | 'approved' | 'changes_requested', item.customization.label_production_notes || '')} disabled={savingId === item.id} className="h-9 rounded border bg-white px-2 text-sm"><option value="pending_review">Pending review</option><option value="approved">Approved</option><option value="changes_requested">Changes requested</option></select></div><textarea defaultValue={item.customization.label_production_notes || ''} onBlur={(event) => void saveLabel(item, (item.customization.label_approval_status || 'pending_review') as 'pending_review' | 'approved' | 'changes_requested', event.target.value)} placeholder="Production notes" className="mt-2 h-16 w-full rounded border p-2 text-xs" /></div>)}</section> : null}
      {loading ? <p className="text-sm text-gray-500">Loading orders...</p> : null}
      {!loading && orders.length === 0 ? <p className="text-sm text-gray-500">No storefront orders yet. Customer orders will appear here after checkout is connected.</p> : null}
      {!loading && orders.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="border-b border-gray-200 text-left text-gray-600"><tr><th className="p-2">Order</th><th className="p-2">Customer</th><th className="p-2">Payment</th><th className="p-2">Order status</th><th className="p-2">Fulfillment</th><th className="p-2">Tracking</th><th className="p-2">Internal note</th><th className="p-2">Action</th><th className="p-2 text-right">Total</th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.id} className="border-b border-gray-100 align-top"><td className="p-2"><p className="font-semibold text-gray-800">{order.order_number}</p><p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p><p className="text-xs text-gray-500">{order.item_count} item{Number(order.item_count) === 1 ? '' : 's'}</p></td><td className="p-2"><p className="font-medium text-gray-800">{order.customer_name}</p><p className="text-xs text-gray-600">{order.customer_email}</p></td><td className="p-2 capitalize text-gray-700">{order.payment_status}</td><td className="p-2"><select disabled={readOnly || savingId === order.id} value={order.status} onChange={(event) => void updateOrder(order, { status: event.target.value })} className="rounded border border-gray-300 px-2 py-1 bg-white text-gray-800">{availableOrderStatuses(order).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="p-2"><select disabled={readOnly || savingId === order.id || order.payment_status !== 'paid'} value={order.fulfillment_status} onChange={(event) => void updateOrder(order, { fulfillment_status: event.target.value })} className="rounded border border-gray-300 px-2 py-1 bg-white text-gray-800">{fulfillmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="p-2"><input disabled={readOnly || savingId === order.id || order.payment_status !== 'paid'} defaultValue={order.tracking_number || ''} placeholder="Tracking #" onBlur={(event) => { if (event.target.value !== (order.tracking_number || '')) void updateOrder(order, { tracking_number: event.target.value }); }} className="w-40 rounded border border-gray-300 px-2 py-1" /></td><td className="p-2"><textarea disabled={readOnly || savingId === order.id} defaultValue={order.staff_note || ''} placeholder="Visible to staff only" onBlur={(event) => { if (event.target.value !== (order.staff_note || '')) void updateOrder(order, { staff_note: event.target.value }); }} className="h-16 w-48 rounded border border-gray-300 px-2 py-1 text-xs" /></td><td className="p-2 space-y-2"><button type="button" disabled={readOnly || savingId === order.id} onClick={() => void openLabelReview(order)} className="block rounded border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-40">Labels</button><button type="button" disabled={readOnly || savingId === order.id || order.payment_status !== 'paid'} onClick={() => void refundOrder(order)} className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Refund</button>{order.status === 'cancelled' ? <button type="button" disabled={readOnly || savingId === order.id} onClick={() => void deleteCancelledOrder(order)} className="block rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Delete</button> : null}</td><td className="p-2 text-right font-semibold text-gray-800">${Number(order.total_amount).toFixed(2)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
