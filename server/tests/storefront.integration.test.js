import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const port = 3119;
const baseUrl = `http://127.0.0.1:${port}`;
const slug = 'kachamaton';
const smokeSlotId = 'api-test-workshop-slot';
const smokeEmail = 'api-test-nonpayment@example.test';
const smokeProductId = 'api-test-storefront-product';
let server;
let accountDb;
let masterDb;
let accountId;
let originalStoreProductIds;

async function waitForApi() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/public/store/${slug}/refill-program`);
      if (response.status === 200) return;
    } catch {
      // The child process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Test API did not start within 15 seconds.');
}

before(async () => {
  masterDb = new PrismaClient();
  const accounts = await masterDb.$queryRaw`SELECT "id", "store_product_ids" FROM "Account" WHERE "store_slug" = ${slug} AND "plan_tier" = 'elite' LIMIT 1`;
  assert.ok(accounts[0]?.id, `Expected an elite storefront with slug ${slug}.`);
  accountId = accounts[0].id;
  originalStoreProductIds = accounts[0].store_product_ids || '[]';
  const filePath = path.join(process.cwd(), 'storage', 'accounts', `${accountId}.db`).replace(/\\/g, '/');
  accountDb = new PrismaClient({ datasources: { db: { url: `file:${filePath}` } } });
  await accountDb.$executeRaw`DELETE FROM "StoreWorkshopBooking" WHERE "slot_id" = ${smokeSlotId}`;
  await accountDb.$executeRaw`DELETE FROM "StoreWorkshopSlot" WHERE "id" = ${smokeSlotId}`;
  await accountDb.$executeRaw`DELETE FROM "StoreWorkshopPartyRequest" WHERE "email" = ${smokeEmail}`;
  await accountDb.$executeRaw`DELETE FROM "StoreRefillRequest" WHERE "email" = ${smokeEmail}`;
  await accountDb.$executeRaw`DELETE FROM "StoreOrderItem" WHERE "product_id" = ${smokeProductId}`;
  await accountDb.$executeRaw`DELETE FROM "Product" WHERE "id" = ${smokeProductId}`;
  server = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, API_PORT: String(port) }, stdio: 'ignore' });
  await waitForApi();
});

after(async () => {
  if (accountDb) {
    await accountDb.$executeRaw`DELETE FROM "StoreWorkshopBooking" WHERE "slot_id" = ${smokeSlotId}`;
    await accountDb.$executeRaw`DELETE FROM "StoreWorkshopSlot" WHERE "id" = ${smokeSlotId}`;
    await accountDb.$executeRaw`DELETE FROM "StoreWorkshopPartyRequest" WHERE "email" = ${smokeEmail}`;
    await accountDb.$executeRaw`DELETE FROM "StoreRefillRequest" WHERE "email" = ${smokeEmail}`;
    await accountDb.$executeRaw`DELETE FROM "StoreOrderItem" WHERE "product_id" = ${smokeProductId}`;
    await accountDb.$executeRaw`DELETE FROM "Product" WHERE "id" = ${smokeProductId}`;
    await accountDb.$disconnect();
  }
  if (masterDb) {
    await masterDb.$executeRaw`UPDATE "Account" SET "store_product_ids" = ${originalStoreProductIds} WHERE "id" = ${accountId}`;
    await masterDb.$disconnect();
  }
  if (server && !server.killed) server.kill();
});

test('public storefront reads remain available', async () => {
  const response = await fetch(`${baseUrl}/api/public/store/${slug}/refill-program`);
  assert.equal(response.status, 200);
  const program = await response.json();
  assert.equal(typeof program.discount_percent, 'number');
});

test('catalog, discovery, launch, pickup, and subscription surfaces load without payment setup', async () => {
  const paths = [
    `/api/public/store/${slug}`,
    `/api/public/store/${slug}/fragrance-oils`,
    `/api/public/store/${slug}/launch-tools`,
    `/api/public/store/${slug}/pickup`,
    `/api/public/store/${slug}/subscription-plans`,
    `/api/public/store/${slug}/gallery`,
    `/api/public/store/${slug}/workshops`,
  ];
  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} should return 200`);
  }
});

test('private party and refill services create separate non-payment fulfillment records', async () => {
  const party = await fetch(`${baseUrl}/api/public/store/${slug}/workshop-party-requests`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'API Test', email: smokeEmail, event_type: 'birthday', requested_date: '2030-02-01', party_size: 8, details: 'Integration test.' }),
  });
  const refill = await fetch(`${baseUrl}/api/public/store/${slug}/refill-requests`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'API Test', email: smokeEmail, product_name: 'Test Vessel', scent: 'Vanilla', quantity: 1, container_condition: 'clean_intact', details: 'Integration test.' }),
  });
  const [partyRows, refillRows] = await Promise.all([
    accountDb.$queryRaw`SELECT "status" FROM "StoreWorkshopPartyRequest" WHERE "email" = ${smokeEmail} LIMIT 1`,
    accountDb.$queryRaw`SELECT "status", "discount_percent" FROM "StoreRefillRequest" WHERE "email" = ${smokeEmail} LIMIT 1`,
  ]);
  assert.equal(party.status, 201);
  assert.equal(refill.status, 201);
  assert.equal(partyRows[0]?.status, 'new');
  assert.equal(refillRows[0]?.status, 'new');
  assert.equal(typeof Number(refillRows[0]?.discount_percent), 'number');
});

