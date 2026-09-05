import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { localDb, type StoreCustomerAddress } from "../../lib/localDb";
import type { CartDetail } from "./helpers";

type Props = {
  slug: string;
  token: string;
  cart: CartDetail;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
  giftCardTermsAccepted: boolean;
  giftCardDeliveryMethod: 'digital' | 'physical';
};
type Config = {
  currency: string;
  square_enabled: boolean;
  square_application_id: string;
  square_location_id: string;
  paypal_enabled: boolean;
  paypal_client_id: string;
};
type SquareWallet = {
  tokenize: () => Promise<{ status: string; token?: string }>;
  attach?: (target: HTMLElement) => Promise<void>;
};
type SquareWalletPayments = {
  paymentRequest: (request: Record<string, unknown>) => unknown;
  applePay: (request: unknown) => Promise<SquareWallet>;
  googlePay: (request: unknown) => Promise<SquareWallet>;
};

function loadScript(key: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const old = document.querySelector<HTMLScriptElement>(
      `script[data-checkout-sdk="${key}"]`,
    );
    if (old) {
      if (old.dataset.loaded === "true") {
        resolve();
        return;
      }
      old.addEventListener("load", () => resolve(), { once: true });
      old.addEventListener(
        "error",
        () => reject(new Error("Unable to load payment provider.")),
        { once: true },
      );
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.checkoutSdk = key;
    s.onload = () => {
      s.dataset.loaded = "true";
      resolve();
    };
    s.onerror = () => reject(new Error("Unable to load payment provider."));
    document.head.appendChild(s);
  });
}

