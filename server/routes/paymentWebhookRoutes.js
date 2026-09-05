import express from 'express';

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function paypalAccessToken() {
  const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) throw httpError(400, 'PayPal webhooks are not configured');
  const base = String(process.env.PAYPAL_ENVIRONMENT || '').toLowerCase() === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const response = await fetch(`${base}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw httpError(400, 'PayPal webhook authentication failed');
  return { base, token: String(result.access_token) };
}

export function registerPaymentWebhookRoutes(app, { masterPrisma, getAccountPrisma, randomUUID }) {
  async function reconcile(provider, eventId, referenceIds, update) {
    const accounts = await masterPrisma.$queryRaw`SELECT "id" FROM "Account"`;
    for (const account of accounts) {
      const db = await getAccountPrisma(account.id);
      const matches = await db.$queryRaw`
        SELECT "id", "order_id", "status" FROM "StoreOrderPayment"
        WHERE "provider" = ${provider} AND "provider_payment_id" IN (${referenceIds[0] || ''}, ${referenceIds[1] || ''})
        LIMIT 1
      `;
      const payment = matches[0];
      if (!payment) continue;
      await db.$transaction(async (tx) => {
        const inserted = await tx.$executeRaw`
          INSERT OR IGNORE INTO "PaymentWebhookEvent" ("id", "provider", "provider_event_id", "event_type", "created_at")
          VALUES (${randomUUID()}, ${provider}, ${eventId}, ${update.eventType}, ${new Date().toISOString()})
        `;
        if (!inserted) return;
        if (update.refundStatus) {
          await tx.$executeRaw`UPDATE "StoreOrderPayment" SET "status" = ${update.refundStatus}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${payment.id}`;
          if (update.refundStatus === 'refunded') {
            await tx.$executeRaw`
              UPDATE "StoreOrder" SET "status" = 'refunded', "payment_status" = 'refunded', "fulfillment_status" = 'cancelled', "updated_at" = ${new Date().toISOString()}
              WHERE "id" = ${payment.order_id}
            `;
          }
        }
      });
      return true;
    }
    return false;
  }

  app.post('/api/webhooks/square', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res, next) => {
    try {
      const signatureKey = String(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '').trim();
      const notificationUrl = String(process.env.SQUARE_WEBHOOK_URL || '').trim();
      const signature = String(req.headers['x-square-hmacsha256-signature'] || '');
      if (!signatureKey || !notificationUrl || !signature) throw httpError(403, 'Invalid Square webhook signature');
      const square = await import('square');
      const valid = await square.WebhooksHelper.verifySignature({ requestBody: Buffer.from(req.body).toString('utf8'), signatureHeader: signature, signatureKey, notificationUrl });
      if (!valid) throw httpError(403, 'Invalid Square webhook signature');
      const event = JSON.parse(Buffer.from(req.body).toString('utf8'));
      const eventType = String(event.type || '');
      const refund = event.data?.object?.refund;
      if (eventType === 'refund.updated' && refund?.id) {
        const status = String(refund.status || '').toUpperCase();
        await reconcile('square', String(event.event_id || refund.id), [String(refund.id), String(refund.payment_id || '')], { eventType, refundStatus: status === 'COMPLETED' ? 'refunded' : status === 'FAILED' ? 'refund_failed' : 'refund_pending' });
      }
      res.status(200).json({ received: true });
    } catch (error) { next(error); }
  });

  app.post('/api/webhooks/paypal', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res, next) => {
    try {
      const webhookId = String(process.env.PAYPAL_WEBHOOK_ID || '').trim();
      if (!webhookId) throw httpError(403, 'PayPal webhooks are not configured');
      const event = JSON.parse(Buffer.from(req.body).toString('utf8'));
      const { base, token } = await paypalAccessToken();
      const response = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_algo: req.headers['paypal-auth-algo'], cert_url: req.headers['paypal-cert-url'], transmission_id: req.headers['paypal-transmission-id'], transmission_sig: req.headers['paypal-transmission-sig'], transmission_time: req.headers['paypal-transmission-time'], webhook_id: webhookId, webhook_event: event }),
      });
      const verified = await response.json();
      if (!response.ok || verified.verification_status !== 'SUCCESS') throw httpError(403, 'Invalid PayPal webhook signature');
      const eventType = String(event.event_type || '');
      if (eventType === 'PAYMENT.CAPTURE.REFUNDED' && event.resource?.id) {
        await reconcile('paypal', String(event.id || event.resource.id), [String(event.resource.id), ''], { eventType, refundStatus: 'refunded' });
      }
      res.status(200).json({ received: true });
    } catch (error) { next(error); }
  });
}
