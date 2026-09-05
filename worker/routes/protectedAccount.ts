import { resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const PROFILE_LIMITS: Record<string, number> = {
  billing_name: 120, billing_email: 320, billing_phone: 40, company_name: 120, street_address_1: 200,
  street_address_2: 200, city: 120, state_region: 120, postal_code: 30, country: 120, paypal_email: 320, payment_profile_note: 500,
};
const PAYMENT_METHODS = new Set(['card', 'apple_pay', 'google_pay', 'paypal', 'manual']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function billingProfile(repository: ReturnType<typeof createD1Repository>, accountId: string, email: string) {
  let profile = await repository.first<Record<string, unknown>>('SELECT * FROM AccountBillingProfile WHERE account_id = ?', [accountId]);
  if (!profile) {
    const account = await repository.first<{ name: string }>('SELECT name FROM Account WHERE id = ?', [accountId]);
    const now = new Date().toISOString();
    await repository.run(
      'INSERT INTO AccountBillingProfile (account_id, billing_name, billing_email, preferred_payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [accountId, String(account?.name || '').trim(), email, 'card', now, now],
    );
    profile = await repository.first<Record<string, unknown>>('SELECT * FROM AccountBillingProfile WHERE account_id = ?', [accountId]);
  }
  return profile;
}

async function readProfile(request: Request) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const body = input as Record<string, unknown>;
    const output: Record<string, string> = {};
    for (const [field, maximum] of Object.entries(PROFILE_LIMITS)) {
      const value = String(body[field] ?? '').trim();
      if (value.length > maximum || ((field === 'billing_email' || field === 'paypal_email') && value && !EMAIL_PATTERN.test(value))) return null;
      output[field] = value;
    }
    const paymentMethod = String(body.preferred_payment_method ?? 'card');
    if (!PAYMENT_METHODS.has(paymentMethod)) return null;
    output.preferred_payment_method = paymentMethod;
    return output;
  } catch { return null; }
}

function count(row: Record<string, unknown> | null, key: string) {
  return Number(row?.[key] || 0);
}

export async function handleProtectedAccountRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  if (!['/api/account/billing-profile', '/api/account/purchase-history', '/api/account/usage-summary'].includes(pathname)) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  const repository = createD1Repository(db);

  if (pathname === '/api/account/billing-profile' && request.method === 'GET') {
    return json(await billingProfile(repository, auth.accountId, auth.email));
  }
  if (pathname === '/api/account/billing-profile' && request.method === 'PUT') {
    const profile = await readProfile(request);
    if (!profile) return json({ error: 'Invalid billing profile data' }, { status: 400 });
    const now = new Date().toISOString();
    await repository.run(
      `INSERT INTO AccountBillingProfile (account_id, ${Object.keys(profile).map((key) => `"${key}"`).join(', ')}, created_at, updated_at)
       VALUES (?, ${Object.keys(profile).map(() => '?').join(', ')}, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET ${Object.keys(profile).map((key) => `"${key}" = excluded."${key}"`).join(', ')}, updated_at = excluded.updated_at`,
      [auth.accountId, ...Object.values(profile), now, now],
    );
    return json(await billingProfile(repository, auth.accountId, auth.email));
  }
  if (pathname === '/api/account/purchase-history' && request.method === 'GET') {
    return json(await repository.all<Record<string, unknown>>(
      `SELECT id, from_tier, target_tier, billing_cycle, payment_method, provider, currency, base_amount, credit_applied,
       amount_due, payment_status, status, paid_at, created_at, updated_at FROM BillingCheckoutSession
       WHERE account_id = ? ORDER BY COALESCE(paid_at, created_at) DESC, created_at DESC LIMIT 100`, [auth.accountId],
    ));
  }
  if (pathname === '/api/account/usage-summary' && request.method === 'GET') {
    const [account, products, supplies, recipes, batches, sales, employees, wax, saleTotals, users, checkouts, paidCheckouts, contacts, latestPaid] = await Promise.all([
      repository.first<{ name: string; plan_tier: string; created_at: string }>('SELECT name, plan_tier, created_at FROM Account WHERE id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM Product WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM Supply WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM CandleRecipe WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM BatchLog WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM Sale WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM Employee WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM WaxInventory WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COALESCE(SUM(total_amount), 0) AS gross_sales, COALESCE(SUM(quantity), 0) AS units_sold FROM Sale WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total_users, COALESCE(SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END), 0) AS active_users FROM AccountUser WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM BillingCheckoutSession WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>("SELECT COUNT(*) AS total FROM BillingCheckoutSession WHERE account_id = ? AND status = 'paid' AND payment_status = 'paid'", [auth.accountId]),
      repository.first<Record<string, unknown>>('SELECT COUNT(*) AS total FROM StoreContactMessage WHERE account_id = ?', [auth.accountId]),
      repository.first<Record<string, unknown>>("SELECT paid_at, created_at, amount_due FROM BillingCheckoutSession WHERE account_id = ? AND status = 'paid' AND payment_status = 'paid' ORDER BY COALESCE(paid_at, created_at) DESC LIMIT 1", [auth.accountId]),
    ]);
    return json({
      account_name: String(account?.name || ''), plan_tier: String(account?.plan_tier || 'free'), role: auth.role,
      account_created_at: account?.created_at || null, last_paid_at: latestPaid?.paid_at || latestPaid?.created_at || null,
      totals: { products: count(products, 'total'), supplies: count(supplies, 'total'), recipes: count(recipes, 'total'), batch_logs: count(batches, 'total'), sales: count(sales, 'total'), employees: count(employees, 'total'), wax_inventory_entries: count(wax, 'total'), team_users: count(users, 'total_users'), active_team_users: count(users, 'active_users'), contact_messages: count(contacts, 'total'), checkout_sessions: count(checkouts, 'total'), paid_orders: count(paidCheckouts, 'total'), units_sold: count(saleTotals, 'units_sold') },
      financials: { gross_sales: Math.round(count(saleTotals, 'gross_sales') * 100) / 100, last_paid_amount: Math.round(count(latestPaid, 'amount_due') * 100) / 100 },
    });
  }
  return null;
}
