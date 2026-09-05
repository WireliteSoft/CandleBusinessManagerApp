import { runOptionalStatements } from './shared.js';

const LEGACY_UPGRADE_STATEMENTS = [
  `ALTER TABLE "Account" ADD COLUMN "join_code" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "plan_tier" TEXT NOT NULL DEFAULT 'free';`,
  `ALTER TABLE "Account" ADD COLUMN "is_banned" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Account" ADD COLUMN "access_disabled" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Account" ADD COLUMN "ban_reason" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "ban_evidence_note" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "ban_evidence_image_data" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "ban_evidence_images_data" TEXT NOT NULL DEFAULT '[]';`,
  `ALTER TABLE "Account" ADD COLUMN "disable_reason" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Product" ADD COLUMN "image_data" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Product" ADD COLUMN "product_type" TEXT NOT NULL DEFAULT 'physical';`,
  `ALTER TABLE "Product" ADD COLUMN "scent_family" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "fragrance_notes" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "sweetness" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "scent_strength" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "warmth" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "freshness" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "season" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "mood" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "room" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "burn_time" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "wax_type" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "wick_type" TEXT NOT NULL DEFAULT '';`, `ALTER TABLE "Product" ADD COLUMN "batch_number" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Product" ADD COLUMN "inspiration" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Product" ADD COLUMN "making_process" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Product" ADD COLUMN "limited_drop" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Product" ADD COLUMN "drop_number" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Product" ADD COLUMN "purchase_limit" INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Product" ADD COLUMN "upcoming_release" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Product" ADD COLUMN "release_date" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Product" ADD COLUMN "preorders_enabled" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Product" ADD COLUMN "member_exclusive" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Product" ADD COLUMN "member_early_access_days" INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Product" ADD COLUMN "subscriber_exclusive" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Product" ADD COLUMN "subscriber_early_access_days" INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Account" ADD COLUMN "store_slug" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_title" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_description" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_logo_data" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_banner_data" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_background_image_data" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_custom_html" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_preset_state" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_custom_full_mode" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Account" ADD COLUMN "store_show_details" BOOLEAN NOT NULL DEFAULT 1;`,
  `ALTER TABLE "StoreContactMessage" ADD COLUMN "is_read" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreContactMessage" ADD COLUMN "read_at" DATETIME;`,
  `ALTER TABLE "StoreContactMessage" ADD COLUMN "workflow_status" TEXT NOT NULL DEFAULT 'new';`,
  `ALTER TABLE "StoreContactMessage" ADD COLUMN "priority_level" TEXT NOT NULL DEFAULT 'normal';`,
  `ALTER TABLE "StoreContactMessage" ADD COLUMN "admin_notes" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Account" ADD COLUMN "store_product_ids" TEXT NOT NULL DEFAULT '[]';`,
  `ALTER TABLE "AccountUser" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "BanAppealTicket" ADD COLUMN "participant_key" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "BanAppealTicket" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open';`,
  `ALTER TABLE "BanAppealTicket" ADD COLUMN "account_id" TEXT;`,
  `ALTER TABLE "AccountUser" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "AccountJoinRequest" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "AccountJoinRequest" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "BillingConfig" ADD COLUMN "standard_monthly_usd" REAL NOT NULL DEFAULT 5.99;`,
  `ALTER TABLE "BillingConfig" ADD COLUMN "standard_yearly_usd" REAL NOT NULL DEFAULT 57.50;`,
  `ALTER TABLE "BillingConfig" ADD COLUMN "pro_monthly_usd" REAL NOT NULL DEFAULT 7.99;`,
  `ALTER TABLE "BillingConfig" ADD COLUMN "pro_yearly_usd" REAL NOT NULL DEFAULT 76.70;`,
  `ALTER TABLE "BillingConfig" ADD COLUMN "elite_monthly_usd" REAL NOT NULL DEFAULT 14.99;`,
  `ALTER TABLE "BillingConfig" ADD COLUMN "elite_yearly_usd" REAL NOT NULL DEFAULT 143.90;`,
  `ALTER TABLE "BillingCheckoutSession" ADD COLUMN "billing_cycle" TEXT NOT NULL DEFAULT 'monthly';`,
  `ALTER TABLE "BillingCheckoutSession" ADD COLUMN "billing_terms_version" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "BillingCheckoutSession" ADD COLUMN "billing_terms_accepted_at" DATETIME;`,
  `ALTER TABLE "BillingCheckoutSession" ADD COLUMN "billing_terms_acceptance_ip" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Supply" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'containers';`,
  `ALTER TABLE "BatchLog" ADD COLUMN "candles_amount" INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "container_type" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "BatchLog" ADD COLUMN "container_size" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "BatchLog" ADD COLUMN "wick_count" INTEGER NOT NULL DEFAULT 1;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "wick_size" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_wax_cost" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_wax_weight_lb" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_fragrance_used_oz" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_fragrance_cost_used" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_fill_per_candle_oz" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_jar_cost_each" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_wick_cost_each" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_label_cost_each" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_other_cost_each" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_labor_overhead_each" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_material_cost_per_candle" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_total_cost_per_candle" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_wholesale_suggestion" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_retail_suggestion" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_premium_suggestion" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_cogs_source" TEXT NOT NULL DEFAULT 'total';`,
  `ALTER TABLE "BatchLog" ADD COLUMN "pricing_price_source" TEXT NOT NULL DEFAULT 'retail';`,
  `ALTER TABLE "Employee" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Employee" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "Employee" ADD COLUMN "picture_data" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "StoreCustomer" ADD COLUMN "marketing_opt_in" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreCustomer" ADD COLUMN "reminder_opt_in" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreCustomer" ADD COLUMN "birthday" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "StoreCustomer" ADD COLUMN "anniversary" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "StoreCustomer" ADD COLUMN "occasion_reminder_opt_in" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreOrderItem" ADD COLUMN "customization_json" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "gift_card_id" TEXT;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "gift_card_discount_amount" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "gift_card_applied_amount" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "gift_card_terms_accepted" BOOLEAN NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "gift_card_delivery_method" TEXT NOT NULL DEFAULT 'digital';`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "customer_credit_id" TEXT;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "customer_credit_applied_amount" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "discount_code_id" TEXT;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "discount_code" TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "discount_code_amount" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "membership_discount_amount" REAL NOT NULL DEFAULT 0;`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "delivery_method" TEXT NOT NULL DEFAULT 'shipping';`,
  `ALTER TABLE "StoreOrder" ADD COLUMN "pickup_slot_at" DATETIME;`,
  `ALTER TABLE "StoreSubscriptionPlan" ADD COLUMN "monthly_delivery_day" INTEGER NOT NULL DEFAULT 1;`,
  `ALTER TABLE "StoreSubscriptionPlan" ADD COLUMN "quarterly_start_month" INTEGER NOT NULL DEFAULT 1;`,
];

