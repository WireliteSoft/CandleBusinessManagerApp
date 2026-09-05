# Payment Data Handling Rules

## Allowed persistence

Storefront and Candle Manager billing records may persist only:

- payment provider name, such as `square` or `paypal`
- provider transaction or order reference
- payment status, amount, currency, and timestamps
- the selected payment method name, such as `card`, `apple_pay`, `google_pay`, or `paypal`

## Prohibited persistence

Never write any of the following to an application database, notes field, uploaded file, client storage, analytics event, or application log:

- card number, expiry date, CVV/CVC, cardholder data, or magnetic-stripe data
- Apple Pay or Google Pay payment credentials
- Square payment source tokens
- PayPal access tokens, client secrets, account passwords, or checkout approval tokens

## Flow boundary

Square payment tokens are accepted only by the checkout request and sent directly to Square. PayPal credentials remain server environment variables and are exchanged only with PayPal's API. The database stores the provider-generated transaction reference only after a successful payment. Public customer order responses do not disclose provider references.
