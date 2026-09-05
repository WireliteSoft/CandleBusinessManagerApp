import { type FormEvent, useEffect, useState } from 'react';
import { localDb } from '../../lib/localDb';

type Workshop = { id: string; starts_at: string; capacity: number; deposit_amount: number; booked: number };

export default function WorkshopBookingModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [form, setForm] = useState({ slotId: '', name: '', email: '', partySize: 1 });
  const [message, setMessage] = useState('');

  const load = () => void localDb.getPublicWorkshops(slug).then((items) => { setWorkshops(items); setForm((current) => ({ ...current, slotId: current.slotId || items[0]?.id || '' })); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Unable to load workshops.'));
  useEffect(load, [slug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      await localDb.bookPublicWorkshop(slug, form.slotId, { name: form.name, email: form.email, party_size: form.partySize });
      setMessage('Your workshop seats are reserved. The store will contact you about any listed deposit.');
      load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reserve workshop seats.'); }
  }

  const selected = workshops.find((workshop) => workshop.id === form.slotId);
  return <div className="app-theme fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-4"><form onSubmit={(event) => void submit(event)} className="mx-auto my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Candle-Making Workshop</h2><p className="mt-1 text-sm">Reserve seats for an upcoming candle-making appointment.</p></div><button type="button" onClick={onClose} className="text-pink-700">Close</button></div><div className="mt-4 grid gap-3"><label className="text-sm font-medium">Workshop time<select required value={form.slotId} onChange={(event) => setForm({ ...form, slotId: event.target.value })} className="mt-1 w-full rounded border p-2"><option value="">Choose a workshop</option>{workshops.map((workshop) => <option key={workshop.id} value={workshop.id}>{new Date(workshop.starts_at).toLocaleString()} ({Math.max(0, Number(workshop.capacity) - Number(workshop.booked))} seats left)</option>)}</select></label><input required placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded border p-2" /><input required type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded border p-2" /><label className="text-sm font-medium">Party size<input required type="number" min="1" max="20" value={form.partySize} onChange={(event) => setForm({ ...form, partySize: Number(event.target.value) })} className="mt-1 w-full rounded border p-2" /></label>{selected?.deposit_amount ? <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">Deposit due: ${Number(selected.deposit_amount).toFixed(2)} per booking. Payment is arranged by the store after reservation.</p> : null}{message ? <p className="text-sm">{message}</p> : null}<button disabled={!form.slotId || !!message} className="rounded bg-pink-600 p-3 font-semibold text-white disabled:opacity-60">Reserve workshop seats</button></div></form></div>;
}
