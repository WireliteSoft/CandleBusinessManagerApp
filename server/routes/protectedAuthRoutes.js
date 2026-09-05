const BILLING_TIER_ORDER = {
  free: 0,
  standard: 1,
  pro: 2,
  elite: 3,
};

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function toCount(value) {
  return Number(value || 0);
}

function toMinorUnits(amount) {
  return BigInt(Math.round((Number(amount) || 0) * 100));
}

function getTierPrice(tier, billingCycle, pricing) {
  if (tier === 'standard') {
    return Number(
      billingCycle === 'yearly' ? pricing.standard_yearly_usd || 0 : pricing.standard_monthly_usd || 0
    );
  }
  if (tier === 'pro') {
    return Number(billingCycle === 'yearly' ? pricing.pro_yearly_usd || 0 : pricing.pro_monthly_usd || 0);
  }
  if (tier === 'elite') {
    return Number(
      billingCycle === 'yearly' ? pricing.elite_yearly_usd || 0 : pricing.elite_monthly_usd || 0
    );
  }
  return 0;
}

function getPricingByTier(pricing) {
  return {
    free: {
      monthly: 0,
      yearly: 0,
      yearly_savings: 0,
    },
    standard: {
      monthly: Number(pricing.standard_monthly_usd || 0),
      yearly: Number(pricing.standard_yearly_usd || 0),
      yearly_savings: roundCurrency(Number(pricing.standard_monthly_usd || 0) * 12 - Number(pricing.standard_yearly_usd || 0)),
    },
    pro: {
      monthly: Number(pricing.pro_monthly_usd || 0),
      yearly: Number(pricing.pro_yearly_usd || 0),
      yearly_savings: roundCurrency(Number(pricing.pro_monthly_usd || 0) * 12 - Number(pricing.pro_yearly_usd || 0)),
    },
    elite: {
      monthly: Number(pricing.elite_monthly_usd || 0),
      yearly: Number(pricing.elite_yearly_usd || 0),
      yearly_savings: roundCurrency(Number(pricing.elite_monthly_usd || 0) * 12 - Number(pricing.elite_yearly_usd || 0)),
    },
  };
}

function isSameCalendarMonth(dateA, dateB) {
  return (
    dateA.getUTCFullYear() === dateB.getUTCFullYear() &&
    dateA.getUTCMonth() === dateB.getUTCMonth()
  );
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getAppOrigin(req) {
  const candidates = [
    String(process.env.APP_ORIGIN || '').trim(),
    String(req.headers.origin || '').trim(),
    String(req.headers.referer || '').trim(),
    'http://localhost:5173',
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!isValidHttpUrl(candidate)) continue;
    const parsed = new URL(candidate);
    return `${parsed.protocol}//${parsed.host}`;
  }
  return 'http://localhost:5173';
}

function buildBillingReturnUrl(req, sessionId, status, tier) {
  const origin = getAppOrigin(req);
  const url = new URL(origin);
  url.searchParams.set('billingCheckout', status);
  url.searchParams.set('session_id', sessionId);
  url.searchParams.set('tier', tier);
  return url.toString();
}

function getPayPalApiBase() {
  return String(process.env.PAYPAL_ENVIRONMENT || 'sandbox').trim().toLowerCase() === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function getBillingTermsAudit(data, clientIp) {
  return {
    billingTermsVersion: String(data.billing_terms_version || '').trim(),
    billingTermsAcceptedAt: String(data.billing_terms_accepted_at || '').trim(),
    billingTermsAcceptanceIp: String(clientIp || '').trim(),
  };
}

function assertBillingTermsAccepted(data, clientIp) {
  const audit = getBillingTermsAudit(data, clientIp);
  if (!audit.billingTermsVersion || !audit.billingTermsAcceptedAt) {
    const error = new Error('Billing terms must be accepted before checkout');
    error.status = 400;
    throw error;
  }
  const acceptedAt = new Date(audit.billingTermsAcceptedAt);
  if (Number.isNaN(acceptedAt.getTime())) {
    const error = new Error('Billing terms acceptance timestamp is invalid');
    error.status = 400;
    throw error;
  }
  return {
    ...audit,
    billingTermsAcceptedAt: acceptedAt.toISOString(),
  };
}

async function getPayPalAccessToken() {
  const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    const error = new Error('PayPal API credentials are not configured');
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    const error = new Error(payload.error_description || payload.error || 'Failed to get PayPal access token');
    error.status = Number(response.status) || 400;
    throw error;
  }
  return String(payload.access_token);
}

