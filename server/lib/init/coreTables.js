import { runStatements } from './shared.js';

const CORE_TABLE_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "image_data" TEXT NOT NULL DEFAULT '',
      "product_type" TEXT NOT NULL DEFAULT 'physical',
      "scent_family" TEXT NOT NULL DEFAULT '', "fragrance_notes" TEXT NOT NULL DEFAULT '', "sweetness" TEXT NOT NULL DEFAULT '', "scent_strength" TEXT NOT NULL DEFAULT '', "warmth" TEXT NOT NULL DEFAULT '', "freshness" TEXT NOT NULL DEFAULT '', "season" TEXT NOT NULL DEFAULT '', "mood" TEXT NOT NULL DEFAULT '', "room" TEXT NOT NULL DEFAULT '', "burn_time" TEXT NOT NULL DEFAULT '', "wax_type" TEXT NOT NULL DEFAULT '', "wick_type" TEXT NOT NULL DEFAULT '', "batch_number" TEXT NOT NULL DEFAULT '', "inspiration" TEXT NOT NULL DEFAULT '', "making_process" TEXT NOT NULL DEFAULT '', "limited_drop" BOOLEAN NOT NULL DEFAULT 0, "drop_number" TEXT NOT NULL DEFAULT '', "purchase_limit" INTEGER NOT NULL DEFAULT 0, "upcoming_release" BOOLEAN NOT NULL DEFAULT 0, "release_date" TEXT NOT NULL DEFAULT '', "preorders_enabled" BOOLEAN NOT NULL DEFAULT 0, "member_exclusive" BOOLEAN NOT NULL DEFAULT 0, "member_early_access_days" INTEGER NOT NULL DEFAULT 0, "subscriber_exclusive" BOOLEAN NOT NULL DEFAULT 0, "subscriber_early_access_days" INTEGER NOT NULL DEFAULT 0,
      "price" REAL NOT NULL,
      "quantity_in_stock" INTEGER NOT NULL DEFAULT 0,
      "cost_per_unit" REAL NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "Supply" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "category" TEXT NOT NULL DEFAULT 'containers',
      "cost_per_unit" REAL NOT NULL,
      "quantity_in_stock" INTEGER NOT NULL DEFAULT 0,
      "unit_type" TEXT NOT NULL DEFAULT 'oz',
      "supplier" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
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
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "ScentProfile" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "supplier" TEXT NOT NULL DEFAULT '',
      "supplier_sku" TEXT NOT NULL DEFAULT '',
      "name" TEXT NOT NULL,
      "scent_family" TEXT NOT NULL DEFAULT '',
      "top_notes" TEXT NOT NULL DEFAULT '',
      "middle_notes" TEXT NOT NULL DEFAULT '',
      "base_notes" TEXT NOT NULL DEFAULT '',
      "flashpoint_f" REAL,
      "vanillin_content" TEXT NOT NULL DEFAULT '',
      "phthalate_free" BOOLEAN NOT NULL DEFAULT 0,
      "prop65_warning" BOOLEAN NOT NULL DEFAULT 0,
      "soy_performance" TEXT NOT NULL DEFAULT '',
      "recommended_load" TEXT NOT NULL DEFAULT '',
      "usage_notes" TEXT NOT NULL DEFAULT '',
      "source_url" TEXT NOT NULL DEFAULT '',
      "source_attribution" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `CREATE TABLE IF NOT EXISTS "FragranceOilCatalog" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "image_url" TEXT NOT NULL DEFAULT '', "source_url" TEXT NOT NULL DEFAULT '', "variants_json" TEXT NOT NULL DEFAULT '[]', "discontinued" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "FragranceOilCatalog_name_idx" ON "FragranceOilCatalog" ("name");`,
  `CREATE TABLE IF NOT EXISTS "StoreGiftPackRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "recipient_name" TEXT NOT NULL DEFAULT '', "gift_message" TEXT NOT NULL DEFAULT '', "items_json" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreGiftPackRequest_status_created_idx" ON "StoreGiftPackRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCollectionRequest" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL, "items_json" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'new', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCollectionRequest_status_created_idx" ON "StoreCollectionRequest" ("status", "created_at");`,
  `CREATE TABLE IF NOT EXISTS "StoreCustomerCollection" ("id" TEXT NOT NULL PRIMARY KEY, "customer_id" TEXT NOT NULL, "collection_name" TEXT NOT NULL, "label_text" TEXT NOT NULL DEFAULT '', "collection_size" INTEGER NOT NULL, "items_json" TEXT NOT NULL DEFAULT '[]', "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS "StoreCustomerCollection_customer_updated_idx" ON "StoreCustomerCollection" ("customer_id", "updated_at");`,
  `
    CREATE TABLE IF NOT EXISTS "Employee" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "address" TEXT NOT NULL DEFAULT '',
      "phone" TEXT NOT NULL DEFAULT '',
      "picture_data" TEXT NOT NULL DEFAULT '',
      "commission_rate" REAL NOT NULL DEFAULT 0.1,
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "Sale" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "product_id" TEXT NOT NULL,
      "employee_id" TEXT,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "sale_price" REAL NOT NULL,
      "total_amount" REAL NOT NULL,
      "commission_amount" REAL NOT NULL DEFAULT 0,
      "sale_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Sale_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Sale_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "CartItem" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "supply_id" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "notes" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CartItem_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "Supply" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "CandleRecipe" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "yield_quantity" INTEGER NOT NULL DEFAULT 1,
      "batch_size" REAL NOT NULL,
      "difficulty_level" TEXT NOT NULL DEFAULT 'Medium',
      "notes" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "recipe_id" TEXT NOT NULL,
      "supply_id" TEXT NOT NULL,
      "quantity" REAL NOT NULL,
      "percentage" REAL NOT NULL DEFAULT 0,
      "notes" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RecipeIngredient_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "CandleRecipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "RecipeIngredient_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "Supply" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "BatchLog" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "batch_date" TEXT NOT NULL,
      "batch_name" TEXT NOT NULL,
      "candles_amount" INTEGER NOT NULL DEFAULT 0,
      "wax_type" TEXT NOT NULL DEFAULT '',
      "container_type" TEXT NOT NULL DEFAULT '',
      "container_size" TEXT NOT NULL DEFAULT '',
      "wax_weight_oz" REAL NOT NULL DEFAULT 0,
      "fragrance_load" REAL NOT NULL DEFAULT 8,
      "fragrance_oil" TEXT NOT NULL DEFAULT '',
      "wick_type" TEXT NOT NULL DEFAULT '',
      "wick_size" TEXT NOT NULL DEFAULT '',
      "wick_count" INTEGER NOT NULL DEFAULT 1,
      "vessel" TEXT NOT NULL DEFAULT '',
      "pour_temp_f" REAL NOT NULL DEFAULT 0,
      "room_temp_f" REAL NOT NULL DEFAULT 0,
      "room_humidity" REAL NOT NULL DEFAULT 0,
      "pricing_wax_cost" REAL NOT NULL DEFAULT 0,
      "pricing_wax_weight_lb" REAL NOT NULL DEFAULT 0,
      "pricing_fragrance_used_oz" REAL NOT NULL DEFAULT 0,
      "pricing_fragrance_cost_used" REAL NOT NULL DEFAULT 0,
      "pricing_fill_per_candle_oz" REAL NOT NULL DEFAULT 0,
      "pricing_jar_cost_each" REAL NOT NULL DEFAULT 0,
      "pricing_wick_cost_each" REAL NOT NULL DEFAULT 0,
      "pricing_label_cost_each" REAL NOT NULL DEFAULT 0,
      "pricing_other_cost_each" REAL NOT NULL DEFAULT 0,
      "pricing_labor_overhead_each" REAL NOT NULL DEFAULT 0,
      "pricing_material_cost_per_candle" REAL NOT NULL DEFAULT 0,
      "pricing_total_cost_per_candle" REAL NOT NULL DEFAULT 0,
      "pricing_wholesale_suggestion" REAL NOT NULL DEFAULT 0,
      "pricing_retail_suggestion" REAL NOT NULL DEFAULT 0,
      "pricing_premium_suggestion" REAL NOT NULL DEFAULT 0,
      "pricing_cogs_source" TEXT NOT NULL DEFAULT 'total',
      "pricing_price_source" TEXT NOT NULL DEFAULT 'retail',
      "notes" TEXT NOT NULL DEFAULT '',
      "outcome" TEXT NOT NULL DEFAULT 'pending',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "Mold" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "weight_oz" REAL NOT NULL DEFAULT 0,
      "image_data" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS "WaxInventory_wax_type_id_key"
    ON "WaxInventory" ("wax_type_id");
  `,
];

export async function setupCoreTables(db) {
  await runStatements(db, CORE_TABLE_STATEMENTS);
}
