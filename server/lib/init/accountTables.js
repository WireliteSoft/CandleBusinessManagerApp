import { runStatements } from './shared.js';

const ACCOUNT_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "StorePickupSettings" ("id" TEXT PRIMARY KEY NOT NULL, "instructions" TEXT NOT NULL DEFAULT '', "cutoff_hours" INTEGER NOT NULL DEFAULT 24, "active" BOOLEAN NOT NULL DEFAULT 0, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StorePickupSlot" ("id" TEXT PRIMARY KEY NOT NULL, "starts_at" DATETIME NOT NULL, "capacity" INTEGER NOT NULL DEFAULT 1, "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StorePickupSlot_starts_idx" ON "StorePickupSlot" ("starts_at");`,
  `
    CREATE TABLE IF NOT EXISTS "StoreBackInStockAlert" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "product_id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "notified_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreBackInStockAlert_product_email_idx" ON "StoreBackInStockAlert" ("product_id", "email");`,
  `CREATE INDEX IF NOT EXISTS "StoreBackInStockAlert_product_status_idx" ON "StoreBackInStockAlert" ("product_id", "status");`,
  `
    CREATE TABLE IF NOT EXISTS "StoreWaitlistEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "product_id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "notified_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreWaitlistEntry_product_email_idx" ON "StoreWaitlistEntry" ("product_id", "email");`,
  `CREATE INDEX IF NOT EXISTS "StoreWaitlistEntry_product_status_idx" ON "StoreWaitlistEntry" ("product_id", "status");`,
  `CREATE TABLE IF NOT EXISTS "StoreScentPoll" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "poll_type" TEXT NOT NULL DEFAULT 'next_scent', "options_json" TEXT NOT NULL DEFAULT '[]', "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreScentPoll_active_created_idx" ON "StoreScentPoll" ("active", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreScentPollVote" ("id" TEXT NOT NULL PRIMARY KEY, "poll_id" TEXT NOT NULL, "visitor_key" TEXT NOT NULL, "option_name" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreScentPollVote_poll_visitor_idx" ON "StoreScentPollVote" ("poll_id", "visitor_key");`,
  `CREATE INDEX IF NOT EXISTS "StoreScentPollVote_poll_option_idx" ON "StoreScentPollVote" ("poll_id", "option_name");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomScentRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "desired_notes" TEXT NOT NULL DEFAULT '', "scent_family" TEXT NOT NULL DEFAULT '', "occasion" TEXT NOT NULL DEFAULT '', "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "quote_amount" REAL NOT NULL DEFAULT 0, "admin_notes" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomScentRequest_status_created_idx" ON "StoreCustomScentRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreEventFavorRequest" ("id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "vessel" TEXT NOT NULL, "scent" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "packaging" TEXT NOT NULL DEFAULT '', "event_date" TEXT NOT NULL DEFAULT '', "details" TEXT NOT NULL DEFAULT '', "estimate_amount" REAL NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StorefrontFeatureSetting" ("feature_key" TEXT PRIMARY KEY NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT 1, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomOrderQuote" ("id" TEXT PRIMARY KEY NOT NULL, "share_code" TEXT NOT NULL UNIQUE, "customer_name" TEXT NOT NULL, "customer_email" TEXT NOT NULL, "title" TEXT NOT NULL, "details" TEXT NOT NULL DEFAULT '', "revision" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'draft', "total_amount" REAL NOT NULL DEFAULT 0, "deposit_amount" REAL NOT NULL DEFAULT 0, "deposit_paid" BOOLEAN NOT NULL DEFAULT 0, "final_paid" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreWorkshopSlot" ("id" TEXT PRIMARY KEY NOT NULL, "starts_at" DATETIME NOT NULL UNIQUE, "capacity" INTEGER NOT NULL, "deposit_amount" REAL NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreWorkshopBooking" ("id" TEXT PRIMARY KEY NOT NULL, "slot_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "party_size" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'confirmed', "payment_status" TEXT NOT NULL DEFAULT 'deposit_pending', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreWorkshopPartyRequest" ("id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "event_type" TEXT NOT NULL, "requested_date" TEXT NOT NULL DEFAULT '', "party_size" INTEGER NOT NULL, "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "admin_notes" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreWorkshopPartyRequest_status_created_idx" ON "StoreWorkshopPartyRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreRefillProgram" ("id" TEXT PRIMARY KEY NOT NULL, "active" BOOLEAN NOT NULL DEFAULT 1, "discount_percent" REAL NOT NULL DEFAULT 10, "eligibility_rules" TEXT NOT NULL DEFAULT '', "return_instructions" TEXT NOT NULL DEFAULT '', "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS "StoreRefillRequest" ("id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "product_name" TEXT NOT NULL, "scent" TEXT NOT NULL DEFAULT '', "quantity" INTEGER NOT NULL DEFAULT 1, "container_condition" TEXT NOT NULL, "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "container_received" BOOLEAN NOT NULL DEFAULT 0, "discount_percent" REAL NOT NULL DEFAULT 0, "staff_notes" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreRefillRequest_status_created_idx" ON "StoreRefillRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftPackRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "recipient_name" TEXT NOT NULL DEFAULT '', "gift_message" TEXT NOT NULL DEFAULT '', "items_json" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreGiftPackRequest_status_created_idx" ON "StoreGiftPackRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCollectionRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL, "items_json" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCollectionRequest_status_created_idx" ON "StoreCollectionRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerCollection" ("id" TEXT NOT NULL PRIMARY KEY, "customer_id" TEXT NOT NULL, "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL, "items_json" TEXT NOT NULL DEFAULT '[]', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerCollection_customer_updated_idx" ON "StoreCustomerCollection" ("customer_id", "updated_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftRegistry" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "share_code" TEXT NOT NULL UNIQUE, "title" TEXT NOT NULL, "event_date" TEXT NOT NULL DEFAULT '', "message" TEXT NOT NULL DEFAULT '', "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreGiftRegistry_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftRegistryItem" ("id" TEXT PRIMARY KEY NOT NULL, "registry_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreGiftRegistryItem_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "StoreGiftRegistry" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreGiftRegistryItem_registry_product_idx" ON "StoreGiftRegistryItem" ("registry_id", "product_id");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerFavorite" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreCustomerFavorite_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerFavorite_customer_product_idx" ON "StoreCustomerFavorite" ("customer_id", "product_id");`,
  `CREATE TABLE IF NOT EXISTS "StoreProductReview" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "rating" INTEGER NOT NULL, "title" TEXT NOT NULL DEFAULT '', "body" TEXT NOT NULL, "photo_data" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'pending', "verified_purchase" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreProductReview_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreProductReview_customer_product_idx" ON "StoreProductReview" ("customer_id", "product_id");`,
  `CREATE INDEX IF NOT EXISTS "StoreProductReview_product_status_idx" ON "StoreProductReview" ("product_id", "status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerRewardBalance" ("customer_id" TEXT PRIMARY KEY NOT NULL, "points" INTEGER NOT NULL DEFAULT 0, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreCustomerRewardBalance_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerRewardLedger" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "points" INTEGER NOT NULL, "source" TEXT NOT NULL, "reference_id" TEXT NOT NULL DEFAULT '', "note" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreCustomerRewardLedger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerRewardLedger_source_ref_idx" ON "StoreCustomerRewardLedger" ("customer_id", "source", "reference_id");`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerRewardLedger_customer_created_idx" ON "StoreCustomerRewardLedger" ("customer_id", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerReferral" ("id" TEXT PRIMARY KEY NOT NULL, "code" TEXT NOT NULL UNIQUE, "referrer_customer_id" TEXT NOT NULL, "referred_customer_id" TEXT, "status" TEXT NOT NULL DEFAULT 'available', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" DATETIME);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerReferral_referred_idx" ON "StoreCustomerReferral" ("referred_customer_id");`,
  `
    CREATE TABLE IF NOT EXISTS "StoreContactMessage" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL DEFAULT '',
      "email" TEXT NOT NULL DEFAULT '',
      "street_address" TEXT NOT NULL DEFAULT '',
      "city" TEXT NOT NULL DEFAULT '',
      "state" TEXT NOT NULL DEFAULT '',
      "zip" TEXT NOT NULL DEFAULT '',
      "phone" TEXT NOT NULL DEFAULT '',
      "message" TEXT NOT NULL DEFAULT '',
      "ip_address" TEXT NOT NULL DEFAULT '',
      "is_read" BOOLEAN NOT NULL DEFAULT 0,
      "read_at" DATETIME,
      "workflow_status" TEXT NOT NULL DEFAULT 'new',
      "priority_level" TEXT NOT NULL DEFAULT 'normal',
      "admin_notes" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreContactMessage_created_idx"
      ON "StoreContactMessage" ("created_at");
  `,
  `
    CREATE TABLE IF NOT EXISTS "BanAppealTicket" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_id" TEXT,
      "account_identifier" TEXT NOT NULL DEFAULT '',
      "email" TEXT NOT NULL DEFAULT '',
      "name" TEXT NOT NULL DEFAULT '',
      "reason" TEXT NOT NULL DEFAULT '',
      "details" TEXT NOT NULL DEFAULT '',
      "participant_key" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'open',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "BanAppealMessage" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "ticket_id" TEXT NOT NULL,
      "sender_type" TEXT NOT NULL DEFAULT 'user',
      "sender_name" TEXT NOT NULL DEFAULT '',
      "message" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BanAppealMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "BanAppealTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "BanAppealMessage_ticket_created_idx"
      ON "BanAppealMessage" ("ticket_id", "created_at");
  `,
  `
    CREATE TABLE IF NOT EXISTS "BanAppealEvidence" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "ticket_id" TEXT NOT NULL,
      "added_by" TEXT NOT NULL DEFAULT 'admin',
      "note" TEXT NOT NULL DEFAULT '',
      "image_data" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BanAppealEvidence_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "BanAppealTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "BanAppealEvidence_ticket_created_idx"
      ON "BanAppealEvidence" ("ticket_id", "created_at");
  `,
  `
    CREATE TABLE IF NOT EXISTS "BanAppealHistory" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "ticket_id" TEXT NOT NULL,
      "account_id" TEXT NOT NULL,
      "ban_reason" TEXT NOT NULL DEFAULT '',
      "appeal_status" TEXT NOT NULL DEFAULT '',
      "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BanAppealHistory_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "BanAppealTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "BanAppealHistory_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "BanAppealHistory_ticket_id_idx"
      ON "BanAppealHistory" ("ticket_id");
  `,
  `
    CREATE INDEX IF NOT EXISTS "BanAppealHistory_account_completed_idx"
      ON "BanAppealHistory" ("account_id", "completed_at");
  `,
  `
    CREATE TABLE IF NOT EXISTS "IpBan" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "ip_address" TEXT NOT NULL,
      "reason" TEXT NOT NULL DEFAULT '',
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "created_by_account_id" TEXT NOT NULL DEFAULT '',
      "created_by_user_id" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "IpBan_ip_address_idx"
      ON "IpBan" ("ip_address");
  `,
  `
    CREATE TABLE IF NOT EXISTS "Account" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "join_code" TEXT NOT NULL DEFAULT '',
      "plan_tier" TEXT NOT NULL DEFAULT 'free',
      "is_banned" BOOLEAN NOT NULL DEFAULT 0,
      "ban_reason" TEXT NOT NULL DEFAULT '',
      "ban_evidence_note" TEXT NOT NULL DEFAULT '',
      "ban_evidence_image_data" TEXT NOT NULL DEFAULT '',
      "ban_evidence_images_data" TEXT NOT NULL DEFAULT '[]',
      "access_disabled" BOOLEAN NOT NULL DEFAULT 0,
      "disable_reason" TEXT NOT NULL DEFAULT '',
      "store_slug" TEXT NOT NULL DEFAULT '',
      "store_title" TEXT NOT NULL DEFAULT '',
      "store_description" TEXT NOT NULL DEFAULT '',
      "store_logo_data" TEXT NOT NULL DEFAULT '',
      "store_banner_data" TEXT NOT NULL DEFAULT '',
      "store_background_image_data" TEXT NOT NULL DEFAULT '',
      "store_custom_html" TEXT NOT NULL DEFAULT '',
      "store_preset_state" TEXT NOT NULL DEFAULT '',
      "store_custom_full_mode" BOOLEAN NOT NULL DEFAULT 0,
      "store_show_details" BOOLEAN NOT NULL DEFAULT 1,
      "store_product_ids" TEXT NOT NULL DEFAULT '[]',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "Account_store_slug_unique_idx"
      ON "Account" ("store_slug")
      WHERE "store_slug" <> '';
  `,
  `
    CREATE TABLE IF NOT EXISTS "BillingConfig" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "standard_monthly_usd" REAL NOT NULL DEFAULT 5.99,
      "standard_yearly_usd" REAL NOT NULL DEFAULT 57.50,
      "pro_monthly_usd" REAL NOT NULL DEFAULT 7.99,
      "pro_yearly_usd" REAL NOT NULL DEFAULT 76.70,
      "elite_monthly_usd" REAL NOT NULL DEFAULT 14.99,
      "elite_yearly_usd" REAL NOT NULL DEFAULT 143.90,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
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
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BillingCheckoutSession_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "BillingCheckoutSession_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "AccountUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "BillingCheckoutSession_account_created_idx"
      ON "BillingCheckoutSession" ("account_id", "created_at");
  `,
  `
    CREATE INDEX IF NOT EXISTS "BillingCheckoutSession_provider_session_idx"
      ON "BillingCheckoutSession" ("provider", "provider_session_id");
  `,
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
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AccountBillingProfile_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "AccountUser" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_id" TEXT NOT NULL,
      "name" TEXT NOT NULL DEFAULT '',
      "email" TEXT NOT NULL DEFAULT '',
      "username" TEXT NOT NULL,
      "password_hash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'member',
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AccountUser_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "AccountUser_account_username_idx"
      ON "AccountUser" ("account_id", "username");
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "AccountUser_email_idx"
      ON "AccountUser" ("email");
  `,
  `
    CREATE TABLE IF NOT EXISTS "AuthSession" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_user_id" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "expires_at" TEXT NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuthSession_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "AccountUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_token_idx" ON "AuthSession" ("token");
  `,
  `
    CREATE TABLE IF NOT EXISTS "SuperAdminSession" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "token" TEXT NOT NULL,
      "expires_at" TEXT NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "SuperAdminSession_token_idx" ON "SuperAdminSession" ("token");
  `,
  `
    CREATE TABLE IF NOT EXISTS "AuthEvent" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_id" TEXT,
      "account_user_id" TEXT,
      "email" TEXT NOT NULL DEFAULT '',
      "event_type" TEXT NOT NULL DEFAULT '',
      "ip_address" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "AuthEvent_account_user_created_idx"
      ON "AuthEvent" ("account_user_id", "created_at");
  `,
  `
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
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AccountJoinRequest_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "AccountJoinRequest_account_status_idx"
      ON "AccountJoinRequest" ("account_id", "status");
  `,
  `
    CREATE TABLE IF NOT EXISTS "AccountRole" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AccountRole_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "AccountRole_account_name_idx"
      ON "AccountRole" ("account_id", "name");
  `,
  `
    CREATE TABLE IF NOT EXISTS "AccountRolePermission" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_id" TEXT NOT NULL,
      "role_name" TEXT NOT NULL,
      "feature_key" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT 1,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AccountRolePermission_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "AccountRolePermission_account_role_feature_idx"
      ON "AccountRolePermission" ("account_id", "role_name", "feature_key");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreCustomer" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL DEFAULT '',
      "email" TEXT NOT NULL,
      "password_hash" TEXT NOT NULL,
      "phone" TEXT NOT NULL DEFAULT '',
      "marketing_opt_in" BOOLEAN NOT NULL DEFAULT 0,
      "reminder_opt_in" BOOLEAN NOT NULL DEFAULT 0,
      "birthday" TEXT NOT NULL DEFAULT '',
      "anniversary" TEXT NOT NULL DEFAULT '',
      "occasion_reminder_opt_in" BOOLEAN NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomer_email_idx"
      ON "StoreCustomer" ("email");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreCustomerGalleryItem" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "customer_id" TEXT NOT NULL,
      "source_type" TEXT NOT NULL,
      "source_id" TEXT NOT NULL,
      "title" TEXT NOT NULL DEFAULT '',
      "image_data" TEXT NOT NULL DEFAULT '',
      "details" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreCustomerGalleryItem_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerGalleryItem_customer_source_idx"
      ON "StoreCustomerGalleryItem" ("customer_id", "source_type", "source_id");
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreCustomerGalleryItem_status_idx"
      ON "StoreCustomerGalleryItem" ("status", "updated_at");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreMembershipProgram" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL DEFAULT 'Candle Club',
      "discount_percent" REAL NOT NULL DEFAULT 0,
      "sample_product_id" TEXT NOT NULL DEFAULT '',
      "active" BOOLEAN NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreCustomerMembership" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "customer_id" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ends_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreCustomerMembership_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerMembership_customer_idx"
      ON "StoreCustomerMembership" ("customer_id");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreSubscriptionPlan" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "plan_type" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "candle_count" INTEGER NOT NULL DEFAULT 1,
      "monthly_price" REAL NOT NULL DEFAULT 0,
      "quarterly_price" REAL NOT NULL DEFAULT 0,
      "monthly_delivery_day" INTEGER NOT NULL DEFAULT 1,
      "quarterly_start_month" INTEGER NOT NULL DEFAULT 1,
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `CREATE INDEX IF NOT EXISTS "StoreSubscriptionPlan_active_idx" ON "StoreSubscriptionPlan" ("active", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerSubscription" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "plan_id" TEXT NOT NULL, "provider" TEXT NOT NULL DEFAULT '', "provider_subscription_id" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'pending_payment', "cadence" TEXT NOT NULL DEFAULT 'monthly', "shipping_address_id" TEXT, "next_shipment_at" DATETIME, "skip_next" BOOLEAN NOT NULL DEFAULT 0, "payment_status" TEXT NOT NULL DEFAULT 'pending', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreCustomerSubscription_customer_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "StoreCustomerSubscription_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "StoreSubscriptionPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerSubscription_provider_idx" ON "StoreCustomerSubscription" ("provider", "provider_subscription_id");`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerSubscription_customer_idx" ON "StoreCustomerSubscription" ("customer_id", "status", "next_shipment_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreSubscriptionFulfillment" ("id" TEXT PRIMARY KEY NOT NULL, "subscription_id" TEXT NOT NULL, "shipment_due_at" DATETIME NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "payment_status" TEXT NOT NULL DEFAULT 'pending', "staff_note" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreSubscriptionFulfillment_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "StoreCustomerSubscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE INDEX IF NOT EXISTS "StoreSubscriptionFulfillment_queue_idx" ON "StoreSubscriptionFulfillment" ("status", "shipment_due_at");`,
  `
    CREATE TABLE IF NOT EXISTS "StoreCustomerSession" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "customer_id" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "expires_at" DATETIME NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreCustomerSession_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "StoreCustomerSession_token_idx"
      ON "StoreCustomerSession" ("token");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreCustomerAddress" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "customer_id" TEXT NOT NULL,
      "label" TEXT NOT NULL DEFAULT '',
      "recipient_name" TEXT NOT NULL DEFAULT '',
      "street_address_1" TEXT NOT NULL DEFAULT '',
      "street_address_2" TEXT NOT NULL DEFAULT '',
      "city" TEXT NOT NULL DEFAULT '',
      "state_region" TEXT NOT NULL DEFAULT '',
      "postal_code" TEXT NOT NULL DEFAULT '',
      "country" TEXT NOT NULL DEFAULT '',
      "phone" TEXT NOT NULL DEFAULT '',
      "is_default" BOOLEAN NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreCustomerAddress_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreCustomerAddress_customer_idx"
      ON "StoreCustomerAddress" ("customer_id", "created_at");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreOrder" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "order_number" TEXT NOT NULL,
      "customer_id" TEXT NOT NULL,
      "customer_name" TEXT NOT NULL DEFAULT '',
      "customer_email" TEXT NOT NULL DEFAULT '',
      "customer_phone" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'awaiting_payment',
      "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
      "fulfillment_status" TEXT NOT NULL DEFAULT 'unfulfilled',
      "delivery_method" TEXT NOT NULL DEFAULT 'shipping',
      "pickup_slot_at" DATETIME,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "subtotal_amount" REAL NOT NULL DEFAULT 0,
      "discount_amount" REAL NOT NULL DEFAULT 0,
      "shipping_amount" REAL NOT NULL DEFAULT 0,
      "tax_amount" REAL NOT NULL DEFAULT 0,
      "total_amount" REAL NOT NULL DEFAULT 0,
      "gift_card_id" TEXT,
      "gift_card_discount_amount" REAL NOT NULL DEFAULT 0,
      "gift_card_applied_amount" REAL NOT NULL DEFAULT 0,
      "gift_card_terms_accepted" BOOLEAN NOT NULL DEFAULT 0,
      "gift_card_delivery_method" TEXT NOT NULL DEFAULT 'digital',
      "customer_credit_id" TEXT,
      "customer_credit_applied_amount" REAL NOT NULL DEFAULT 0,
      "discount_code_id" TEXT,
      "discount_code" TEXT NOT NULL DEFAULT '',
      "discount_code_amount" REAL NOT NULL DEFAULT 0,
      "membership_discount_amount" REAL NOT NULL DEFAULT 0,
      "customer_note" TEXT NOT NULL DEFAULT '',
      "staff_note" TEXT NOT NULL DEFAULT '',
      "tracking_number" TEXT NOT NULL DEFAULT '',
      "shipping_recipient_name" TEXT NOT NULL DEFAULT '',
      "shipping_street_address_1" TEXT NOT NULL DEFAULT '',
      "shipping_street_address_2" TEXT NOT NULL DEFAULT '',
      "shipping_city" TEXT NOT NULL DEFAULT '',
      "shipping_state_region" TEXT NOT NULL DEFAULT '',
      "shipping_postal_code" TEXT NOT NULL DEFAULT '',
      "shipping_country" TEXT NOT NULL DEFAULT '',
      "reservation_expires_at" DATETIME,
      "paid_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreOrder_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "StoreOrder_order_number_idx"
      ON "StoreOrder" ("order_number");
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreOrder_customer_created_idx"
      ON "StoreOrder" ("customer_id", "created_at");
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreOrder_status_reservation_idx"
      ON "StoreOrder" ("status", "reservation_expires_at");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreDiscountCode" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "code" TEXT NOT NULL,
      "discount_type" TEXT NOT NULL DEFAULT 'percent',
      "discount_value" REAL NOT NULL DEFAULT 0,
      "minimum_subtotal" REAL NOT NULL DEFAULT 0,
      "starts_at" DATETIME,
      "expires_at" DATETIME,
      "usage_limit" INTEGER NOT NULL DEFAULT 0,
      "usage_count" INTEGER NOT NULL DEFAULT 0,
      "per_customer_limit" INTEGER NOT NULL DEFAULT 1,
      "stack_with_mix" BOOLEAN NOT NULL DEFAULT 1,
      "stack_with_gift_card" BOOLEAN NOT NULL DEFAULT 1,
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "StoreDiscountCode_code_idx"
      ON "StoreDiscountCode" ("code");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreDiscountRedemption" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "discount_code_id" TEXT NOT NULL,
      "customer_id" TEXT NOT NULL,
      "order_id" TEXT NOT NULL,
      "amount" REAL NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreDiscountRedemption_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "StoreDiscountCode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "StoreDiscountRedemption_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "StoreDiscountRedemption_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "StoreOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "StoreDiscountRedemption_order_idx"
      ON "StoreDiscountRedemption" ("order_id");
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreDiscountRedemption_customer_code_idx"
      ON "StoreDiscountRedemption" ("customer_id", "discount_code_id");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreOrderItem" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "order_id" TEXT NOT NULL,
      "product_id" TEXT NOT NULL,
      "product_name" TEXT NOT NULL DEFAULT '',
      "product_image_data" TEXT NOT NULL DEFAULT '',
      "unit_price" REAL NOT NULL DEFAULT 0,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "line_total" REAL NOT NULL DEFAULT 0,
      "customization_json" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreOrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "StoreOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StoreOrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreOrderItem_order_idx"
      ON "StoreOrderItem" ("order_id");
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreOrderItem_product_idx"
      ON "StoreOrderItem" ("product_id");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreOrderPayment" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "order_id" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "provider_payment_id" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "amount" REAL NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreOrderPayment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "StoreOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "StoreOrderPayment_order_idx"
      ON "StoreOrderPayment" ("order_id", "created_at");
  `,
  `CREATE TABLE IF NOT EXISTS "StoreGiftCard" ("id" TEXT PRIMARY KEY NOT NULL, "code" TEXT NOT NULL UNIQUE, "customer_id" TEXT, "initial_balance" REAL NOT NULL, "balance" REAL NOT NULL, "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreGiftCard_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE SET NULL ON UPDATE CASCADE);`,
  `CREATE INDEX IF NOT EXISTS "StoreGiftCard_customer_idx" ON "StoreGiftCard" ("customer_id", "updated_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftCardUsage" ("id" TEXT PRIMARY KEY NOT NULL, "gift_card_id" TEXT NOT NULL, "order_id" TEXT, "amount" REAL NOT NULL, "balance_after" REAL NOT NULL DEFAULT 0, "usage_type" TEXT NOT NULL DEFAULT 'issue', "note" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreGiftCardUsage_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "StoreGiftCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE INDEX IF NOT EXISTS "StoreGiftCardUsage_card_created_idx" ON "StoreGiftCardUsage" ("gift_card_id", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerCredit" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "credit_type" TEXT NOT NULL DEFAULT 'giveaway_balance', "label" TEXT NOT NULL DEFAULT '', "balance" REAL NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT 1, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreCustomerCredit_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerCredit_customer_idx" ON "StoreCustomerCredit" ("customer_id", "active");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerCreditUsage" ("id" TEXT PRIMARY KEY NOT NULL, "customer_credit_id" TEXT NOT NULL, "order_id" TEXT, "amount" REAL NOT NULL, "balance_after" REAL NOT NULL DEFAULT 0, "usage_type" TEXT NOT NULL DEFAULT 'issue', "note" TEXT NOT NULL DEFAULT '', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreCustomerCreditUsage_credit_id_fkey" FOREIGN KEY ("customer_credit_id") REFERENCES "StoreCustomerCredit" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerCreditUsage_credit_created_idx" ON "StoreCustomerCreditUsage" ("customer_credit_id", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerNotification" ("id" TEXT PRIMARY KEY NOT NULL, "customer_id" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'gift_card', "title" TEXT NOT NULL, "message" TEXT NOT NULL, "is_read" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StoreCustomerNotification_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerNotification_customer_created_idx" ON "StoreCustomerNotification" ("customer_id", "created_at");`,
  `
    CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "provider" TEXT NOT NULL,
      "provider_event_id" TEXT NOT NULL,
      "event_type" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_provider_event_idx"
      ON "PaymentWebhookEvent" ("provider", "provider_event_id");
  `,
  `
    CREATE TABLE IF NOT EXISTS "StoreEmailEvent" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "event_type" TEXT NOT NULL,
      "recipient" TEXT NOT NULL DEFAULT '',
      "subject" TEXT NOT NULL DEFAULT '',
      "body" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "error_message" TEXT NOT NULL DEFAULT '',
      "sent_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
];

export async function setupAccountTables(db) {
  await runStatements(db, ACCOUNT_TABLE_STATEMENTS);
}
