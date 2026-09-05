import { createD1Repository } from '../lib/d1';

export async function handlePublicCheckoutConfigRequest(request: Request, db: D1Database | undefined, config: { squareApplicationId?: string; squareLocationId?: string; squareAccessToken?: string; paypalClientId?: string; paypalClientSecret?: string }): Promise<Response | null> {
  if (!db || request.method !== 'GET') return null;
  const match = new URL(request.url).pathname.match(/^\/api\/public\/store\/([^/]+)\/checkout-config$/); if (!match) return null;
  let slug = ''; try { slug = decodeURIComponent(match[1]).trim(); } catch { /* invalid */ }
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  const account = slug && await createD1Repository(db).first<{ id: string }>("SELECT id FROM Account WHERE lower(store_slug) = ? AND plan_tier = 'elite' LIMIT 1", [slug.toLowerCase()]);
  if (!account) return new Response(JSON.stringify({ error: 'Storefront not found' }), { status: 404, headers });
  const squareEnabled = Boolean(config.squareApplicationId && config.squareLocationId && config.squareAccessToken); const paypalEnabled = Boolean(config.paypalClientId && config.paypalClientSecret);
  return new Response(JSON.stringify({ currency: 'USD', square_enabled: squareEnabled, square_application_id: squareEnabled ? config.squareApplicationId : '', square_location_id: squareEnabled ? config.squareLocationId : '', paypal_enabled: paypalEnabled, paypal_client_id: paypalEnabled ? config.paypalClientId : '' }), { headers });
}
