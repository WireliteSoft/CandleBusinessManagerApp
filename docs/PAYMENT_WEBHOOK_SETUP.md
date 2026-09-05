# Payment Webhook Setup

Configure these only after the app has a public HTTPS URL:

- `SQUARE_WEBHOOK_URL=https://your-domain.example/api/webhooks/square`
- `SQUARE_WEBHOOK_SIGNATURE_KEY=` the signature key for that Square webhook subscription
- `PAYPAL_WEBHOOK_ID=` the webhook ID from the PayPal Developer Dashboard

Subscribe Square to `refund.updated` and PayPal to `PAYMENT.CAPTURE.REFUNDED`. The handlers validate Square's raw-body HMAC signature and PayPal's verification API response before changing any order. Duplicate provider events are ignored by `PaymentWebhookEvent` records.
