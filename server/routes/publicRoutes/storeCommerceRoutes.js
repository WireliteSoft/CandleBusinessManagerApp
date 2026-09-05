import { findAccountByStoreSlug, requireStoreSlug } from './shared.js';
import { sendStoreEmail } from '../../lib/storeEmail.js';

const CUSTOMER_SESSION_DAYS = 30;
const RESERVATION_MINUTES = 30;

function mixMatchDiscountPercent(quantity) {
  if (quantity >= 12) return 60;
  if (quantity >= 6) return 40;
  if (quantity >= 3) return 20;
  return 0;
}

function customerTokenFromRequest(req) {
  const explicit = String(req.headers['x-store-customer-token'] || '').trim();
  if (explicit) return explicit;
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function customerResponse(row, expiresAt) {
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    marketing_opt_in: Boolean(row.marketing_opt_in),
    reminder_opt_in: Boolean(row.reminder_opt_in),
    birthday: row.birthday || '', anniversary: row.anniversary || '', occasion_reminder_opt_in: Boolean(row.occasion_reminder_opt_in),
    expires_at: expiresAt,
  };
}

async function getStoreCustomer(accountPrisma, req) {
  const token = customerTokenFromRequest(req);
  if (!token) return null;
  const now = new Date().toISOString();
  const rows = await accountPrisma.$queryRaw`
    SELECT
      c."id", c."name", c."email", c."phone", c."marketing_opt_in", c."reminder_opt_in", c."birthday", c."anniversary", c."occasion_reminder_opt_in", c."active",
      s."id" AS "session_id", s."expires_at"
    FROM "StoreCustomerSession" s
    JOIN "StoreCustomer" c ON c."id" = s."customer_id"
    WHERE s."token" = ${token}
      AND s."expires_at" > ${now}
    LIMIT 1
  `;
  const row = rows[0];
  return row && Boolean(row.active) ? row : null;
}

