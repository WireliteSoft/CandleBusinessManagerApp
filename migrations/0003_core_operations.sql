-- Account-owned production and inventory data consolidated from per-account SQLite files.
-- Route queries must always filter by account_id; primary ids remain globally unique CUIDs.

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "account_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "image_data" TEXT NOT NULL DEFAULT '',
  "product_type" TEXT NOT NULL DEFAULT 'physical',
  "scent_family" TEXT NOT NULL DEFAULT '', "fragrance_notes" TEXT NOT NULL DEFAULT '',
  "sweetness" TEXT NOT NULL DEFAULT '', "scent_strength" TEXT NOT NULL DEFAULT '',
  "warmth" TEXT NOT NULL DEFAULT '', "freshness" TEXT NOT NULL DEFAULT '',
  "season" TEXT NOT NULL DEFAULT '', "mood" TEXT NOT NULL DEFAULT '', "room" TEXT NOT NULL DEFAULT '',
  "burn_time" TEXT NOT NULL DEFAULT '', "wax_type" TEXT NOT NULL DEFAULT '', "wick_type" TEXT NOT NULL DEFAULT '',
  "batch_number" TEXT NOT NULL DEFAULT '', "inspiration" TEXT NOT NULL DEFAULT '', "making_process" TEXT NOT NULL DEFAULT '',
  "limited_drop" INTEGER NOT NULL DEFAULT 0, "drop_number" TEXT NOT NULL DEFAULT '',
  "purchase_limit" INTEGER NOT NULL DEFAULT 0, "upcoming_release" INTEGER NOT NULL DEFAULT 0,
  "release_date" TEXT NOT NULL DEFAULT '', "preorders_enabled" INTEGER NOT NULL DEFAULT 0,
  "member_exclusive" INTEGER NOT NULL DEFAULT 0, "member_early_access_days" INTEGER NOT NULL DEFAULT 0,
  "subscriber_exclusive" INTEGER NOT NULL DEFAULT 0, "subscriber_early_access_days" INTEGER NOT NULL DEFAULT 0,
  "price" REAL NOT NULL, "quantity_in_stock" INTEGER NOT NULL DEFAULT 0, "cost_per_unit" REAL NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Product_account_updated_idx" ON "Product" ("account_id", "updated_at");
CREATE INDEX IF NOT EXISTS "Product_account_name_idx" ON "Product" ("account_id", "name");

CREATE TABLE IF NOT EXISTS "Supply" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL DEFAULT 'containers',
  "cost_per_unit" REAL NOT NULL, "quantity_in_stock" INTEGER NOT NULL DEFAULT 0,
  "unit_type" TEXT NOT NULL DEFAULT 'oz', "supplier" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Supply_account_category_idx" ON "Supply" ("account_id", "category");

CREATE TABLE IF NOT EXISTS "WaxInventory" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "wax_type_id" TEXT NOT NULL,
  "wax_name" TEXT NOT NULL, "pounds" REAL NOT NULL DEFAULT 0, "total_price" REAL NOT NULL DEFAULT 0,
  "selected" INTEGER NOT NULL DEFAULT 0, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  UNIQUE ("account_id", "wax_type_id")
);

CREATE TABLE IF NOT EXISTS "CandleRecipe" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '', "yield_quantity" INTEGER NOT NULL DEFAULT 1,
  "batch_size" REAL NOT NULL, "difficulty_level" TEXT NOT NULL DEFAULT 'Medium', "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "CandleRecipe_account_updated_idx" ON "CandleRecipe" ("account_id", "updated_at");

CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "recipe_id" TEXT NOT NULL,
  "supply_id" TEXT NOT NULL, "quantity" REAL NOT NULL, "percentage" REAL NOT NULL DEFAULT 0,
  "notes" TEXT NOT NULL DEFAULT '', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("recipe_id") REFERENCES "CandleRecipe" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("supply_id") REFERENCES "Supply" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "RecipeIngredient_recipe_idx" ON "RecipeIngredient" ("account_id", "recipe_id");

