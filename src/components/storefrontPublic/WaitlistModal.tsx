import { useState, type FormEvent } from 'react';
import { localDb, type StorefrontProductSummary } from '../../lib/localDb';

type Props = { product: StorefrontProductSummary; slug: string; onClose: () => void };

export default function WaitlistModal({ product, slug, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      await localDb.createWaitlistEntry(slug, product.id, email);
      setStatus('You are on the waitlist. We will email you when this release is available.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to join the waitlist.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="app-theme fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
    <form onSubmit={(event) => void submit(event)} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-900">Join the waitlist</h2><p className="mt-1 text-sm text-gray-600">Be first to know when <strong>{product.name}</strong> is released.</p></div><button type="button" onClick={onClose} className="text-sm font-semibold text-pink-700">Close</button></div>
      {product.release_date ? <p className="mt-3 rounded-lg bg-pink-50 px-3 py-2 text-sm text-pink-900">Expected release: {product.release_date}</p> : null}
      <label className="mt-4 block text-sm font-semibold text-gray-800">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" placeholder="you@example.com" /></label>
      {status ? <p className="mt-3 text-sm text-gray-700" role="status">{status}</p> : null}
      <button disabled={saving} type="submit" className="mt-5 w-full rounded-lg bg-pink-600 px-4 py-2 font-semibold text-white hover:bg-pink-700 disabled:opacity-60">{saving ? 'Joining...' : 'Join waitlist'}</button>
    </form>
  </div>;
}
