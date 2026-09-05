import { resolveStoreCustomer } from '../lib/customerAuth';
import { createD1Repository, type D1Repository } from '../lib/d1';
import { enqueueStoreEmail, type EmailOutboxQueue } from '../lib/emailOutbox';
import {
  ORDER_RESERVATION_MINUTES,
  expireUnpaidReservations,
  mixMatchDiscountPercent,
  money,
  orderNumber,
  reservationExpiry,
} from '../lib/storeCheckout';

const GIFT_CARD_VALUES = Array.from({ length: 100 }, (_, index) => (index + 1) * 5);
const GIFT_CARD_ID = /^system-gift-card-(?:[1-9]\d{0,2})$/;
const US_COUNTRIES = new Set(['united states', 'us', 'usa']);
const LABEL_STYLES = new Set(['classic', 'minimal', 'celebration']);
const LABEL_APPROVAL = new Set(['pending_review', 'approved', 'changes_requested']);

type CheckoutCustomization = {
  size: string;
  scent: string;
  wick: string;
  label: string;
  label_date: string;
  label_message: string;
  label_logo_data: string;
  label_style: 'classic' | 'minimal' | 'celebration';
  label_approval_status: 'pending_review' | 'approved' | 'changes_requested';
  label_production_notes: string;
  extras: string[];
};

type CheckoutItemInput = {
  product_id: string;
  quantity: number;
  customization: CheckoutCustomization | null;
};

type CheckoutInput = {
  items: CheckoutItemInput[];
  shipping_address_id: string;
  delivery_method: 'shipping' | 'pickup';
  pickup_slot_at: string;
  gift_card_code: string;
  gift_card_terms_accepted: boolean;
  gift_card_delivery_method: 'digital' | 'physical';
  customer_credit_id: string;
  discount_code: string;
  customer_note: string;
};

type StoreProductRow = {
  id: string;
  name: string;
  image_data: string;
  product_type: string;
  price: number;
  quantity_in_stock: number;
  limited_drop: number;
  purchase_limit: number;
  upcoming_release: number;
  release_date: string | null;
  preorders_enabled: number;
  member_exclusive: number;
  member_early_access_days: number;
  subscriber_exclusive: number;
  subscriber_early_access_days: number;
};

type MembershipRow = {
  id: string;
  discount_percent: number;
  sample_product_id: string;
};

type SubscriptionRow = {
  id: string;
};

type PickupSlotRow = {
  starts_at: string;
  capacity: number;
};

type PickupSettingsRow = {
  active: number;
  cutoff_hours: number;
};

type CustomerAddressRow = {
  recipient_name: string;
  street_address_1: string;
  street_address_2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country: string;
};

type GiftCardRow = {
  id: string;
  customer_id: string | null;
  code: string;
  initial_balance: number;
  balance: number;
  active: number;
};

type CustomerCreditRow = {
  id: string;
  customer_id: string;
  credit_type: string;
  label: string;
  balance: number;
  active: number;
};

type DiscountCodeRow = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_subtotal: number;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number;
  usage_count: number;
  per_customer_limit: number;
  stack_with_mix: number;
  stack_with_gift_card: number;
  active: number;
};

type OrderRow = Record<string, unknown> & {
  id: string;
  account_id: string;
  customer_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  currency: string;
  subtotal_amount: number;
  total_amount: number;
  customer_email: string;
  discount_code_id: string | null;
  discount_code_amount: number;
  gift_card_id: string | null;
  gift_card_applied_amount: number;
  customer_credit_id: string | null;
  customer_credit_applied_amount: number;
};

type OrderItemForFinalize = {
  product_id: string;
  quantity: number;
  product_type: string;
};

type PurchasedGiftCardRow = {
  product_name: string;
  unit_price: number;
  quantity: number;
};

type ReferralRow = {
  id: string;
  referrer_customer_id: string;
};

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return '';
  }
}