export default function StoreCheckoutModal({
  slug,
  token,
  cart,
  open,
  onClose,
  onPaid,
  giftCardTermsAccepted,
  giftCardDeliveryMethod,
}: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [addresses, setAddresses] = useState<StoreCustomerAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'pickup'>('shipping');
  const [pickupSlotAt, setPickupSlotAt] = useState('');
  const [pickupSlots, setPickupSlots] = useState<Array<{ starts_at: string; capacity: number; reserved: number }>>([]);
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [order, setOrder] = useState<{
    id: string;
    total_amount: number;
    currency: string;
    order_number: string;
    discount_code?: string;
    discount_code_amount?: number;
  } | null>(null);
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [credits, setCredits] = useState<Array<{ id: string; credit_type: string; label: string; balance: number; active: boolean }>>([]);
  const [creditId, setCreditId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [applePay, setApplePay] = useState<SquareWallet | null>(null);
  const [googlePay, setGooglePay] = useState<SquareWallet | null>(null);
  const cardEl = useRef<HTMLDivElement>(null);
  const paypalEl = useRef<HTMLDivElement>(null);
  const googleEl = useRef<HTMLDivElement>(null);
  const card = useRef<{
    attach: (target: HTMLElement) => Promise<void>;
    tokenize: () => Promise<{ status: string; token?: string }>;
  } | null>(null);
  useEffect(() => {
    if (!open) return;
    void Promise.all([
      localDb.getStoreCheckoutConfig(slug),
      localDb.getStoreCustomerMe(slug, token),
      localDb.getStoreCustomerRewards(slug, token),
      localDb.getPublicPickup(slug),
    ])
      .then(([c, me, rewards, pickup]) => {
        setConfig(c);
        setAddresses(me.addresses);
        setAddressId(
          me.addresses.find((a) => a.is_default)?.id ||
            me.addresses[0]?.id ||
            "",
        );
        setCredits(rewards.credits.filter((credit) => credit.active && Number(credit.balance) > 0));
        setPickupSlots(pickup.active ? pickup.slots : []);
        setPickupInstructions(pickup.instructions || 'Select an available pickup time.');
      })
      .catch((e) => setError(e.message));
  }, [open, slug, token]);
  useEffect(() => {
    if (
      !order ||
      method !== "card" ||
      !config?.square_enabled ||
      !cardEl.current
    )
      return;
    void (async () => {
      try {
        await loadScript("square", "https://web.squarecdn.com/v1/square.js");
        const payments = await window.Square!.payments(
          config.square_application_id,
          config.square_location_id,
        );
        card.current = await payments.card();
        await card.current.attach(cardEl.current!);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Square form failed.");
      }
    })();
  }, [order, method, config]);
  useEffect(() => {
    setApplePay(null);
    setGooglePay(null);
    if (googleEl.current) googleEl.current.innerHTML = "";
    if (!order || !config?.square_enabled) return;
    void (async () => {
      try {
        await loadScript("square", "https://web.squarecdn.com/v1/square.js");
        const payments = (await window.Square!.payments(
          config.square_application_id,
          config.square_location_id,
        )) as unknown as SquareWalletPayments;
        const request = payments.paymentRequest({
          countryCode: "US",
          currencyCode: config.currency,
          total: {
            amount: Number(order.total_amount).toFixed(2),
            label: "Total",
          },
        });
        try {
          setApplePay(await payments.applePay(request));
        } catch {
          setApplePay(null);
        }
        try {
          const google = await payments.googlePay(request);
          if (googleEl.current && google.attach) {
            googleEl.current.innerHTML = "";
            await google.attach(googleEl.current);
          }
          setGooglePay(google);
        } catch {
          setGooglePay(null);
        }
      } catch {
        /* Card checkout remains available. */
      }
    })();
  }, [order, config]);
  useEffect(() => {
    if (
      !order ||
      method !== "paypal" ||
      !config?.paypal_enabled ||
      !paypalEl.current
    )
      return;
    void (async () => {
      try {
        await loadScript(
          "paypal",
          `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypal_client_id)}&currency=${config.currency}&intent=capture`,
        );
        const buttons = window.paypal!.Buttons({
          createOrder: async () =>
            (await localDb.createStorePayPalOrder(slug, token, order.id))
              .order_id,
          onApprove: async (data) => {
            await localDb.captureStorePayPalOrder(slug, token, data.orderID);
            onPaid();
          },
          onCancel: () => setError("PayPal checkout cancelled."),
          onError: () => setError("PayPal checkout failed."),
        });
        await buttons.render(paypalEl.current!);
      } catch (e) {
        setError(e instanceof Error ? e.message : "PayPal failed.");
      }
    })();
  }, [order, method, config, slug, token, onPaid]);
  async function createOrder() {
    setBusy(true);
    setError("");
    try {
      const result = await localDb.createStoreOrder(slug, token, {
        items: cart.items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          customization: item.customization,
        })),
        shipping_address_id: deliveryMethod === 'shipping' ? addressId || undefined : undefined,
        delivery_method: deliveryMethod,
        pickup_slot_at: deliveryMethod === 'pickup' ? pickupSlotAt || undefined : undefined,
        gift_card_code: giftCardCode.trim() || undefined,
        discount_code: discountCode.trim() || undefined,
        gift_card_terms_accepted: giftCardTermsAccepted,
        customer_credit_id: creditId || undefined,
        gift_card_delivery_method: giftCardDeliveryMethod,
      });
      setOrder(result.order);
      if (!result.payment_required) onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create order.");
    } finally {
      setBusy(false);
    }
  }
  async function payCard() {
    if (!card.current || !order) return;
    setBusy(true);
    try {
      const result = await card.current.tokenize();
      if (result.status !== "OK" || !result.token)
        throw new Error("Card details could not be verified.");
      await localDb.payStoreOrderWithSquare(
        slug,
        token,
        order.id,
        result.token,
      );
      onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Card payment failed.");
    } finally {
      setBusy(false);
    }
  }
  async function payWallet(wallet: SquareWallet | null) {
    if (!order || !wallet) return;
    setBusy(true);
    try {
      const result = await wallet.tokenize();
      if (result.status !== "OK" || !result.token)
        throw new Error("Wallet payment could not be verified.");
      await localDb.payStoreOrderWithSquare(
        slug,
        token,
        order.id,
        result.token,
      );
      onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet payment failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 p-4 overflow-y-auto">
      <div className="app-theme mx-auto mt-8 max-w-lg rounded-xl bg-white border border-gray-200 p-5 shadow-2xl">
        <div className="flex justify-between">
          <h2 className="text-xl font-bold text-gray-800">Checkout</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {!order ? (
          <>
            <p className="mt-3 text-gray-600">
              Total: ${cart.total.toFixed(2)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDeliveryMethod('shipping')} className={`rounded border p-2 text-sm ${deliveryMethod === 'shipping' ? 'border-pink-600 bg-pink-50 text-pink-800' : 'border-gray-300'}`}>Ship to address</button><button type="button" onClick={() => setDeliveryMethod('pickup')} className={`rounded border p-2 text-sm ${deliveryMethod === 'pickup' ? 'border-pink-600 bg-pink-50 text-pink-800' : 'border-gray-300'}`}>Local pickup</button></div>
            {deliveryMethod === 'pickup' ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900"><p>{pickupInstructions}</p><select value={pickupSlotAt} onChange={(e) => setPickupSlotAt(e.target.value)} className="mt-2 w-full rounded border border-emerald-300 bg-white p-2 text-gray-900"><option value="">Select pickup time</option>{pickupSlots.map((slot) => <option key={slot.starts_at} value={slot.starts_at}>{new Date(slot.starts_at).toLocaleString()} ({Number(slot.capacity) - Number(slot.reserved)} left)</option>)}</select></div> : <select
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              className="mt-4 w-full rounded border border-gray-300 p-2"
            >
              <option value="">No shipping address selected</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label || a.street_address_1}
                </option>
              ))}
            </select>}
            {giftCardDeliveryMethod === 'physical' ? <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">A saved shipping address is required to mail this physical gift card. Staff will fulfill the shipment after payment.</p> : null}
            <label className="mt-4 block text-sm font-medium text-gray-700">Gift card code<input value={giftCardCode} onChange={(event) => setGiftCardCode(event.target.value.toUpperCase())} placeholder="CM-GIFT-..." className="mt-1 w-full rounded border border-gray-300 p-2" /></label>
            <label className="mt-4 block text-sm font-medium text-gray-700">Discount code<input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} placeholder="Enter code" className="mt-1 w-full rounded border border-gray-300 p-2" /></label>
            {credits.length ? <label className="mt-4 block text-sm font-medium text-gray-700">Apply account credit<select value={creditId} onChange={(event) => setCreditId(event.target.value)} className="mt-1 w-full rounded border border-gray-300 p-2"><option value="">Do not use an account credit</option>{credits.map((credit) => <option key={credit.id} value={credit.id}>{credit.credit_type === 'free_gift' ? 'Free gift' : 'Giveaway balance'}: {credit.label} (${Number(credit.balance).toFixed(2)})</option>)}</select></label> : null}
            <button
              disabled={busy || !cart.items.length}
              onClick={() => void createOrder()}
              className="mt-4 w-full rounded bg-pink-600 p-3 text-white"
            >
              {busy ? "Creating order..." : "Continue to payment"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-gray-600">
              Order {order.order_number} - $
              {Number(order.total_amount).toFixed(2)}
            </p>
            {order.discount_code_amount ? <p className="mt-1 text-sm text-emerald-700">{order.discount_code} discount applied: -${Number(order.discount_code_amount).toFixed(2)}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMethod("card")}
                className="rounded border p-2"
              >
                Card
              </button>
              <button
                onClick={() => setMethod("paypal")}
                className="rounded border p-2"
              >
                PayPal
              </button>
            </div>
            {method === "card" ? (
              <>
                <div ref={cardEl} className="mt-4 min-h-[80px]" />
                <button
                  disabled={busy}
                  onClick={() => void payCard()}
                  className="mt-4 w-full rounded bg-pink-600 p-3 text-white"
                >
                  Pay ${Number(order.total_amount).toFixed(2)}
                </button>
                {applePay ? (
                  <button
                    disabled={busy}
                    onClick={() => void payWallet(applePay)}
                    className="mt-3 w-full rounded bg-black p-3 text-white"
                  >
                    Apple Pay
                  </button>
                ) : null}
                <div
                  ref={googleEl}
                  onClick={() => void payWallet(googlePay)}
                  className="mt-3"
                />
              </>
            ) : (
              <div ref={paypalEl} className="mt-4" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
