import { useEffect, useState } from 'react';
import { localDb } from '../../lib/localDb';

type Candidate = { id: string; source_type: 'collection' | 'custom_order'; title: string; details: string; image_data: string };
type GalleryItem = { id: string; source_type: string; source_id: string; title: string; image_data: string; details: string; status: 'pending' | 'approved' | 'rejected'; created_at: string };

export default function CustomerGalleryPanel({ slug, token }: { slug: string; token: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [title, setTitle] = useState('');
  const [imageData, setImageData] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => { try { const result = await localDb.getStoreCustomerGallery(slug, token); setCandidates([...result.collections, ...result.custom_orders]); setItems(result.gallery); } catch { setMessage('Unable to load gallery options.'); } };
  useEffect(() => { void (async () => { try { const result = await localDb.getStoreCustomerGallery(slug, token); setCandidates([...result.collections, ...result.custom_orders]); setItems(result.gallery); } catch { setMessage('Unable to load gallery options.'); } })(); }, [slug, token]);
  const submitted = new Set(items.map((item) => `${item.source_type}:${item.source_id}`));
  async function submit() {
    if (!selected) return;
    try { await localDb.submitStoreCustomerGallery(slug, token, { source_type: selected.source_type, source_id: selected.id, title: title || selected.title, image_data: imageData || undefined }); setMessage('Submitted for staff approval.'); setSelected(null); setTitle(''); setImageData(''); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to submit gallery item.'); }
  }
  return <section><h3 className="mb-3 font-bold text-slate-900">Candle gallery</h3><p className="mb-3 text-sm text-slate-600">Share a saved collection or a purchased custom candle. Gallery posts are public only after staff approval.</p>{candidates.filter((item) => !submitted.has(`${item.source_type}:${item.id}`)).length ? <div className="grid gap-3 sm:grid-cols-2">{candidates.filter((item) => !submitted.has(`${item.source_type}:${item.id}`)).map((item) => <div key={`${item.source_type}-${item.id}`} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">{item.image_data ? <img src={item.image_data} alt="" className="mb-2 h-24 w-full rounded object-cover" /> : null}<p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs">{item.source_type === 'collection' ? 'Saved collection' : 'Purchased custom candle'}{item.details ? ` | ${item.details}` : ''}</p><button type="button" onClick={() => { setSelected(item); setTitle(item.title); setImageData(item.image_data); }} className="mt-3 text-xs font-semibold text-pink-700 hover:underline">Submit to gallery</button></div>)}</div> : <p className="text-sm text-slate-500">Your saved collections and paid custom candles will be available here to submit.</p>}{selected ? <div className="mt-4 grid gap-3 rounded-xl border border-pink-200 bg-pink-50 p-4"><p className="font-semibold text-slate-900">Submit {selected.title}</p><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Gallery title" className="rounded-lg border border-slate-300 px-3 py-2" /><input value={imageData} onChange={(event) => setImageData(event.target.value)} placeholder="Optional image URL or data URL" className="rounded-lg border border-slate-300 px-3 py-2" /><div className="flex gap-3"><button type="button" onClick={() => void submit()} className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white">Submit for approval</button><button type="button" onClick={() => setSelected(null)} className="text-sm font-semibold text-slate-700">Cancel</button></div></div> : null}{items.length ? <div className="mt-4 space-y-2">{items.map((item) => <p key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><strong>{item.title}</strong> - {item.status}</p>)}</div> : null}{message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}</section>;
}