const FOLLOW_UP_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "StoreGiftCard" ("id" TEXT PRIMARY KEY NOT NULL, "code" TEXT NOT NULL UNIQUE, "customer_id" TEXT, "initial_balance" REAL NOT NULL, "balance" REAL NOT NULL, "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreGiftCard_customer_idx" ON "StoreGiftCard" ("customer_id", "updated_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftCardUsage" ("id" TEXT PRIMARY KEY NOT NULL, "gift_card_id" TEXT NOT NULL, "order_id" TEXT, "amount" REAL NOT NULL, "balance_after" REAL NOT NULL DEFAULT 0, "usage_type" TEXT NOT NULL DEFAULT 'issue', "note" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreGiftCardUsage_card_created_idx" ON "StoreGiftCardUsage" ("gift_card_id", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerCredit" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "credit_type" TEXT NOT NULL DEFAULT 'giveaway_balance', "label" TEXT NOT NULL DEFAULT '', "balance" REAL NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerCredit_customer_idx" ON "StoreCustomerCredit" ("customer_id", "active");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerCreditUsage" ("id" TEXT PRIMARY KEY NOT NULL, "customer_credit_id" TEXT NOT NULL, "order_id" TEXT, "amount" REAL NOT NULL, "balance_after" REAL NOT NULL DEFAULT 0, "usage_type" TEXT NOT NULL DEFAULT 'issue', "note" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerCreditUsage_credit_created_idx" ON "StoreCustomerCreditUsage" ("customer_credit_id", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftRegistry" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "share_code" TEXT NOT NULL UNIQUE, "title" TEXT NOT NULL, "event_date" TEXT NOT NULL DEFAULT '', "message" TEXT NOT NULL DEFAULT '', "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftRegistryItem" ("id" TEXT PRIMARY KEY NOT NULL, "registry_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreGiftRegistryItem_registry_product_idx" ON "StoreGiftRegistryItem" ("registry_id", "product_id");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerFavorite" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerFavorite_customer_product_idx" ON "StoreCustomerFavorite" ("customer_id", "product_id");`,
  `CREATE TABLE IF NOT EXISTS "StoreProductReview" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "rating" INTEGER NOT NULL, "title" TEXT NOT NULL DEFAULT '', "body" TEXT NOT NULL, "photo_data" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'pending', "verified_purchase" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreProductReview_customer_product_idx" ON "StoreProductReview" ("customer_id", "product_id");`,
  `CREATE INDEX IF NOT EXISTS "StoreProductReview_product_status_idx" ON "StoreProductReview" ("product_id", "status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerRewardBalance" ("customer_id" TEXT PRIMARY KEY NOT NULL, "points" INTEGER NOT NULL DEFAULT 0, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerRewardLedger" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "points" INTEGER NOT NULL, "source" TEXT NOT NULL, "reference_id" TEXT NOT NULL DEFAULT '', "note" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerRewardLedger_source_ref_idx" ON "StoreCustomerRewardLedger" ("customer_id", "source", "reference_id");`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerRewardLedger_customer_created_idx" ON "StoreCustomerRewardLedger" ("customer_id", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerReferral" ("id" TEXT PRIMARY KEY NOT NULL, "code" TEXT NOT NULL UNIQUE, "referrer_customer_id" TEXT NOT NULL, "referred_customer_id" TEXT, "status" TEXT NOT NULL DEFAULT 'available', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" DATETIME);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerReferral_referred_idx" ON "StoreCustomerReferral" ("referred_customer_id");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerNotification" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'gift_card', "title" TEXT NOT NULL, "message" TEXT NOT NULL, "is_read" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerNotification_customer_created_idx" ON "StoreCustomerNotification" ("customer_id", "created_at");`,
  `
    CREATE TABLE IF NOT EXISTS "StoreBackInStockAlert" (
      "id" TEXT PRIMARY KEY NOT NULL, "product_id" TEXT NOT NULL, "email" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active', "notified_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreBackInStockAlert_product_email_idx" ON "StoreBackInStockAlert" ("product_id", "email")`,
  `CREATE INDEX IF NOT EXISTS "StoreBackInStockAlert_product_status_idx" ON "StoreBackInStockAlert" ("product_id", "status")`,
  `CREATE TABLE IF NOT EXISTS "StoreWaitlistEntry" ("id" TEXT NOT NULL PRIMARY KEY, "product_id" TEXT NOT NULL, "email" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'active', "notified_at" DATETIME, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreWaitlistEntry_product_email_idx" ON "StoreWaitlistEntry" ("product_id", "email")`,
  `CREATE INDEX IF NOT EXISTS "StoreWaitlistEntry_product_status_idx" ON "StoreWaitlistEntry" ("product_id", "status")`,
  `CREATE TABLE IF NOT EXISTS "StoreScentPoll" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "poll_type" TEXT NOT NULL DEFAULT 'next_scent', "options_json" TEXT NOT NULL DEFAULT '[]', "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS "StoreScentPoll_active_created_idx" ON "StoreScentPoll" ("active", "created_at")`,
  `CREATE TABLE IF NOT EXISTS "StoreScentPollVote" ("id" TEXT NOT NULL PRIMARY KEY, "poll_id" TEXT NOT NULL, "visitor_key" TEXT NOT NULL, "option_name" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreScentPollVote_poll_visitor_idx" ON "StoreScentPollVote" ("poll_id", "visitor_key")`,
  `CREATE INDEX IF NOT EXISTS "StoreScentPollVote_poll_option_idx" ON "StoreScentPollVote" ("poll_id", "option_name")`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomScentRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "desired_notes" TEXT NOT NULL DEFAULT '', "scent_family" TEXT NOT NULL DEFAULT '', "occasion" TEXT NOT NULL DEFAULT '', "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "admin_notes" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomScentRequest_status_created_idx" ON "StoreCustomScentRequest" ("status", "created_at")`,
  `ALTER TABLE "StoreCustomScentRequest" ADD COLUMN "quote_amount" REAL NOT NULL DEFAULT 0;`,
  `CREATE TABLE IF NOT EXISTS "StoreEventFavorRequest" ("id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "vessel" TEXT NOT NULL, "scent" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "packaging" TEXT NOT NULL DEFAULT '', "event_date" TEXT NOT NULL DEFAULT '', "details" TEXT NOT NULL DEFAULT '', "estimate_amount" REAL NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StorefrontFeatureSetting" ("feature_key" TEXT PRIMARY KEY NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT 1, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomOrderQuote" ("id" TEXT PRIMARY KEY NOT NULL, "customer_name" TEXT NOT NULL, "customer_email" TEXT NOT NULL, "title" TEXT NOT NULL, "details" TEXT NOT NULL DEFAULT '', "revision" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'draft', "total_amount" REAL NOT NULL DEFAULT 0, "deposit_amount" REAL NOT NULL DEFAULT 0, "deposit_paid" BOOLEAN NOT NULL DEFAULT 0, "final_paid" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `ALTER TABLE "StoreCustomOrderQuote" ADD COLUMN "share_code" TEXT NOT NULL DEFAULT '';`,
  `CREATE TABLE IF NOT EXISTS "StoreWorkshopSlot" ("id" TEXT PRIMARY KEY NOT NULL, "starts_at" DATETIME NOT NULL UNIQUE, "capacity" INTEGER NOT NULL, "deposit_amount" REAL NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreWorkshopBooking" ("id" TEXT PRIMARY KEY NOT NULL, "slot_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "party_size" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'confirmed', "payment_status" TEXT NOT NULL DEFAULT 'deposit_pending', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreWorkshopPartyRequest" ("id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "event_type" TEXT NOT NULL, "requested_date" TEXT NOT NULL DEFAULT '', "party_size" INTEGER NOT NULL, "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "admin_notes" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreWorkshopPartyRequest_status_created_idx" ON "StoreWorkshopPartyRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreRefillProgram" ("id" TEXT PRIMARY KEY NOT NULL, "active" BOOLEAN NOT NULL DEFAULT 1, "discount_percent" REAL NOT NULL DEFAULT 10, "eligibility_rules" TEXT NOT NULL DEFAULT '', "return_instructions" TEXT NOT NULL DEFAULT '', "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreRefillRequest" ("id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "product_name" TEXT NOT NULL, "scent" TEXT NOT NULL DEFAULT '', "quantity" INTEGER NOT NULL DEFAULT 1, "container_condition" TEXT NOT NULL, "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "container_received" BOOLEAN NOT NULL DEFAULT 0, "discount_percent" REAL NOT NULL DEFAULT 0, "staff_notes" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreRefillRequest_status_created_idx" ON "StoreRefillRequest" ("status", "created_at");`,
  `
    CREATE TABLE IF NOT EXISTS "ScentProfile" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "supplier" TEXT NOT NULL DEFAULT '', "supplier_sku" TEXT NOT NULL DEFAULT '',
      "name" TEXT NOT NULL, "scent_family" TEXT NOT NULL DEFAULT '',
      "top_notes" TEXT NOT NULL DEFAULT '', "middle_notes" TEXT NOT NULL DEFAULT '', "base_notes" TEXT NOT NULL DEFAULT '',
      "flashpoint_f" REAL, "vanillin_content" TEXT NOT NULL DEFAULT '',
      "phthalate_free" BOOLEAN NOT NULL DEFAULT 0, "prop65_warning" BOOLEAN NOT NULL DEFAULT 0,
      "soy_performance" TEXT NOT NULL DEFAULT '', "recommended_load" TEXT NOT NULL DEFAULT '',
      "usage_notes" TEXT NOT NULL DEFAULT '', "source_url" TEXT NOT NULL DEFAULT '', "source_attribution" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `CREATE INDEX IF NOT EXISTS "ScentProfile_name_idx" ON "ScentProfile" ("name")`,
  `CREATE TABLE IF NOT EXISTS "FragranceOilCatalog" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "image_url" TEXT NOT NULL DEFAULT '', "source_url" TEXT NOT NULL DEFAULT '', "variants_json" TEXT NOT NULL DEFAULT '[]', "discontinued" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS "FragranceOilCatalog_name_idx" ON "FragranceOilCatalog" ("name")`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftPackRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "recipient_name" TEXT NOT NULL DEFAULT '', "gift_message" TEXT NOT NULL DEFAULT '', "items_json" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS "StoreGiftPackRequest_status_created_idx" ON "StoreGiftPackRequest" ("status", "created_at")`,
  `CREATE TABLE IF NOT EXISTS "StoreCollectionRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL, "items_json" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS "StoreCollectionRequest_status_created_idx" ON "StoreCollectionRequest" ("status", "created_at")`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerCollection" ("id" TEXT NOT NULL PRIMARY KEY, "customer_id" TEXT NOT NULL, "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL, "items_json" TEXT NOT NULL DEFAULT '[]', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerCollection_customer_updated_idx" ON "StoreCustomerCollection" ("customer_id", "updated_at")`,
  `DROP TABLE IF EXISTS "Experiment"`,
  `
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
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS "WaxInventory" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "wax_type_id" TEXT NOT NULL,
      "wax_name" TEXT NOT NULL,
      "pounds" REAL NOT NULL DEFAULT 0,
      "total_price" REAL NOT NULL DEFAULT 0,
      "selected" BOOLEAN NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "WaxInventory_wax_type_id_key"
    ON "WaxInventory" ("wax_type_id")
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "Account_store_slug_unique_idx"
      ON "Account" ("store_slug")
      WHERE "store_slug" <> '';
  `,
  `
    UPDATE "BanAppealTicket"
    SET "status" = 'open'
    WHERE "status" = '' OR "status" = 'pending'
  `,
  `
    INSERT INTO "BillingConfig" (
      "id",
      "standard_monthly_usd",
      "standard_yearly_usd",
      "pro_monthly_usd",
      "pro_yearly_usd",
      "elite_monthly_usd",
      "elite_yearly_usd",
      "currency",
      "created_at",
      "updated_at"
    )
    SELECT 'default', 5.99, 57.50, 7.99, 76.70, 14.99, 143.90, 'USD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "BillingConfig" WHERE "id" = 'default')
  `,
  `
    UPDATE "BillingConfig"
    SET
      "standard_monthly_usd" = COALESCE(NULLIF("standard_monthly_usd", 0), 5.99),
      "standard_yearly_usd" = COALESCE(NULLIF("standard_yearly_usd", 0), 57.50),
      "pro_monthly_usd" = COALESCE(NULLIF("pro_monthly_usd", 0), 7.99),
      "pro_yearly_usd" = COALESCE(NULLIF("pro_yearly_usd", 0), 76.70),
      "elite_monthly_usd" = COALESCE(NULLIF("elite_monthly_usd", 0), 14.99),
      "elite_yearly_usd" = COALESCE(NULLIF("elite_yearly_usd", 0), 143.90)
  `,
  `
    CREATE TABLE IF NOT EXISTS "BillingCheckoutSession" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_id" TEXT NOT NULL,
      "account_user_id" TEXT NOT NULL,
      "from_tier" TEXT NOT NULL DEFAULT 'free',
      "target_tier" TEXT NOT NULL,
      "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
      "payment_method" TEXT NOT NULL,
      "billing_terms_version" TEXT NOT NULL DEFAULT '',
      "billing_terms_accepted_at" DATETIME,
      "billing_terms_acceptance_ip" TEXT NOT NULL DEFAULT '',
      "provider" TEXT NOT NULL,
      "provider_session_id" TEXT NOT NULL DEFAULT '',
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "base_amount" REAL NOT NULL DEFAULT 0,
      "credit_applied" REAL NOT NULL DEFAULT 0,
      "amount_due" REAL NOT NULL DEFAULT 0,
      "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "paid_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS "BillingCheckoutSession_account_created_idx"
      ON "BillingCheckoutSession" ("account_id", "created_at")
  `,
  `
    CREATE INDEX IF NOT EXISTS "BillingCheckoutSession_provider_session_idx"
      ON "BillingCheckoutSession" ("provider", "provider_session_id")
  `,
];

export async function applyLegacyUpgrades(db) {
  await runOptionalStatements(db, LEGACY_UPGRADE_STATEMENTS);

  for (const statement of FOLLOW_UP_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch {
      // Safe to ignore on partially upgraded legacy databases.
    }
  }
}