async function createPayPalOrder({ amount, currency, referenceId, description }) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: referenceId,
          description,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.id) {
    const issue = payload?.details?.map((detail) => detail.issue || detail.description).filter(Boolean).join('; ');
    const error = new Error(issue || payload.message || 'Failed to create PayPal order');
    error.status = Number(response.status) || 400;
    throw error;
  }
  return payload;
}

async function capturePayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: '{}',
  });
  const payload = await response.json();
  if (!response.ok) {
    const issue = payload?.details?.map((detail) => detail.issue || detail.description).filter(Boolean).join('; ');
    const error = new Error(issue || payload.message || 'Failed to capture PayPal order');
    error.status = Number(response.status) || 400;
    throw error;
  }
  return payload;
}

async function getBillingConfig(masterPrisma) {
  const rows = await masterPrisma.$queryRaw`
    SELECT
      "standard_monthly_usd",
      "standard_yearly_usd",
      "pro_monthly_usd",
      "pro_yearly_usd",
      "elite_monthly_usd",
      "elite_yearly_usd",
      "currency",
      "updated_at"
    FROM "BillingConfig"
    WHERE "id" = 'default'
    LIMIT 1
  `;
  return (
    rows[0] || {
      standard_monthly_usd: 5.99,
      standard_yearly_usd: 57.5,
      pro_monthly_usd: 7.99,
      pro_yearly_usd: 76.7,
      elite_monthly_usd: 14.99,
      elite_yearly_usd: 143.9,
      currency: 'USD',
    }
  );
}

async function getCurrentAccountTier(masterPrisma, accountId, fallbackTier) {
  const rows = await masterPrisma.$queryRaw`
    SELECT "plan_tier"
    FROM "Account"
    WHERE "id" = ${accountId}
    LIMIT 1
  `;
  return String(rows[0]?.plan_tier || fallbackTier || 'free').toLowerCase();
}