CREATE TABLE IF NOT EXISTS "BatchLog" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "batch_date" TEXT NOT NULL,
  "batch_name" TEXT NOT NULL, "candles_amount" INTEGER NOT NULL DEFAULT 0, "wax_type" TEXT NOT NULL DEFAULT '',
  "container_type" TEXT NOT NULL DEFAULT '', "container_size" TEXT NOT NULL DEFAULT '',
  "wax_weight_oz" REAL NOT NULL DEFAULT 0, "fragrance_load" REAL NOT NULL DEFAULT 8,
  "fragrance_oil" TEXT NOT NULL DEFAULT '', "wick_type" TEXT NOT NULL DEFAULT '', "wick_size" TEXT NOT NULL DEFAULT '',
  "wick_count" INTEGER NOT NULL DEFAULT 1, "vessel" TEXT NOT NULL DEFAULT '', "pour_temp_f" REAL NOT NULL DEFAULT 0,
  "room_temp_f" REAL NOT NULL DEFAULT 0, "room_humidity" REAL NOT NULL DEFAULT 0,
  "pricing_wax_cost" REAL NOT NULL DEFAULT 0, "pricing_wax_weight_lb" REAL NOT NULL DEFAULT 0,
  "pricing_fragrance_used_oz" REAL NOT NULL DEFAULT 0, "pricing_fragrance_cost_used" REAL NOT NULL DEFAULT 0,
  "pricing_fill_per_candle_oz" REAL NOT NULL DEFAULT 0, "pricing_jar_cost_each" REAL NOT NULL DEFAULT 0,
  "pricing_wick_cost_each" REAL NOT NULL DEFAULT 0, "pricing_label_cost_each" REAL NOT NULL DEFAULT 0,
  "pricing_other_cost_each" REAL NOT NULL DEFAULT 0, "pricing_labor_overhead_each" REAL NOT NULL DEFAULT 0,
  "pricing_material_cost_per_candle" REAL NOT NULL DEFAULT 0, "pricing_total_cost_per_candle" REAL NOT NULL DEFAULT 0,
  "pricing_wholesale_suggestion" REAL NOT NULL DEFAULT 0, "pricing_retail_suggestion" REAL NOT NULL DEFAULT 0,
  "pricing_premium_suggestion" REAL NOT NULL DEFAULT 0, "pricing_cogs_source" TEXT NOT NULL DEFAULT 'total',
  "pricing_price_source" TEXT NOT NULL DEFAULT 'retail', "notes" TEXT NOT NULL DEFAULT '',
  "outcome" TEXT NOT NULL DEFAULT 'pending', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "BatchLog_account_date_idx" ON "BatchLog" ("account_id", "batch_date");

CREATE TABLE IF NOT EXISTS "Mold" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "weight_oz" REAL NOT NULL DEFAULT 0, "image_data" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Employee" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "email" TEXT NOT NULL, "address" TEXT NOT NULL DEFAULT '', "phone" TEXT NOT NULL DEFAULT '',
  "picture_data" TEXT NOT NULL DEFAULT '', "commission_rate" REAL NOT NULL DEFAULT 0.1,
  "active" INTEGER NOT NULL DEFAULT 1, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Employee_account_active_idx" ON "Employee" ("account_id", "active");

CREATE TABLE IF NOT EXISTS "Sale" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "product_id" TEXT NOT NULL,
  "employee_id" TEXT, "quantity" INTEGER NOT NULL DEFAULT 1, "sale_price" REAL NOT NULL,
  "total_amount" REAL NOT NULL, "commission_amount" REAL NOT NULL DEFAULT 0,
  "sale_date" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("employee_id") REFERENCES "Employee" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "Sale_account_date_idx" ON "Sale" ("account_id", "sale_date");

CREATE TABLE IF NOT EXISTS "CartItem" (
  "id" TEXT PRIMARY KEY NOT NULL, "account_id" TEXT NOT NULL, "supply_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1, "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("supply_id") REFERENCES "Supply" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "CartItem_account_idx" ON "CartItem" ("account_id");

-- Shared supplier reference data is intentionally global, not copied for each account.
CREATE TABLE IF NOT EXISTS "ScentProfile" (
  "id" TEXT PRIMARY KEY NOT NULL, "supplier" TEXT NOT NULL DEFAULT '', "supplier_sku" TEXT NOT NULL DEFAULT '',
  "name" TEXT NOT NULL, "scent_family" TEXT NOT NULL DEFAULT '', "top_notes" TEXT NOT NULL DEFAULT '',
  "middle_notes" TEXT NOT NULL DEFAULT '', "base_notes" TEXT NOT NULL DEFAULT '', "flashpoint_f" REAL,
  "vanillin_content" TEXT NOT NULL DEFAULT '', "phthalate_free" INTEGER NOT NULL DEFAULT 0,
  "prop65_warning" INTEGER NOT NULL DEFAULT 0, "soy_performance" TEXT NOT NULL DEFAULT '',
  "recommended_load" TEXT NOT NULL DEFAULT '', "usage_notes" TEXT NOT NULL DEFAULT '',
  "source_url" TEXT NOT NULL DEFAULT '', "source_attribution" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ScentProfile_name_idx" ON "ScentProfile" ("name");

CREATE TABLE IF NOT EXISTS "FragranceOilCatalog" (
  "id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "image_url" TEXT NOT NULL DEFAULT '',
  "source_url" TEXT NOT NULL DEFAULT '', "variants_json" TEXT NOT NULL DEFAULT '[]',
  "discontinued" INTEGER NOT NULL DEFAULT 0, "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "FragranceOilCatalog_name_idx" ON "FragranceOilCatalog" ("name");
