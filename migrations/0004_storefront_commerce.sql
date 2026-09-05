-- Tenant-scoped storefront identity, order, fulfillment, loyalty, and balance records.
-- Provider calls stay outside this migration and will be moved only after sandbox verification.

CREATE TABLE IF NOT EXISTS "StoreCustomer" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL, "password_hash" TEXT NOT NULL, "phone" TEXT NOT NULL DEFAULT '',
  "marketing_opt_in" INTEGER NOT NULL DEFAULT 0, "reminder_opt_in" INTEGER NOT NULL DEFAULT 0,
  "birthday" TEXT NOT NULL DEFAULT '', "anniversary" TEXT NOT NULL DEFAULT '',
  "occasion_reminder_opt_in" INTEGER NOT NULL DEFAULT 0, "active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "email")
);

CREATE TABLE IF NOT EXISTS "StoreCustomerSession" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE, "expires_at" TEXT NOT NULL, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCustomerSession_customer_expiry_idx" ON "StoreCustomerSession" ("account_id", "customer_id", "expires_at");

CREATE TABLE IF NOT EXISTS "StoreCustomerAddress" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '', "recipient_name" TEXT NOT NULL DEFAULT '',
  "street_address_1" TEXT NOT NULL DEFAULT '', "street_address_2" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '', "state_region" TEXT NOT NULL DEFAULT '',
  "postal_code" TEXT NOT NULL DEFAULT '', "country" TEXT NOT NULL DEFAULT '', "phone" TEXT NOT NULL DEFAULT '',
  "is_default" INTEGER NOT NULL DEFAULT 0, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCustomerAddress_customer_idx" ON "StoreCustomerAddress" ("account_id", "customer_id", "created_at");

CREATE TABLE IF NOT EXISTS "StorePickupSettings" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL UNIQUE, "instructions" TEXT NOT NULL DEFAULT '',
  "cutoff_hours" INTEGER NOT NULL DEFAULT 24, "active" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "StorePickupSlot" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "starts_at" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1, "active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "starts_at")
);

CREATE TABLE IF NOT EXISTS "StoreMembershipProgram" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL DEFAULT 'Candle Club',
  "discount_percent" REAL NOT NULL DEFAULT 0, "sample_product_id" TEXT NOT NULL DEFAULT '',
  "active" INTEGER NOT NULL DEFAULT 0, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "StoreCustomerMembership" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active', "started_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "ends_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "customer_id")
);

CREATE TABLE IF NOT EXISTS "StoreSubscriptionPlan" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "plan_type" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '', "candle_count" INTEGER NOT NULL DEFAULT 1,
  "monthly_price" REAL NOT NULL DEFAULT 0, "quarterly_price" REAL NOT NULL DEFAULT 0,
  "monthly_delivery_day" INTEGER NOT NULL DEFAULT 1, "quarterly_start_month" INTEGER NOT NULL DEFAULT 1,
  "active" INTEGER NOT NULL DEFAULT 1, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreSubscriptionPlan_active_idx" ON "StoreSubscriptionPlan" ("account_id", "active", "created_at");
CREATE TABLE IF NOT EXISTS "StoreCustomerSubscription" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL, "plan_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT '', "provider_subscription_id" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending_payment', "cadence" TEXT NOT NULL DEFAULT 'monthly',
  "shipping_address_id" TEXT, "next_shipment_at" TEXT, "skip_next" INTEGER NOT NULL DEFAULT 0,
  "payment_status" TEXT NOT NULL DEFAULT 'pending', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("plan_id") REFERENCES "StoreSubscriptionPlan" ("id") ON DELETE RESTRICT,
  UNIQUE ("account_id", "provider", "provider_subscription_id")
);
CREATE INDEX IF NOT EXISTS "StoreCustomerSubscription_customer_idx" ON "StoreCustomerSubscription" ("account_id", "customer_id", "status", "next_shipment_at");
CREATE TABLE IF NOT EXISTS "StoreSubscriptionFulfillment" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "subscription_id" TEXT NOT NULL,
  "shipment_due_at" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
  "payment_status" TEXT NOT NULL DEFAULT 'pending', "staff_note" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("subscription_id") REFERENCES "StoreCustomerSubscription" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreSubscriptionFulfillment_queue_idx" ON "StoreSubscriptionFulfillment" ("account_id", "status", "shipment_due_at");

