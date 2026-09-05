import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';
import { enqueueStoreEmail, type EmailOutboxQueue } from '../lib/emailOutbox';

type PaymentConfig = { squareAccessToken?: string; squareEnvironment?: string; paypalClientId?: string; paypalClientSecret?: string; paypalEnvironment?: string; emailOutbox?: EmailOutboxQueue };
function json(body: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(body), { ...init, headers }); }
function paypalBase(environment: string | undefined) { return String(environment || '').trim().toLowerCase() === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'; }
function squareBase(environment: string | undefined) { return String(environment || '').trim().toLowerCase() === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'; }
async function paypalToken(config: PaymentConfig) { const id = String(config.paypalClientId || '').trim(); const secret = String(config.paypalClientSecret || '').trim(); if (!id || !secret) return null; const response = await fetch(`${paypalBase(config.paypalEnvironment)}/v1/oauth2/token`, { method: 'POST', headers: { authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' }); const payload = await response.json() as { access_token?: unknown }; return response.ok && String(payload.access_token || '').trim() ? String(payload.access_token).trim() : null; }

export async function handleProtectedStorefrontRefundRequest(request: Request, db: D1Database | undefined, config: PaymentConfig): Promise<Response | null> {
  if (!db || request.method !== 'POST') return null;
  const match = new URL(request.url).pathname.match(/^\/api\/storefront\/orders\/([^/]+)\/refund$/); if (!match) return null;
  const auth = await resolveAuthContext(db, request); if (!auth) return json({ error: 'Unauthorized' }, { status: 401 }); if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  let orderId = ''; try { orderId = decodeURIComponent(match[1]).trim(); } catch { /* invalid */ } if (!orderId) return json({ error: 'Invalid order id' }, { status: 400 });
  const repo = createD1Repository(db);
  try {
    const order = await repo.first<Record<string, unknown>>('SELECT * FROM StoreOrder WHERE account_id = ? AND id = ? LIMIT 1', [auth.accountId, orderId]);
    if (!order) return json({ error: 'Order not found' }, { status: 404 });
    if (String(order.payment_status) !== 'paid' || String(order.status) === 'refunded') return json({ error: 'Only a paid order can be refunded.' }, { status: 409 });
    const payment = await repo.first<Record<string, unknown>>("SELECT * FROM StoreOrderPayment WHERE account_id = ? AND order_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 1", [auth.accountId, orderId]);
    if (!payment || !['square', 'paypal'].includes(String(payment.provider)) || !String(payment.provider_payment_id || '')) return json({ error: 'This order has no refundable provider payment record.' }, { status: 409 });
    const previousRefund = await repo.first<{ id: string }>("SELECT id FROM StoreOrderPayment WHERE account_id = ? AND order_id = ? AND status IN ('refund_pending', 'refunded') LIMIT 1", [auth.accountId, orderId]);
    if (previousRefund) return json({ error: 'A refund has already been submitted for this order.' }, { status: 409 });
    const amount = Number(order.total_amount); const currency = String(order.currency || 'USD'); const provider = String(payment.provider); const idempotencyKey = crypto.randomUUID(); let providerRefundId = ''; let pending = false;
    if (provider === 'square') {
      const accessToken = String(config.squareAccessToken || '').trim(); if (!accessToken) return json({ error: 'Square refunds are not configured.' }, { status: 400 });
      const response = await fetch(`${squareBase(config.squareEnvironment)}/v2/refunds`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ idempotency_key: idempotencyKey, payment_id: String(payment.provider_payment_id), amount_money: { amount: Math.round(amount * 100), currency }, reason: `Store order ${String(order.order_number)} refund` }) });
      const result = await response.json() as { refund?: { id?: unknown; status?: unknown }; errors?: Array<{ detail?: unknown }> }; const status = String(result.refund?.status || '').toUpperCase();
      if (!response.ok || !String(result.refund?.id || '') || !['COMPLETED', 'PENDING'].includes(status)) return json({ error: String(result.errors?.[0]?.detail || 'Square did not accept the refund.') }, { status: 400 });
      providerRefundId = String(result.refund?.id); pending = status === 'PENDING';
    } else {
      const token = await paypalToken(config); if (!token) return json({ error: 'PayPal refunds are not configured.' }, { status: 400 });
      const response = await fetch(`${paypalBase(config.paypalEnvironment)}/v2/payments/captures/${encodeURIComponent(String(payment.provider_payment_id))}/refund`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'paypal-request-id': idempotencyKey }, body: JSON.stringify({ amount: { value: amount.toFixed(2), currency_code: currency }, note_to_payer: 'Refund processed by the store.' }) });
      const result = await response.json() as { id?: unknown; status?: unknown; message?: unknown }; if (!response.ok || !String(result.id || '') || String(result.status || '').toUpperCase() !== 'COMPLETED') return json({ error: String(result.message || 'PayPal did not complete the refund.') }, { status: 400 }); providerRefundId = String(result.id);
    }
    const now = new Date().toISOString();
    await repo.run('INSERT INTO StoreOrderPayment (id, account_id, order_id, provider, provider_payment_id, status, amount, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), auth.accountId, orderId, provider, providerRefundId, pending ? 'refund_pending' : 'refunded', -amount, currency, now, now]);
    if (!pending) { await repo.run("UPDATE StoreOrder SET status = 'refunded', payment_status = 'refunded', fulfillment_status = 'cancelled', updated_at = ? WHERE account_id = ? AND id = ? AND payment_status = 'paid'", [now, auth.accountId, orderId]); await enqueueStoreEmail(repo, config.emailOutbox, { accountId: auth.accountId, eventType: 'refund_confirmation', recipient: String(order.customer_email || ''), subject: `Refund processed: ${String(order.order_number)}`, body: `A refund of $${amount.toFixed(2)} was processed for order ${String(order.order_number)}.`, now }); }
    const updated = await repo.first<Record<string, unknown>>('SELECT * FROM StoreOrder WHERE account_id = ? AND id = ?', [auth.accountId, orderId]); return json({ ...updated, refund_pending: pending });
  } catch (error) { const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 500; return json({ error: error instanceof Error ? error.message : 'Unable to refund order' }, { status }); }
}
