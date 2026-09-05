-- Remaining account-owned storefront discovery, service, request, and engagement records.

CREATE TABLE IF NOT EXISTS "StorefrontFeatureSetting" (
  "account_id" TEXT NOT NULL, "feature_key" TEXT NOT NULL, "enabled" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("account_id", "feature_key"),
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoreBackInStockAlert" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active', "notified_at" TEXT, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "product_id", "email")
);
CREATE INDEX IF NOT EXISTS "StoreBackInStockAlert_product_status_idx" ON "StoreBackInStockAlert" ("account_id", "product_id", "status");
CREATE TABLE IF NOT EXISTS "StoreWaitlistEntry" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active', "notified_at" TEXT, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "product_id", "email")
);
CREATE INDEX IF NOT EXISTS "StoreWaitlistEntry_product_status_idx" ON "StoreWaitlistEntry" ("account_id", "product_id", "status");

CREATE TABLE IF NOT EXISTS "StoreScentPoll" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "title" TEXT NOT NULL,
  "poll_type" TEXT NOT NULL DEFAULT 'next_scent', "options_json" TEXT NOT NULL DEFAULT '[]', "active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreScentPoll_active_created_idx" ON "StoreScentPoll" ("account_id", "active", "created_at");
CREATE TABLE IF NOT EXISTS "StoreScentPollVote" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "poll_id" TEXT NOT NULL,
  "visitor_key" TEXT NOT NULL, "option_name" TEXT NOT NULL, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("poll_id") REFERENCES "StoreScentPoll" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "poll_id", "visitor_key")
);
CREATE INDEX IF NOT EXISTS "StoreScentPollVote_poll_option_idx" ON "StoreScentPollVote" ("account_id", "poll_id", "option_name");

CREATE TABLE IF NOT EXISTS "StoreCustomerCollection" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL,
  "items_json" TEXT NOT NULL DEFAULT '[]', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCustomerCollection_customer_updated_idx" ON "StoreCustomerCollection" ("account_id", "customer_id", "updated_at");
CREATE TABLE IF NOT EXISTS "StoreGiftRegistry" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL, "share_code" TEXT NOT NULL,
  "title" TEXT NOT NULL, "event_date" TEXT NOT NULL DEFAULT '', "message" TEXT NOT NULL DEFAULT '',
  "active" INTEGER NOT NULL DEFAULT 1, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "share_code")
);
CREATE TABLE IF NOT EXISTS "StoreGiftRegistryItem" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "registry_id" TEXT NOT NULL, "product_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("registry_id") REFERENCES "StoreGiftRegistry" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "registry_id", "product_id")
);
CREATE TABLE IF NOT EXISTS "StoreCustomerFavorite" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL, "product_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "customer_id", "product_id")
);
CREATE TABLE IF NOT EXISTS "StoreProductReview" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL, "product_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL, "title" TEXT NOT NULL DEFAULT '', "body" TEXT NOT NULL, "photo_data" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending', "verified_purchase" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "customer_id", "product_id")
);
CREATE INDEX IF NOT EXISTS "StoreProductReview_product_status_idx" ON "StoreProductReview" ("account_id", "product_id", "status", "created_at");
CREATE TABLE IF NOT EXISTS "StoreCustomerReferral" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "code" TEXT NOT NULL,
  "referrer_customer_id" TEXT NOT NULL, "referred_customer_id" TEXT, "status" TEXT NOT NULL DEFAULT 'available',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" TEXT,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("referrer_customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("referred_customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE SET NULL,
  UNIQUE ("account_id", "code"), UNIQUE ("account_id", "referred_customer_id")
);
CREATE TABLE IF NOT EXISTS "StoreCustomerGalleryItem" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "customer_id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL, "source_id" TEXT NOT NULL, "title" TEXT NOT NULL DEFAULT '',
  "image_data" TEXT NOT NULL DEFAULT '', "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("customer_id") REFERENCES "StoreCustomer" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "customer_id", "source_type", "source_id")
);
CREATE INDEX IF NOT EXISTS "StoreCustomerGalleryItem_status_idx" ON "StoreCustomerGalleryItem" ("account_id", "status", "updated_at");

CREATE TABLE IF NOT EXISTS "StoreGiftPackRequest" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "recipient_name" TEXT NOT NULL DEFAULT '', "gift_message" TEXT NOT NULL DEFAULT '', "items_json" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'new', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreGiftPackRequest_status_created_idx" ON "StoreGiftPackRequest" ("account_id", "status", "created_at");
CREATE TABLE IF NOT EXISTS "StoreCollectionRequest" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL,
  "items_json" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCollectionRequest_status_created_idx" ON "StoreCollectionRequest" ("account_id", "status", "created_at");