function throwHttp(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function customerOrderDetail(order) {
  const { customer_id, staff_note, ...detail } = order;
  return detail;
}

function newGiftCardCode(randomBytes) {
  return `CM-GIFT-${randomBytes(5).toString('hex').toUpperCase()}`;
}

async function awardReward(tx, randomUUID, customerId, points, source, referenceId, note, now) {
  if (!customerId || !Number.isInteger(points) || points === 0) return false;
  const inserted = await tx.$executeRaw`INSERT OR IGNORE INTO "StoreCustomerRewardLedger" ("id", "customer_id", "points", "source", "reference_id", "note", "created_at") VALUES (${randomUUID()}, ${customerId}, ${points}, ${source}, ${referenceId}, ${note}, ${now})`;
  if (!inserted) return false;
  await tx.$executeRaw`INSERT INTO "StoreCustomerRewardBalance" ("customer_id", "points", "updated_at") VALUES (${customerId}, ${points}, ${now}) ON CONFLICT("customer_id") DO UPDATE SET "points" = "points" + ${points}, "updated_at" = ${now}`;
  return true;
}

async function expireReservations(accountPrisma, now) {
  await accountPrisma.$executeRaw`
    UPDATE "StoreOrder"
    SET
      "status" = 'cancelled',
      "fulfillment_status" = 'cancelled',
      "staff_note" = CASE
        WHEN "staff_note" = '' THEN 'Payment reservation expired.'
        ELSE "staff_note"
      END,
      "updated_at" = ${now}
    WHERE "status" = 'awaiting_payment'
      AND "payment_status" = 'unpaid'
      AND "reservation_expires_at" IS NOT NULL
      AND "reservation_expires_at" <= ${now}
  `;
}

async function getOrderDetail(accountPrisma, orderId) {
  const orders = await accountPrisma.$queryRaw`
    SELECT * FROM "StoreOrder" WHERE "id" = ${orderId} LIMIT 1
  `;
  const order = orders[0];
  if (!order) return null;
  const [items, payments] = await Promise.all([
    accountPrisma.$queryRaw`
      SELECT "id", "product_id", "product_name", "product_image_data", "unit_price", "quantity", "line_total", "customization_json"
      FROM "StoreOrderItem"
      WHERE "order_id" = ${orderId}
      ORDER BY "created_at" ASC
    `,
    accountPrisma.$queryRaw`
      SELECT "id", "provider", "status", "amount", "currency", "created_at", "updated_at"
      FROM "StoreOrderPayment"
      WHERE "order_id" = ${orderId}
      ORDER BY "created_at" ASC
    `,
  ]);
  return { ...order, items, payments };
}

export function registerPublicStoreCommerceRoutes(app, context) {
  const {
    masterPrisma,
    getAccountPrisma,
    parseOrThrow,
    parseStringArrayJson,
    getClientIp,
    hashPassword,
    verifyPassword,
    randomUUID,
    randomBytes,
    storeCustomerRegisterInput,
    storeCustomerLoginInput,
    storeCustomerProfileInput,
    storeCustomerAddressInput,
    storeOrderCreateInput,
    storeOrderSquarePaymentInput,
    storeOrderPayPalInput,
  } = context;

  async function finalizePaidOrder(accountPrisma, orderId, provider, providerPaymentId) {
    const now = new Date().toISOString();
    await accountPrisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT * FROM "StoreOrder" WHERE "id" = ${orderId} LIMIT 1`;
      const order = rows[0];
      if (!order) throwHttp(404, 'Order not found');
      if (order.payment_status === 'paid') return;
      if (order.status !== 'awaiting_payment') throwHttp(409, 'This order is no longer available for payment');
      if (order.reservation_expires_at && new Date(order.reservation_expires_at).getTime() <= Date.now()) {
        await expireReservations(tx, now);
        throwHttp(409, 'This order reservation expired before payment could be finalized');
      }
      if (order.fulfillment_status !== 'preorder') {
        const items = await tx.$queryRaw`SELECT i."product_id", i."quantity", p."product_type" FROM "StoreOrderItem" i JOIN "Product" p ON p."id" = i."product_id" WHERE i."order_id" = ${orderId}`;
        for (const item of items) {
          if (item.product_type === 'gift_card') continue;
          const changed = await tx.$executeRaw`
            UPDATE "Product" SET "quantity_in_stock" = "quantity_in_stock" - ${Number(item.quantity)}
            WHERE "id" = ${item.product_id} AND "quantity_in_stock" >= ${Number(item.quantity)}
          `;
          if (!changed) throwHttp(409, 'Stock changed before payment could be finalized');
        }
      }
      if (order.discount_code_id && Number(order.discount_code_amount) > 0) {
        const codes = await tx.$queryRaw`SELECT * FROM "StoreDiscountCode" WHERE "id" = ${order.discount_code_id} LIMIT 1`;
        const code = codes[0];
        if (!code || !Boolean(code.active) || (code.starts_at && String(code.starts_at) > now) || (code.expires_at && String(code.expires_at) < now)) {
          throwHttp(409, 'The discount code is no longer available for this order');
        }
        if (Number(code.usage_limit) > 0 && Number(code.usage_count) >= Number(code.usage_limit)) {
          throwHttp(409, 'The discount code has reached its redemption limit');
        }
        const redemptionRows = await tx.$queryRaw`SELECT COUNT(*) AS "count" FROM "StoreDiscountRedemption" WHERE "discount_code_id" = ${code.id} AND "customer_id" = ${order.customer_id}`;
        if (Number(code.per_customer_limit) > 0 && Number(redemptionRows[0]?.count || 0) >= Number(code.per_customer_limit)) {
          throwHttp(409, 'You have already reached the redemption limit for this discount code');
        }
        const incremented = await tx.$executeRaw`UPDATE "StoreDiscountCode" SET "usage_count" = "usage_count" + 1, "updated_at" = ${now} WHERE "id" = ${code.id} AND ("usage_limit" = 0 OR "usage_count" < "usage_limit")`;
        if (!incremented) throwHttp(409, 'The discount code has reached its redemption limit');
        await tx.$executeRaw`INSERT INTO "StoreDiscountRedemption" ("id", "discount_code_id", "customer_id", "order_id", "amount", "created_at") VALUES (${randomUUID()}, ${code.id}, ${order.customer_id}, ${orderId}, ${Number(order.discount_code_amount)}, ${now})`;
      }
      await tx.$executeRaw`
        UPDATE "StoreOrder" SET "status" = 'paid', "payment_status" = 'paid', "paid_at" = ${now}, "reservation_expires_at" = ${null}, "updated_at" = ${now} WHERE "id" = ${orderId}
      `;
      if (order.gift_card_id && Number(order.gift_card_applied_amount) > 0) {
        const applied = Number(order.gift_card_applied_amount);
        const changed = await tx.$executeRaw`
          UPDATE "StoreGiftCard" SET "balance" = "balance" - ${applied}, "updated_at" = ${now}
          WHERE "id" = ${order.gift_card_id} AND "active" = 1 AND "balance" >= ${applied}
        `;
        if (!changed) throwHttp(409, 'The selected gift card balance changed before payment could be finalized');
        const cardRows = await tx.$queryRaw`SELECT "balance", "customer_id", "code" FROM "StoreGiftCard" WHERE "id" = ${order.gift_card_id} LIMIT 1`;
        const card = cardRows[0];
        await tx.$executeRaw`INSERT INTO "StoreGiftCardUsage" ("id", "gift_card_id", "order_id", "amount", "balance_after", "usage_type", "note", "created_at") VALUES (${randomUUID()}, ${order.gift_card_id}, ${orderId}, ${-applied}, ${Number(card.balance)}, ${'redeem'}, ${`Applied to order ${order.order_number}`}, ${now})`;
        if (card.customer_id) await tx.$executeRaw`INSERT INTO "StoreCustomerNotification" ("id", "customer_id", "category", "title", "message", "is_read", "created_at") VALUES (${randomUUID()}, ${card.customer_id}, ${'gift_card'}, ${'Gift card used'}, ${`$${applied.toFixed(2)} was used from gift card ending in ${String(card.code).slice(-6)}. Remaining balance: $${Number(card.balance).toFixed(2)}.`}, ${0}, ${now})`;
      }
      if (order.customer_credit_id && Number(order.customer_credit_applied_amount) > 0) {
        const applied = Number(order.customer_credit_applied_amount);
        const changed = await tx.$executeRaw`UPDATE "StoreCustomerCredit" SET "balance" = "balance" - ${applied}, "updated_at" = ${now} WHERE "id" = ${order.customer_credit_id} AND "active" = 1 AND "balance" >= ${applied}`;
        if (!changed) throwHttp(409, 'The selected account credit balance changed before payment could be finalized');
        const creditRows = await tx.$queryRaw`SELECT "balance", "customer_id", "label", "credit_type" FROM "StoreCustomerCredit" WHERE "id" = ${order.customer_credit_id} LIMIT 1`;
        const credit = creditRows[0];
        await tx.$executeRaw`INSERT INTO "StoreCustomerCreditUsage" ("id", "customer_credit_id", "order_id", "amount", "balance_after", "usage_type", "note", "created_at") VALUES (${randomUUID()}, ${order.customer_credit_id}, ${orderId}, ${-applied}, ${Number(credit.balance)}, ${'redeem'}, ${`Applied to order ${order.order_number}`}, ${now})`;
        await tx.$executeRaw`INSERT INTO "StoreCustomerNotification" ("id", "customer_id", "category", "title", "message", "is_read", "created_at") VALUES (${randomUUID()}, ${credit.customer_id}, ${credit.credit_type}, ${'Account credit used'}, ${`$${applied.toFixed(2)} was used from ${credit.label || 'your account credit'}. Remaining balance: $${Number(credit.balance).toFixed(2)}.`}, ${0}, ${now})`;
      }
      const purchasedGiftCards = await tx.$queryRaw`
        SELECT i."product_name", i."unit_price", i."quantity"
        FROM "StoreOrderItem" i JOIN "Product" p ON p."id" = i."product_id"
        WHERE i."order_id" = ${orderId} AND p."product_type" = 'gift_card'
      `;
      for (const item of purchasedGiftCards) {
        for (let count = 0; count < Number(item.quantity); count += 1) {
          const cardId = randomUUID();
          const code = newGiftCardCode(randomBytes);
          const balance = Number(item.unit_price);
          await tx.$executeRaw`INSERT INTO "StoreGiftCard" ("id", "code", "customer_id", "initial_balance", "balance", "active", "created_at", "updated_at") VALUES (${cardId}, ${code}, ${order.customer_id}, ${balance}, ${balance}, ${1}, ${now}, ${now})`;
          await tx.$executeRaw`INSERT INTO "StoreGiftCardUsage" ("id", "gift_card_id", "order_id", "amount", "balance_after", "usage_type", "note", "created_at") VALUES (${randomUUID()}, ${cardId}, ${orderId}, ${balance}, ${balance}, ${'purchase_issue'}, ${`Issued from order ${order.order_number}`}, ${now})`;
          await tx.$executeRaw`INSERT INTO "StoreCustomerNotification" ("id", "customer_id", "category", "title", "message", "is_read", "created_at") VALUES (${randomUUID()}, ${order.customer_id}, ${'gift_card'}, ${'Gift card purchase completed'}, ${`A $${balance.toFixed(2)} gift card was added to your account. Code: ${code}. It is ready to use at checkout.`}, ${0}, ${now})`;
        }
      }
      const purchasePoints = Math.floor(Number(order.subtotal_amount));
      await awardReward(tx, randomUUID, order.customer_id, purchasePoints, 'purchase', orderId, `Earned from order ${order.order_number}`, now);
      const referrals = await tx.$queryRaw`SELECT * FROM "StoreCustomerReferral" WHERE "referred_customer_id" = ${order.customer_id} AND "status" = 'signed_up' LIMIT 1`;
      const referral = referrals[0];
      if (referral) {
        await awardReward(tx, randomUUID, referral.referrer_customer_id, 50, 'referral', referral.id, 'Referral completed a first paid order', now);
        await tx.$executeRaw`UPDATE "StoreCustomerReferral" SET "status" = 'completed', "completed_at" = ${now} WHERE "id" = ${referral.id}`;
      }
      await tx.$executeRaw`
        INSERT INTO "StoreOrderPayment" ("id", "order_id", "provider", "provider_payment_id", "status", "amount", "currency", "created_at", "updated_at")
        VALUES (${randomUUID()}, ${orderId}, ${provider}, ${providerPaymentId}, ${'paid'}, ${Number(order.total_amount)}, ${order.currency || 'USD'}, ${now}, ${now})
      `;
    });
    const order = await getOrderDetail(accountPrisma, orderId);
    await sendStoreEmail(accountPrisma, randomUUID, { eventType: 'payment_confirmation', recipient: order.customer_email, subject: `Payment confirmed for ${order.order_number}`, text: `Your payment of $${Number(order.total_amount).toFixed(2)} was confirmed. Order: ${order.order_number}.` });
  }

  async function getPayableOrder(accountPrisma, orderId, customerId) {
    await expireReservations(accountPrisma, new Date().toISOString());
    const order = await getOrderDetail(accountPrisma, orderId);
    if (!order || order.customer_id !== customerId) throwHttp(404, 'Order not found');
    if (order.payment_status === 'paid') return order;
    if (order.status !== 'awaiting_payment' || order.payment_status !== 'unpaid') {
      throwHttp(409, 'This order is no longer available for payment');
    }
    return order;
  }

  async function resolveStore(req, res) {
    const slug = requireStoreSlug(res, req.params.slug);
    if (!slug) return null;
    const account = await findAccountByStoreSlug(masterPrisma, slug);
    if (!account?.id || String(account.plan_tier || '').toLowerCase() !== 'elite') {
      res.status(404).json({ error: 'Storefront not found' });
      return null;
    }
    return { account, accountPrisma: await getAccountPrisma(account.id) };
  }

  async function requireCustomer(req, res) {
    const store = await resolveStore(req, res);
    if (!store) return null;
    const customer = await getStoreCustomer(store.accountPrisma, req);
    if (!customer) {
      res.status(401).json({ error: 'Customer sign-in is required' });
      return null;
    }
    return { ...store, customer };
  }

  app.get('/api/public/store/:slug/gallery', async (req, res, next) => {
    try {
      const store = await resolveStore(req, res);
      if (!store) return;
      const rows = await store.accountPrisma.$queryRaw`
        SELECT g."id", g."title", g."image_data", g."details", g."source_type", g."created_at", c."name" AS "customer_name"
        FROM "StoreCustomerGalleryItem" g
        JOIN "StoreCustomer" c ON c."id" = g."customer_id"
        WHERE g."status" = 'approved'
        ORDER BY g."updated_at" DESC LIMIT 60
      `;
      res.json(rows);
    } catch (error) { next(error); }
  });

  app.get('/api/public/store/:slug/subscription-plans', async (req, res, next) => { try { const store = await resolveStore(req, res); if (!store) return; res.json(await store.accountPrisma.$queryRaw`SELECT "id", "name", "plan_type", "description", "candle_count", "monthly_price", "quarterly_price", "monthly_delivery_day", "quarterly_start_month" FROM "StoreSubscriptionPlan" WHERE "active" = 1 ORDER BY "created_at" DESC`); } catch (error) { next(error); } });
  app.get('/api/public/store/:slug/pickup', async (req, res, next) => { try { const store = await resolveStore(req, res); if (!store) return; const settings = (await store.accountPrisma.$queryRaw`SELECT * FROM "StorePickupSettings" WHERE "id" = 'default' LIMIT 1`)[0]; if (!settings?.active) return res.json({ active: false, instructions: '', slots: [] }); const cutoff = new Date(Date.now() + Number(settings.cutoff_hours || 24) * 3600000).toISOString(); const slots = await store.accountPrisma.$queryRaw`SELECT s."starts_at", s."capacity", COUNT(o."id") AS "reserved" FROM "StorePickupSlot" s LEFT JOIN "StoreOrder" o ON o."pickup_slot_at" = s."starts_at" AND o."status" NOT IN ('cancelled', 'refunded') WHERE s."active" = 1 AND s."starts_at" > ${cutoff} GROUP BY s."id" HAVING COUNT(o."id") < s."capacity" ORDER BY s."starts_at" ASC`; res.json({ active: true, instructions: settings.instructions, slots: slots.map((slot) => ({ ...slot, reserved: Number(slot.reserved) })) }); } catch (error) { next(error); } });
  app.get('/api/public/store/:slug/customers/subscriptions', async (req, res, next) => { try { const current = await requireCustomer(req, res); if (!current) return; res.json(await current.accountPrisma.$queryRaw`SELECT s.*, p."name" AS "plan_name", p."candle_count" FROM "StoreCustomerSubscription" s JOIN "StoreSubscriptionPlan" p ON p."id" = s."plan_id" WHERE s."customer_id" = ${current.customer.id} ORDER BY s."updated_at" DESC`); } catch (error) { next(error); } });
  app.patch('/api/public/store/:slug/customers/subscriptions/:id', async (req, res, next) => { try { const current = await requireCustomer(req, res); if (!current) return; const data = parseOrThrow(context.z.object({ action: context.z.enum(['skip', 'pause', 'resume', 'cancel', 'address']), shipping_address_id: context.z.string().optional().default('') }), req.body); const rows = await current.accountPrisma.$queryRaw`SELECT * FROM "StoreCustomerSubscription" WHERE "id" = ${req.params.id} AND "customer_id" = ${current.customer.id} LIMIT 1`; const subscription = rows[0]; if (!subscription) throwHttp(404, 'Subscription not found.'); let addressId = subscription.shipping_address_id || null; if (data.action === 'address') { const addresses = await current.accountPrisma.$queryRaw`SELECT "id" FROM "StoreCustomerAddress" WHERE "id" = ${data.shipping_address_id} AND "customer_id" = ${current.customer.id} LIMIT 1`; if (!addresses[0]) throwHttp(400, 'Saved shipping address not found.'); addressId = data.shipping_address_id; } const status = data.action === 'pause' ? 'paused' : data.action === 'resume' ? 'active' : data.action === 'cancel' ? 'cancelled' : subscription.status; await current.accountPrisma.$executeRaw`UPDATE "StoreCustomerSubscription" SET "status" = ${status}, "skip_next" = ${data.action === 'skip' ? 1 : 0}, "shipping_address_id" = ${addressId}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${subscription.id}`; res.json({ updated: true }); } catch (error) { next(error); } });

  app.post('/api/public/store/:slug/customers/register', async (req, res, next) => {
    try {
      const store = await resolveStore(req, res);
      if (!store) return;
      const data = parseOrThrow(storeCustomerRegisterInput, req.body);
      if (data.password !== data.password_confirm) {
        throwHttp(400, 'Password confirmation does not match');
      }
      const email = data.email.trim().toLowerCase();
      const existing = await store.accountPrisma.$queryRaw`
        SELECT "id" FROM "StoreCustomer" WHERE lower("email") = ${email} LIMIT 1
      `;
      if (existing[0]) throwHttp(409, 'An account with this email already exists for this store');

      const now = new Date().toISOString();
      const customerId = randomUUID();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await store.accountPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO "StoreCustomer" ("id", "name", "email", "password_hash", "phone", "marketing_opt_in", "reminder_opt_in", "active", "created_at", "updated_at")
          VALUES (${customerId}, ${data.name}, ${email}, ${hashPassword(data.password)}, ${''}, ${0}, ${0}, ${1}, ${now}, ${now})
        `;
        await tx.$executeRaw`
          INSERT INTO "StoreCustomerSession" ("id", "customer_id", "token", "expires_at", "created_at")
          VALUES (${randomUUID()}, ${customerId}, ${token}, ${expiresAt}, ${now})
        `;
        if (data.referral_code) {
          const referrals = await tx.$queryRaw`SELECT * FROM "StoreCustomerReferral" WHERE upper("code") = ${data.referral_code.toUpperCase()} AND "status" = 'available' LIMIT 1`;
          const referral = referrals[0];
          if (referral && referral.referrer_customer_id !== customerId) {
            await tx.$executeRaw`UPDATE "StoreCustomerReferral" SET "referred_customer_id" = ${customerId}, "status" = 'signed_up' WHERE "id" = ${referral.id}`;
            await tx.$executeRaw`INSERT INTO "StoreCustomerCredit" ("id", "customer_id", "credit_type", "label", "balance", "active", "created_at", "updated_at") VALUES (${randomUUID()}, ${customerId}, ${'giveaway_balance'}, ${'Referral welcome credit'}, ${5}, ${1}, ${now}, ${now})`;
            await tx.$executeRaw`INSERT INTO "StoreCustomerNotification" ("id", "customer_id", "category", "title", "message", "is_read", "created_at") VALUES (${randomUUID()}, ${customerId}, ${'rewards'}, ${'Referral credit added'}, ${'$5.00 referral credit was added to your account.'}, ${0}, ${now})`;
          }
        }
      });
      res.status(201).json({
        token,
        customer: customerResponse({ id: customerId, name: data.name, email, phone: '', marketing_opt_in: false, reminder_opt_in: false }, expiresAt),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/public/store/:slug/checkout-config', async (req, res, next) => {
    try {
      const store = await resolveStore(req, res);
      if (!store) return;
      res.json({
        currency: 'USD',
        square_enabled: Boolean(process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_LOCATION_ID && process.env.SQUARE_ACCESS_TOKEN),
        square_application_id: String(process.env.SQUARE_APPLICATION_ID || ''),
        square_location_id: String(process.env.SQUARE_LOCATION_ID || ''),
        paypal_enabled: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
        paypal_client_id: String(process.env.PAYPAL_CLIENT_ID || ''),
      });
    } catch (error) { next(error); }
  });

  app.post('/api/public/store/:slug/customers/login', async (req, res, next) => {
    try {
      const store = await resolveStore(req, res);
      if (!store) return;
      const data = parseOrThrow(storeCustomerLoginInput, req.body);
      const email = data.email.trim().toLowerCase();
      const rows = await store.accountPrisma.$queryRaw`
        SELECT "id", "name", "email", "phone", "marketing_opt_in", "reminder_opt_in", "birthday", "anniversary", "occasion_reminder_opt_in", "password_hash", "active"
        FROM "StoreCustomer"
        WHERE lower("email") = ${email}
        LIMIT 1
      `;
      const customer = rows[0];
      if (!customer || !Boolean(customer.active) || !verifyPassword(data.password, customer.password_hash)) {
        throwHttp(401, 'Invalid email or password');
      }
      const now = new Date().toISOString();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await store.accountPrisma.$executeRaw`
        INSERT INTO "StoreCustomerSession" ("id", "customer_id", "token", "expires_at", "created_at")
        VALUES (${randomUUID()}, ${customer.id}, ${token}, ${expiresAt}, ${now})
      `;
      res.json({ token, customer: customerResponse(customer, expiresAt) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/public/store/:slug/customers/me', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const { accountPrisma, customer } = contextWithCustomer;
      const addresses = await accountPrisma.$queryRaw`
        SELECT "id", "label", "recipient_name", "street_address_1", "street_address_2", "city", "state_region", "postal_code", "country", "phone", "is_default"
        FROM "StoreCustomerAddress"
        WHERE "customer_id" = ${customer.id}
        ORDER BY "is_default" DESC, "created_at" DESC
      `;
      res.json({ customer: customerResponse(customer, customer.expires_at), addresses });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/public/store/:slug/customers/rewards', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res);
      if (!current) return;
      const [giftCards, credits, notifications, membershipRows] = await Promise.all([
        current.accountPrisma.$queryRaw`SELECT "id", "code", "initial_balance", "balance", "active", "created_at", "updated_at" FROM "StoreGiftCard" WHERE "customer_id" = ${current.customer.id} ORDER BY "updated_at" DESC`,
        current.accountPrisma.$queryRaw`SELECT "id", "credit_type", "label", "balance", "active", "created_at", "updated_at" FROM "StoreCustomerCredit" WHERE "customer_id" = ${current.customer.id} ORDER BY "updated_at" DESC`,
        current.accountPrisma.$queryRaw`SELECT "id", "category", "title", "message", "is_read", "created_at" FROM "StoreCustomerNotification" WHERE "customer_id" = ${current.customer.id} ORDER BY "created_at" DESC LIMIT 100`,
        current.accountPrisma.$queryRaw`SELECT m."status", m."ends_at", p."name", p."discount_percent", p."active" AS "program_active" FROM "StoreCustomerMembership" m JOIN "StoreMembershipProgram" p ON 1 = 1 WHERE m."customer_id" = ${current.customer.id} ORDER BY m."updated_at" DESC LIMIT 1`,
      ]);
      const [balanceRows, ledger] = await Promise.all([
        current.accountPrisma.$queryRaw`SELECT "points" FROM "StoreCustomerRewardBalance" WHERE "customer_id" = ${current.customer.id} LIMIT 1`,
        current.accountPrisma.$queryRaw`SELECT "id", "points", "source", "note", "created_at" FROM "StoreCustomerRewardLedger" WHERE "customer_id" = ${current.customer.id} ORDER BY "created_at" DESC LIMIT 100`,
      ]);
      let referralRows = await current.accountPrisma.$queryRaw`SELECT "code" FROM "StoreCustomerReferral" WHERE "referrer_customer_id" = ${current.customer.id} AND "status" = 'available' LIMIT 1`;
      if (!referralRows[0]) { const code = `KACHA-${randomBytes(4).toString('hex').toUpperCase()}`; await current.accountPrisma.$executeRaw`INSERT INTO "StoreCustomerReferral" ("id", "code", "referrer_customer_id", "status", "created_at") VALUES (${randomUUID()}, ${code}, ${current.customer.id}, ${'available'}, ${new Date().toISOString()})`; referralRows = [{ code }]; }
      const membership = membershipRows[0];
      res.json({ gift_cards: giftCards.map((card) => ({ ...card, reward_discount_percent: Number(card.initial_balance) >= 100 ? 10 : 5 })), credits, notifications, reward_points: Number(balanceRows[0]?.points || 0), reward_ledger: ledger, referral_code: referralRows[0].code, membership: membership ? { active: Boolean(membership.program_active) && membership.status === 'active' && (!membership.ends_at || String(membership.ends_at) > new Date().toISOString()), name: membership.name, discount_percent: Number(membership.discount_percent || 0), ends_at: membership.ends_at || null } : null });
    } catch (error) { next(error); }
  });

  app.patch('/api/public/store/:slug/customers/notifications/:notificationId/read', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res);
      if (!current) return;
      await current.accountPrisma.$executeRaw`UPDATE "StoreCustomerNotification" SET "is_read" = ${1} WHERE "id" = ${req.params.notificationId} AND "customer_id" = ${current.customer.id}`;
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  app.post('/api/public/store/:slug/customers/collections', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const data = parseOrThrow(context.z.object({ collection_name: context.z.string().trim().min(1).max(120), label_text: context.z.string().trim().max(160).optional().default(''), collection_size: context.z.union([context.z.literal(3), context.z.literal(4), context.z.literal(6), context.z.literal(12)]), items: context.z.array(context.z.object({ name: context.z.string().trim().min(1).max(160), size: context.z.enum(['4 oz', '8 oz', '10 oz', '16 oz']), wickCount: context.z.enum(['1 wick', '2 wicks', '3 wicks']), wickType: context.z.enum(['Cotton wick', 'Wood wick']) })).min(3).max(12) }), req.body);
      if (data.items.length !== data.collection_size) throwHttp(400, 'Select the exact number of candles in the collection.');
      const now = new Date().toISOString();
      await contextWithCustomer.accountPrisma.$executeRaw`INSERT INTO "StoreCustomerCollection" ("id", "customer_id", "collection_name", "label_text", "collection_size", "items_json", "created_at", "updated_at") VALUES (${randomUUID()}, ${contextWithCustomer.customer.id}, ${data.collection_name}, ${data.label_text}, ${data.collection_size}, ${JSON.stringify(data.items)}, ${now}, ${now})`;
      res.status(201).json({ saved: true });
    } catch (e) { next(e); }
  });

  app.get('/api/public/store/:slug/customers/collections', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const rows = await contextWithCustomer.accountPrisma.$queryRaw`SELECT "id", "collection_name", "label_text", "collection_size", "items_json", "created_at", "updated_at" FROM "StoreCustomerCollection" WHERE "customer_id" = ${contextWithCustomer.customer.id} ORDER BY "updated_at" DESC`;
      res.json(rows.map((row) => ({ ...row, collection_size: Number(row.collection_size), items: (() => { try { return JSON.parse(String(row.items_json || '[]')); } catch { return []; } })() })));
    } catch (e) { next(e); }
  });

  app.get('/api/public/store/:slug/customers/gallery', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const [collections, customOrders, gallery] = await Promise.all([
        current.accountPrisma.$queryRaw`SELECT "id", "collection_name", "label_text", "collection_size", "items_json" FROM "StoreCustomerCollection" WHERE "customer_id" = ${current.customer.id} ORDER BY "updated_at" DESC`,
        current.accountPrisma.$queryRaw`SELECT i."id", i."product_name", i."product_image_data", i."customization_json", o."order_number" FROM "StoreOrderItem" i JOIN "StoreOrder" o ON o."id" = i."order_id" JOIN "Product" p ON p."id" = i."product_id" WHERE o."customer_id" = ${current.customer.id} AND o."payment_status" = 'paid' AND p."product_type" = 'custom' ORDER BY o."paid_at" DESC`,
        current.accountPrisma.$queryRaw`SELECT * FROM "StoreCustomerGalleryItem" WHERE "customer_id" = ${current.customer.id} ORDER BY "updated_at" DESC`,
      ]);
      res.json({ collections: collections.map((row) => ({ ...row, source_type: 'collection', title: row.collection_name, details: row.label_text || `${row.collection_size}-candle collection`, image_data: '' })), custom_orders: customOrders.map((row) => ({ ...row, source_type: 'custom_order', title: row.product_name, details: row.customization_json || row.order_number, image_data: row.product_image_data || '' })), gallery });
    } catch (error) { next(error); }
  });

  app.post('/api/public/store/:slug/customers/gallery', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const data = parseOrThrow(context.z.object({ source_type: context.z.enum(['collection', 'custom_order']), source_id: context.z.string().min(1), title: context.z.string().trim().min(2).max(120), image_data: context.z.string().max(2_500_000).optional().default('') }), req.body);
      let details = '';
      let defaultImage = '';
      if (data.source_type === 'collection') {
        const rows = await current.accountPrisma.$queryRaw`SELECT "collection_name", "label_text", "collection_size" FROM "StoreCustomerCollection" WHERE "id" = ${data.source_id} AND "customer_id" = ${current.customer.id} LIMIT 1`;
        const source = rows[0]; if (!source) throwHttp(404, 'Saved collection not found.');
        details = source.label_text || `${source.collection_size}-candle collection`;
      } else {
        const rows = await current.accountPrisma.$queryRaw`SELECT i."product_image_data", i."customization_json", o."order_number" FROM "StoreOrderItem" i JOIN "StoreOrder" o ON o."id" = i."order_id" JOIN "Product" p ON p."id" = i."product_id" WHERE i."id" = ${data.source_id} AND o."customer_id" = ${current.customer.id} AND o."payment_status" = 'paid' AND p."product_type" = 'custom' LIMIT 1`;
        const source = rows[0]; if (!source) throwHttp(404, 'Paid custom candle not found.');
        details = source.customization_json || source.order_number;
        defaultImage = source.product_image_data || '';
      }
      const now = new Date().toISOString();
      await current.accountPrisma.$executeRaw`INSERT INTO "StoreCustomerGalleryItem" ("id", "customer_id", "source_type", "source_id", "title", "image_data", "details", "status", "created_at", "updated_at") VALUES (${randomUUID()}, ${current.customer.id}, ${data.source_type}, ${data.source_id}, ${data.title}, ${data.image_data || defaultImage}, ${details}, ${'pending'}, ${now}, ${now})`;
      res.status(201).json({ submitted: true });
    } catch (error) { next(error); }
  });

  app.post('/api/public/store/:slug/customers/registries', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const data = parseOrThrow(context.z.object({ title: context.z.string().trim().min(2).max(120), event_date: context.z.string().trim().max(40).optional().default(''), message: context.z.string().trim().max(1000).optional().default(''), product_ids: context.z.array(context.z.string().min(1)).min(1).max(100) }), req.body);
      const selected = new Set(parseStringArrayJson(current.account.store_product_ids));
      if (data.product_ids.some((id) => !selected.has(id))) throwHttp(400, 'A selected registry item is no longer available in this storefront.');
      const products = await current.accountPrisma.product.findMany({ where: { id: { in: data.product_ids } }, select: { id: true } });
      if (products.length !== new Set(data.product_ids).size) throwHttp(400, 'A selected registry item no longer exists.');
      const now = new Date().toISOString(); const id = randomUUID(); const shareCode = randomBytes(9).toString('hex');
      await current.accountPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`INSERT INTO "StoreGiftRegistry" ("id", "customer_id", "share_code", "title", "event_date", "message", "active", "created_at", "updated_at") VALUES (${id}, ${current.customer.id}, ${shareCode}, ${data.title}, ${data.event_date}, ${data.message}, ${1}, ${now}, ${now})`;
        for (const productId of new Set(data.product_ids)) await tx.$executeRaw`INSERT INTO "StoreGiftRegistryItem" ("id", "registry_id", "product_id", "created_at") VALUES (${randomUUID()}, ${id}, ${productId}, ${now})`;
      });
      res.status(201).json({ id, share_code: shareCode });
    } catch (error) { next(error); }
  });

  app.get('/api/public/store/:slug/customers/registries', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const rows = await current.accountPrisma.$queryRaw`SELECT r.*, COUNT(i."id") AS "item_count" FROM "StoreGiftRegistry" r LEFT JOIN "StoreGiftRegistryItem" i ON i."registry_id" = r."id" WHERE r."customer_id" = ${current.customer.id} GROUP BY r."id" ORDER BY r."updated_at" DESC`;
      res.json(rows.map((row) => ({ ...row, item_count: Number(row.item_count || 0) })));
    } catch (error) { next(error); }
  });

  app.get('/api/public/store/:slug/customers/favorites', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const rows = await current.accountPrisma.$queryRaw`SELECT p."id", p."name", p."image_data", p."price", f."created_at" FROM "StoreCustomerFavorite" f JOIN "Product" p ON p."id" = f."product_id" WHERE f."customer_id" = ${current.customer.id} ORDER BY f."created_at" DESC`;
      res.json(rows);
    } catch (error) { next(error); }
  });
  app.post('/api/public/store/:slug/customers/favorites/:productId', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const selected = new Set(parseStringArrayJson(current.account.store_product_ids));
      if (!selected.has(req.params.productId)) throwHttp(404, 'Product not found');
      const product = await current.accountPrisma.product.findUnique({ where: { id: req.params.productId }, select: { id: true } });
      if (!product) throwHttp(404, 'Product not found');
      await current.accountPrisma.$executeRaw`INSERT OR IGNORE INTO "StoreCustomerFavorite" ("id", "customer_id", "product_id", "created_at") VALUES (${randomUUID()}, ${current.customer.id}, ${product.id}, ${new Date().toISOString()})`;
      res.status(201).json({ saved: true });
    } catch (error) { next(error); }
  });
  app.delete('/api/public/store/:slug/customers/favorites/:productId', async (req, res, next) => {
    try { const current = await requireCustomer(req, res); if (!current) return; await current.accountPrisma.$executeRaw`DELETE FROM "StoreCustomerFavorite" WHERE "customer_id" = ${current.customer.id} AND "product_id" = ${req.params.productId}`; res.json({ deleted: true }); } catch (error) { next(error); }
  });
  app.post('/api/public/store/:slug/customers/reviews', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const data = parseOrThrow(context.z.object({ product_id: context.z.string().min(1), rating: context.z.number().int().min(1).max(5), title: context.z.string().trim().max(120).optional().default(''), body: context.z.string().trim().min(10).max(2000), photo_data: context.z.string().max(6_000_000).optional().default('') }), req.body);
      const selected = new Set(parseStringArrayJson(current.account.store_product_ids)); if (!selected.has(data.product_id)) throwHttp(404, 'Product not found');
      const product = await current.accountPrisma.product.findUnique({ where: { id: data.product_id }, select: { id: true } }); if (!product) throwHttp(404, 'Product not found');
      const purchases = await current.accountPrisma.$queryRaw`SELECT 1 FROM "StoreOrderItem" i JOIN "StoreOrder" o ON o."id" = i."order_id" WHERE o."customer_id" = ${current.customer.id} AND i."product_id" = ${data.product_id} AND o."payment_status" = 'paid' LIMIT 1`;
      const now = new Date().toISOString();
      await current.accountPrisma.$executeRaw`INSERT INTO "StoreProductReview" ("id", "customer_id", "product_id", "rating", "title", "body", "photo_data", "status", "verified_purchase", "created_at", "updated_at") VALUES (${randomUUID()}, ${current.customer.id}, ${data.product_id}, ${data.rating}, ${data.title}, ${data.body}, ${data.photo_data}, ${'pending'}, ${purchases[0] ? 1 : 0}, ${now}, ${now}) ON CONFLICT("customer_id", "product_id") DO UPDATE SET "rating" = excluded."rating", "title" = excluded."title", "body" = excluded."body", "photo_data" = excluded."photo_data", "status" = 'pending', "verified_purchase" = excluded."verified_purchase", "updated_at" = excluded."updated_at"`;
      res.status(201).json({ submitted: true, verified_purchase: Boolean(purchases[0]) });
    } catch (error) { next(error); }
  });

  app.put('/api/public/store/:slug/customers/me', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const data = parseOrThrow(storeCustomerProfileInput, req.body);
      const now = new Date().toISOString();
      await contextWithCustomer.accountPrisma.$executeRaw`
        UPDATE "StoreCustomer"
        SET "name" = ${data.name}, "phone" = ${data.phone}, "marketing_opt_in" = ${data.marketing_opt_in ? 1 : 0}, "reminder_opt_in" = ${data.reminder_opt_in ? 1 : 0}, "birthday" = ${data.birthday}, "anniversary" = ${data.anniversary}, "occasion_reminder_opt_in" = ${data.occasion_reminder_opt_in ? 1 : 0}, "updated_at" = ${now}
        WHERE "id" = ${contextWithCustomer.customer.id}
      `;
      res.json({ customer: customerResponse({ ...contextWithCustomer.customer, ...data }, contextWithCustomer.customer.expires_at) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/public/store/:slug/customers/me', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const { accountPrisma, customer } = contextWithCustomer;
      const now = new Date().toISOString();
      // Orders retain their original checkout snapshot for accounting obligations; this removes the active profile and login data.
      await accountPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`DELETE FROM "StoreCustomerSession" WHERE "customer_id" = ${customer.id}`;
        await tx.$executeRaw`DELETE FROM "StoreCustomerAddress" WHERE "customer_id" = ${customer.id}`;
        await tx.$executeRaw`DELETE FROM "StoreCustomerCollection" WHERE "customer_id" = ${customer.id}`;
        await tx.$executeRaw`
          UPDATE "StoreCustomer"
          SET
            "name" = ${'Deleted customer'},
            "email" = ${`deleted-${customer.id}@store.invalid`},
            "password_hash" = ${hashPassword(randomUUID())},
            "phone" = ${''},
            "marketing_opt_in" = ${0},
            "reminder_opt_in" = ${0},
            "active" = ${0},
            "updated_at" = ${now}
          WHERE "id" = ${customer.id}
        `;
      });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/public/store/:slug/customers/addresses', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const data = parseOrThrow(storeCustomerAddressInput, req.body);
      const { accountPrisma, customer } = contextWithCustomer;
      const now = new Date().toISOString();
      const addressId = randomUUID();
      await accountPrisma.$transaction(async (tx) => {
        if (data.is_default) {
          await tx.$executeRaw`
            UPDATE "StoreCustomerAddress" SET "is_default" = ${0}, "updated_at" = ${now}
            WHERE "customer_id" = ${customer.id}
          `;
        }
        await tx.$executeRaw`
          INSERT INTO "StoreCustomerAddress" (
            "id", "customer_id", "label", "recipient_name", "street_address_1", "street_address_2", "city", "state_region", "postal_code", "country", "phone", "is_default", "created_at", "updated_at"
          ) VALUES (
            ${addressId}, ${customer.id}, ${data.label}, ${data.recipient_name}, ${data.street_address_1}, ${data.street_address_2}, ${data.city}, ${data.state_region}, ${data.postal_code}, ${data.country}, ${data.phone}, ${data.is_default ? 1 : 0}, ${now}, ${now}
          )
        `;
      });
      res.status(201).json({ id: addressId, ...data });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/public/store/:slug/customers/addresses/:addressId', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const data = parseOrThrow(storeCustomerAddressInput, req.body);
      const { accountPrisma, customer } = contextWithCustomer;
      const now = new Date().toISOString();
      const existing = await accountPrisma.$queryRaw`
        SELECT "id" FROM "StoreCustomerAddress"
        WHERE "id" = ${req.params.addressId} AND "customer_id" = ${customer.id}
        LIMIT 1
      `;
      if (!existing[0]) throwHttp(404, 'Address not found');
      await accountPrisma.$transaction(async (tx) => {
        if (data.is_default) {
          await tx.$executeRaw`
            UPDATE "StoreCustomerAddress" SET "is_default" = ${0}, "updated_at" = ${now}
            WHERE "customer_id" = ${customer.id}
          `;
        }
        await tx.$executeRaw`
          UPDATE "StoreCustomerAddress"
          SET "label" = ${data.label}, "recipient_name" = ${data.recipient_name}, "street_address_1" = ${data.street_address_1},
              "street_address_2" = ${data.street_address_2}, "city" = ${data.city}, "state_region" = ${data.state_region},
              "postal_code" = ${data.postal_code}, "country" = ${data.country}, "phone" = ${data.phone},
              "is_default" = ${data.is_default ? 1 : 0}, "updated_at" = ${now}
          WHERE "id" = ${req.params.addressId} AND "customer_id" = ${customer.id}
        `;
      });
      res.json({ id: req.params.addressId, ...data });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/public/store/:slug/customers/addresses/:addressId', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const { accountPrisma, customer } = contextWithCustomer;
      const result = await accountPrisma.$executeRaw`
        DELETE FROM "StoreCustomerAddress"
        WHERE "id" = ${req.params.addressId} AND "customer_id" = ${customer.id}
      `;
      if (!result) throwHttp(404, 'Address not found');
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/public/store/:slug/orders', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const data = parseOrThrow(storeOrderCreateInput, req.body);
      const { account, accountPrisma, customer } = contextWithCustomer;
      const selectedProductIds = new Set(parseStringArrayJson(account.store_product_ids));
      const quantityByProduct = new Map();
      const customizationByProduct = new Map();
      data.items.forEach((item) => {
        quantityByProduct.set(item.product_id, (quantityByProduct.get(item.product_id) || 0) + item.quantity);
        if (item.customization) customizationByProduct.set(item.product_id, item.customization);
      });
      const productIds = [...quantityByProduct.keys()];
      if (productIds.some((id) => !selectedProductIds.has(id) && !/^system-gift-card-(?:[1-9]\d{0,2})$/.test(id))) {
        throwHttp(400, 'One or more items are no longer available in this storefront');
      }

      const now = new Date().toISOString();
      const reservationExpiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000).toISOString();
      const orderId = randomUUID();
      const orderNumber = `CM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
      await accountPrisma.$transaction(async (tx) => {
        await expireReservations(tx, now);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, image_data: true, product_type: true, price: true, quantity_in_stock: true, limited_drop: true, purchase_limit: true, upcoming_release: true, release_date: true, preorders_enabled: true, member_exclusive: true, member_early_access_days: true, subscriber_exclusive: true, subscriber_early_access_days: true },
        });
        const productMap = new Map(products.map((product) => [product.id, product]));
        if (productMap.size !== productIds.length) throwHttp(400, 'One or more products are no longer available');
        const membershipRows = await tx.$queryRaw`SELECT m.*, p."name" AS "program_name", p."discount_percent", p."sample_product_id", p."active" AS "program_active" FROM "StoreCustomerMembership" m JOIN "StoreMembershipProgram" p ON 1 = 1 WHERE m."customer_id" = ${customer.id} AND m."status" = 'active' AND p."active" = 1 AND (m."ends_at" IS NULL OR m."ends_at" > ${now}) ORDER BY m."updated_at" DESC LIMIT 1`;
        const membership = membershipRows[0] || null;
        const subscriptionRows = await tx.$queryRaw`SELECT "id" FROM "StoreCustomerSubscription" WHERE "customer_id" = ${customer.id} AND "status" = 'active' AND "payment_status" = 'paid' LIMIT 1`;
        const subscription = subscriptionRows[0] || null;
        if (products.some((product) => product.id.startsWith('system-gift-card-') && product.product_type !== 'gift_card')) throwHttp(400, 'Invalid gift card product.');
        const preorderProductIds = products.filter((product) => product.upcoming_release && product.preorders_enabled).map((product) => product.id);
        if (preorderProductIds.length && preorderProductIds.length !== productIds.length) {
          throwHttp(409, 'Preorder items must be checked out separately from in-stock items');
        }
        const isPreorderOrder = preorderProductIds.length > 0;

        let shippingAddress = null;
        if (data.delivery_method === 'pickup') { const slot = (await tx.$queryRaw`SELECT "starts_at", "capacity" FROM "StorePickupSlot" WHERE "starts_at" = ${data.pickup_slot_at} AND "active" = 1 LIMIT 1`)[0]; if (!slot) throwHttp(400, 'Select an available pickup time.'); const settings = (await tx.$queryRaw`SELECT * FROM "StorePickupSettings" WHERE "id" = 'default' LIMIT 1`)[0]; const reserved = await tx.$queryRaw`SELECT COUNT(*) AS "count" FROM "StoreOrder" WHERE "pickup_slot_at" = ${slot.starts_at} AND "status" NOT IN ('cancelled', 'refunded')`; if (!settings?.active || Number(reserved[0]?.count || 0) >= Number(slot.capacity) || new Date(slot.starts_at).getTime() <= Date.now() + Number(settings.cutoff_hours || 24) * 3600000) throwHttp(400, 'That pickup time is no longer available.'); }
        if (data.delivery_method === 'shipping' && data.shipping_address_id) {
          const addresses = await tx.$queryRaw`
            SELECT * FROM "StoreCustomerAddress"
            WHERE "id" = ${data.shipping_address_id} AND "customer_id" = ${customer.id}
            LIMIT 1
          `;
          shippingAddress = addresses[0] || null;
          if (!shippingAddress) throwHttp(400, 'Selected shipping address was not found');
          if (!['united states', 'us', 'usa'].includes(String(shippingAddress.country || '').trim().toLowerCase())) {
            throwHttp(400, 'This storefront currently ships only within the United States');
          }
        }

        const orderItems = [];
        for (const productId of productIds) {
          const product = productMap.get(productId);
          const quantity = quantityByProduct.get(productId);
          const customization = customizationByProduct.get(productId) || null;
          if (customization && product.product_type !== 'custom') throwHttp(400, 'Custom selections are only allowed for a custom candle product');
          const memberEarlyAccessOpensAt = product.release_date && Number(product.member_early_access_days) > 0 ? new Date(new Date(product.release_date).getTime() - Number(product.member_early_access_days) * 86400000).getTime() : Number.POSITIVE_INFINITY;
          const subscriberEarlyAccessOpensAt = product.release_date && Number(product.subscriber_early_access_days) > 0 ? new Date(new Date(product.release_date).getTime() - Number(product.subscriber_early_access_days) * 86400000).getTime() : Number.POSITIVE_INFINITY;
          const hasEarlyAccess = (Boolean(membership) && Date.now() >= memberEarlyAccessOpensAt) || (Boolean(subscription) && Date.now() >= subscriberEarlyAccessOpensAt);
          if (product.member_exclusive && !membership) throwHttp(403, `${product.name} is available only to active members.`);
          if (product.subscriber_exclusive && !subscription) throwHttp(403, `${product.name} is available only to active subscribers.`);
          if (product.upcoming_release && !product.preorders_enabled && !hasEarlyAccess) {
            throwHttp(409, `${product.name} is not available until its release.`);
          }
          const reservationRows = product.product_type === 'gift_card' ? [{ reserved_quantity: 0 }] : await tx.$queryRaw`
            SELECT COALESCE(SUM(i."quantity"), 0) AS "reserved_quantity"
            FROM "StoreOrderItem" i
            JOIN "StoreOrder" o ON o."id" = i."order_id"
            WHERE i."product_id" = ${productId}
              AND o."status" = 'awaiting_payment'
              AND o."payment_status" = 'unpaid'
              AND o."reservation_expires_at" > ${now}
          `;
          const reserved = Number(reservationRows[0]?.reserved_quantity || 0);
          if (product.product_type !== 'gift_card' && !isPreorderOrder && Number(product.quantity_in_stock) - reserved < quantity) {
            throwHttp(409, `${product.name} does not have enough stock available`);
          }
          if (product.limited_drop && Number(product.purchase_limit) > 0) {
            const purchasedRows = await tx.$queryRaw`
              SELECT COALESCE(SUM(i."quantity"), 0) AS "purchased_quantity"
              FROM "StoreOrderItem" i
              JOIN "StoreOrder" o ON o."id" = i."order_id"
              WHERE i."product_id" = ${productId}
                AND o."customer_id" = ${customer.id}
                AND o."payment_status" = 'paid'
                AND o."status" NOT IN ('cancelled', 'refunded')
            `;
            const purchased = Number(purchasedRows[0]?.purchased_quantity || 0);
            if (purchased + quantity > Number(product.purchase_limit)) {
              throwHttp(409, `${product.name} is limited to ${product.purchase_limit} per customer`);
            }
          }
          const unitPrice = Number(product.price);
          orderItems.push({ product, quantity, customization, unitPrice, lineTotal: unitPrice * quantity });
        }

        const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
        if (orderItems.some((item) => item.product.product_type === 'gift_card') && !data.gift_card_terms_accepted) {
          throwHttp(400, 'Gift card terms and conditions must be accepted before purchase.');
        }
        const hasPhysicalGiftCard = orderItems.some((item) => item.product.product_type === 'gift_card') && data.gift_card_delivery_method === 'physical';
        if (hasPhysicalGiftCard && !shippingAddress) throwHttp(400, 'A shipping address is required for a physical gift card.');
        if (membership?.sample_product_id && !orderItems.some((item) => item.product.id === membership.sample_product_id)) {
          const sample = await tx.product.findUnique({ where: { id: membership.sample_product_id }, select: { id: true, name: true, image_data: true, product_type: true, quantity_in_stock: true } });
          if (sample && sample.product_type === 'sample' && Number(sample.quantity_in_stock) > 0) orderItems.push({ product: sample, quantity: 1, customization: null, unitPrice: 0, lineTotal: 0 });
        }
        const eligibleItems = orderItems.filter((item) => item.product.product_type !== 'gift_card');
        const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0);
        const itemCount = eligibleItems.reduce((sum, item) => sum + Number(item.quantity), 0);
        let mixDiscountAmount = Math.round(eligibleSubtotal * mixMatchDiscountPercent(itemCount)) / 100;
        const membershipDiscountAmount = membership ? Math.round((eligibleSubtotal - mixDiscountAmount) * Number(membership.discount_percent || 0)) / 100 : 0;
        let giftCard = null;
        let customerCredit = null;
        let discountCode = null;
        let discountCodeAmount = 0;
        if (data.gift_card_code) {
          if (orderItems.some((item) => item.product.product_type === 'gift_card')) throwHttp(400, 'Gift cards cannot be used to purchase gift-card products.');
          const cards = await tx.$queryRaw`SELECT * FROM "StoreGiftCard" WHERE upper("code") = ${data.gift_card_code.toUpperCase()} AND "active" = 1 LIMIT 1`;
          giftCard = cards[0] || null;
          if (!giftCard || giftCard.customer_id !== customer.id) throwHttp(400, 'That gift card is not available for this customer account.');
          if (Number(giftCard.balance) <= 0) throwHttp(400, 'That gift card has no remaining balance.');
        }
        if (data.customer_credit_id) {
          const credits = await tx.$queryRaw`SELECT * FROM "StoreCustomerCredit" WHERE "id" = ${data.customer_credit_id} AND "customer_id" = ${customer.id} AND "active" = 1 LIMIT 1`;
          customerCredit = credits[0] || null;
          if (!customerCredit || Number(customerCredit.balance) <= 0) throwHttp(400, 'That account credit is not available.');
        }
        if (data.discount_code) {
          if (orderItems.some((item) => item.product.product_type === 'gift_card')) throwHttp(400, 'Discount codes cannot be applied to gift-card products.');
          const codes = await tx.$queryRaw`SELECT * FROM "StoreDiscountCode" WHERE upper("code") = ${data.discount_code.toUpperCase()} LIMIT 1`;
          discountCode = codes[0] || null;
          if (!discountCode || !Boolean(discountCode.active)) throwHttp(400, 'That discount code is not available.');
          if (discountCode.starts_at && String(discountCode.starts_at) > now) throwHttp(400, 'That discount code is not active yet.');
          if (discountCode.expires_at && String(discountCode.expires_at) < now) throwHttp(400, 'That discount code has expired.');
          if (Number(discountCode.usage_limit) > 0 && Number(discountCode.usage_count) >= Number(discountCode.usage_limit)) throwHttp(400, 'That discount code has reached its redemption limit.');
          if (eligibleSubtotal < Number(discountCode.minimum_subtotal)) throwHttp(400, `This discount code requires a $${Number(discountCode.minimum_subtotal).toFixed(2)} eligible subtotal.`);
          if (giftCard && !Boolean(discountCode.stack_with_gift_card)) throwHttp(400, 'This discount code cannot be combined with a gift card.');
          const redemptionRows = await tx.$queryRaw`SELECT COUNT(*) AS "count" FROM "StoreDiscountRedemption" WHERE "discount_code_id" = ${discountCode.id} AND "customer_id" = ${customer.id}`;
          if (Number(discountCode.per_customer_limit) > 0 && Number(redemptionRows[0]?.count || 0) >= Number(discountCode.per_customer_limit)) throwHttp(400, 'You have already reached the redemption limit for this discount code.');
          const discountBase = Math.max(0, eligibleSubtotal - mixDiscountAmount - membershipDiscountAmount);
          discountCodeAmount = discountCode.discount_type === 'percent'
            ? Math.round(discountBase * Number(discountCode.discount_value)) / 100
            : Math.round(Math.min(discountBase, Number(discountCode.discount_value)) * 100) / 100;
          if (!Boolean(discountCode.stack_with_mix)) {
            if (discountCodeAmount >= mixDiscountAmount) mixDiscountAmount = 0;
            else discountCodeAmount = 0;
          }
        }
        const subtotalAfterMix = subtotal - mixDiscountAmount - membershipDiscountAmount - discountCodeAmount;
        const giftCardDiscountAmount = giftCard ? Math.round(subtotalAfterMix * (Number(giftCard.initial_balance) >= 100 ? 0.10 : 0.05) * 100) / 100 : 0;
        const afterDiscounts = subtotalAfterMix - giftCardDiscountAmount;
        const giftCardAppliedAmount = giftCard ? Math.min(Number(giftCard.balance), afterDiscounts) : 0;
        const afterGiftCard = Math.max(0, afterDiscounts - giftCardAppliedAmount);
        const customerCreditAppliedAmount = customerCredit ? Math.min(Number(customerCredit.balance), afterGiftCard) : 0;
        const discountAmount = mixDiscountAmount + membershipDiscountAmount + discountCodeAmount + giftCardDiscountAmount + giftCardAppliedAmount + customerCreditAppliedAmount;
        const totalAmount = Math.max(0, afterGiftCard - customerCreditAppliedAmount);
        await tx.$executeRaw`
          INSERT INTO "StoreOrder" (
            "id", "order_number", "customer_id", "customer_name", "customer_email", "customer_phone", "status", "payment_status", "fulfillment_status", "delivery_method", "pickup_slot_at", "currency", "subtotal_amount", "discount_amount", "shipping_amount", "tax_amount", "total_amount", "gift_card_id", "gift_card_discount_amount", "gift_card_applied_amount", "gift_card_terms_accepted", "gift_card_delivery_method", "customer_credit_id", "customer_credit_applied_amount", "discount_code_id", "discount_code", "discount_code_amount", "membership_discount_amount", "customer_note", "staff_note", "shipping_recipient_name", "shipping_street_address_1", "shipping_street_address_2", "shipping_city", "shipping_state_region", "shipping_postal_code", "shipping_country", "reservation_expires_at", "created_at", "updated_at"
          ) VALUES (
            ${orderId}, ${orderNumber}, ${customer.id}, ${customer.name}, ${customer.email}, ${customer.phone || ''}, ${'awaiting_payment'}, ${'unpaid'}, ${isPreorderOrder ? 'preorder' : data.delivery_method === 'pickup' ? 'ready_for_pickup' : 'unfulfilled'}, ${data.delivery_method}, ${data.delivery_method === 'pickup' ? data.pickup_slot_at : null}, ${'USD'}, ${subtotal}, ${discountAmount}, ${0}, ${0}, ${totalAmount}, ${giftCard?.id || null}, ${giftCardDiscountAmount}, ${giftCardAppliedAmount}, ${data.gift_card_terms_accepted ? 1 : 0}, ${hasPhysicalGiftCard ? 'physical' : 'digital'}, ${customerCredit?.id || null}, ${customerCreditAppliedAmount}, ${discountCode?.id || null}, ${discountCode?.code || ''}, ${discountCodeAmount}, ${membershipDiscountAmount}, ${data.customer_note}, ${data.delivery_method === 'pickup' ? 'Local pickup selected.' : hasPhysicalGiftCard ? 'Physical gift card shipment requested.' : ''}, ${shippingAddress?.recipient_name || ''}, ${shippingAddress?.street_address_1 || ''}, ${shippingAddress?.street_address_2 || ''}, ${shippingAddress?.city || ''}, ${shippingAddress?.state_region || ''}, ${shippingAddress?.postal_code || ''}, ${shippingAddress?.country || ''}, ${reservationExpiresAt}, ${now}, ${now}
          )
        `;
        for (const item of orderItems) {
          await tx.$executeRaw`
            INSERT INTO "StoreOrderItem" ("id", "order_id", "product_id", "product_name", "product_image_data", "unit_price", "quantity", "line_total", "customization_json", "created_at")
            VALUES (${randomUUID()}, ${orderId}, ${item.product.id}, ${item.product.name}, ${item.product.image_data || ''}, ${item.unitPrice}, ${item.quantity}, ${item.lineTotal}, ${item.customization ? JSON.stringify(item.customization) : ''}, ${now})
          `;
        }
      });
      const order = await getOrderDetail(accountPrisma, orderId);
      if (Number(order.total_amount) === 0) await finalizePaidOrder(accountPrisma, orderId, 'gift_card', `gift-card-${order.gift_card_id}`);
      await sendStoreEmail(accountPrisma, randomUUID, { eventType: 'order_received', recipient: customer.email, subject: `Order received: ${order.order_number}`, text: `We received your order for $${Number(order.total_amount).toFixed(2)}. Payment must be completed within ${RESERVATION_MINUTES} minutes.` });
      res.status(201).json({ order: Number(order.total_amount) === 0 ? await getOrderDetail(accountPrisma, orderId) : order, payment_required: Number(order.total_amount) > 0, reservation_minutes: RESERVATION_MINUTES });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/public/store/:slug/orders', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const now = new Date().toISOString();
      await expireReservations(contextWithCustomer.accountPrisma, now);
      const orders = await contextWithCustomer.accountPrisma.$queryRaw`
        SELECT "id", "order_number", "status", "payment_status", "fulfillment_status", "currency", "total_amount", "created_at", "updated_at"
        FROM "StoreOrder"
        WHERE "customer_id" = ${contextWithCustomer.customer.id}
        ORDER BY "created_at" DESC
      `;
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/public/store/:slug/orders/:orderId', async (req, res, next) => {
    try {
      const contextWithCustomer = await requireCustomer(req, res);
      if (!contextWithCustomer) return;
      const order = await getOrderDetail(contextWithCustomer.accountPrisma, req.params.orderId);
      if (!order || order.customer_id !== contextWithCustomer.customer.id) {
        throwHttp(404, 'Order not found');
      }
      res.json(customerOrderDetail(order));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/public/store/:slug/orders/pay/square', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const data = parseOrThrow(storeOrderSquarePaymentInput, req.body);
      const order = await getPayableOrder(current.accountPrisma, data.order_id, current.customer.id);
      if (order.payment_status === 'paid') { res.json({ paid: true, order }); return; }
      if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) throwHttp(400, 'Square checkout is not configured');
      const square = await import('square');
      const client = new square.SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: String(process.env.SQUARE_ENVIRONMENT).toLowerCase() === 'production' ? square.SquareEnvironment.Production : square.SquareEnvironment.Sandbox });
      const result = await client.payments.create({ sourceId: data.source_id, idempotencyKey: randomUUID(), amountMoney: { amount: BigInt(Math.round(Number(order.total_amount) * 100)), currency: order.currency || 'USD' }, autocomplete: true, locationId: process.env.SQUARE_LOCATION_ID, referenceId: order.id, note: `Store order ${order.order_number}` });
      if (String(result.payment?.status).toUpperCase() !== 'COMPLETED') throwHttp(400, 'Square payment did not complete');
      await finalizePaidOrder(current.accountPrisma, order.id, 'square', String(result.payment?.id || ''));
      res.json({ paid: true, order: await getOrderDetail(current.accountPrisma, order.id) });
    } catch (error) { next(error); }
  });

  app.post('/api/public/store/:slug/orders/pay/paypal/create', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const data = parseOrThrow(storeOrderPayPalInput, req.body);
      const order = await getPayableOrder(current.accountPrisma, data.order_id, current.customer.id);
      if (order.payment_status === 'paid') throwHttp(409, 'Order is already paid');
      const id = String(process.env.PAYPAL_CLIENT_ID || '').trim(), secret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim(); if (!id || !secret) throwHttp(400, 'PayPal checkout is not configured');
      const base = String(process.env.PAYPAL_ENVIRONMENT || '').toLowerCase() === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const tokenResponse = await fetch(`${base}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' }); const token = await tokenResponse.json(); if (!token.access_token) throwHttp(400, 'PayPal authentication failed');
      const response = await fetch(`${base}/v2/checkout/orders`, { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: order.id, description: `Store order ${order.order_number}`, amount: { currency_code: order.currency || 'USD', value: Number(order.total_amount).toFixed(2) } }] }) }); const result = await response.json(); if (!result.id) throwHttp(400, result.message || 'PayPal order creation failed');
      res.json({ order_id: result.id });
    } catch (error) { next(error); }
  });

  app.post('/api/public/store/:slug/orders/pay/paypal/capture', async (req, res, next) => {
    try {
      const current = await requireCustomer(req, res); if (!current) return;
      const data = parseOrThrow(storeOrderPayPalInput, req.body);
      const id = String(process.env.PAYPAL_CLIENT_ID || '').trim(), secret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim(); if (!id || !secret) throwHttp(400, 'PayPal checkout is not configured');
      const base = String(process.env.PAYPAL_ENVIRONMENT || '').toLowerCase() === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const auth = await fetch(`${base}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' }); const token = await auth.json(); if (!token.access_token) throwHttp(400, 'PayPal authentication failed');
      const captureResponse = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(data.order_id)}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, body: '{}' }); const capture = await captureResponse.json(); if (String(capture.status).toUpperCase() !== 'COMPLETED') throwHttp(400, 'PayPal payment did not complete');
      const orderId = String(capture.purchase_units?.[0]?.reference_id || ''); const order = await getOrderDetail(current.accountPrisma, orderId); if (!order || order.customer_id !== current.customer.id) throwHttp(404, 'Order not found');
      const captureId = String(capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || '');
      if (!captureId) throwHttp(400, 'PayPal did not return a payment capture reference');
      await finalizePaidOrder(current.accountPrisma, orderId, 'paypal', captureId); res.json({ paid: true, order: await getOrderDetail(current.accountPrisma, orderId) });
    } catch (error) { next(error); }
  });
}