function fail(status: number, message: string): never {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  throw error;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function readBody(request: Request) {
  try {
    return asRecord(await request.json());
  } catch {
    return null;
  }
}

function stringField(value: unknown, min: number, max: number, trim = true) {
  if (typeof value !== 'string') return null;
  const output = trim ? value.trim() : value;
  return output.length >= min && output.length <= max ? output : null;
}

function optionalStringField(value: unknown, max: number, trim = true) {
  if (value === undefined) return '';
  return stringField(value, 0, max, trim);
}

function isIsoDatetime(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function parseProductIds(raw: unknown): string[] {
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseCustomization(value: unknown): CheckoutCustomization | null | undefined {
  if (value === undefined) return null;
  const input = asRecord(value);
  if (!input) return undefined;
  const size = optionalStringField(input.size, 120);
  const scent = optionalStringField(input.scent, 120);
  const wick = optionalStringField(input.wick, 120);
  const label = optionalStringField(input.label, 240);
  const labelDate = optionalStringField(input.label_date, 40);
  const labelMessage = optionalStringField(input.label_message, 240);
  const labelLogo = optionalStringField(input.label_logo_data, 7_000_000, false);
  const labelStyle = optionalStringField(input.label_style, 20);
  const labelApproval = optionalStringField(input.label_approval_status, 30);
  const labelNotes = optionalStringField(input.label_production_notes, 1_000);
  const extrasInput = input.extras === undefined ? [] : input.extras;
  if (
    size === null || scent === null || wick === null || label === null || labelDate === null ||
    labelMessage === null || labelLogo === null || labelStyle === null || labelApproval === null ||
    labelNotes === null || !Array.isArray(extrasInput) || extrasInput.length > 12
  ) {
    return undefined;
  }
  const extras = extrasInput.map((entry) => stringField(entry, 0, 120)).filter((entry): entry is string => entry !== null);
  if (extras.length !== extrasInput.length || !LABEL_STYLES.has(labelStyle) || !LABEL_APPROVAL.has(labelApproval)) return undefined;
  return {
    size,
    scent,
    wick,
    label,
    label_date: labelDate,
    label_message: labelMessage,
    label_logo_data: labelLogo,
    label_style: labelStyle as CheckoutCustomization['label_style'],
    label_approval_status: labelApproval as CheckoutCustomization['label_approval_status'],
    label_production_notes: labelNotes,
    extras,
  };
}

function parseCheckoutInput(input: Record<string, unknown> | null): CheckoutInput | null {
  if (!input || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) return null;
  const items: CheckoutItemInput[] = [];
  for (const rawItem of input.items) {
    const item = asRecord(rawItem);
    const productId = stringField(item?.product_id, 1, 200);
    const quantity = Number(item?.quantity);
    const customization = parseCustomization(item?.customization);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100 || customization === undefined) return null;
    items.push({ product_id: productId, quantity, customization });
  }
  const shippingAddressId = input.shipping_address_id === undefined ? '' : stringField(input.shipping_address_id, 1, 200);
  const deliveryMethod = input.delivery_method === undefined ? 'shipping' : input.delivery_method === 'shipping' || input.delivery_method === 'pickup' ? input.delivery_method : null;
  const pickupSlotAt = input.pickup_slot_at === undefined ? '' : stringField(input.pickup_slot_at, 1, 100);
  const giftCardCode = optionalStringField(input.gift_card_code, 80);
  const customerCreditId = input.customer_credit_id === undefined ? '' : stringField(input.customer_credit_id, 1, 200);
  const discountCode = optionalStringField(input.discount_code, 80);
  const customerNote = optionalStringField(input.customer_note, 2_000);
  const giftCardTermsAccepted = input.gift_card_terms_accepted === undefined ? false : typeof input.gift_card_terms_accepted === 'boolean' ? input.gift_card_terms_accepted : null;
  const giftCardDeliveryMethod = input.gift_card_delivery_method === undefined ? 'digital' : input.gift_card_delivery_method === 'digital' || input.gift_card_delivery_method === 'physical' ? input.gift_card_delivery_method : null;
  if (
    shippingAddressId === null || !deliveryMethod || pickupSlotAt === null || giftCardCode === null ||
    customerCreditId === null || discountCode === null || customerNote === null ||
    giftCardTermsAccepted === null || !giftCardDeliveryMethod
  ) {
    return null;
  }
  if (pickupSlotAt && !isIsoDatetime(pickupSlotAt)) return null;
  return {
    items,
    shipping_address_id: shippingAddressId,
    delivery_method: deliveryMethod,
    pickup_slot_at: pickupSlotAt,
    gift_card_code: giftCardCode,
    gift_card_terms_accepted: giftCardTermsAccepted,
    gift_card_delivery_method: giftCardDeliveryMethod,
    customer_credit_id: customerCreditId,
    discount_code: discountCode,
    customer_note: customerNote,
  };
}

async function ensureGiftCardProducts(repo: D1Repository, accountId: string) {
  const now = new Date().toISOString();
  await repo.batch(
    GIFT_CARD_VALUES.map((value) => ({
      query: `INSERT OR IGNORE INTO Product
        (id, account_id, name, description, product_type, price, quantity_in_stock, cost_per_unit, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'gift_card', ?, 0, 0, ?, ?)`,
      values: [
        `system-gift-card-${value}`,
        accountId,
        `$${value} Digital Gift Card`,
        'A pre-made digital gift card. It is issued to the buyer after successful payment.',
        value,
        now,
        now,
      ],
    })),
  );
}

async function findProducts(repo: D1Repository, accountId: string, ids: string[]) {
  const rows: StoreProductRow[] = [];
  for (let start = 0; start < ids.length; start += 99) {
    const chunk = ids.slice(start, start + 99);
    rows.push(...await repo.all<StoreProductRow>(
      `SELECT id, name, image_data, product_type, price, quantity_in_stock, limited_drop, purchase_limit,
         upcoming_release, release_date, preorders_enabled, member_exclusive, member_early_access_days,
         subscriber_exclusive, subscriber_early_access_days
       FROM Product WHERE account_id = ? AND id IN (${chunk.map(() => '?').join(', ')})`,
      [accountId, ...chunk],
    ));
  }
  return rows;
}

async function getOrderDetail(repo: D1Repository, accountId: string, orderId: string) {
  const order = await repo.first<OrderRow>('SELECT * FROM StoreOrder WHERE account_id = ? AND id = ? LIMIT 1', [accountId, orderId]);
  if (!order) return null;
  const [items, payments] = await Promise.all([
    repo.all<Record<string, unknown>>(
      'SELECT id, product_id, product_name, product_image_data, unit_price, quantity, line_total, customization_json FROM StoreOrderItem WHERE account_id = ? AND order_id = ? ORDER BY created_at ASC',
      [accountId, orderId],
    ),
    repo.all<Record<string, unknown>>(
      'SELECT id, provider, provider_payment_id, status, amount, currency, created_at, updated_at FROM StoreOrderPayment WHERE account_id = ? AND order_id = ? ORDER BY created_at ASC',
      [accountId, orderId],
    ),
  ]);
  return { ...order, items, payments };
}

function customerOrderDetail(order: Record<string, unknown> | null) {
  if (!order) return null;
  const { account_id, customer_id, staff_note, ...detail } = order;
  return detail;
}

async function notifyCustomer(repo: D1Repository, accountId: string, customerId: string, category: string, title: string, message: string, now: string) {
  await repo.run(
    'INSERT INTO StoreCustomerNotification (id, account_id, customer_id, category, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
    [crypto.randomUUID(), accountId, customerId, category, title, message, now],
  );
}

async function awardReward(repo: D1Repository, accountId: string, customerId: string, points: number, source: string, referenceId: string, note: string, now: string) {
  if (!customerId || !Number.isInteger(points) || points === 0) return false;
  const inserted = await repo.run(
    'INSERT OR IGNORE INTO StoreCustomerRewardLedger (id, account_id, customer_id, points, source, reference_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), accountId, customerId, points, source, referenceId, note, now],
  );
  if (Number(inserted.meta.changes || 0) === 0) return false;
  await repo.run(
    `INSERT INTO StoreCustomerRewardBalance (customer_id, account_id, points, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(customer_id) DO UPDATE SET points = StoreCustomerRewardBalance.points + excluded.points, updated_at = excluded.updated_at`,
    [customerId, accountId, points, now],
  );
  return true;
}

function internalProvider(order: OrderRow) {
  if (Number(order.gift_card_applied_amount || 0) > 0) return 'gift_card';
  if (Number(order.customer_credit_applied_amount || 0) > 0) return 'customer_credit';
  return 'internal';
}

export async function finalizeStoreOrderPayment(repo: D1Repository, accountId: string, orderId: string, provider: string, providerPaymentId: string, emailOutbox?: EmailOutboxQueue) {
  const now = new Date().toISOString();
  await expireUnpaidReservations(repo, accountId, now);
  const order = await repo.first<OrderRow>('SELECT * FROM StoreOrder WHERE account_id = ? AND id = ? LIMIT 1', [accountId, orderId]);
  if (!order) fail(404, 'Order not found');
  if (order.payment_status === 'paid') return customerOrderDetail(await getOrderDetail(repo, accountId, orderId));
  if (order.status !== 'awaiting_payment') fail(409, 'This order is no longer available for payment');
  if (order.reservation_expires_at && String(order.reservation_expires_at) <= now) {
    await expireUnpaidReservations(repo, accountId, now);
    fail(409, 'This order reservation expired before payment could be finalized');
  }

  if (order.fulfillment_status !== 'preorder') {
    const items = await repo.all<OrderItemForFinalize>(
      `SELECT i.product_id, i.quantity, p.product_type
       FROM StoreOrderItem i
       JOIN Product p ON p.account_id = i.account_id AND p.id = i.product_id
       WHERE i.account_id = ? AND i.order_id = ?`,
      [accountId, orderId],
    );
    for (const item of items) {
      if (item.product_type === 'gift_card') continue;
      const changed = await repo.run(
        'UPDATE Product SET quantity_in_stock = quantity_in_stock - ? WHERE account_id = ? AND id = ? AND quantity_in_stock >= ?',
        [Number(item.quantity), accountId, item.product_id, Number(item.quantity)],
      );
      if (Number(changed.meta.changes || 0) !== 1) fail(409, 'Stock changed before payment could be finalized');
    }
  }

  if (order.discount_code_id && Number(order.discount_code_amount) > 0) {
    const code = await repo.first<DiscountCodeRow>(
      'SELECT * FROM StoreDiscountCode WHERE account_id = ? AND id = ? LIMIT 1',
      [accountId, order.discount_code_id],
    );
    if (!code || !code.active || (code.starts_at && code.starts_at > now) || (code.expires_at && code.expires_at < now)) {
      fail(409, 'The discount code is no longer available for this order');
    }
    if (Number(code.usage_limit) > 0 && Number(code.usage_count) >= Number(code.usage_limit)) {
      fail(409, 'The discount code has reached its redemption limit');
    }
    const redemptionCount = await repo.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM StoreDiscountRedemption WHERE account_id = ? AND discount_code_id = ? AND customer_id = ?',
      [accountId, code.id, order.customer_id],
    );
    if (Number(code.per_customer_limit) > 0 && Number(redemptionCount?.count || 0) >= Number(code.per_customer_limit)) {
      fail(409, 'You have already reached the redemption limit for this discount code');
    }
    const incremented = await repo.run(
      'UPDATE StoreDiscountCode SET usage_count = usage_count + 1, updated_at = ? WHERE account_id = ? AND id = ? AND (usage_limit = 0 OR usage_count < usage_limit)',
      [now, accountId, code.id],
    );
    if (Number(incremented.meta.changes || 0) !== 1) fail(409, 'The discount code has reached its redemption limit');
    await repo.run(
      'INSERT INTO StoreDiscountRedemption (id, account_id, discount_code_id, customer_id, order_id, amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), accountId, code.id, order.customer_id, orderId, Number(order.discount_code_amount), now],
    );
  }

  await repo.run(
    "UPDATE StoreOrder SET status = 'paid', payment_status = 'paid', paid_at = ?, reservation_expires_at = NULL, updated_at = ? WHERE account_id = ? AND id = ?",
    [now, now, accountId, orderId],
  );

  if (order.gift_card_id && Number(order.gift_card_applied_amount) > 0) {
    const applied = money(Number(order.gift_card_applied_amount));
    const changed = await repo.run(
      'UPDATE StoreGiftCard SET balance = balance - ?, updated_at = ? WHERE account_id = ? AND id = ? AND active = 1 AND balance >= ?',
      [applied, now, accountId, order.gift_card_id, applied],
    );
    if (Number(changed.meta.changes || 0) !== 1) fail(409, 'The selected gift card balance changed before payment could be finalized');
    const card = await repo.first<{ balance: number; customer_id: string | null; code: string }>(
      'SELECT balance, customer_id, code FROM StoreGiftCard WHERE account_id = ? AND id = ? LIMIT 1',
      [accountId, order.gift_card_id],
    );
    await repo.run(
      'INSERT INTO StoreGiftCardUsage (id, account_id, gift_card_id, order_id, amount, balance_after, usage_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), accountId, order.gift_card_id, orderId, -applied, Number(card?.balance || 0), 'redeem', `Applied to order ${order.order_number}`, now],
    );
    if (card?.customer_id) {
      await notifyCustomer(
        repo,
        accountId,
        card.customer_id,
        'gift_card',
        'Gift card used',
        `$${applied.toFixed(2)} was used from gift card ending in ${String(card.code).slice(-6)}. Remaining balance: $${Number(card.balance).toFixed(2)}.`,
        now,
      );
    }
  }

  if (order.customer_credit_id && Number(order.customer_credit_applied_amount) > 0) {
    const applied = money(Number(order.customer_credit_applied_amount));
    const changed = await repo.run(
      'UPDATE StoreCustomerCredit SET balance = balance - ?, updated_at = ? WHERE account_id = ? AND id = ? AND active = 1 AND balance >= ?',
      [applied, now, accountId, order.customer_credit_id, applied],
    );
    if (Number(changed.meta.changes || 0) !== 1) fail(409, 'The selected account credit balance changed before payment could be finalized');
    const credit = await repo.first<{ balance: number; customer_id: string; label: string; credit_type: string }>(
      'SELECT balance, customer_id, label, credit_type FROM StoreCustomerCredit WHERE account_id = ? AND id = ? LIMIT 1',
      [accountId, order.customer_credit_id],
    );
    await repo.run(
      'INSERT INTO StoreCustomerCreditUsage (id, account_id, customer_credit_id, order_id, amount, balance_after, usage_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), accountId, order.customer_credit_id, orderId, -applied, Number(credit?.balance || 0), 'redeem', `Applied to order ${order.order_number}`, now],
    );
    if (credit?.customer_id) {
      await notifyCustomer(
        repo,
        accountId,
        credit.customer_id,
        credit.credit_type,
        'Account credit used',
        `$${applied.toFixed(2)} was used from ${credit.label || 'your account credit'}. Remaining balance: $${Number(credit.balance).toFixed(2)}.`,
        now,
      );
    }
  }

  const purchasedGiftCards = await repo.all<PurchasedGiftCardRow>(
    `SELECT i.product_name, i.unit_price, i.quantity
     FROM StoreOrderItem i
     JOIN Product p ON p.account_id = i.account_id AND p.id = i.product_id
     WHERE i.account_id = ? AND i.order_id = ? AND p.product_type = 'gift_card'`,
    [accountId, orderId],
  );
  for (const item of purchasedGiftCards) {
    for (let count = 0; count < Number(item.quantity); count += 1) {
      const cardId = crypto.randomUUID();
      const code = `CM-GIFT-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
      const balance = money(Number(item.unit_price));
      await repo.batch([
        {
          query: 'INSERT INTO StoreGiftCard (id, account_id, code, customer_id, initial_balance, balance, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
          values: [cardId, accountId, code, order.customer_id, balance, balance, now, now],
        },
        {
          query: 'INSERT INTO StoreGiftCardUsage (id, account_id, gift_card_id, order_id, amount, balance_after, usage_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          values: [crypto.randomUUID(), accountId, cardId, orderId, balance, balance, 'purchase_issue', `Issued from order ${order.order_number}`, now],
        },
      ]);
      await notifyCustomer(
        repo,
        accountId,
        order.customer_id,
        'gift_card',
        'Gift card purchase completed',
        `A $${balance.toFixed(2)} gift card was added to your account. Code: ${code}. It is ready to use at checkout.`,
        now,
      );
    }
  }

  await awardReward(repo, accountId, order.customer_id, Math.floor(Number(order.subtotal_amount)), 'purchase', orderId, `Earned from order ${order.order_number}`, now);
  const referral = await repo.first<ReferralRow>(
    "SELECT id, referrer_customer_id FROM StoreCustomerReferral WHERE account_id = ? AND referred_customer_id = ? AND status = 'signed_up' LIMIT 1",
    [accountId, order.customer_id],
  );
  if (referral) {
    await awardReward(repo, accountId, referral.referrer_customer_id, 50, 'referral', referral.id, 'Referral completed a first paid order', now);
    await repo.run(
      "UPDATE StoreCustomerReferral SET status = 'completed', completed_at = ? WHERE account_id = ? AND id = ?",
      [now, accountId, referral.id],
    );
  }

  await repo.run(
    'INSERT INTO StoreOrderPayment (id, account_id, order_id, provider, provider_payment_id, status, amount, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), accountId, orderId, provider, providerPaymentId, 'paid', Number(order.total_amount), order.currency || 'USD', now, now],
  );
  await enqueueStoreEmail(repo, emailOutbox, { accountId, eventType: 'payment_confirmation', recipient: order.customer_email, subject: `Payment confirmed for ${order.order_number}`, body: `Your payment of $${Number(order.total_amount).toFixed(2)} was confirmed. Order: ${order.order_number}.`, now });

  return customerOrderDetail(await getOrderDetail(repo, accountId, orderId));
}

export async function getPayableStoreOrder(repo: D1Repository, accountId: string, orderId: string, customerId: string) {
  await expireUnpaidReservations(repo, accountId, new Date().toISOString());
  const order = await getOrderDetail(repo, accountId, orderId);
  if (!order || String(order.customer_id) !== customerId) fail(404, 'Order not found');
  if (String(order.payment_status) === 'paid') return customerOrderDetail(order);
  if (String(order.status) !== 'awaiting_payment' || String(order.payment_status) !== 'unpaid') {
    fail(409, 'This order is no longer available for payment');
  }
  return customerOrderDetail(order);
}

export async function handlePublicCheckoutRequest(request: Request, db: D1Database | undefined, emailOutbox?: EmailOutboxQueue): Promise<Response | null> {
  if (!db || request.method !== 'POST') return null;

  const match = new URL(request.url).pathname.match(/^\/api\/public\/store\/([^/]+)\/orders$/);
  if (!match) return null;

  try {
    const slug = decodeSegment(match[1]);
    if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });

    const customer = await resolveStoreCustomer(db, request, slug);
    if (!customer) return json({ error: 'Unauthorized' }, { status: 401 });

    const repo = createD1Repository(db);
    const input = parseCheckoutInput(await readBody(request));
    if (!input) return json({ error: 'Invalid order request' }, { status: 400 });

    const account = await repo.first<{ store_product_ids: string }>(
      "SELECT store_product_ids FROM Account WHERE id = ? AND plan_tier = 'elite' LIMIT 1",
      [customer.accountId],
    );
    if (!account) return json({ error: 'Storefront not found' }, { status: 404 });

    await ensureGiftCardProducts(repo, customer.accountId);

    const quantityByProduct = new Map<string, number>();
    const customizationByProduct = new Map<string, CheckoutCustomization | null>();
    const selectedProductIds = new Set([
      ...parseProductIds(account.store_product_ids),
      ...GIFT_CARD_VALUES.map((value) => `system-gift-card-${value}`),
    ]);
    for (const item of input.items) {
      quantityByProduct.set(item.product_id, (quantityByProduct.get(item.product_id) || 0) + item.quantity);
      if (item.customization) customizationByProduct.set(item.product_id, item.customization);
    }
    const productIds = [...quantityByProduct.keys()];
    if (productIds.some((id) => !selectedProductIds.has(id) && !GIFT_CARD_ID.test(id))) {
      return json({ error: 'One or more items are no longer available in this storefront' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const reservationExpiresAt = reservationExpiry();
    await expireUnpaidReservations(repo, customer.accountId, now);

    const products = await findProducts(repo, customer.accountId, productIds);
    const productMap = new Map(products.map((product) => [product.id, product]));
    if (productMap.size !== productIds.length) {
      return json({ error: 'One or more products are no longer available' }, { status: 400 });
    }

    const [membership, subscription] = await Promise.all([
      repo.first<MembershipRow>(
        `SELECT m.id, p.discount_percent, p.sample_product_id
         FROM StoreCustomerMembership m
         JOIN StoreMembershipProgram p ON p.account_id = m.account_id
         WHERE m.account_id = ? AND m.customer_id = ? AND m.status = 'active' AND p.active = 1
           AND (m.ends_at IS NULL OR m.ends_at > ?)
         ORDER BY m.updated_at DESC LIMIT 1`,
        [customer.accountId, customer.customerId, now],
      ),
      repo.first<SubscriptionRow>(
        "SELECT id FROM StoreCustomerSubscription WHERE account_id = ? AND customer_id = ? AND status = 'active' AND payment_status = 'paid' LIMIT 1",
        [customer.accountId, customer.customerId],
      ),
    ]);

    if (products.some((product) => product.id.startsWith('system-gift-card-') && product.product_type !== 'gift_card')) {
      return json({ error: 'Invalid gift card product.' }, { status: 400 });
    }

    const preorderProductIds = products
      .filter((product) => Boolean(product.upcoming_release) && Boolean(product.preorders_enabled))
      .map((product) => product.id);
    if (preorderProductIds.length && preorderProductIds.length !== productIds.length) {
      return json({ error: 'Preorder items must be checked out separately from in-stock items' }, { status: 409 });
    }
    const isPreorderOrder = preorderProductIds.length > 0;

    let shippingAddress: CustomerAddressRow | null = null;
    if (input.delivery_method === 'pickup') {
      if (!input.pickup_slot_at) return json({ error: 'Select an available pickup time.' }, { status: 400 });
      const slot = await repo.first<PickupSlotRow>(
        'SELECT starts_at, capacity FROM StorePickupSlot WHERE account_id = ? AND starts_at = ? AND active = 1 LIMIT 1',
        [customer.accountId, input.pickup_slot_at],
      );
      const settings = await repo.first<PickupSettingsRow>(
        'SELECT active, cutoff_hours FROM StorePickupSettings WHERE account_id = ? LIMIT 1',
        [customer.accountId],
      );
      const reserved = await repo.first<{ count: number }>(
        "SELECT COUNT(*) AS count FROM StoreOrder WHERE account_id = ? AND pickup_slot_at = ? AND status NOT IN ('cancelled', 'refunded')",
        [customer.accountId, input.pickup_slot_at],
      );
      if (
        !slot || !settings?.active ||
        Number(reserved?.count || 0) >= Number(slot.capacity) ||
        new Date(slot.starts_at).getTime() <= Date.now() + Number(settings.cutoff_hours || 24) * 3_600_000
      ) {
        return json({ error: 'That pickup time is no longer available.' }, { status: 400 });
      }
    }

    if (input.delivery_method === 'shipping' && input.shipping_address_id) {
      shippingAddress = await repo.first<CustomerAddressRow>(
        `SELECT recipient_name, street_address_1, street_address_2, city, state_region, postal_code, country
         FROM StoreCustomerAddress WHERE account_id = ? AND customer_id = ? AND id = ? LIMIT 1`,
        [customer.accountId, customer.customerId, input.shipping_address_id],
      );
      if (!shippingAddress) return json({ error: 'Selected shipping address was not found' }, { status: 400 });
      if (!US_COUNTRIES.has(String(shippingAddress.country || '').trim().toLowerCase())) {
        return json({ error: 'This storefront currently ships only within the United States' }, { status: 400 });
      }
    }

    const orderItems: Array<{
      product: StoreProductRow;
      quantity: number;
      customization: CheckoutCustomization | null;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    for (const productId of productIds) {
      const product = productMap.get(productId);
      const quantity = quantityByProduct.get(productId) || 0;
      const customization = customizationByProduct.get(productId) || null;
      if (!product) continue;
      if (customization && product.product_type !== 'custom') {
        return json({ error: 'Custom selections are only allowed for a custom candle product' }, { status: 400 });
      }

      const releaseAt = product.release_date ? new Date(product.release_date).getTime() : Number.POSITIVE_INFINITY;
      const memberEarlyAccessOpensAt = releaseAt - Number(product.member_early_access_days || 0) * 86_400_000;
      const subscriberEarlyAccessOpensAt = releaseAt - Number(product.subscriber_early_access_days || 0) * 86_400_000;
      const hasEarlyAccess = (Boolean(membership) && Date.now() >= memberEarlyAccessOpensAt) || (Boolean(subscription) && Date.now() >= subscriberEarlyAccessOpensAt);

      if (product.member_exclusive && !membership) {
        return json({ error: `${product.name} is available only to active members.` }, { status: 403 });
      }
      if (product.subscriber_exclusive && !subscription) {
        return json({ error: `${product.name} is available only to active subscribers.` }, { status: 403 });
      }
      if (product.upcoming_release && !product.preorders_enabled && !hasEarlyAccess) {
        return json({ error: `${product.name} is not available until its release.` }, { status: 409 });
      }

      if (product.product_type !== 'gift_card' && !isPreorderOrder) {
        const reservation = await repo.first<{ reserved_quantity: number }>(
          `SELECT COALESCE(SUM(i.quantity), 0) AS reserved_quantity
           FROM StoreOrderItem i
           JOIN StoreOrder o ON o.account_id = i.account_id AND o.id = i.order_id
           WHERE i.account_id = ? AND i.product_id = ? AND o.status = 'awaiting_payment'
             AND o.payment_status = 'unpaid' AND o.reservation_expires_at > ?`,
          [customer.accountId, productId, now],
        );
        const reserved = Number(reservation?.reserved_quantity || 0);
        if (Number(product.quantity_in_stock) - reserved < quantity) {
          return json({ error: `${product.name} does not have enough stock available` }, { status: 409 });
        }
      }

      if (product.limited_drop && Number(product.purchase_limit) > 0) {
        const purchased = await repo.first<{ purchased_quantity: number }>(
          `SELECT COALESCE(SUM(i.quantity), 0) AS purchased_quantity
           FROM StoreOrderItem i
           JOIN StoreOrder o ON o.account_id = i.account_id AND o.id = i.order_id
           WHERE i.account_id = ? AND i.product_id = ? AND o.customer_id = ?
             AND o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'refunded')`,
          [customer.accountId, productId, customer.customerId],
        );
        if (Number(purchased?.purchased_quantity || 0) + quantity > Number(product.purchase_limit)) {
          return json({ error: `${product.name} is limited to ${product.purchase_limit} per customer` }, { status: 409 });
        }
      }

      const unitPrice = money(Number(product.price));
      orderItems.push({
        product,
        quantity,
        customization,
        unitPrice,
        lineTotal: money(unitPrice * quantity),
      });
    }

    const subtotal = money(orderItems.reduce((sum, item) => sum + item.lineTotal, 0));
    if (orderItems.some((item) => item.product.product_type === 'gift_card') && !input.gift_card_terms_accepted) {
      return json({ error: 'Gift card terms and conditions must be accepted before purchase.' }, { status: 400 });
    }

    const hasPhysicalGiftCard = orderItems.some((item) => item.product.product_type === 'gift_card') && input.gift_card_delivery_method === 'physical';
    if (hasPhysicalGiftCard && !shippingAddress) {
      return json({ error: 'A shipping address is required for a physical gift card.' }, { status: 400 });
    }

    if (membership?.sample_product_id && !orderItems.some((item) => item.product.id === membership.sample_product_id)) {
      const sample = await repo.first<StoreProductRow>(
        'SELECT id, name, image_data, product_type, price, quantity_in_stock, limited_drop, purchase_limit, upcoming_release, release_date, preorders_enabled, member_exclusive, member_early_access_days, subscriber_exclusive, subscriber_early_access_days FROM Product WHERE account_id = ? AND id = ? LIMIT 1',
        [customer.accountId, membership.sample_product_id],
      );
      if (sample && sample.product_type === 'sample' && Number(sample.quantity_in_stock) > 0) {
        orderItems.push({ product: sample, quantity: 1, customization: null, unitPrice: 0, lineTotal: 0 });
      }
    }

    const eligibleItems = orderItems.filter((item) => item.product.product_type !== 'gift_card');
    const eligibleSubtotal = money(eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const itemCount = eligibleItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    let mixDiscountAmount = money(eligibleSubtotal * mixMatchDiscountPercent(itemCount));
    const membershipDiscountAmount = membership ? money((eligibleSubtotal - mixDiscountAmount) * (Number(membership.discount_percent || 0) / 100)) : 0;

    let giftCard: GiftCardRow | null = null;
    let customerCredit: CustomerCreditRow | null = null;
    let discountCode: DiscountCodeRow | null = null;
    let discountCodeAmount = 0;

    if (input.gift_card_code) {
      if (orderItems.some((item) => item.product.product_type === 'gift_card')) {
        return json({ error: 'Gift cards cannot be used to purchase gift-card products.' }, { status: 400 });
      }
      giftCard = await repo.first<GiftCardRow>(
        'SELECT id, customer_id, code, initial_balance, balance, active FROM StoreGiftCard WHERE account_id = ? AND upper(code) = ? AND active = 1 LIMIT 1',
        [customer.accountId, input.gift_card_code.toUpperCase()],
      );
      if (!giftCard || giftCard.customer_id !== customer.customerId) {
        return json({ error: 'That gift card is not available for this customer account.' }, { status: 400 });
      }
      if (Number(giftCard.balance) <= 0) {
        return json({ error: 'That gift card has no remaining balance.' }, { status: 400 });
      }
    }

    if (input.customer_credit_id) {
      customerCredit = await repo.first<CustomerCreditRow>(
        'SELECT id, customer_id, credit_type, label, balance, active FROM StoreCustomerCredit WHERE account_id = ? AND id = ? AND customer_id = ? AND active = 1 LIMIT 1',
        [customer.accountId, input.customer_credit_id, customer.customerId],
      );
      if (!customerCredit || Number(customerCredit.balance) <= 0) {
        return json({ error: 'That account credit is not available.' }, { status: 400 });
      }
    }

    if (input.discount_code) {
      if (orderItems.some((item) => item.product.product_type === 'gift_card')) {
        return json({ error: 'Discount codes cannot be applied to gift-card products.' }, { status: 400 });
      }
      discountCode = await repo.first<DiscountCodeRow>(
        'SELECT * FROM StoreDiscountCode WHERE account_id = ? AND upper(code) = ? LIMIT 1',
        [customer.accountId, input.discount_code.toUpperCase()],
      );
      if (!discountCode || !discountCode.active) return json({ error: 'That discount code is not available.' }, { status: 400 });
      if (discountCode.starts_at && discountCode.starts_at > now) return json({ error: 'That discount code is not active yet.' }, { status: 400 });
      if (discountCode.expires_at && discountCode.expires_at < now) return json({ error: 'That discount code has expired.' }, { status: 400 });
      if (Number(discountCode.usage_limit) > 0 && Number(discountCode.usage_count) >= Number(discountCode.usage_limit)) {
        return json({ error: 'That discount code has reached its redemption limit.' }, { status: 400 });
      }
      if (eligibleSubtotal < Number(discountCode.minimum_subtotal)) {
        return json({ error: `This discount code requires a $${Number(discountCode.minimum_subtotal).toFixed(2)} eligible subtotal.` }, { status: 400 });
      }
      if (giftCard && !discountCode.stack_with_gift_card) {
        return json({ error: 'This discount code cannot be combined with a gift card.' }, { status: 400 });
      }
      const redemptionCount = await repo.first<{ count: number }>(
        'SELECT COUNT(*) AS count FROM StoreDiscountRedemption WHERE account_id = ? AND discount_code_id = ? AND customer_id = ?',
        [customer.accountId, discountCode.id, customer.customerId],
      );
      if (Number(discountCode.per_customer_limit) > 0 && Number(redemptionCount?.count || 0) >= Number(discountCode.per_customer_limit)) {
        return json({ error: 'You have already reached the redemption limit for this discount code.' }, { status: 400 });
      }
      const discountBase = Math.max(0, eligibleSubtotal - mixDiscountAmount - membershipDiscountAmount);
      discountCodeAmount = discountCode.discount_type === 'percent'
        ? money(discountBase * (Number(discountCode.discount_value) / 100))
        : money(Math.min(discountBase, Number(discountCode.discount_value)));
      if (!discountCode.stack_with_mix) {
        if (discountCodeAmount >= mixDiscountAmount) mixDiscountAmount = 0;
        else discountCodeAmount = 0;
      }
    }

    const subtotalAfterDiscountCodes = money(subtotal - mixDiscountAmount - membershipDiscountAmount - discountCodeAmount);
    const giftCardDiscountAmount = giftCard
      ? money(subtotalAfterDiscountCodes * (Number(giftCard.initial_balance) >= 100 ? 0.1 : 0.05))
      : 0;
    const afterDiscounts = money(Math.max(0, subtotalAfterDiscountCodes - giftCardDiscountAmount));
    const giftCardAppliedAmount = giftCard ? money(Math.min(Number(giftCard.balance), afterDiscounts)) : 0;
    const afterGiftCard = money(Math.max(0, afterDiscounts - giftCardAppliedAmount));
    const customerCreditAppliedAmount = customerCredit ? money(Math.min(Number(customerCredit.balance), afterGiftCard)) : 0;
    const discountAmount = money(
      mixDiscountAmount +
      membershipDiscountAmount +
      discountCodeAmount +
      giftCardDiscountAmount +
      giftCardAppliedAmount +
      customerCreditAppliedAmount
    );
    const totalAmount = money(Math.max(0, afterGiftCard - customerCreditAppliedAmount));

    const orderNumberValue = orderNumber();
    await repo.run(
      `INSERT INTO StoreOrder (
        id, account_id, order_number, customer_id, customer_name, customer_email, customer_phone, status, payment_status,
        fulfillment_status, delivery_method, pickup_slot_at, currency, subtotal_amount, discount_amount, shipping_amount,
        tax_amount, total_amount, gift_card_id, gift_card_discount_amount, gift_card_applied_amount, gift_card_terms_accepted,
        gift_card_delivery_method, customer_credit_id, customer_credit_applied_amount, discount_code_id, discount_code,
        discount_code_amount, membership_discount_amount, customer_note, staff_note, shipping_recipient_name,
        shipping_street_address_1, shipping_street_address_2, shipping_city, shipping_state_region, shipping_postal_code,
        shipping_country, reservation_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', 'unpaid', ?, ?, ?, 'USD', ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        customer.accountId,
        orderNumberValue,
        customer.customerId,
        customer.name,
        customer.email,
        customer.phone || '',
        isPreorderOrder ? 'preorder' : input.delivery_method === 'pickup' ? 'ready_for_pickup' : 'unfulfilled',
        input.delivery_method,
        input.delivery_method === 'pickup' ? input.pickup_slot_at : null,
        subtotal,
        discountAmount,
        totalAmount,
        giftCard?.id || null,
        giftCardDiscountAmount,
        giftCardAppliedAmount,
        input.gift_card_terms_accepted ? 1 : 0,
        hasPhysicalGiftCard ? 'physical' : 'digital',
        customerCredit?.id || null,
        customerCreditAppliedAmount,
        discountCode?.id || null,
        discountCode?.code || '',
        discountCodeAmount,
        membershipDiscountAmount,
        input.customer_note,
        input.delivery_method === 'pickup' ? 'Local pickup selected.' : hasPhysicalGiftCard ? 'Physical gift card shipment requested.' : '',
        shippingAddress?.recipient_name || '',
        shippingAddress?.street_address_1 || '',
        shippingAddress?.street_address_2 || '',
        shippingAddress?.city || '',
        shippingAddress?.state_region || '',
        shippingAddress?.postal_code || '',
        shippingAddress?.country || '',
        reservationExpiresAt,
        now,
        now,
      ],
    );

    await repo.batch(orderItems.map((item) => ({
      query: `INSERT INTO StoreOrderItem
        (id, account_id, order_id, product_id, product_name, product_image_data, unit_price, quantity, line_total, customization_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        crypto.randomUUID(),
        customer.accountId,
        orderId,
        item.product.id,
        item.product.name,
        item.product.image_data || '',
        item.unitPrice,
        item.quantity,
        item.lineTotal,
        item.customization ? JSON.stringify(item.customization) : '',
        now,
      ],
    })));
    await enqueueStoreEmail(repo, emailOutbox, { accountId: customer.accountId, eventType: 'order_received', recipient: customer.email, subject: `Order received: ${orderNumberValue}`, body: `We received your order. Payment must be completed within ${ORDER_RESERVATION_MINUTES} minutes.`, now });

    let order = customerOrderDetail(await getOrderDetail(repo, customer.accountId, orderId));
    const paymentRequired = Number(order?.total_amount || 0) > 0;
    if (!paymentRequired) {
      order = await finalizeStoreOrderPayment(
        repo,
        customer.accountId,
        orderId,
        internalProvider((await repo.first<OrderRow>('SELECT * FROM StoreOrder WHERE account_id = ? AND id = ? LIMIT 1', [customer.accountId, orderId]))!),
        `zero-total-${orderId}`,
        emailOutbox,
      );
    }

    return json({
      order,
      payment_required: paymentRequired,
      reservation_minutes: ORDER_RESERVATION_MINUTES,
    }, { status: 201 });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: number }).status) || 500 : 500;
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return json({ error: message }, { status });
  }
}
