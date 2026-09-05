import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { localDb, type StorefrontProductSummary } from '../../lib/localDb';

type Props = { product: StorefrontProductSummary; slug: string; onClose: () => void };

export default function BackInStockAlertModal({ product, slug, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setStatus('');
    try { await localDb.createBackInStockAlert(slug, product.id, email); setStatus('You will be notified when this item returns.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save your alert.'); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Back in stock alert"><form onSubmit={(event) => void submit(event)} className="app-theme mx-auto my-24 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-pink-100 p-2 text-pink-700"><Bell size={20} /></div><div><h2 className="font-bold text-gray-900">Back in stock alert</h2><p className="text-sm text-gray-500">{product.name}</p></div></div><button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X size={20} /></button></div><p className="mt-5 text-sm text-gray-700">Enter your email and we will send one notification when this product is replenished.</p><label className="mt-4 block text-sm font-semibold text-gray-700">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal" /></label>{status ? <p className="mt-3 rounded-lg bg-pink-50 px-3 py-2 text-sm text-pink-800">{status}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Close</button><button disabled={saving} type="submit" className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Notify me'}</button></div></form></div>;
}
