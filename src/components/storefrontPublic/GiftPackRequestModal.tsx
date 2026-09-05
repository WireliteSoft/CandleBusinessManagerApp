import { useState, type FormEvent } from "react";
import { localDb } from "../../lib/localDb";
import type { GiftPackOilSelection } from "./FragranceOilCatalogModal";

export default function GiftPackRequestModal({
  slug,
  items,
  packSize,
  onClose,
}: {
  slug: string;
  items: GiftPackOilSelection[];
  packSize: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    recipient_name: "",
    gift_message: "",
  });
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setStatus("");
    try {
      await localDb.submitGiftPackRequest(slug, { ...form, pack_size: packSize, items });
      setStatus("Your gift pack request was sent. We will contact you with the final details.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send your gift pack request.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-theme fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={(event) => void submit(event)} className="store-customer-modal mx-auto my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create a gift pack</h2>
            <p className="mt-1 text-sm text-gray-600">Your {packSize}-candle gift pack is made to order. Tell us who it is for and add an optional gift message.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-pink-700">Close</button>
        </div>
        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-semibold text-gray-900">Selected candle choices</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {items.map((item) => <li key={`${item.name}-${item.size}-${item.wickCount}-${item.wickType}`}>{item.name}: {item.size}, {item.wickCount}, {item.wickType}</li>)}
          </ul>
        </div>
        <div className="mt-5 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" className="rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <input value={form.recipient_name} onChange={(event) => setForm((current) => ({ ...current, recipient_name: event.target.value }))} placeholder="Gift recipient name (optional)" className="rounded-lg border border-gray-300 px-3 py-2" />
          <textarea value={form.gift_message} onChange={(event) => setForm((current) => ({ ...current, gift_message: event.target.value }))} placeholder="Gift message (optional)" rows={4} className="rounded-lg border border-gray-300 px-3 py-2" />
          {status ? <p className="text-sm text-gray-700">{status}</p> : null}
          <button disabled={sending || Boolean(status)} className="rounded-lg bg-pink-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{sending ? "Sending..." : "Send gift pack request"}</button>
        </div>
      </form>
    </div>
  );
}
