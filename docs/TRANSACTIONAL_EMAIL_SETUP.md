# Transactional Email Setup

Set these environment values on the hosted server to send storefront email:

- `SMTP_HOST`
- `SMTP_PORT` (usually `587`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (for example, `orders@your-domain.example`)
- `SMTP_SECURE=true` only for implicit TLS, normally port 465

Without this configuration, Candle Manager creates `StoreEmailEvent` outbox records with `pending_config` status and does not claim that email was sent. Events cover order received, payment confirmation, shipment, pickup readiness, cancellation, and completed refunds.
