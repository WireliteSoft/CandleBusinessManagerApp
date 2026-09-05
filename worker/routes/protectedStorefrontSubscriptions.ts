import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const PLAN_TYPES = new Set(['one_candle', 'two_candle', 'discovery', 'seasonal', 'candle_of_month']);
const FULFILLMENT_STATUSES = new Set(['pending', 'in_production', 'ready', 'shipped', 'cancelled']);

function json(body: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(body), { ...init, headers }); }
async function readObject(request: Request) { try { const value = await request.json(); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; } }
function amount(value: unknown, maximum: number) { const result = Number(value); return Number.isFinite(result) && result >= 0 && result <= maximum ? result : null; }

export async function handleProtectedStorefrontSubscriptionsRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const planMatch = pathname.match(/^\/api\/storefront\/subscriptions\/plans(?:\/([^/]+))?$/);
  const fulfillmentMatch = pathname.match(/^\/api\/storefront\/subscriptions\/fulfillment(?:\/([^/]+))?$/);
  if (!planMatch && !fulfillmentMatch) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  if (planMatch) {
    const id = planMatch[1] ? decodeURIComponent(planMatch[1]).trim() : '';
    if (!id && request.method === 'GET') {
      const rows = await repository.all<Record<string, unknown>>('SELECT * FROM StoreSubscriptionPlan WHERE account_id = ? ORDER BY created_at DESC', [auth.accountId]);
      return json(rows.map((row) => ({ ...row, active: Boolean(row.active) })));
    }
    if (!id && request.method === 'POST') {
      const body = await readObject(request);
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const planType = String(body?.plan_type ?? '');
      const description = typeof body?.description === 'string' ? body.description.trim() : '';
      const candleCount = Number(body?.candle_count);
      const monthlyPrice = amount(body?.monthly_price, 10_000); const quarterlyPrice = amount(body?.quarterly_price, 30_000);
      const monthlyDay = body?.monthly_delivery_day === undefined ? 1 : Number(body.monthly_delivery_day);
      const quarterlyMonth = body?.quarterly_start_month === undefined ? 1 : Number(body.quarterly_start_month);
      if (!body || name.length < 2 || name.length > 120 || !PLAN_TYPES.has(planType) || description.length > 1_000 || !Number.isInteger(candleCount) || candleCount < 1 || candleCount > 24 || monthlyPrice === null || quarterlyPrice === null || !Number.isInteger(monthlyDay) || monthlyDay < 1 || monthlyDay > 28 || !Number.isInteger(quarterlyMonth) || quarterlyMonth < 1 || quarterlyMonth > 12 || typeof body.active !== 'boolean') return json({ error: 'Invalid subscription plan' }, { status: 400 });
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await repository.run(`INSERT INTO StoreSubscriptionPlan (id, account_id, name, plan_type, description, candle_count, monthly_price, quarterly_price, monthly_delivery_day, quarterly_start_month, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, auth.accountId, name, planType, description, candleCount, monthlyPrice, quarterlyPrice, monthlyDay, quarterlyMonth, body.active ? 1 : 0, now, now]);
      const created = await repository.first<Record<string, unknown>>('SELECT * FROM StoreSubscriptionPlan WHERE account_id = ? AND id = ?', [auth.accountId, id]);
      return json({ ...created, active: Boolean(created?.active) }, { status: 201 });
    }
    if (id && request.method === 'PATCH') {
      const body = await readObject(request); if (!body || typeof body.active !== 'boolean') return json({ error: 'Invalid subscription plan status' }, { status: 400 });
      const result = await repository.run('UPDATE StoreSubscriptionPlan SET active = ?, updated_at = ? WHERE account_id = ? AND id = ?', [body.active ? 1 : 0, new Date().toISOString(), auth.accountId, id]);
      return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Subscription plan not found' }, { status: 404 });
    }
    return null;
  }
  const id = fulfillmentMatch?.[1] ? decodeURIComponent(fulfillmentMatch[1]).trim() : '';
  if (!id && request.method === 'GET') return json(await repository.all<Record<string, unknown>>(`SELECT f.*, s.status AS subscription_status, p.name AS plan_name, c.name AS customer_name, c.email AS customer_email FROM StoreSubscriptionFulfillment f JOIN StoreCustomerSubscription s ON s.account_id = f.account_id AND s.id = f.subscription_id JOIN StoreSubscriptionPlan p ON p.account_id = s.account_id AND p.id = s.plan_id JOIN StoreCustomer c ON c.account_id = s.account_id AND c.id = s.customer_id WHERE f.account_id = ? ORDER BY f.shipment_due_at ASC`, [auth.accountId]));
  if (id && request.method === 'PATCH') {
    const body = await readObject(request); const status = String(body?.status ?? ''); const note = typeof body?.staff_note === 'string' ? body.staff_note.trim() : '';
    if (!FULFILLMENT_STATUSES.has(status) || note.length > 2_000) return json({ error: 'Invalid subscription fulfillment update' }, { status: 400 });
    const result = await repository.run('UPDATE StoreSubscriptionFulfillment SET status = ?, staff_note = ?, updated_at = ? WHERE account_id = ? AND id = ?', [status, note, new Date().toISOString(), auth.accountId, id]);
    return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Subscription fulfillment record not found' }, { status: 404 });
  }
  return null;
}
