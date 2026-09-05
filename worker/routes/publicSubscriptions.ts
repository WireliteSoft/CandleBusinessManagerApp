import { createD1Repository } from '../lib/d1';
function json(body: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(body), { ...init, headers }); }
export async function handlePublicSubscriptionsRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'GET') return null;
  const match = new URL(request.url).pathname.match(/^\/api\/public\/store\/([^/]+)\/subscription-plans$/); if (!match) return null;
  let slug = ''; try { slug = decodeURIComponent(match[1]).trim(); } catch { /* invalid route input */ }
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  const repository = createD1Repository(db); const store = await repository.first<{ id: string; plan_tier: string }>('SELECT id, plan_tier FROM Account WHERE lower(store_slug) = ? LIMIT 1', [slug.toLowerCase()]);
  if (!store || store.plan_tier.toLowerCase() !== 'elite') return json({ error: 'Storefront not found' }, { status: 404 });
  return json(await repository.all<Record<string, unknown>>('SELECT id, name, plan_type, description, candle_count, monthly_price, quarterly_price, monthly_delivery_day, quarterly_start_month FROM StoreSubscriptionPlan WHERE account_id = ? AND active = 1 ORDER BY created_at DESC', [store.id]));
}
