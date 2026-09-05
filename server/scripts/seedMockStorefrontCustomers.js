import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/security.js';
import { initDatabase } from '../lib/initDatabase.js';

const root = path.resolve(process.cwd());
const accountRoot = path.join(root, 'storage', 'accounts');
const password = 'MockCandle!2026';
const now = new Date().toISOString();

const customers = [
  { id: 'mock-store-customer-01', name: 'Avery Mock', email: 'mock.avery@candles.local', amount: 25 },
  { id: 'mock-store-customer-02', name: 'Blake Mock', email: 'mock.blake@candles.local', amount: 50 },
  { id: 'mock-store-customer-03', name: 'Casey Mock', email: 'mock.casey@candles.local', amount: 100 },
  { id: 'mock-store-customer-04', name: 'Devon Mock', email: 'mock.devon@candles.local', amount: 150 },
  { id: 'mock-store-customer-05', name: 'Emery Mock', email: 'mock.emery@candles.local', amount: 500 },
];

function futureSlot(daysFromNow, hour) {
  const slot = new Date();
  slot.setDate(slot.getDate() + daysFromNow);
  slot.setHours(hour, 0, 0, 0);
  return slot.toISOString();
}

async function seedAccount(fileName) {
  const databasePath = path.join(accountRoot, fileName);
  const db = new PrismaClient({
    datasources: { db: { url: `file:${databasePath.replace(/\\/g, '/')}` } },
  });

  try {
    await initDatabase(db);

    const existingProgram = await db.$queryRaw`
      SELECT "id" FROM "StoreMembershipProgram" WHERE "active" = 1 LIMIT 1
    `;
    const membershipProgramId = existingProgram[0]?.id || 'mock-candle-club';
    if (!existingProgram[0]) {
      await db.$executeRaw`
        INSERT INTO "StoreMembershipProgram"
          ("id", "name", "discount_percent", "sample_product_id", "active", "created_at", "updated_at")
        VALUES (${membershipProgramId}, ${'Mock Candle Club'}, ${10}, ${''}, ${1}, ${now}, ${now})
      `;
    }

    const mockPlanId = 'mock-monthly-candle-subscription';
    await db.$executeRaw`
      INSERT INTO "StoreSubscriptionPlan"
        ("id", "name", "plan_type", "description", "candle_count", "monthly_price", "quarterly_price", "monthly_delivery_day", "quarterly_start_month", "active", "created_at", "updated_at")
      VALUES (${mockPlanId}, ${'Mock Monthly Candle Subscription'}, ${'one_candle'}, ${'Test subscription for storefront controls and fulfillment.'}, ${1}, ${19.99}, ${54.99}, ${15}, ${1}, ${1}, ${now}, ${now})
      ON CONFLICT("id") DO UPDATE SET
        "active" = excluded."active",
        "updated_at" = excluded."updated_at"
    `;

    await db.$executeRaw`
      INSERT INTO "StorePickupSettings" ("id", "instructions", "cutoff_hours", "active", "updated_at")
      VALUES (${ 'default' }, ${'Mock pickup is available for testing. Bring your order confirmation when collecting your candles.'}, ${2}, ${1}, ${now})
      ON CONFLICT("id") DO UPDATE SET
        "instructions" = excluded."instructions",
        "cutoff_hours" = excluded."cutoff_hours",
        "active" = excluded."active",
        "updated_at" = excluded."updated_at"
    `;

    for (const [index, startsAt] of [futureSlot(2, 11), futureSlot(3, 14), futureSlot(5, 16)].entries()) {
      const slotId = `mock-pickup-slot-${index + 1}`;
      await db.$executeRaw`
        INSERT INTO "StorePickupSlot" ("id", "starts_at", "capacity", "active", "created_at")
        VALUES (${slotId}, ${startsAt}, ${5}, ${1}, ${now})
        ON CONFLICT("id") DO UPDATE SET
          "starts_at" = excluded."starts_at",
          "capacity" = excluded."capacity",
          "active" = excluded."active"
      `;
    }

    for (const [index, customer] of customers.entries()) {
      const customerId = customer.id;
      const addressId = `mock-store-address-0${index + 1}`;
      const cardId = `mock-gift-card-0${index + 1}`;
      const creditId = `mock-credit-0${index + 1}`;
      const membershipId = `mock-membership-0${index + 1}`;
      const subscriptionId = `mock-subscription-0${index + 1}`;
      const fulfillmentId = `mock-subscription-fulfillment-0${index + 1}`;
      const cardCode = `MOCK-GIFT-${String(index + 1).padStart(2, '0')}`;
      const creditAmount = (index + 1) * 5;

      // Replace the password deliberately so every mock customer has the documented test login.
      await db.$executeRaw`
        INSERT INTO "StoreCustomer"
          ("id", "name", "email", "password_hash", "phone", "marketing_opt_in", "reminder_opt_in", "birthday", "anniversary", "occasion_reminder_opt_in", "active", "created_at", "updated_at")
        VALUES (${customerId}, ${customer.name}, ${customer.email}, ${hashPassword(password)}, ${`555-010${index + 1}`}, ${1}, ${1}, ${'1990-01-01'}, ${''}, ${1}, ${1}, ${now}, ${now})
        ON CONFLICT("email") DO UPDATE SET
          "name" = excluded."name",
          "password_hash" = excluded."password_hash",
          "phone" = excluded."phone",
          "active" = excluded."active",
          "updated_at" = excluded."updated_at"
      `;

      await db.$executeRaw`
        INSERT INTO "StoreCustomerAddress"
          ("id", "customer_id", "label", "recipient_name", "street_address_1", "street_address_2", "city", "state_region", "postal_code", "country", "phone", "is_default", "created_at", "updated_at")
        VALUES (${addressId}, ${customerId}, ${'Home'}, ${customer.name}, ${`${index + 10} Candle Lane`}, ${''}, ${'Los Angeles'}, ${'CA'}, ${`9000${index + 1}`}, ${'US'}, ${`555-010${index + 1}`}, ${1}, ${now}, ${now})
        ON CONFLICT("id") DO UPDATE SET
          "recipient_name" = excluded."recipient_name",
          "street_address_1" = excluded."street_address_1",
          "city" = excluded."city",
          "state_region" = excluded."state_region",
          "postal_code" = excluded."postal_code",
          "country" = excluded."country",
          "phone" = excluded."phone",
          "is_default" = excluded."is_default",
          "updated_at" = excluded."updated_at"
      `;

      await db.$executeRaw`
        INSERT INTO "StoreCustomerMembership" ("id", "customer_id", "status", "started_at", "ends_at", "created_at", "updated_at")
        VALUES (${membershipId}, ${customerId}, ${'active'}, ${now}, ${null}, ${now}, ${now})
        ON CONFLICT("customer_id") DO UPDATE SET
          "status" = excluded."status",
          "ends_at" = excluded."ends_at",
          "updated_at" = excluded."updated_at"
      `;

      const shipmentDueAt = futureSlot(index + 2, 10);
      await db.$executeRaw`
        INSERT INTO "StoreCustomerSubscription"
          ("id", "customer_id", "plan_id", "provider", "provider_subscription_id", "status", "cadence", "shipping_address_id", "next_shipment_at", "skip_next", "payment_status", "created_at", "updated_at")
        VALUES (${subscriptionId}, ${customerId}, ${mockPlanId}, ${'mock'}, ${`mock-provider-subscription-${index + 1}`}, ${'active'}, ${index % 2 ? 'quarterly' : 'monthly'}, ${addressId}, ${shipmentDueAt}, ${0}, ${'paid'}, ${now}, ${now})
        ON CONFLICT("id") DO UPDATE SET
          "status" = excluded."status",
          "shipping_address_id" = excluded."shipping_address_id",
          "next_shipment_at" = excluded."next_shipment_at",
          "skip_next" = excluded."skip_next",
          "payment_status" = excluded."payment_status",
          "updated_at" = excluded."updated_at"
      `;
      await db.$executeRaw`
        INSERT INTO "StoreSubscriptionFulfillment"
          ("id", "subscription_id", "shipment_due_at", "status", "payment_status", "staff_note", "created_at", "updated_at")
        VALUES (${fulfillmentId}, ${subscriptionId}, ${shipmentDueAt}, ${'pending'}, ${'paid'}, ${'Mock subscription fulfillment test'}, ${now}, ${now})
        ON CONFLICT("id") DO UPDATE SET
          "shipment_due_at" = excluded."shipment_due_at",
          "status" = excluded."status",
          "payment_status" = excluded."payment_status",
          "updated_at" = excluded."updated_at"
      `;

      await db.$executeRaw`
        INSERT INTO "StoreGiftCard" ("id", "code", "customer_id", "initial_balance", "balance", "active", "created_at", "updated_at")
        VALUES (${cardId}, ${cardCode}, ${customerId}, ${customer.amount}, ${customer.amount}, ${1}, ${now}, ${now})
        ON CONFLICT("code") DO UPDATE SET
          "customer_id" = excluded."customer_id",
          "initial_balance" = excluded."initial_balance",
          "balance" = excluded."balance",
          "active" = excluded."active",
          "updated_at" = excluded."updated_at"
      `;

      const usageExists = await db.$queryRaw`
        SELECT "id" FROM "StoreGiftCardUsage"
        WHERE "gift_card_id" = ${cardId} AND "usage_type" = ${'issue'} AND "note" = ${'Mock account seed'}
        LIMIT 1
      `;
      if (!usageExists[0]) {
        await db.$executeRaw`
          INSERT INTO "StoreGiftCardUsage" ("id", "gift_card_id", "order_id", "amount", "balance_after", "usage_type", "note", "created_at")
          VALUES (${randomUUID()}, ${cardId}, ${null}, ${customer.amount}, ${customer.amount}, ${'issue'}, ${'Mock account seed'}, ${now})
        `;
      }

      await db.$executeRaw`
        INSERT INTO "StoreCustomerCredit" ("id", "customer_id", "credit_type", "label", "balance", "active", "created_at", "updated_at")
        VALUES (${creditId}, ${customerId}, ${'giveaway_balance'}, ${'Mock promotional credit'}, ${creditAmount}, ${1}, ${now}, ${now})
        ON CONFLICT("id") DO UPDATE SET
          "balance" = excluded."balance",
          "active" = excluded."active",
          "updated_at" = excluded."updated_at"
      `;

      const notificationExists = await db.$queryRaw`
        SELECT "id" FROM "StoreCustomerNotification"
        WHERE "customer_id" = ${customerId} AND "title" = ${'Mock account ready'} LIMIT 1
      `;
      if (!notificationExists[0]) {
        await db.$executeRaw`
          INSERT INTO "StoreCustomerNotification" ("id", "customer_id", "category", "title", "message", "is_read", "created_at")
          VALUES (${randomUUID()}, ${customerId}, ${'gift_card'}, ${'Mock account ready'}, ${`Gift card ${cardCode} with $${customer.amount.toFixed(2)} and $${creditAmount.toFixed(2)} promotional credit were added for checkout testing.`}, ${0}, ${now})
        `;
      }
    }

    console.log(`${fileName}: seeded 5 mock customers, memberships, gift cards, credits, addresses, and pickup slots.`);
  } finally {
    await db.$disconnect();
  }
}

if (!fs.existsSync(accountRoot)) {
  throw new Error(`Account database directory does not exist: ${accountRoot}`);
}

const files = fs.readdirSync(accountRoot).filter((fileName) => fileName.endsWith('.db'));
if (files.length === 0) {
  throw new Error('No account databases were found to seed.');
}

for (const fileName of files) {
  await seedAccount(fileName);
}

console.log(`Test password for all mock customers: ${password}`);
