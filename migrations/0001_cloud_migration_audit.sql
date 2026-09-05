-- Cloud D1 foundation only. Application tables are added in later versioned migrations.
-- The importer records source-file and per-account checkpoints here for resumable verification.

CREATE TABLE IF NOT EXISTS "CloudMigrationAudit" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "source_name" TEXT NOT NULL,
  "source_account_id" TEXT,
  "phase" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "details_json" TEXT NOT NULL DEFAULT '{}',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "CloudMigrationAudit_source_phase_idx"
  ON "CloudMigrationAudit" ("source_name", "source_account_id", "phase");
