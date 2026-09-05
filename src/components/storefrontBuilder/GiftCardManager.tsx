import { useEffect, useState, type FormEvent } from 'react';
import { localDb } from '../../lib/localDb';

type GiftCard = { id: string; code: string; customer_name?: string; customer_email?: string; initial_balance: number; balance: number; active: boolean; created_at: string };
type Credit = { id: string; customer_name: string; customer_email: string; credit_type: string; label: string; balance: number; active: boolean };
type Usage = { id: string; gift_card_id: string; gift_card_code: string; amount: number; balance_after: number; usage_type: string; note: string; created_at: string };

export default function GiftCardManager({ readOnly }: { readOnly: boolean }) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState({ customer_email: '', amount: '25', code: '', note: '' });
  const [credit, setCredit] = useState({ customer_email: '', amount: '10', credit_type: 'giveaway_balance' as 'free_gift' | 'giveaway_balance', label: '' });

  async function load() {
    setLoading(true);
    try { const result = await localDb.getStorefrontGiftCards(); setCards(result.cards); setCredits(result.credits); setUsages(result.usages); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load gift cards.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submitIssue(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try { await localDb.issueStorefrontGiftCard({ customer_email: issue.customer_email, amount: Number(issue.amount), code: issue.code || undefined, note: issue.note || undefined }); setIssue({ customer_email: '', amount: '25', code: '', note: '' }); setMessage('Gift card issued and the customer was notified.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to issue gift card.'); }
  }
  async function adjust(card: GiftCard) {
    const amount = Number(window.prompt(`Funds to add to ${card.code}. Enter a positive dollar amount.`, '0'));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const note = window.prompt('Reason for adding funds:', 'Staff added funds') || '';
    if (note.trim().length < 2) return;
    try { await localDb.adjustStorefrontGiftCard(card.id, { amount, note }); setMessage('Gift card updated and the customer was notified.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update gift card.'); }
  }
  async function submitCredit(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try { await localDb.addStorefrontCustomerCredit({ ...credit, amount: Number(credit.amount) }); setCredit({ customer_email: '', amount: '10', credit_type: 'giveaway_balance', label: '' }); setMessage('Account credit added and the customer was notified.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to add account credit.'); }
  }

  return <section className="rounded-xl border border-gray-300 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Gift cards and customer credits</h2><p className="text-sm text-gray-600">Issue stored-value cards, adjust balances, and record free gifts or giveaway balances.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border px-3 py-2 text-sm font-semibold">Refresh</button></div>{message ? <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm">{message}</p> : null}
    {!readOnly ? <div className="mt-5 grid gap-4 lg:grid-cols-2"><form onSubmit={submitIssue} className="grid gap-3 rounded-xl border p-4"><h3 className="font-bold">Issue gift card</h3><input required type="email" placeholder="Customer account email" value={issue.customer_email} onChange={(e) => setIssue({ ...issue, customer_email: e.target.value })} className="rounded border p-2" /><input required min="5" max="5000" step="0.01" type="number" placeholder="Balance" value={issue.amount} onChange={(e) => setIssue({ ...issue, amount: e.target.value })} className="rounded border p-2" /><input placeholder="Optional custom code" value={issue.code} onChange={(e) => setIssue({ ...issue, code: e.target.value })} className="rounded border p-2" /><input placeholder="Optional note" value={issue.note} onChange={(e) => setIssue({ ...issue, note: e.target.value })} className="rounded border p-2" /><button className="rounded bg-pink-600 p-2 font-semibold text-white">Issue and notify</button></form><form onSubmit={submitCredit} className="grid gap-3 rounded-xl border p-4"><h3 className="font-bold">Free gift or giveaway balance</h3><input required type="email" placeholder="Customer account email" value={credit.customer_email} onChange={(e) => setCredit({ ...credit, customer_email: e.target.value })} className="rounded border p-2" /><input required min="0.01" step="0.01" type="number" placeholder="Amount" value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} className="rounded border p-2" /><select value={credit.credit_type} onChange={(e) => setCredit({ ...credit, credit_type: e.target.value as 'free_gift' | 'giveaway_balance' })} className="rounded border p-2"><option value="giveaway_balance">Giveaway balance</option><option value="free_gift">Free gift</option></select><input required placeholder="Label, e.g. Fall giveaway" value={credit.label} onChange={(e) => setCredit({ ...credit, label: e.target.value })} className="rounded border p-2" /><button className="rounded bg-pink-600 p-2 font-semibold text-white">Add and notify</button></form></div> : null}
    <div className="mt-6 overflow-x-auto"><h3 className="mb-2 font-bold">Gift card accounts</h3><p className="mb-2 text-sm text-gray-600">Staff can add funds only. Balances are deducted securely by storefront checkout when a customer redeems a card.</p><table className="min-w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Code</th><th className="p-2">Customer</th><th className="p-2">Balance</th><th className="p-2">Status</th><th className="p-2"></th></tr></thead><tbody>{cards.map((card) => <tr key={card.id} className="border-b"><td className="p-2 font-mono">{card.code}</td><td className="p-2">{card.customer_name || 'Unassigned'}<br /><span className="text-xs text-gray-500">{card.customer_email}</span></td><td className="p-2">${Number(card.balance).toFixed(2)}</td><td className="p-2">{card.active ? 'Active' : 'Inactive'}</td><td className="p-2">{!readOnly ? <button type="button" onClick={() => void adjust(card)} className="text-pink-700 underline">Add funds</button> : null}</td></tr>)}{!cards.length && !loading ? <tr><td className="p-3 text-gray-500" colSpan={5}>No gift cards issued yet.</td></tr> : null}</tbody></table></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2"><div><h3 className="mb-2 font-bold">Free gifts and giveaway balances</h3>{credits.length ? credits.map((item) => <div key={item.id} className="border-b p-2 text-sm"><strong>{item.customer_name}</strong>: ${Number(item.balance).toFixed(2)} {item.credit_type.replace('_', ' ')} - {item.label}</div>) : <p className="text-sm text-gray-500">No customer credits yet.</p>}</div><div><h3 className="mb-2 font-bold">Recent card activity</h3>{usages.length ? usages.slice(0, 12).map((item) => <div key={item.id} className="border-b p-2 text-sm"><strong>{item.gift_card_code}</strong>: {Number(item.amount) >= 0 ? '+' : '-'}${Math.abs(Number(item.amount)).toFixed(2)} - {item.note}</div>) : <p className="text-sm text-gray-500">No gift card activity yet.</p>}</div></div>
  </section>;
}