CREATE TABLE IF NOT EXISTS "StoreDiscountCode" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "code" TEXT NOT NULL,
  "discount_type" TEXT NOT NULL DEFAULT 'percent', "discount_value" REAL NOT NULL DEFAULT 0,
  "minimum_subtotal" REAL NOT NULL DEFAULT 0, "starts_at" TEXT, "expires_at" TEXT,
  "usage_limit" INTEGER NOT NULL DEFAULT 0, "usage_count" INTEGER NOT NULL DEFAULT 0,
  "per_customer_limit" INTEGER NOT NULL DEFAULT 1, "stack_with_mix" INTEGER NOT NULL DEFAULT 1,
  "stack_with_gift_card" INTEGER NOT NULL DEFAULT 1, "active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "code")
);

CREATE TABLE IF NOT EXISTS "StoreOrder" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "order_number" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL DEFAULT '', "customer_email" TEXT NOT NULL DEFAULT '', "customer_phone" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'awaiting_payment', "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  "fulfillment_status" TEXT NOT NULL DEFAULT 'unfulfilled', "delivery_method" TEXT NOT NULL DEFAULT 'shipping', "pickup_slot_at" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD', "subtotal_amount" REAL NOT NULL DEFAULT 0, "discount_amount" REAL NOT NULL DEFAULT 0,
  "shipping_amount" REAL NOT NULL DEFAULT 0, "tax_amount" REAL NOT NULL DEFAULT 0, "total_amount" REAL NOT NULL DEFAULT 0,
  "gift_card_id" TEXT, "gift_card_discount_amount" REAL NOT NULL DEFAULT 0, "gift_card_applied_amount" REAL NOT NULL DEFAULT 0,
  "gift_card_terms_accepted" INTEGER NOT NULL DEFAULT 0, "gift_card_delivery_method" TEXT NOT NULL DEFAULT 'digital',
  "customer_credit_id" TEXT, "customer_credit_applied_amount" REAL NOT NULL DEFAULT 0,
  "discount_code_id" TEXT, "discount_code" TEXT NOT NULL DEFAULT '', "discount_code_amount" REAL NOT NULL DEFAULT 0,
  "membership_discount_amount" REAL NOT NULL DEFAULT 0, "customer_note" TEXT NOT NULL DEFAULT '', "staff_note" TEXT NOT NULL DEFAULT '',
  "tracking_number" TEXT NOT NULL DEFAULT '', "shipping_recipient_name" TEXT NOT NULL DEFAULT '',
  "shipping_street_address_1" TEXT NOT NULL DEFAULT '', "shipping_street_address_2" TEXT NOT NULL DEFAULT '',
  "shipping_city" TEXT NOT NULL DEFAULT '', "shipping_state_region" TEXT NOT NULL DEFAULT '',
  "shipping_postal_code" TEXT NOT NULL DEFAULT '', "shipping_country" TEXT NOT NULL DEFAULT '',
  "reservation_expires_at" TEXT, "paid_at" TEXT, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE RESTRICT,
  UNIQUE ("account_id", "order_number")
);
CREATE INDEX IF NOT EXISTS "StoreOrder_customer_created_idx" ON "StoreOrder" ("account_id", "customer_id", "created_at");
CREATE INDEX IF NOT EXISTS "StoreOrder_status_reservation_idx" ON "StoreOrder" ("account_id", "status", "reservation_expires_at");