test('signed-in customers can reach their non-payment account surfaces', async () => {
  const login = await fetch(`${baseUrl}/api/public/store/${slug}/customers/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'mock.avery@candles.local', password: 'MockCandle!2026' }),
  });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const paths = ['customers/me', 'orders', 'customers/rewards', 'customers/collections', 'customers/favorites', 'customers/subscriptions', 'customers/registries'];
  for (const path of paths) {
    const response = await fetch(`${baseUrl}/api/public/store/${slug}/${path}`, { headers: { 'x-store-customer-token': token } });
    assert.equal(response.status, 200, `customer ${path} should return 200`);
  }
});

test('checkout reserves stock and applies the mix-and-match discount before provider payment', async () => {
  const selected = new Set(JSON.parse(originalStoreProductIds || '[]'));
  selected.add(smokeProductId);
  await accountDb.$executeRaw`INSERT INTO "Product" ("id", "name", "description", "image_data", "product_type", "price", "quantity_in_stock", "cost_per_unit", "created_at", "updated_at") VALUES (${smokeProductId}, ${'API Test Candle'}, ${'Temporary integration-test candle.'}, ${''}, ${'physical'}, ${10}, ${20}, ${4}, ${new Date().toISOString()}, ${new Date().toISOString()})`;
  await masterDb.$executeRaw`UPDATE "Account" SET "store_product_ids" = ${JSON.stringify([...selected])} WHERE "id" = ${accountId}`;
  const login = await fetch(`${baseUrl}/api/public/store/${slug}/customers/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'mock.avery@candles.local', password: 'MockCandle!2026' }) });
  const { token } = await login.json();
  const response = await fetch(`${baseUrl}/api/public/store/${slug}/orders`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-store-customer-token': token },
    body: JSON.stringify({ items: [{ product_id: smokeProductId, quantity: 3 }], delivery_method: 'shipping', shipping_address_id: 'mock-store-address-01' }),
  });
  const checkout = await response.json();
  assert.equal(response.status, 201, checkout.error || 'Checkout should create an order.');
  const { order, payment_required } = checkout;
  assert.equal(payment_required, true);
  assert.equal(Number(order.subtotal_amount), 30);
  assert.ok(Number(order.discount_amount) >= 6, 'three items should include the 20% mix discount');
  const reservation = await accountDb.$queryRaw`SELECT "reservation_expires_at", "status", "payment_status" FROM "StoreOrder" WHERE "id" = ${order.id} LIMIT 1`;
  assert.equal(reservation[0]?.status, 'awaiting_payment');
  assert.equal(reservation[0]?.payment_status, 'unpaid');
  assert.ok(reservation[0]?.reservation_expires_at);
  await accountDb.$executeRaw`DELETE FROM "StoreOrderItem" WHERE "order_id" = ${order.id}`;
  await accountDb.$executeRaw`DELETE FROM "StoreOrder" WHERE "id" = ${order.id}`;
});

test('public invalid form data is rejected before it is stored', async () => {
  const response = await fetch(`${baseUrl}/api/public/store/${slug}/refill-requests`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '', email: 'not-an-email', product_name: '', quantity: 0, container_condition: 'invalid' }),
  });
  assert.equal(response.status, 400);
});

test('owner storefront routes require account authentication', async () => {
  const response = await fetch(`${baseUrl}/api/storefront/workshops`);
  assert.equal(response.status, 401);
});

test('workshop bookings enforce remaining party-seat capacity', async () => {
  await accountDb.$executeRaw`INSERT INTO "StoreWorkshopSlot" ("id", "starts_at", "capacity", "deposit_amount", "active") VALUES (${smokeSlotId}, ${'2030-01-01T18:00:00.000Z'}, ${2}, ${10}, ${1})`;
  const first = await fetch(`${baseUrl}/api/public/store/${slug}/workshops/${smokeSlotId}/book`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'API Test', email: 'api-test@example.test', party_size: 2 }),
  });
  const second = await fetch(`${baseUrl}/api/public/store/${slug}/workshops/${smokeSlotId}/book`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'API Test Overflow', email: 'api-test-overflow@example.test', party_size: 1 }),
  });
  assert.equal(first.status, 201);
  assert.equal(second.status, 409);
});
