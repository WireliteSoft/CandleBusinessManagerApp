-- Cross-cutting records used by Worker webhooks, email delivery, and account safety workflows.

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT, "provider" TEXT NOT NULL,
  "provider_event_id" TEXT NOT NULL, "event_type" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE SET NULL,
  UNIQUE ("provider", "provider_event_id")
);
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_account_created_idx" ON "PaymentWebhookEvent" ("account_id", "created_at");

CREATE TABLE IF NOT EXISTS "StoreEmailEvent" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT, "event_type" TEXT NOT NULL,
  "recipient" TEXT NOT NULL DEFAULT '', "subject" TEXT NOT NULL DEFAULT '', "body" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending', "error_message" TEXT NOT NULL DEFAULT '', "sent_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "StoreEmailEvent_delivery_idx" ON "StoreEmailEvent" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "StoreEmailEvent_account_delivery_idx" ON "StoreEmailEvent" ("account_id", "status", "created_at");

CREATE TABLE IF NOT EXISTS "BanAppealTicket" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT, "account_identifier" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '', "name" TEXT NOT NULL DEFAULT '', "reason" TEXT NOT NULL DEFAULT '',
  "details" TEXT NOT NULL DEFAULT '', "participant_key" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'open',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "BanAppealTicket_account_status_idx" ON "BanAppealTicket" ("account_id", "status", "created_at");
CREATE TABLE IF NOT EXISTS "BanAppealMessage" (
  "id" TEXT PRIMARY KEY NOT NULL, "ticket_id" TEXT NOT NULL, "sender_type" TEXT NOT NULL DEFAULT 'user',
  "sender_name" TEXT NOT NULL DEFAULT '', "message" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("ticket_id") REFERENCES "BanAppealTicket" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "BanAppealMessage_ticket_created_idx" ON "BanAppealMessage" ("ticket_id", "created_at");
CREATE TABLE IF NOT EXISTS "BanAppealEvidence" (
  "id" TEXT PRIMARY KEY NOT NULL, "ticket_id" TEXT NOT NULL, "added_by" TEXT NOT NULL DEFAULT 'admin',
  "note" TEXT NOT NULL DEFAULT '', "image_data" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("ticket_id") REFERENCES "BanAppealTicket" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "BanAppealEvidence_ticket_created_idx" ON "BanAppealEvidence" ("ticket_id", "created_at");
CREATE TABLE IF NOT EXISTS "BanAppealHistory" (
  "id" TEXT PRIMARY KEY NOT NULL, "ticket_id" TEXT NOT NULL UNIQUE, "account_id" TEXT NOT NULL,
  "ban_reason" TEXT NOT NULL DEFAULT '', "appeal_status" TEXT NOT NULL DEFAULT '',
  "completed_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("ticket_id") REFERENCES "BanAppealTicket" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "BanAppealHistory_account_completed_idx" ON "BanAppealHistory" ("account_id", "completed_at");

CREATE TABLE IF NOT EXISTS "IpBan" (
  "id" TEXT PRIMARY KEY NOT NULL, "ip_address" TEXT NOT NULL UNIQUE, "reason" TEXT NOT NULL DEFAULT '',
  "active" INTEGER NOT NULL DEFAULT 1, "created_by_account_id" TEXT NOT NULL DEFAULT '',
  "created_by_user_id" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
