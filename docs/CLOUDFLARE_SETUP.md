# Cloudflare Git Deployment

Deploy this repository by connecting it to Cloudflare from GitHub. No local Wrangler login or
Cloudflare API token is needed for this flow.

## 1. Create Cloudflare resources in the dashboard

Create a D1 database, an R2 bucket, and an email-outbox Queue in the Cloudflare dashboard. Apply
the SQL files in `migrations/` to the D1 database using the dashboard or Cloudflare's migration
workflow before sending production traffic to the Worker.

## 2. Connect GitHub

Create a Workers project from this repository in the Cloudflare dashboard. Configure the build
command as:

```text
npm run build
```

Use `wrangler.jsonc` as the Worker configuration. The build writes the React application to
`dist/`; the Worker serves it through the `ASSETS` binding and handles `/api/*` on the same domain.

## 3. Add dashboard bindings

Add these bindings to the Worker in Cloudflare's dashboard. Do not put resource IDs or secrets in
the repository.

| Binding | Resource |
| --- | --- |
| `DB` | The D1 database |
| `STORE_MEDIA` | The R2 bucket |
| `EMAIL_OUTBOX` | The email-outbox Queue |

## 4. Add dashboard variables and secrets

Variables: `APP_ORIGIN`, `PAYPAL_ENVIRONMENT`, `SQUARE_ENVIRONMENT`, `SQUARE_APPLICATION_ID`,
and `SQUARE_LOCATION_ID`.

Secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `SQUARE_ACCESS_TOKEN`,
`SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_URL`, `PAYPAL_WEBHOOK_ID`,
`SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `EMAIL_DELIVERY_URL`, and `EMAIL_DELIVERY_TOKEN`.

## 5. Local-only validation

```powershell
npm run cf:types
npm run cf:d1:migrate:local
```

`wrangler.local.jsonc` is only for local SQLite-backed D1 validation. It is not used by Cloudflare
when deploying from GitHub.

## 6. Verify staging

```powershell
npm run build
npm run cf:dev
```

Verify `/api/health`, login, protected data, R2 media, checkout, email outbox delivery, and
Square/PayPal sandbox flows on the staging Worker domain before configuring a production route.

## Active Conversion Order

1. Consolidated D1 application schema.
2. D1 repository layer and account-scoped authentication.
3. Protected operations routes.
4. R2 upload and media delivery.
5. Public storefront, orders, rewards, and fulfillment.
6. Payment providers, raw-body webhooks, email queue, and scheduled maintenance.