CREATE TABLE IF NOT EXISTS "StoreDiscountRedemption" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "discount_code_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL, "order_id" TEXT NOT NULL, "amount" REAL NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("discount_code_id") REFERENCES "StoreDiscountCode" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("order_id") REFERENCES "StoreOrder" ("id") ON DELETE CASCADE,
  UNIQUE ("order_id")
);
CREATE INDEX IF NOT EXISTS "StoreDiscountRedemption_customer_code_idx" ON "StoreDiscountRedemption" ("account_id", "customer_id", "discount_code_id");

CREATE TABLE IF NOT EXISTS "StoreOrderItem" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "order_id" TEXT NOT NULL, "product_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL DEFAULT '', "product_image_data" TEXT NOT NULL DEFAULT '', "unit_price" REAL NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1, "line_total" REAL NOT NULL DEFAULT 0, "customization_json" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("order_id") REFERENCES "StoreOrder" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "StoreOrderItem_order_idx" ON "StoreOrderItem" ("account_id", "order_id");
CREATE TABLE IF NOT EXISTS "StoreOrderPayment" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "order_id" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "provider_payment_id" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'pending', "amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("order_id") REFERENCES "StoreOrder" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreOrderPayment_order_idx" ON "StoreOrderPayment" ("account_id", "order_id", "created_at");

CREATE TABLE IF NOT EXISTS "StoreGiftCard" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "code" TEXT NOT NULL, "customer_id" TEXT,
  "initial_balance" REAL NOT NULL, "balance" REAL NOT NULL, "active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE SET NULL,
  UNIQUE ("account_id", "code")
);
CREATE INDEX IF NOT EXISTS "StoreGiftCard_customer_idx" ON "StoreGiftCard" ("account_id", "customer_id", "updated_at");
CREATE TABLE IF NOT EXISTS "StoreGiftCardUsage" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "gift_card_id" TEXT NOT NULL, "order_id" TEXT,
  "amount" REAL NOT NULL, "balance_after" REAL NOT NULL DEFAULT 0, "usage_type" TEXT NOT NULL DEFAULT 'issue',
  "note" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("gift_card_id") REFERENCES "StoreGiftCard" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreGiftCardUsage_card_created_idx" ON "StoreGiftCardUsage" ("account_id", "gift_card_id", "created_at");

CREATE TABLE IF NOT EXISTS "StoreCustomerCredit" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "credit_type" TEXT NOT NULL DEFAULT 'giveaway_balance', "label" TEXT NOT NULL DEFAULT '', "balance" REAL NOT NULL DEFAULT 0,
  "active" INTEGER NOT NULL DEFAULT 1, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCustomerCredit_customer_idx" ON "StoreCustomerCredit" ("account_id", "customer_id", "active");
CREATE TABLE IF NOT EXISTS "StoreCustomerCreditUsage" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_credit_id" TEXT NOT NULL, "order_id" TEXT,
  "amount" REAL NOT NULL, "balance_after" REAL NOT NULL DEFAULT 0, "usage_type" TEXT NOT NULL DEFAULT 'issue',
  "note" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_credit_id") REFERENCES "StoreCustomerCredit" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCustomerCreditUsage_credit_created_idx" ON "StoreCustomerCreditUsage" ("account_id", "customer_credit_id", "created_at");

CREATE TABLE IF NOT EXISTS "StoreCustomerRewardBalance" (
  "customer_id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "points" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "StoreCustomerRewardLedger" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL, "points" INTEGER NOT NULL,
  "source" TEXT NOT NULL, "reference_id" TEXT NOT NULL DEFAULT '', "note" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "customer_id", "source", "reference_id")
);
CREATE INDEX IF NOT EXISTS "StoreCustomerRewardLedger_customer_created_idx" ON "StoreCustomerRewardLedger" ("account_id", "customer_id", "created_at");
CREATE TABLE IF NOT EXISTS "StoreCustomerNotification" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'gift_card', "title" TEXT NOT NULL, "message" TEXT NOT NULL,
  "is_read" INTEGER NOT NULL DEFAULT 0, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCustomerNotification_customer_created_idx" ON "StoreCustomerNotification" ("account_id", "customer_id", "created_at");
