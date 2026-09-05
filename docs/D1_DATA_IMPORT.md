# Import Existing SQLite Data Into D1

Run this once before the first production Cloudflare deployment if the existing SQLite data must be retained:

```powershell
npm run cf:d1:export
```

The command reads the existing master database and every `storage/accounts/*.db` file. It writes `exports/d1-import.sql` and ordered dashboard-sized files in `exports/d1-import-chunks/`. Both contain the consolidated D1 rows with the correct `account_id` on former per-account data.

In the Cloudflare dashboard, create the D1 database and apply the SQL files in `migrations` in numeric order. Then run every file in `exports/d1-import-chunks/` through the D1 console in filename order. The chunks are transaction-safe and sized for dashboard execution. Keep the export files private: they contain customer and business data and are intentionally excluded from Git.

The exporter does not call Cloudflare, deploy the app, or need a Cloudflare API token. It only creates a portable SQL file for the dashboard import step.
