import { resolveStoreCustomer } from '../lib/customerAuth';
import { createD1Repository } from '../lib/d1';
import { finalizeStoreOrderPayment, getPayableStoreOrder } from './publicCheckout';
import type { EmailOutboxQueue } from '../lib/emailOutbox';

type PaymentConfig = {
  squareAccessToken?: string;
  squareLocationId?: string;
  squareEnvironment?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalEnvironment?: string;
  emailOutbox?: EmailOutboxQueue;
};

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function decode(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return '';
  }
}

async function requestBody(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function value(input: Record<string, unknown> | null, key: string, minimum: number, maximum: number) {
  const result = String(input?.[key] ?? '').trim();
  return result.length >= minimum && result.length <= maximum ? result : '';
}

function paypalBase(environment: string | undefined) {
  return String(environment || '').trim().toLowerCase() === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function squareBase(environment: string | undefined) {
  return String(environment || '').trim().toLowerCase() === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

async function paypalToken(config: PaymentConfig) {
  const clientId = String(config.paypalClientId || '').trim();
  const clientSecret = String(config.paypalClientSecret || '').trim();
  if (!clientId || !clientSecret) return null;
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${paypalBase(config.paypalEnvironment)}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) return null;
  const payload = await response.json() as { access_token?: unknown };
  const token = String(payload.access_token || '').trim();
  return token || null;
}

export async function handlePublicCheckoutPaymentRequest(request: Request, db: D1Database | undefined, config: PaymentConfig): Promise<Response | null> {
  if (!db || request.method !== 'POST') return null;
  const match = new URL(request.url).pathname.match(/^\/api\/public\/store\/([^/]+)\/orders\/pay\/(square|paypal\/create|paypal\/capture)$/);
  if (!match) return null;

  const slug = decode(match[1]);
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  const customer = await resolveStoreCustomer(db, request, slug);
  if (!customer) return json({ error: 'Unauthorized' }, { status: 401 });

  const repo = createD1Repository(db);
  const route = match[2];
  const input = await requestBody(request);

  try {
    if (route === 'square') {
      const orderId = value(input, 'order_id', 1, 200);
      const sourceId = value(input, 'source_id', 1, 8_000);
      if (!orderId || !sourceId) return json({ error: 'Invalid Square payment request' }, { status: 400 });
      const order = await getPayableStoreOrder(repo, customer.accountId, orderId, customer.customerId);
      if (!order) return json({ error: 'Order not found' }, { status: 404 });
      if (String(order.payment_status) === 'paid') return json({ paid: true, order });

      const accessToken = String(config.squareAccessToken || '').trim();
      const locationId = String(config.squareLocationId || '').trim();
      if (!accessToken || !locationId) return json({ error: 'Square checkout is not configured' }, { status: 400 });
      const paymentResponse = await fetch(`${squareBase(config.squareEnvironment)}/v2/payments`, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', 'square-version': '2025-01-23' },
        body: JSON.stringify({
          source_id: sourceId,
          idempotency_key: crypto.randomUUID(),
          amount_money: { amount: Math.round(Number(order.total_amount) * 100), currency: String(order.currency || 'USD') },
          autocomplete: true,
          location_id: locationId,
          reference_id: String(order.id),
          note: `Store order ${String(order.order_number)}`,
        }),
      });
      const payment = await paymentResponse.json() as { payment?: { id?: unknown; status?: unknown }; errors?: Array<{ detail?: unknown }> };
      if (!paymentResponse.ok || String(payment.payment?.status || '').toUpperCase() !== 'COMPLETED') {
        return json({ error: String(payment.errors?.[0]?.detail || 'Square payment did not complete') }, { status: 400 });
      }
      const paymentId = String(payment.payment?.id || '').trim();
      if (!paymentId) return json({ error: 'Square did not return a payment reference' }, { status: 400 });
      return json({ paid: true, order: await finalizeStoreOrderPayment(repo, customer.accountId, String(order.id), 'square', paymentId, config.emailOutbox) });
    }

    if (route === 'paypal/create') {
      const orderId = value(input, 'order_id', 1, 200);
      if (!orderId) return json({ error: 'Invalid PayPal payment request' }, { status: 400 });
      const order = await getPayableStoreOrder(repo, customer.accountId, orderId, customer.customerId);
      if (!order) return json({ error: 'Order not found' }, { status: 404 });
      if (String(order.payment_status) === 'paid') return json({ error: 'Order is already paid' }, { status: 409 });
      const token = await paypalToken(config);
      if (!token) return json({ error: 'PayPal checkout is not configured' }, { status: 400 });
      const response = await fetch(`${paypalBase(config.paypalEnvironment)}/v2/checkout/orders`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'paypal-request-id': crypto.randomUUID() },
        body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: String(order.id), description: `Store order ${String(order.order_number)}`, amount: { currency_code: String(order.currency || 'USD'), value: Number(order.total_amount).toFixed(2) } }] }),
      });
      const paypalOrder = await response.json() as { id?: unknown; message?: unknown };
      const paypalOrderId = String(paypalOrder.id || '').trim();
      if (!response.ok || !paypalOrderId) return json({ error: String(paypalOrder.message || 'PayPal order creation failed') }, { status: 400 });
      return json({ order_id: paypalOrderId });
    }

    const paypalOrderId = value(input, 'order_id', 1, 200);
    if (!paypalOrderId) return json({ error: 'Invalid PayPal payment request' }, { status: 400 });
    const token = await paypalToken(config);
    if (!token) return json({ error: 'PayPal checkout is not configured' }, { status: 400 });
    const base = paypalBase(config.paypalEnvironment);
    const orderResponse = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const paypalOrder = await orderResponse.json() as { message?: unknown; purchase_units?: Array<{ reference_id?: unknown }> };
    const expectedOrderId = String(paypalOrder.purchase_units?.[0]?.reference_id || '').trim();
    if (!orderResponse.ok || !expectedOrderId) return json({ error: String(paypalOrder.message || 'PayPal order was not found') }, { status: 400 });
    const payableOrder = await getPayableStoreOrder(repo, customer.accountId, expectedOrderId, customer.customerId);
    if (!payableOrder) return json({ error: 'Order not found' }, { status: 404 });
    if (String(payableOrder.payment_status) === 'paid') return json({ paid: true, order: payableOrder });
    const captureResponse = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'paypal-request-id': crypto.randomUUID() },
      body: '{}',
    });
    const capture = await captureResponse.json() as { status?: unknown; message?: unknown; purchase_units?: Array<{ reference_id?: unknown; payments?: { captures?: Array<{ id?: unknown }> } }> };
    if (!captureResponse.ok || String(capture.status || '').toUpperCase() !== 'COMPLETED') return json({ error: String(capture.message || 'PayPal payment did not complete') }, { status: 400 });
    const unit = capture.purchase_units?.[0];
    const orderId = String(unit?.reference_id || '').trim();
    const captureId = String(unit?.payments?.captures?.[0]?.id || '').trim();
    if (!orderId || orderId !== expectedOrderId || !captureId) return json({ error: 'PayPal did not return a payment capture reference' }, { status: 400 });
    await getPayableStoreOrder(repo, customer.accountId, orderId, customer.customerId);
    return json({ paid: true, order: await finalizeStoreOrderPayment(repo, customer.accountId, orderId, 'paypal', captureId, config.emailOutbox) });
  } catch (error) {
    const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to process payment';
    return json({ error: message }, { status });
  }
}
