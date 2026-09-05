import { useEffect, useMemo, useRef, useState } from 'react';
import { localDb } from '../lib/localDb';
import type { BillingPaymentOptions, BillingTierQuote } from '../lib/localDbTypes';

type Tier = 'free' | 'standard' | 'pro' | 'elite';
type PaymentMethod = 'free' | 'card' | 'apple_pay' | 'google_pay' | 'paypal';
type BillingTermsAcceptance = {
  billing_terms_version: string;
  billing_terms_accepted_at: string;
};

type Props = {
  currentTier: Tier;
  pricingByTier:
    | Record<
        Tier,
        {
          monthly: number;
          yearly: number;
          yearly_savings: number;
        }
      >
    | null;
  currency: string;
  paymentOptions: BillingPaymentOptions;
  tierQuotes: Record<'monthly' | 'yearly', Record<Tier, BillingTierQuote>> | null;
  onSelectTier: (
    tier: Tier,
    billingCycle: 'monthly' | 'yearly',
    paymentMethod: PaymentMethod,
    sourceId?: string,
    billingTerms?: BillingTermsAcceptance
  ) => Promise<void> | void;
  onClose?: () => void;
};

const BILLING_TERMS_VERSION = '2026-08-13-billing-enforcement-v1';

const TIERS: Array<{
  id: Tier;
  title: string;
  includes: string[];
  pros: string[];
  cons: string[];
  bestFor: string;
}> = [
  {
    id: 'free',
    title: 'Free',
    includes: ['Products', 'Supplies', 'Manual inventory tracking'],
    pros: [
      'Lowest barrier to get started.',
      'Enough for basic product and supply tracking.',
      'Good fit if you are still validating your candle workflow.',
    ],
    cons: [
      'No recipes or calculators.',
      'No batch logs.',
      'No teams or storefront tools.',
    ],
    bestFor: 'Solo makers who only need simple inventory and supply tracking.',
  },
  {
    id: 'standard',
    title: 'Standard',
    includes: ['Everything in Free', 'Recipes', 'Wax calculator', 'Wick calculator', 'Hot throw tips'],
    pros: [
      'Adds planning tools without forcing a full production workflow.',
      'Makes repeat formulas easier to save and reuse.',
      'Useful for testing costs, fills, and blends before production.',
    ],
    cons: [
      'Still no batch production log.',
      'No production history tracking.',
      'No teams or storefront.',
    ],
    bestFor: 'Makers who are refining products and want repeatable formulas and calculator support.',
  },
  {
    id: 'pro',
    title: 'Pro',
    includes: ['Everything in Standard', 'Batch Log', 'Create products from saved batches', 'Production costing history'],
    pros: [
      'Adds real production workflow support.',
      'Makes batch history traceable.',
      'Lets products be created from batch records with saved pricing.',
    ],
    cons: ['No team tools.', 'No storefront builder.'],
    bestFor:
      'Small production businesses that need production logs, saved costing history, and cleaner batch workflow.',
  },
  {
    id: 'elite',
    title: 'Elite',
    includes: ['Everything in Pro', 'Teams', 'Storefront'],
    pros: [
      'Unlocks the full business workflow.',
      'Supports staff, access control, and customer-facing storefront setup.',
      'Adds business admin and storefront tools on top of the production workflow.',
    ],
    cons: ['Highest monthly cost.', 'May be more than a solo maker needs early on.'],
    bestFor: 'Established candle businesses that need staff access, branding, and sales tools.',
  },
];

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  label: string;
  description: string;
}> = [
  { id: 'card', label: 'Credit / Debit Card', description: 'Secure card entry powered by Square.' },
  { id: 'apple_pay', label: 'Apple Pay', description: 'Available through Square wallet support.' },
  { id: 'google_pay', label: 'Google Pay', description: 'Available through Square wallet support.' },
  { id: 'paypal', label: 'PayPal', description: 'PayPal checkout redirect.' },
];

const DEFAULT_PRICING_BY_TIER: Record<
  Tier,
  {
    monthly: number;
    yearly: number;
    yearly_savings: number;
  }