async function getLatestPaidBillingSession(masterPrisma, accountId) {
  const rows = await masterPrisma.$queryRaw`
    SELECT
      "id",
      "target_tier",
      "amount_due",
      "paid_at",
      "created_at"
    FROM "BillingCheckoutSession"
    WHERE "account_id" = ${accountId}
      AND "status" = 'paid'
      AND "payment_status" = 'paid'
      AND "amount_due" > 0
    ORDER BY COALESCE("paid_at", "created_at") DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

async function buildTierQuote(masterPrisma, accountId, currentTier, targetTier, billingCycle) {
  const pricing = await getBillingConfig(masterPrisma);
  const now = new Date();
  const basePrice = roundCurrency(getTierPrice(targetTier, billingCycle, pricing));
  const quote = {
    tier: targetTier,
    billing_cycle: billingCycle,
    base_price: basePrice,
    credit_applied: 0,
    amount_due: basePrice,
    currency: String(pricing.currency || 'USD'),
    can_switch_directly: targetTier === 'free',
    credit_eligible: false,
    prior_purchase_amount: 0,
    prior_purchase_date: null,
    credit_expires_at: null,
  };

  if (targetTier === 'free') {
    quote.amount_due = 0;
    quote.can_switch_directly = true;
    return quote;
  }

  const currentRank = BILLING_TIER_ORDER[currentTier] ?? 0;
  const targetRank = BILLING_TIER_ORDER[targetTier] ?? 0;
  if (targetRank <= currentRank) {
    quote.credit_applied = 0;
    quote.amount_due = 0;
    quote.can_switch_directly = true;
    return quote;
  }

  const lastPaid = await getLatestPaidBillingSession(masterPrisma, accountId);
  if (!lastPaid) return quote;

  const paidAt = new Date(String(lastPaid.paid_at || lastPaid.created_at || ''));
  if (Number.isNaN(paidAt.getTime())) return quote;

  const creditExpiresAt = addDays(paidAt, 5);
  const withinFiveDays = now.getTime() <= creditExpiresAt.getTime();
  const sameCalendarMonth = isSameCalendarMonth(now, paidAt);
  if (!withinFiveDays || !sameCalendarMonth) {
    return quote;
  }

  const priorTier = String(lastPaid.target_tier || 'free').toLowerCase();
  const priorRank = BILLING_TIER_ORDER[priorTier] ?? 0;
  const priorAmount = roundCurrency(Number(lastPaid.amount_due || 0));

  quote.prior_purchase_amount = priorAmount;
  quote.prior_purchase_date = paidAt.toISOString();
  quote.credit_expires_at = creditExpiresAt.toISOString();
  quote.credit_eligible = targetRank > priorRank && priorAmount > 0;

  if (!quote.credit_eligible) {
    return quote;
  }

  quote.credit_applied = Math.min(basePrice, priorAmount);
  quote.amount_due = roundCurrency(Math.max(basePrice - quote.credit_applied, 0));
  quote.can_switch_directly = quote.amount_due <= 0;
  return quote;
}

async function markBillingSessionPaid(masterPrisma, sessionRow, paidAt = new Date()) {
  const paidIso = paidAt.toISOString();
  await masterPrisma.$executeRaw`
    UPDATE "BillingCheckoutSession"
    SET
      "payment_status" = 'paid',
      "status" = 'paid',
      "paid_at" = ${paidIso},
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${sessionRow.id}
  `;
  await masterPrisma.$executeRaw`
    UPDATE "Account"
    SET "plan_tier" = ${sessionRow.target_tier}
    WHERE "id" = ${sessionRow.account_id}
  `;
}

async function getOrCreateAccountBillingProfile(masterPrisma, auth) {
  const rows = await masterPrisma.$queryRaw`
    SELECT *
    FROM "AccountBillingProfile"
    WHERE "account_id" = ${auth.account_id}
    LIMIT 1
  `;
  if (rows[0]) {
    return rows[0];
  }

  await masterPrisma.$executeRaw`
    INSERT INTO "AccountBillingProfile" (
      "account_id",
      "billing_name",
      "billing_email",
      "preferred_payment_method",
      "created_at",
      "updated_at"
    ) VALUES (
      ${auth.account_id},
      ${String(auth.account_name || '').trim()},
      ${String(auth.email || '').trim()},
      'card',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `;

  const createdRows = await masterPrisma.$queryRaw`
    SELECT *
    FROM "AccountBillingProfile"
    WHERE "account_id" = ${auth.account_id}
    LIMIT 1
  `;
  return createdRows[0];
}

async function getAccountUsageSummary({ prisma, masterPrisma, auth, currentTier }) {
  const [
    productCount,
    supplyCount,
    recipeCount,
    batchCount,
    saleCount,
    employeeCount,
    waxInventoryCount,
    saleTotals,
    accountRows,
    accountUserRows,
    checkoutCountRows,
    paidCheckoutCountRows,
    contactCountRows,
    latestPaidSession,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.supply.count(),
    prisma.candleRecipe.count(),
    prisma.batchLog.count(),
    prisma.sale.count(),
    prisma.employee.count(),
    prisma.waxInventory.count(),
    prisma.sale.aggregate({
      _sum: {
        total_amount: true,
        quantity: true,
      },
    }),
    masterPrisma.$queryRaw`
      SELECT "name", "created_at"
      FROM "Account"
      WHERE "id" = ${auth.account_id}
      LIMIT 1
    `,
    masterPrisma.$queryRaw`
      SELECT
        COUNT(*) AS "total_users",
        SUM(CASE WHEN "active" = 1 THEN 1 ELSE 0 END) AS "active_users"
      FROM "AccountUser"
      WHERE "account_id" = ${auth.account_id}
    `,
    masterPrisma.$queryRaw`
      SELECT COUNT(*) AS "total_checkout_sessions"
      FROM "BillingCheckoutSession"
      WHERE "account_id" = ${auth.account_id}
    `,
    masterPrisma.$queryRaw`
      SELECT COUNT(*) AS "paid_orders"
      FROM "BillingCheckoutSession"
      WHERE "account_id" = ${auth.account_id}
        AND "status" = 'paid'
        AND "payment_status" = 'paid'
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) AS "contact_messages"
      FROM "StoreContactMessage"
    `,
    getLatestPaidBillingSession(masterPrisma, auth.account_id),
  ]);

  const accountRow = accountRows[0] || {};
  const accountUserRow = accountUserRows[0] || {};
  const checkoutCountRow = checkoutCountRows[0] || {};
  const paidCheckoutCountRow = paidCheckoutCountRows[0] || {};
  const contactCountRow = contactCountRows[0] || {};

  return {
    account_name: String(accountRow.name || auth.account_name || ''),
    plan_tier: currentTier,
    role: String(auth.role || ''),
    account_created_at: accountRow.created_at || null,
    last_paid_at: latestPaidSession?.paid_at || latestPaidSession?.created_at || null,
    totals: {
      products: productCount,
      supplies: supplyCount,
      recipes: recipeCount,
      batch_logs: batchCount,
      sales: saleCount,
      employees: employeeCount,
      wax_inventory_entries: waxInventoryCount,
      team_users: toCount(accountUserRow.total_users),
      active_team_users: toCount(accountUserRow.active_users),
      contact_messages: toCount(contactCountRow.contact_messages),
      checkout_sessions: toCount(checkoutCountRow.total_checkout_sessions),
      paid_orders: toCount(paidCheckoutCountRow.paid_orders),
      units_sold: toCount(saleTotals._sum.quantity),
    },
    financials: {
      gross_sales: roundCurrency(Number(saleTotals._sum.total_amount || 0)),
      last_paid_amount: roundCurrency(Number(latestPaidSession?.amount_due || 0)),
    },
  };
}

export function registerProtectedAuthRoutes(app, context) {
  const {
    prisma,
    masterPrisma,
    parseOrThrow,
    toRowDates,
    generateJoinCode,
    getClientIp,
    billingTierInput,
    billingCheckoutInput,
    billingPayPalOrderInput,
    billingPayPalCaptureInput,
    accountBillingProfileInput,
    randomUUID,
  } = context;

  app.get('/api/auth/me', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (auth?.blocked) {
        res.status(403).json({ error: auth.reason || 'Account access is blocked' });
        return;
      }
      if (!auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const accountRows = await masterPrisma.$queryRaw`
        SELECT "join_code", "plan_tier" FROM "Account" WHERE "id" = ${auth.account_id} LIMIT 1
      `;
      let joinCode = accountRows[0]?.join_code || '';
      if (!joinCode) {
        joinCode = generateJoinCode();
        await masterPrisma.$executeRaw`
          UPDATE "Account" SET "join_code" = ${joinCode} WHERE "id" = ${auth.account_id}
        `;
      }
      res.json({
        ...auth,
        join_code: joinCode || auth.join_code || '',
        plan_tier: accountRows[0]?.plan_tier || auth.plan_tier || 'free',
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/account/billing-profile', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }
      const profile = await getOrCreateAccountBillingProfile(masterPrisma, auth);
      res.json(toRowDates(profile));
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/account/billing-profile', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }
      const data = parseOrThrow(accountBillingProfileInput, req.body);
      await masterPrisma.$executeRaw`
        INSERT INTO "AccountBillingProfile" (
          "account_id",
          "billing_name",
          "billing_email",
          "billing_phone",
          "company_name",
          "street_address_1",
          "street_address_2",
          "city",
          "state_region",
          "postal_code",
          "country",
          "preferred_payment_method",
          "paypal_email",
          "payment_profile_note",
          "created_at",
          "updated_at"
        ) VALUES (
          ${auth.account_id},
          ${data.billing_name},
          ${data.billing_email},
          ${data.billing_phone},
          ${data.company_name},
          ${data.street_address_1},
          ${data.street_address_2},
          ${data.city},
          ${data.state_region},
          ${data.postal_code},
          ${data.country},
          ${data.preferred_payment_method},
          ${data.paypal_email},
          ${data.payment_profile_note},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT("account_id") DO UPDATE SET
          "billing_name" = excluded."billing_name",
          "billing_email" = excluded."billing_email",
          "billing_phone" = excluded."billing_phone",
          "company_name" = excluded."company_name",
          "street_address_1" = excluded."street_address_1",
          "street_address_2" = excluded."street_address_2",
          "city" = excluded."city",
          "state_region" = excluded."state_region",
          "postal_code" = excluded."postal_code",
          "country" = excluded."country",
          "preferred_payment_method" = excluded."preferred_payment_method",
          "paypal_email" = excluded."paypal_email",
          "payment_profile_note" = excluded."payment_profile_note",
          "updated_at" = CURRENT_TIMESTAMP
      `;
      const profile = await getOrCreateAccountBillingProfile(masterPrisma, auth);
      res.json(toRowDates(profile));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/account/purchase-history', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }
      const rows = await masterPrisma.$queryRaw`
        SELECT
          "id",
          "from_tier",
          "target_tier",
          "billing_cycle",
          "payment_method",
          "provider",
          "currency",
          "base_amount",
          "credit_applied",
          "amount_due",
          "payment_status",
          "status",
          "paid_at",
          "created_at",
          "updated_at"
        FROM "BillingCheckoutSession"
        WHERE "account_id" = ${auth.account_id}
        ORDER BY COALESCE("paid_at", "created_at") DESC, "created_at" DESC
        LIMIT 100
      `;
      res.json(rows.map(toRowDates));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/account/usage-summary', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }
      const currentTier = await getCurrentAccountTier(masterPrisma, auth.account_id, auth.plan_tier);
      const summary = await getAccountUsageSummary({
        prisma,
        masterPrisma,
        auth,
        currentTier,
      });
      res.json(toRowDates(summary));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/billing/plans', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }

      const pricing = await getBillingConfig(masterPrisma);
      const currentTier = await getCurrentAccountTier(masterPrisma, auth.account_id, auth.plan_tier);
      const tierQuotes = {
        monthly: {
          free: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'free', 'monthly'),
          standard: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'standard', 'monthly'),
          pro: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'pro', 'monthly'),
          elite: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'elite', 'monthly'),
        },
        yearly: {
          free: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'free', 'yearly'),
          standard: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'standard', 'yearly'),
          pro: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'pro', 'yearly'),
          elite: await buildTierQuote(masterPrisma, auth.account_id, currentTier, 'elite', 'yearly'),
        },
      };

      res.json({
        plan_tier: currentTier,
        pricing: toRowDates(pricing),
        pricing_by_tier: getPricingByTier(pricing),
        payment_options: {
          square_enabled: Boolean(
            String(process.env.SQUARE_ACCESS_TOKEN || '').trim() &&
              String(process.env.SQUARE_APPLICATION_ID || '').trim() &&
              String(process.env.SQUARE_LOCATION_ID || '').trim()
          ),
          square_application_id: String(process.env.SQUARE_APPLICATION_ID || '').trim(),
          square_location_id: String(process.env.SQUARE_LOCATION_ID || '').trim(),
          paypal_enabled: Boolean(
            String(process.env.PAYPAL_CLIENT_ID || '').trim() &&
              String(process.env.PAYPAL_CLIENT_SECRET || '').trim()
          ),
          paypal_client_id: String(process.env.PAYPAL_CLIENT_ID || '').trim(),
        },
        tier_quotes: tierQuotes,
      });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/billing/select-tier', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }
      const data = parseOrThrow(billingTierInput, req.body);
      if (data.tier !== 'free') {
        const error = new Error('Paid plans must be changed through checkout');
        error.status = 400;
        throw error;
      }
      await masterPrisma.$executeRaw`
        UPDATE "Account"
        SET "plan_tier" = ${data.tier}
        WHERE "id" = ${auth.account_id}
      `;
      res.json({ ok: true, plan_tier: data.tier });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/billing/checkout', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }

      const data = parseOrThrow(billingCheckoutInput, req.body);
      const currentTier = await getCurrentAccountTier(masterPrisma, auth.account_id, auth.plan_tier);
      const quote = await buildTierQuote(masterPrisma, auth.account_id, currentTier, data.tier, data.billing_cycle);
      const sessionId = randomUUID();
      const billingTermsAudit =
        data.tier !== 'free' && quote.amount_due > 0 ? assertBillingTermsAccepted(data, getClientIp(req)) : null;
      const provider =
        data.tier === 'free' || quote.amount_due <= 0
          ? 'internal'
          : data.payment_method === 'paypal'
            ? 'paypal'
            : 'square';

      if (
        data.tier !== 'free' &&
        quote.amount_due > 0 &&
        provider === 'square' &&
        !['card', 'apple_pay', 'google_pay'].includes(data.payment_method)
      ) {
        const error = new Error('Unsupported Square payment method');
        error.status = 400;
        throw error;
      }

      if (
        provider === 'square' &&
        (!String(process.env.SQUARE_ACCESS_TOKEN || '').trim() ||
          !String(process.env.SQUARE_APPLICATION_ID || '').trim() ||
          !String(process.env.SQUARE_LOCATION_ID || '').trim())
      ) {
        const error = new Error('Square card checkout is not configured');
        error.status = 400;
        throw error;
      }

      if (
        provider === 'paypal' &&
        (!String(process.env.PAYPAL_CLIENT_ID || '').trim() ||
          !String(process.env.PAYPAL_CLIENT_SECRET || '').trim())
      ) {
        const error = new Error('PayPal checkout is not configured');
        error.status = 400;
        throw error;
      }

      await masterPrisma.$executeRaw`
        INSERT INTO "BillingCheckoutSession" (
          "id",
          "account_id",
          "account_user_id",
          "from_tier",
          "target_tier",
          "billing_cycle",
          "payment_method",
          "billing_terms_version",
          "billing_terms_accepted_at",
          "billing_terms_acceptance_ip",
          "provider",
          "provider_session_id",
          "currency",
          "base_amount",
          "credit_applied",
          "amount_due",
          "payment_status",
          "status",
          "created_at",
          "updated_at"
        ) VALUES (
          ${sessionId},
          ${auth.account_id},
          ${auth.user_id},
          ${currentTier},
          ${data.tier},
          ${data.billing_cycle},
          ${data.payment_method},
          ${billingTermsAudit?.billingTermsVersion || ''},
          ${billingTermsAudit?.billingTermsAcceptedAt || null},
          ${billingTermsAudit?.billingTermsAcceptanceIp || ''},
          ${provider},
          '',
          ${quote.currency},
          ${quote.base_price},
          ${quote.credit_applied},
          ${quote.amount_due},
          ${quote.amount_due <= 0 ? 'paid' : 'unpaid'},
          ${quote.amount_due <= 0 ? 'paid' : 'pending'},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;

      if (data.tier === 'free' || quote.amount_due <= 0) {
        await markBillingSessionPaid(masterPrisma, {
          id: sessionId,
          account_id: auth.account_id,
          target_tier: data.tier,
        });
        res.json({
          provider: 'internal',
          url: buildBillingReturnUrl(req, sessionId, 'success', data.tier),
          session_id: sessionId,
          quote,
          plan_tier: data.tier,
        });
        return;
      }

      if (provider === 'square') {
        if (!data.source_id) {
          const error = new Error('Missing Square payment token');
          error.status = 400;
          throw error;
        }

        const squareModule = await import('square');
        const { SquareClient, SquareEnvironment, SquareError } = squareModule;
        const squareClient = new SquareClient({
          token: String(process.env.SQUARE_ACCESS_TOKEN || '').trim(),
          environment:
            String(process.env.SQUARE_ENVIRONMENT || 'sandbox').trim().toLowerCase() === 'production'
              ? SquareEnvironment.Production
              : SquareEnvironment.Sandbox,
        });

        try {
          const paymentResponse = await squareClient.payments.create({
            sourceId: data.source_id,
            idempotencyKey: randomUUID(),
            amountMoney: {
              amount: toMinorUnits(quote.amount_due),
              currency: String(quote.currency || 'USD'),
            },
            autocomplete: true,
            locationId: String(process.env.SQUARE_LOCATION_ID || '').trim(),
            referenceId: sessionId,
            note: `${data.tier} ${data.billing_cycle} plan upgrade`,
          });

          await masterPrisma.$executeRaw`
            UPDATE "BillingCheckoutSession"
            SET
              "provider_session_id" = ${String(paymentResponse.payment?.id || '')},
              "updated_at" = CURRENT_TIMESTAMP
            WHERE "id" = ${sessionId}
          `;

          const paymentStatus = String(paymentResponse.payment?.status || '').toUpperCase();
          if (paymentStatus !== 'COMPLETED' && paymentStatus !== 'APPROVED') {
            const error = new Error(`Square payment did not complete. Status: ${paymentStatus || 'unknown'}`);
            error.status = 400;
            throw error;
          }

          await markBillingSessionPaid(masterPrisma, {
            id: sessionId,
            account_id: auth.account_id,
            target_tier: data.tier,
          });

          res.json({
            provider: 'square',
            url: '',
            session_id: sessionId,
            quote,
            plan_tier: data.tier,
          });
          return;
        } catch (error) {
          if (error instanceof SquareError) {
            const squareMessage =
              error.body?.errors?.map((entry) => entry.detail || entry.category || entry.code).filter(Boolean).join('; ') ||
              error.message;
            const nextError = new Error(squareMessage || 'Square payment failed');
            nextError.status = Number(error.statusCode) || 400;
            throw nextError;
          }
          throw error;
        }
      }

      if (provider === 'paypal') {
        const error = new Error('Use the PayPal order flow for PayPal payments');
        error.status = 400;
        throw error;
      }
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/billing/checkout-session-status', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }

      const sessionId = String(req.query.session_id || '').trim();
      if (!sessionId) {
        const error = new Error('Missing session_id');
        error.status = 400;
        throw error;
      }

      const rows = await masterPrisma.$queryRaw`
        SELECT *
        FROM "BillingCheckoutSession"
        WHERE "id" = ${sessionId}
          AND "account_id" = ${auth.account_id}
        LIMIT 1
      `;
      const sessionRow = rows[0];
      if (!sessionRow) {
        const error = new Error('Checkout session not found');
        error.status = 404;
        throw error;
      }

      const currentTier = await getCurrentAccountTier(masterPrisma, auth.account_id, auth.plan_tier);
      res.json({
        paid: sessionRow.status === 'paid' || sessionRow.payment_status === 'paid',
        plan_tier: currentTier,
        payment_status: String(sessionRow.payment_status || 'unpaid'),
        status: String(sessionRow.status || 'pending'),
        target_tier: sessionRow.target_tier || null,
      });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/billing/paypal/create-order', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }

      const data = parseOrThrow(billingPayPalOrderInput, req.body);
      const currentTier = await getCurrentAccountTier(masterPrisma, auth.account_id, auth.plan_tier);
      const quote = await buildTierQuote(masterPrisma, auth.account_id, currentTier, data.tier, data.billing_cycle);
      const billingTermsAudit = assertBillingTermsAccepted(data, getClientIp(req));
      if (data.tier === 'free' || quote.amount_due <= 0) {
        const error = new Error('PayPal order is only needed when payment is due');
        error.status = 400;
        throw error;
      }

      const sessionId = randomUUID();
      await masterPrisma.$executeRaw`
        INSERT INTO "BillingCheckoutSession" (
          "id",
          "account_id",
          "account_user_id",
          "from_tier",
          "target_tier",
          "billing_cycle",
          "payment_method",
          "billing_terms_version",
          "billing_terms_accepted_at",
          "billing_terms_acceptance_ip",
          "provider",
          "provider_session_id",
          "currency",
          "base_amount",
          "credit_applied",
          "amount_due",
          "payment_status",
          "status",
          "created_at",
          "updated_at"
        ) VALUES (
          ${sessionId},
          ${auth.account_id},
          ${auth.user_id},
          ${currentTier},
          ${data.tier},
          ${data.billing_cycle},
          'paypal',
          ${billingTermsAudit.billingTermsVersion},
          ${billingTermsAudit.billingTermsAcceptedAt},
          ${billingTermsAudit.billingTermsAcceptanceIp},
          'paypal',
          '',
          ${quote.currency},
          ${quote.base_price},
          ${quote.credit_applied},
          ${quote.amount_due},
          'unpaid',
          'pending',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;

      const order = await createPayPalOrder({
        amount: quote.amount_due,
        currency: quote.currency,
        referenceId: sessionId,
        description: `${data.tier} ${data.billing_cycle} plan upgrade`,
      });

      await masterPrisma.$executeRaw`
        UPDATE "BillingCheckoutSession"
        SET "provider_session_id" = ${String(order.id || '')}, "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = ${sessionId}
      `;

      res.json({ order_id: String(order.id) });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/billing/paypal/capture-order', async (req, res, next) => {
    try {
      const auth = req.auth;
      if (!auth || auth.blocked) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }

      const data = parseOrThrow(billingPayPalCaptureInput, req.body);
      const rows = await masterPrisma.$queryRaw`
        SELECT *
        FROM "BillingCheckoutSession"
        WHERE "provider" = 'paypal'
          AND "provider_session_id" = ${data.order_id}
          AND "account_id" = ${auth.account_id}
        LIMIT 1
      `;
      const sessionRow = rows[0];
      if (!sessionRow) {
        const error = new Error('PayPal billing session not found');
        error.status = 404;
        throw error;
      }

      const capture = await capturePayPalOrder(data.order_id);
      const captureStatus = String(capture.status || '').toUpperCase();
      if (captureStatus !== 'COMPLETED') {
        const error = new Error(`PayPal order capture did not complete. Status: ${captureStatus || 'unknown'}`);
        error.status = 400;
        throw error;
      }

      await markBillingSessionPaid(masterPrisma, sessionRow, new Date());
      const currentTier = await getCurrentAccountTier(masterPrisma, auth.account_id, sessionRow.target_tier);
      res.json({
        paid: true,
        plan_tier: currentTier,
        status: 'paid',
      });
    } catch (e) {
      next(e);
    }
  });
}