CREATE TABLE IF NOT EXISTS "StoreCustomScentRequest" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "desired_notes" TEXT NOT NULL DEFAULT '', "scent_family" TEXT NOT NULL DEFAULT '', "occasion" TEXT NOT NULL DEFAULT '',
  "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "quote_amount" REAL NOT NULL DEFAULT 0,
  "admin_notes" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreCustomScentRequest_status_created_idx" ON "StoreCustomScentRequest" ("account_id", "status", "created_at");
CREATE TABLE IF NOT EXISTS "StoreEventFavorRequest" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "vessel" TEXT NOT NULL, "scent" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '',
  "packaging" TEXT NOT NULL DEFAULT '', "event_date" TEXT NOT NULL DEFAULT '', "details" TEXT NOT NULL DEFAULT '',
  "estimate_amount" REAL NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreEventFavorRequest_status_created_idx" ON "StoreEventFavorRequest" ("account_id", "status", "created_at");
CREATE TABLE IF NOT EXISTS "StoreCustomOrderQuote" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "share_code" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL, "customer_email" TEXT NOT NULL, "title" TEXT NOT NULL, "details" TEXT NOT NULL DEFAULT '',
  "revision" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'draft', "total_amount" REAL NOT NULL DEFAULT 0,
  "deposit_amount" REAL NOT NULL DEFAULT 0, "deposit_paid" INTEGER NOT NULL DEFAULT 0, "final_paid" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "share_code")
);
CREATE TABLE IF NOT EXISTS "StorePrivateLabelRequest" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "business_name" TEXT NOT NULL, "minimum_quantity" INTEGER NOT NULL, "branding_data" TEXT NOT NULL DEFAULT '',
  "product_details" TEXT NOT NULL DEFAULT '', "quote_amount" REAL NOT NULL DEFAULT 0,
  "proof_status" TEXT NOT NULL DEFAULT 'pending', "production_status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StorePrivateLabelRequest_status_idx" ON "StorePrivateLabelRequest" ("account_id", "production_status", "updated_at");

CREATE TABLE IF NOT EXISTS "StoreWorkshopSlot" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "starts_at" TEXT NOT NULL, "capacity" INTEGER NOT NULL,
  "deposit_amount" REAL NOT NULL DEFAULT 0, "active" INTEGER NOT NULL DEFAULT 1, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "starts_at")
);
CREATE TABLE IF NOT EXISTS "StoreWorkshopBooking" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "slot_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "email" TEXT NOT NULL, "party_size" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'confirmed',
  "payment_status" TEXT NOT NULL DEFAULT 'deposit_pending', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("slot_id") REFERENCES "StoreWorkshopSlot" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreWorkshopBooking_slot_idx" ON "StoreWorkshopBooking" ("account_id", "slot_id", "status");
CREATE TABLE IF NOT EXISTS "StoreWorkshopPartyRequest" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "event_type" TEXT NOT NULL, "requested_date" TEXT NOT NULL DEFAULT '', "party_size" INTEGER NOT NULL,
  "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new', "admin_notes" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreWorkshopPartyRequest_status_created_idx" ON "StoreWorkshopPartyRequest" ("account_id", "status", "created_at");
CREATE TABLE IF NOT EXISTS "StoreRefillProgram" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL UNIQUE, "active" INTEGER NOT NULL DEFAULT 1,
  "discount_percent" REAL NOT NULL DEFAULT 10, "eligibility_rules" TEXT NOT NULL DEFAULT '',
  "return_instructions" TEXT NOT NULL DEFAULT '', "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "StoreRefillRequest" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "product_name" TEXT NOT NULL, "scent" TEXT NOT NULL DEFAULT '', "quantity" INTEGER NOT NULL DEFAULT 1,
  "container_condition" TEXT NOT NULL, "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'new',
  "container_received" INTEGER NOT NULL DEFAULT 0, "discount_percent" REAL NOT NULL DEFAULT 0,
  "staff_notes" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreRefillRequest_status_created_idx" ON "StoreRefillRequest" ("account_id", "status", "created_at");

CREATE TABLE IF NOT EXISTS "StoreContactMessage" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL DEFAULT '', "email" TEXT NOT NULL DEFAULT '',
  "street_address" TEXT NOT NULL DEFAULT '', "city" TEXT NOT NULL DEFAULT '', "state" TEXT NOT NULL DEFAULT '',
  "zip" TEXT NOT NULL DEFAULT '', "phone" TEXT NOT NULL DEFAULT '', "message" TEXT NOT NULL DEFAULT '',
  "ip_address" TEXT NOT NULL DEFAULT '', "is_read" INTEGER NOT NULL DEFAULT 0, "read_at" TEXT,
  "workflow_status" TEXT NOT NULL DEFAULT 'new', "priority_level" TEXT NOT NULL DEFAULT 'normal',
  "admin_notes" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StoreContactMessage_created_idx" ON "StoreContactMessage" ("account_id", "created_at");