> = {
  free: { monthly: 0, yearly: 0, yearly_savings: 0 },
  standard: { monthly: 5.99, yearly: 57.5, yearly_savings: 14.38 },
  pro: { monthly: 7.99, yearly: 76.7, yearly_savings: 19.18 },
  elite: { monthly: 14.99, yearly: 143.9, yearly_savings: 35.98 },
};

declare global {
  interface Window {
    Square?: {
      payments: (
        applicationId: string,
        locationId: string
      ) => Promise<{
        card: () => Promise<{
          attach: (selector: string | HTMLElement) => Promise<void>;
          tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message?: string }> }>;
          destroy?: () => Promise<void>;
        }>;
      }>;
    };
    paypal?: {
      Buttons: (config: {
        style?: Record<string, string>;
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel?: () => void;
        onError?: (error: unknown) => void;
      }) => {
        render: (selector: string | HTMLElement) => Promise<void>;
        close?: () => Promise<void>;
      };
    };
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
}

async function ensureSquareScript() {
  if (window.Square) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-square-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Square SDK.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://web.squarecdn.com/v1/square.js';
    script.async = true;
    script.dataset.squareSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Square SDK.'));
    document.head.appendChild(script);
  });
}

async function ensurePayPalScript(clientId: string, currency: string) {
  if (window.paypal) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load PayPal SDK.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    const params = new URLSearchParams({
      'client-id': clientId,
      currency,
      intent: 'capture',
      components: 'buttons',
    });
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.dataset.paypalSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK.'));
    document.head.appendChild(script);
  });
}

