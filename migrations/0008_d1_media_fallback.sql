-- Free-tier media fallback: small storefront images and fonts live in D1, not R2.
CREATE TABLE IF NOT EXISTS "StorefrontMedia" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "file_name" TEXT NOT NULL,
  "kind" TEXT NOT NULL, "content_type" TEXT NOT NULL, "body" BLOB NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "file_name", "kind")
);
CREATE INDEX IF NOT EXISTS "StorefrontMedia_account_created_idx" ON "StorefrontMedia" ("account_id", "created_at");
