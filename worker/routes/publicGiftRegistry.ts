import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(body), { ...init, headers }); }

export async function handlePublicGiftRegistryRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'GET') return null;
  const match = new URL(request.url).pathname.match(/^\/api\/public\/store\/([^/]+)\/registries\/([^/]+)$/); if (!match) return null;
  let slug = ''; let shareCode = ''; try { slug = decodeURIComponent(match[1]).trim(); shareCode = decodeURIComponent(match[2]).trim(); } catch { /* invalid */ }
  if (!slug || !shareCode) return json({ error: 'Invalid gift registry link' }, { status: 400 }); const repo = createD1Repository(db);
  const registry = await repo.first<Record<string, unknown>>(`SELECT r.id, r.title, r.event_date, r.message FROM StoreGiftRegistry r JOIN Account a ON a.id = r.account_id WHERE lower(a.store_slug) = ? AND a.plan_tier = 'elite' AND r.share_code = ? AND r.active = 1 LIMIT 1`, [slug.toLowerCase(), shareCode]);
  if (!registry) return json({ error: 'Gift registry not found' }, { status: 404 });
  const products = await repo.all<Record<string, unknown>>(`SELECT p.id, p.name, p.description, p.image_data, p.product_type, p.price, p.quantity_in_stock, p.scent_family, p.fragrance_notes, p.sweetness, p.scent_strength, p.warmth, p.freshness, p.season, p.mood, p.room, p.burn_time, p.wax_type, p.wick_type, p.batch_number, p.inspiration, p.making_process, p.limited_drop, p.drop_number, p.purchase_limit, p.upcoming_release, p.release_date, p.preorders_enabled, p.member_exclusive, p.member_early_access_days, p.subscriber_exclusive, p.subscriber_early_access_days FROM StoreGiftRegistryItem i JOIN Product p ON p.account_id = i.account_id AND p.id = i.product_id WHERE i.registry_id = ?`, [registry.id]);
  return json({ title: registry.title, event_date: registry.event_date || '', message: registry.message || '', products: products.map((product) => ({ ...product, limited_drop: Boolean(product.limited_drop), upcoming_release: Boolean(product.upcoming_release), preorders_enabled: Boolean(product.preorders_enabled), member_exclusive: Boolean(product.member_exclusive), subscriber_exclusive: Boolean(product.subscriber_exclusive) })) });
}
