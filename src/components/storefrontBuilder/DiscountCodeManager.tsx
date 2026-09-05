import { useEffect, useState, type FormEvent } from 'react';
import { localDb } from '../../lib/localDb';

type DiscountCode = {
  id: string; code: string; discount_type: 'percent' | 'fixed'; discount_value: number; minimum_subtotal: number;
  starts_at: string | null; expires_at: string | null; usage_limit: number; usage_count: number; per_customer_limit: number;
  stack_with_mix: boolean; stack_with_gift_card: boolean; active: boolean; created_at: string;
};
type Redemption = { id: string; code: string; order_number: string; customer_email: string; amount: number; created_at: string };

const emptyForm = {
  code: '', discount_type: 'percent' as 'percent' | 'fixed', discount_value: '10', minimum_subtotal: '0', starts_at: '', expires_at: '',
  usage_limit: '0', per_customer_limit: '1', stack_with_mix: true, stack_with_gift_card: true, active: true,
};
const toIso = (value: string) => value ? new Date(value).toISOString() : null;

export default function DiscountCodeManager({ readOnly }: { readOnly: boolean }) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const result = await localDb.getStorefrontDiscountCodes(); setCodes(result.codes); setRedemptions(result.redemptions); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load discount codes.'); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      await localDb.createStorefrontDiscountCode({
        code: form.code, discount_type: form.discount_type, discount_value: Number(form.discount_value), minimum_subtotal: Number(form.minimum_subtotal),
        starts_at: toIso(form.starts_at), expires_at: toIso(form.expires_at), usage_limit: Number(form.usage_limit), per_customer_limit: Number(form.per_customer_limit),
        stack_with_mix: form.stack_with_mix, stack_with_gift_card: form.stack_with_gift_card, active: form.active,
      });
      setForm(emptyForm); setMessage('Discount code created.'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create discount code.'); }
    finally { setSaving(false); }
  }
  async function toggle(code: DiscountCode) {
    try { await localDb.updateStorefrontDiscountCode(code.id, { active: !code.active }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update discount code.'); }
  }

  return <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
    <h3 className="text-lg font-semibold text-gray-800">Discount codes</h3>
    <p className="mt-1 text-sm text-gray-600">Create percentage or fixed discounts. Codes are verified at checkout and only redeemed after successful payment.</p>
    {!readOnly ? <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <input required placeholder="Code, e.g. FALL10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded border border-gray-300 bg-white p-2" />
      <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })} className="rounded border border-gray-300 bg-white p-2"><option value="percent">Percent off</option><option value="fixed">Fixed amount off</option></select>
      <input required type="number" min="0.01" max={form.discount_type === 'percent' ? 100 : undefined} step="0.01" placeholder="Discount value" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="rounded border border-gray-300 bg-white p-2" />
      <input required type="number" min="0" step="0.01" placeholder="Minimum eligible subtotal" value={form.minimum_subtotal} onChange={(e) => setForm({ ...form, minimum_subtotal: e.target.value })} className="rounded border border-gray-300 bg-white p-2" />
      <label className="text-sm text-gray-700">Starts (optional)<input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="mt-1 w-full rounded border border-gray-300 bg-white p-2" /></label>
      <label className="text-sm text-gray-700">Expires (optional)<input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="mt-1 w-full rounded border border-gray-300 bg-white p-2" /></label>
      <input required type="number" min="0" step="1" placeholder="Total uses (0 = unlimited)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="rounded border border-gray-300 bg-white p-2" />
      <input required type="number" min="0" step="1" placeholder="Uses per customer (0 = unlimited)" value={form.per_customer_limit} onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })} className="rounded border border-gray-300 bg-white p-2" />
      <div className="space-y-2 text-sm text-gray-700"><label className="flex gap-2"><input type="checkbox" checked={form.stack_with_mix} onChange={(e) => setForm({ ...form, stack_with_mix: e.target.checked })} /> Stack with mix-and-match</label><label className="flex gap-2"><input type="checkbox" checked={form.stack_with_gift_card} onChange={(e) => setForm({ ...form, stack_with_gift_card: e.target.checked })} /> Stack with gift-card discount</label><label className="flex gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activate immediately</label></div>
      <button disabled={saving} className="rounded bg-pink-600 p-2 font-semibold text-white disabled:opacity-60 sm:col-span-2 lg:col-span-3">{saving ? 'Creating...' : 'Create discount code'}</button>
    </form> : null}
    {message ? <p className="mt-3 text-sm text-gray-700">{message}</p> : null}
    <div className="mt-5 overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="border-b text-gray-600"><tr><th className="p-2">Code</th><th className="p-2">Discount</th><th className="p-2">Rules</th><th className="p-2">Uses</th><th className="p-2">Schedule</th><th className="p-2">Status</th></tr></thead><tbody>{codes.map((code) => <tr key={code.id} className="border-b border-gray-100"><td className="p-2 font-semibold text-gray-800">{code.code}</td><td className="p-2">{code.discount_type === 'percent' ? `${Number(code.discount_value)}%` : `$${Number(code.discount_value).toFixed(2)}`}<p className="text-xs text-gray-500">Min ${Number(code.minimum_subtotal).toFixed(2)}</p></td><td className="p-2 text-xs">{code.stack_with_mix ? 'Stacks with mix' : 'Best of mix/code'}<br />{code.stack_with_gift_card ? 'Stacks with gift card' : 'No gift-card stacking'}</td><td className="p-2">{code.usage_count}{Number(code.usage_limit) > 0 ? ` / ${code.usage_limit}` : ' / unlimited'}<p className="text-xs text-gray-500">{Number(code.per_customer_limit) || 'Unlimited'} per customer</p></td><td className="p-2 text-xs">{code.starts_at ? `Starts ${new Date(code.starts_at).toLocaleDateString()}` : 'Starts now'}<br />{code.expires_at ? `Ends ${new Date(code.expires_at).toLocaleDateString()}` : 'No expiration'}</td><td className="p-2">{!readOnly ? <button type="button" onClick={() => void toggle(code)} className={`rounded px-2 py-1 text-xs font-semibold ${code.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>{code.active ? 'Active - deactivate' : 'Inactive - activate'}</button> : <span>{code.active ? 'Active' : 'Inactive'}</span>}</td></tr>)}</tbody></table>{!codes.length ? <p className="p-3 text-sm text-gray-500">No discount codes created yet.</p> : null}</div>
    <div className="mt-5"><h4 className="font-semibold text-gray-800">Recent redemptions</h4>{redemptions.length ? <div className="mt-2 max-h-48 overflow-y-auto text-sm">{redemptions.map((redemption) => <p key={redemption.id} className="border-b py-2 text-gray-700"><strong>{redemption.code}</strong> saved ${Number(redemption.amount).toFixed(2)} on {redemption.order_number} for {redemption.customer_email}.</p>)}</div> : <p className="mt-2 text-sm text-gray-500">Paid redemptions will appear here.</p>}</div>
  </section>;
}
