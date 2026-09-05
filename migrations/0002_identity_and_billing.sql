-- Consolidated D1 identity and billing foundation.
-- Every operational table added later must use account_id instead of a separate database per account.

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "join_code" TEXT NOT NULL DEFAULT '',
  "plan_tier" TEXT NOT NULL DEFAULT 'free',
  "is_banned" INTEGER NOT NULL DEFAULT 0,
  "ban_reason" TEXT NOT NULL DEFAULT '',
  "ban_evidence_note" TEXT NOT NULL DEFAULT '',
  "ban_evidence_image_data" TEXT NOT NULL DEFAULT '',
  "ban_evidence_images_data" TEXT NOT NULL DEFAULT '[]',
  "access_disabled" INTEGER NOT NULL DEFAULT 0,
  "disable_reason" TEXT NOT NULL DEFAULT '',
  "store_slug" TEXT NOT NULL DEFAULT '',
  "store_title" TEXT NOT NULL DEFAULT '',
  "store_description" TEXT NOT NULL DEFAULT '',
  "store_logo_data" TEXT NOT NULL DEFAULT '',
  "store_banner_data" TEXT NOT NULL DEFAULT '',
  "store_background_image_data" TEXT NOT NULL DEFAULT '',
  "store_custom_html" TEXT NOT NULL DEFAULT '',
  "store_preset_state" TEXT NOT NULL DEFAULT '',
  "store_custom_full_mode" INTEGER NOT NULL DEFAULT 0,
  "store_show_details" INTEGER NOT NULL DEFAULT 1,
  "store_product_ids" TEXT NOT NULL DEFAULT '[]',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_store_slug_key" ON "Account" ("store_slug")
  WHERE "store_slug" <> '';

CREATE TABLE IF NOT EXISTS "AccountUser" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountUser_account_username_key"
  ON "AccountUser" ("account_id", "username");
CREATE UNIQUE INDEX IF NOT EXISTS "AccountUser_email_key"
  ON "AccountUser" ("email") WHERE "email" <> '';

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires_at" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_user_id") REFERENCES "AccountUser" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "AuthSession_user_expiry_idx"
  ON "AuthSession" ("account_user_id", "expires_at");

CREATE TABLE IF NOT EXISTS "AccountRole" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "name")
);

CREATE TABLE IF NOT EXISTS "AccountRolePermission" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT NOT NULL,
  "role_name" TEXT NOT NULL,
  "feature_key" TEXT NOT NULL,
  "enabled" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "role_name", "feature_key")
);

CREATE TABLE IF NOT EXISTS "AccountJoinRequest" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "requested_role" TEXT NOT NULL DEFAULT 'member',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_by_user_id" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "AccountJoinRequest_account_status_idx"
  ON "AccountJoinRequest" ("account_id", "status");

CREATE TABLE IF NOT EXISTS "SuperAdminSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires_at" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuthEvent" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT,
  "account_user_id" TEXT,
  "email" TEXT NOT NULL DEFAULT '',
  "event_type" TEXT NOT NULL DEFAULT '',
  "ip_address" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("account_user_id") REFERENCES "AccountUser" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "AuthEvent_user_created_idx"
  ON "AuthEvent" ("account_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "BillingConfig" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "standard_monthly_usd" REAL NOT NULL DEFAULT 5.99,
  "standard_yearly_usd" REAL NOT NULL DEFAULT 57.50,
  "pro_monthly_usd" REAL NOT NULL DEFAULT 7.99,
  "pro_yearly_usd" REAL NOT NULL DEFAULT 76.70,
  "elite_monthly_usd" REAL NOT NULL DEFAULT 14.99,
  "elite_yearly_usd" REAL NOT NULL DEFAULT 143.90,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AccountBillingProfile" (
  "account_id" TEXT PRIMARY KEY NOT NULL,
  "billing_name" TEXT NOT NULL DEFAULT '',
  "billing_email" TEXT NOT NULL DEFAULT '',
  "billing_phone" TEXT NOT NULL DEFAULT '',
  "company_name" TEXT NOT NULL DEFAULT '',
  "street_address_1" TEXT NOT NULL DEFAULT '',
  "street_address_2" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "state_region" TEXT NOT NULL DEFAULT '',
  "postal_code" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL DEFAULT '',
  "preferred_payment_method" TEXT NOT NULL DEFAULT 'card',
  "paypal_email" TEXT NOT NULL DEFAULT '',
  "payment_profile_note" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "BillingCheckoutSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT NOT NULL,
  "account_user_id" TEXT NOT NULL,
  "from_tier" TEXT NOT NULL DEFAULT 'free',
  "target_tier" TEXT NOT NULL,
  "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
  "payment_method" TEXT NOT NULL,
  "billing_terms_version" TEXT NOT NULL DEFAULT '',
  "billing_terms_accepted_at" TEXT,
  "billing_terms_acceptance_ip" TEXT NOT NULL DEFAULT '',
  "provider" TEXT NOT NULL,
  "provider_session_id" TEXT NOT NULL DEFAULT '',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "base_amount" REAL NOT NULL DEFAULT 0,
  "credit_applied" REAL NOT NULL DEFAULT 0,
  "amount_due" REAL NOT NULL DEFAULT 0,
  "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paid_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("account_user_id") REFERENCES "AccountUser" ("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "BillingCheckoutSession_account_created_idx"
  ON "BillingCheckoutSession" ("account_id", "created_at");
CREATE INDEX IF NOT EXISTS "BillingCheckoutSession_provider_session_idx"
  ON "BillingCheckoutSession" ("provider", "provider_session_id");