export default function SubscriptionPaywall({
  currentTier,
  pricingByTier,
  currency,
  paymentOptions,
  tierQuotes,
  onSelectTier,
  onClose,
}: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredTier, setHoveredTier] = useState<Tier | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card');
  const [submitting, setSubmitting] = useState(false);
  const [squareCardReady, setSquareCardReady] = useState(false);
  const [squareCardError, setSquareCardError] = useState('');
  const [payPalReady, setPayPalReady] = useState(false);
  const [payPalError, setPayPalError] = useState('');
  const [paymentWindowOpen, setPaymentWindowOpen] = useState(false);
  const [billingTermsAccepted, setBillingTermsAccepted] = useState(false);
  const [billingTermsAcceptedAt, setBillingTermsAcceptedAt] = useState('');
  const activeHelpTier = hoveredTier ?? selectedTier ?? currentTier ?? 'pro';
  const resolvedPricingByTier = pricingByTier || DEFAULT_PRICING_BY_TIER;
  const quote = selectedTier && tierQuotes ? tierQuotes[billingCycle][selectedTier] : null;
  const squareCardContainerRef = useRef<HTMLDivElement | null>(null);
  const payPalButtonContainerRef = useRef<HTMLDivElement | null>(null);
  const squareCardRef = useRef<{
    tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message?: string }> }>;
    destroy?: () => Promise<void>;
  } | null>(null);
  const payPalButtonsRef = useRef<{ close?: () => Promise<void> } | null>(null);
  const onSelectTierRef = useRef(onSelectTier);

  useEffect(() => {
    onSelectTierRef.current = onSelectTier;
  }, [onSelectTier]);

  const availablePaymentMethods = useMemo(() => {
    return PAYMENT_METHODS.map((method) => {
      if (method.id === 'paypal') {
        return { ...method, enabled: paymentOptions.paypal_enabled };
      }
      return { ...method, enabled: paymentOptions.square_enabled };
    });
  }, [paymentOptions]);
  const missingConfig = useMemo(() => {
    const items: string[] = [];
    if (!paymentOptions.square_enabled) {
      if (!paymentOptions.square_application_id) items.push('SQUARE_APPLICATION_ID');
      if (!paymentOptions.square_location_id) items.push('SQUARE_LOCATION_ID');
      items.push('SQUARE_ACCESS_TOKEN');
    }
    if (!paymentOptions.paypal_enabled) {
      items.push('PAYPAL_CLIENT_ID');
      items.push('PAYPAL_CLIENT_SECRET');
    }
    return Array.from(new Set(items));
  }, [paymentOptions]);

  useEffect(() => {
    const shouldRenderSquareCard =
      paymentWindowOpen &&
      billingTermsAccepted &&
      selectedTier !== null &&
      selectedTier !== 'free' &&
      selectedPaymentMethod === 'card' &&
      quote !== null &&
      quote.amount_due > 0 &&
      paymentOptions.square_enabled &&
      Boolean(paymentOptions.square_application_id) &&
      Boolean(paymentOptions.square_location_id);

    if (!shouldRenderSquareCard) {
      setSquareCardReady(false);
      setSquareCardError('');
      void squareCardRef.current?.destroy?.();
      squareCardRef.current = null;
      if (squareCardContainerRef.current) {
        squareCardContainerRef.current.innerHTML = '';
      }
      return;
    }

    let cancelled = false;

    async function mountSquareCard() {
      try {
        setSquareCardReady(false);
        setSquareCardError('');
        if (squareCardContainerRef.current) {
          squareCardContainerRef.current.innerHTML = '';
        }
        await squareCardRef.current?.destroy?.();
        squareCardRef.current = null;

        await ensureSquareScript();
        if (!window.Square || !squareCardContainerRef.current) {
          throw new Error('Square SDK did not initialize.');
        }
        const payments = await window.Square.payments(
          paymentOptions.square_application_id,
          paymentOptions.square_location_id
        );
        const card = await payments.card();
        await card.attach(squareCardContainerRef.current);

        if (cancelled) {
          await card.destroy?.();
          return;
        }

        squareCardRef.current = card;
        setSquareCardReady(true);
      } catch (error) {
        if (cancelled) return;
        setSquareCardError(error instanceof Error ? error.message : 'Unable to load Square card form.');
      }
    }

    void mountSquareCard();

    return () => {
      cancelled = true;
    };
  }, [
    paymentOptions.square_application_id,
    paymentOptions.square_enabled,
    paymentOptions.square_location_id,
    billingTermsAccepted,
    paymentWindowOpen,
    quote,
    selectedPaymentMethod,
    selectedTier,
  ]);

  useEffect(() => {
    const shouldRenderPayPalButton =
      paymentWindowOpen &&
      billingTermsAccepted &&
      selectedTier !== null &&
      selectedTier !== 'free' &&
      selectedPaymentMethod === 'paypal' &&
      quote !== null &&
      quote.amount_due > 0 &&
      paymentOptions.paypal_enabled &&
      Boolean(paymentOptions.paypal_client_id);

    if (!shouldRenderPayPalButton) {
      setPayPalReady(false);
      setPayPalError('');
      void payPalButtonsRef.current?.close?.();
      payPalButtonsRef.current = null;
      if (payPalButtonContainerRef.current) {
        payPalButtonContainerRef.current.innerHTML = '';
      }
      return;
    }

    let cancelled = false;
    const payPalTier = selectedTier;

    async function mountPayPalButton() {
      try {
        setPayPalReady(false);
        setPayPalError('');
        if (payPalButtonContainerRef.current) {
          payPalButtonContainerRef.current.innerHTML = '';
        }
        await payPalButtonsRef.current?.close?.();
        payPalButtonsRef.current = null;

        await ensurePayPalScript(paymentOptions.paypal_client_id, currency || 'USD');
        if (!window.paypal || !payPalButtonContainerRef.current) {
          throw new Error('PayPal SDK did not initialize.');
        }

        const buttons = window.paypal.Buttons({
          style: {
            layout: 'vertical',
            shape: 'rect',
            label: 'paypal',
          },
          createOrder: async () => {
            if (!billingTermsAccepted || !billingTermsAcceptedAt) {
              throw new Error('You must accept the billing terms before continuing.');
            }
            const result = await localDb.createBillingPayPalOrder(payPalTier, billingCycle, {
              billing_terms_version: BILLING_TERMS_VERSION,
              billing_terms_accepted_at: billingTermsAcceptedAt,
            });
            return String(result.order_id);
          },
          onApprove: async (data) => {
            const result = await localDb.captureBillingPayPalOrder(data.orderID);
            if (!result.paid || !result.plan_tier) {
              throw new Error('PayPal payment did not complete successfully.');
            }
            await onSelectTierRef.current(payPalTier, billingCycle, 'paypal', '__PAYPAL_CAPTURED__');
          },
          onCancel: () => {
            setPayPalError('PayPal checkout was canceled.');
          },
          onError: (error) => {
            setPayPalError(error instanceof Error ? error.message : 'PayPal checkout failed.');
          },
        });

        await buttons.render(payPalButtonContainerRef.current);
        if (cancelled) {
          await buttons.close?.();
          return;
        }
        payPalButtonsRef.current = buttons;
        setPayPalReady(true);
      } catch (error) {
        if (cancelled) return;
        setPayPalError(error instanceof Error ? error.message : 'Unable to load PayPal button.');
      }
    }

    void mountPayPalButton();

    return () => {
      cancelled = true;
      void payPalButtonsRef.current?.close?.();
      payPalButtonsRef.current = null;
    };
  }, [
    billingCycle,
    billingTermsAccepted,
    billingTermsAcceptedAt,
    currency,
    paymentWindowOpen,
    paymentOptions.paypal_client_id,
    paymentOptions.paypal_enabled,
    quote,
    selectedPaymentMethod,
    selectedTier,
  ]);

  async function handleContinue() {
    if (!selectedTier) return;
    setSubmitting(true);
    try {
      let sourceId: string | undefined;
      const billingTerms =
        selectedTier !== 'free' && quote?.amount_due && quote.amount_due > 0
          ? {
              billing_terms_version: BILLING_TERMS_VERSION,
              billing_terms_accepted_at: billingTermsAcceptedAt,
            }
          : undefined;
      if (
        selectedTier !== 'free' &&
        quote?.amount_due &&
        quote.amount_due > 0 &&
        ['card', 'apple_pay', 'google_pay'].includes(selectedPaymentMethod)
      ) {
        if (!squareCardRef.current) {
          throw new Error('Square card form is not ready yet.');
        }
        const tokenResult = await squareCardRef.current.tokenize();
        if (tokenResult.status !== 'OK' || !tokenResult.token) {
          throw new Error(
            tokenResult.errors?.map((error) => error.message).filter(Boolean).join('; ') ||
              'Square could not tokenize the card.'
          );
        }
        sourceId = tokenResult.token;
      }

      await onSelectTier(
        selectedTier,
        billingCycle,
        selectedTier === 'free' || quote?.amount_due === 0 ? 'free' : selectedPaymentMethod,
        sourceId,
        billingTerms
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrimaryAction() {
    if (!selectedTier || !quote) return;
    if (selectedTier === 'free' || quote.amount_due <= 0) {
      void handleContinue();
      return;
    }
    setBillingTermsAccepted(false);
    setBillingTermsAcceptedAt('');
    setPaymentWindowOpen(true);
  }

  const selectedMethodEnabled =
    selectedTier !== null &&
    (selectedTier === 'free' ||
      quote?.amount_due === 0 ||
      availablePaymentMethods.some((method) => method.id === selectedPaymentMethod && method.enabled));

  const needsPaymentWindow =
    Boolean(selectedTier) && selectedTier !== 'free' && Boolean(quote) && Number(quote?.amount_due || 0) > 0;

  const paymentWindowTitle =
    selectedPaymentMethod === 'paypal'
      ? 'PayPal Checkout'
      : selectedPaymentMethod === 'apple_pay'
        ? 'Apple Pay Checkout'
        : selectedPaymentMethod === 'google_pay'
          ? 'Google Pay Checkout'
          : 'Card Checkout';

  const paymentMethodLabel =
    PAYMENT_METHODS.find((method) => method.id === selectedPaymentMethod)?.label || 'Payment';

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-3">
      <div className="w-full max-w-4xl bg-white rounded-xl border border-gray-200 shadow-xl p-4 paywall-shell">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 paywall-title">Choose Your Plan</h2>
            <p className="text-xs text-gray-600 mt-1 paywall-subtitle">
              Your current plan is <strong>{currentTier}</strong>. Confirm the tier first, then complete checkout if a payment is due.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_0.9fr] gap-3">
          <div>
            <div className="mb-3 flex justify-center">
              <div className="relative inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Annually
                </button>
                <span
                  className={`absolute -right-12 -top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${
                    billingCycle === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-gray-100'
                  }`}
                >
                  20% Off
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  onMouseEnter={() => setHoveredTier(tier.id)}
                  onMouseLeave={() => setHoveredTier(null)}
                  onFocus={() => setHoveredTier(tier.id)}
                  onBlur={() => setHoveredTier(null)}
                  className={`rounded-lg border p-3 paywall-plan-card ${
                    currentTier === tier.id || activeHelpTier === tier.id || selectedTier === tier.id
                      ? 'border-indigo-500 bg-indigo-50 paywall-plan-selected'
                      : 'border-gray-200'
                  }`}
                >
                  <h3 className="text-base font-semibold text-gray-800 paywall-plan-title">{tier.title}</h3>
                  <div className="mt-2 min-h-[72px]">
                    <p className="text-xl font-bold text-gray-900 paywall-plan-price">
                      {formatMoney(resolvedPricingByTier[tier.id][billingCycle], currency)}
                      <span className="text-sm font-medium text-gray-600 paywall-plan-price-unit">
                        {billingCycle === 'monthly' ? '/mo' : '/yr'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1 paywall-plan-currency">{currency || 'USD'}</p>
                    <p className="mt-1 text-xs font-medium text-emerald-700 min-h-[20px]">
                      {billingCycle === 'yearly' && tier.id !== 'free'
                        ? `Save ${formatMoney(resolvedPricingByTier[tier.id].yearly_savings, currency)}`
                        : '\u00A0'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`mt-2 w-full py-1.5 rounded-lg text-xs font-medium ${
                      currentTier === tier.id
                        ? 'bg-gray-200 text-gray-700 paywall-current-plan-btn'
                        : selectedTier === tier.id
                          ? 'bg-indigo-700 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                    disabled={currentTier === tier.id}
                  >
                    {currentTier === tier.id ? 'Current Plan' : selectedTier === tier.id ? 'Selected' : `Choose ${tier.title}`}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border p-3 paywall-help-shell min-h-[260px]">
              {TIERS.filter((tier) => tier.id === activeHelpTier).map((tier) => (
                <div key={tier.id}>
                  <div>
                    <h3 className="text-base font-semibold paywall-help-title">{tier.title}</h3>
                    <p className="text-xs mt-1 paywall-help-copy">{tier.bestFor}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg border bg-white p-2.5 paywall-help-card paywall-help-card-included">
                      <h4 className="font-semibold paywall-help-card-title">Included</h4>
                      <ul className="mt-1.5 space-y-0.5 paywall-help-copy">
                        {tier.includes.map((item) => (
                          <li key={item}>&bull; {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border p-2.5 paywall-help-card paywall-help-card-pros">
                      <h4 className="font-semibold paywall-help-card-title">Pros</h4>
                      <ul className="mt-1.5 space-y-0.5 paywall-help-copy">
                        {tier.pros.map((item) => (
                          <li key={item}>&bull; {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border p-2.5 paywall-help-card paywall-help-card-cons">
                      <h4 className="font-semibold paywall-help-card-title">Cons</h4>
                      <ul className="mt-1.5 space-y-0.5 paywall-help-copy">
                        {tier.cons.map((item) => (
                          <li key={item}>&bull; {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 max-h-[560px] overflow-hidden">
            <h3 className="text-base font-semibold text-gray-900">Upgrade Checkout</h3>
            {!selectedTier && (
              <p className="mt-2 text-xs text-gray-600">
                Select a tier to review the charge, any eligible credit, and the payment options for that change.
              </p>
            )}

            {selectedTier && quote && (
              <div className="mt-3 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-medium text-gray-500">Selected plan</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {TIERS.find((tier) => tier.id === selectedTier)?.title}
                  </p>
                  <p className="mt-2 text-xs text-gray-600">
                    Base {billingCycle === 'monthly' ? 'monthly' : 'yearly'} price:{' '}
                    {formatMoney(quote.base_price, quote.currency)}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Prior tier credit: {formatMoney(quote.credit_applied, quote.currency)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">
                    Amount due now: {formatMoney(quote.amount_due, quote.currency)}
                  </p>
                  {selectedTier !== 'free' && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      Billing type: {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                    </p>
                  )}
                  {quote.credit_eligible && quote.prior_purchase_date && quote.credit_expires_at && (
                    <p className="mt-2 text-xs text-emerald-700">
                      Credit applied from the last paid tier purchased on{' '}
                      {new Date(quote.prior_purchase_date).toLocaleDateString()}.
                      Credit window ends {new Date(quote.credit_expires_at).toLocaleDateString()}.
                    </p>
                  )}
                </div>

                {selectedTier !== 'free' && quote.amount_due > 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-medium text-gray-700">Payment method</p>
                    {missingConfig.length > 0 && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                        Missing payment config: {missingConfig.join(', ')}
                      </div>
                    )}
                    <div className="mt-2 space-y-2">
                      {availablePaymentMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-start gap-2 rounded-lg border p-2 ${
                            !method.enabled ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400' : 'border-gray-200 bg-white text-gray-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.id}
                            checked={selectedPaymentMethod === method.id}
                            onChange={() => setSelectedPaymentMethod(method.id)}
                            disabled={!method.enabled}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-xs font-medium">{method.label}</span>
                            <span className="block text-[11px]">{method.description}</span>
                            {!method.enabled && (
                              <span className="block text-[11px] mt-1">Not configured yet on this app instance.</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-[11px] text-gray-600">
                      The payment form opens in a larger checkout window so card entry and wallet checkout are not squeezed into this panel.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    {selectedTier === 'free'
                      ? 'Downgrading to Free does not require payment.'
                      : 'This upgrade is fully covered by your recent tier credit, so no payment is due.'}
                  </div>
                )}

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Confirming this change will switch the account to the selected tier once checkout succeeds.
                  If checkout is canceled, the current tier stays active.
                </div>

                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={
                    submitting ||
                    currentTier === selectedTier ||
                    (selectedTier !== 'free' &&
                      quote.amount_due > 0 &&
                      !selectedMethodEnabled)
                  }
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {submitting
                    ? 'Processing...'
                    : selectedTier === 'free'
                      ? 'Confirm switch to Free'
                      : quote.amount_due > 0
                        ? 'Open payment window'
                        : 'Confirm upgrade'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {paymentWindowOpen && selectedTier && quote && needsPaymentWindow && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{paymentWindowTitle}</h3>
                <p className="mt-1 text-xs text-gray-600">
                  {TIERS.find((tier) => tier.id === selectedTier)?.title} {billingCycle === 'monthly' ? 'monthly' : 'annual'} plan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentWindowOpen(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(90vh-76px)] overflow-y-auto px-5 py-5">
              <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[11px] font-medium text-gray-500">Plan</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {TIERS.find((tier) => tier.id === selectedTier)?.title}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[11px] font-medium text-gray-500">Due now</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatMoney(quote.amount_due, quote.currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[11px] font-medium text-gray-500">Method</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {paymentMethodLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-amber-950">Billing Terms and Payment Authorization</h4>
                    <p className="mt-1 text-xs text-amber-900">
                      You must review and accept these terms before continuing with {paymentMethodLabel.toLowerCase()} checkout.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-950">
                    Required
                  </span>
                </div>
                <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto rounded-lg border border-amber-200 bg-white p-3 text-xs leading-5 text-gray-700">
                  <div>
                    <p className="font-semibold text-gray-900">1. Authorization to Charge</p>
                    <p>
                      By continuing, you authorize this app to submit the selected subscription charge through {paymentMethodLabel}.
                      Your subscription change is tied to the account shown in this billing window and will be applied after the payment
                      provider reports success.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">2. Method-Specific Terms</p>
                    <p>
                      Card, Apple Pay, and Google Pay transactions are processed through Square. PayPal transactions are processed through
                      PayPal. Provider-side disputes, bank reversals, failed captures, failed settlements, unauthorized claims, or payment
                      reversals may delay or block plan activation.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">3. Declines and Failed Payments</p>
                    <p>
                      If a payment is declined or cannot be completed, the requested plan change may be canceled and access to paid features
                      may be refused until a valid payment method is provided and all outstanding charges are paid in full.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">4. Reversals, Chargebacks, and Late Cancellations</p>
                    <p>
                      If a payment is reversed, disputed, charged back, or canceled after the first 3 calendar days following purchase, the
                      account may be suspended or banned until the full unpaid balance, any provider penalties, and any recovery costs allowed
                      by your final written terms are resolved.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">5. Data Removal After Fraudulent or Reversed Payment</p>
                    <p>
                      If an account is banned because of a payment reversal, chargeback, or equivalent forced recovery event, account data may
                      be permanently removed. This data-removal consequence does not apply merely because a payment is declined. It is intended
                      for reversed-payment abuse, unpaid recovery events, or materially fraudulent payment activity.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">6. No Immediate Refund Promise in This Window</p>
                    <p>
                      Accepting these terms does not itself grant a refund, reversal, or cancellation right. Any exception, grace period, or
                      billing correction must be handled under your separate refund policy and any applicable law.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">7. Acknowledgment</p>
                    <p>
                      By checking the acceptance box below, you confirm that you understand these billing consequences, that you are authorized
                      to use the selected payment method, and that you intend to complete a valid payment for this subscription change.
                    </p>
                  </div>
                </div>
                <label className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 text-xs text-gray-800">
                  <input
                    type="checkbox"
                    checked={billingTermsAccepted}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setBillingTermsAccepted(checked);
                      setBillingTermsAcceptedAt(checked ? new Date().toISOString() : '');
                    }}
                    className="mt-0.5"
                  />
                  <span>
                    I have read and accept the billing terms, payment authorization, reversal policy, and the account enforcement rules shown
                    above.
                  </span>
                </label>
                <p className="mt-2 text-[11px] text-amber-900">
                  This is a product-side acceptance gate. It should still be reviewed against your final Terms of Service and refund policy
                  before you rely on it operationally.
                </p>
              </div>

              {['card', 'apple_pay', 'google_pay'].includes(selectedPaymentMethod) &&
                paymentOptions.square_enabled && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedPaymentMethod === 'card' ? 'Card details' : 'Wallet checkout'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Use the larger checkout window below to complete payment.
                  </p>
                  <div
                    ref={squareCardContainerRef}
                    className="mt-3 min-h-[220px] rounded-xl border border-gray-200 bg-white px-4 py-4"
                  />
                  {!billingTermsAccepted && (
                    <p className="mt-3 text-xs text-amber-700">
                      Accept the billing terms above to enable the payment form.
                    </p>
                  )}
                  {!squareCardReady && !squareCardError && (
                    <p className="mt-3 text-xs text-gray-500">Loading Square payment form...</p>
                  )}
                  {squareCardError && (
                    <p className="mt-3 text-xs text-red-600">{squareCardError}</p>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleContinue()}
                      disabled={submitting || !squareCardReady || !billingTermsAccepted}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {submitting ? 'Processing...' : 'Pay now'}
                    </button>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === 'paypal' && paymentOptions.paypal_enabled && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-800">PayPal</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Continue in the PayPal popup window after clicking the button below.
                  </p>
                  <div ref={payPalButtonContainerRef} className="mt-4 min-h-[46px]" />
                  {!payPalReady && !payPalError && (
                    <p className="mt-3 text-xs text-gray-500">Loading PayPal button...</p>
                  )}
                  {!billingTermsAccepted && (
                    <p className="mt-3 text-xs text-amber-700">
                      Accept the billing terms above to enable PayPal checkout.
                    </p>
                  )}
                  {payPalError && (
                    <p className="mt-3 text-xs text-red-600">{payPalError}</p>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
