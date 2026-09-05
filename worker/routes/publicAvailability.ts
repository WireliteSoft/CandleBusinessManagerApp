import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function decodeSegment(value: string) {
  try { return decodeURIComponent(value).trim(); } catch { return ''; }
}

function includesProduct(raw: string, productId: string) {
  try { return Array.isArray(JSON.parse(raw)) && JSON.parse(raw).map(String).includes(productId); } catch { return false; }
}

async function readEmail(request: Request) {
  try {
    const body = await request.json() as { email?: unknown };
    const email = String(body.email || '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : '';
  } catch {
    return '';
  }
}

export async function handlePublicAvailabilityRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'POST') return null;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/public\/store\/([^/]+)\/products\/([^/]+)\/(back-in-stock-alerts|waitlist)$/);
  if (!match) return null;

  const slug = decodeSegment(match[1]);
  const productId = decodeSegment(match[2]);
  const action = match[3];
  const email = await readEmail(request);
  if (!slug || !productId || !email) return json({ error: 'Invalid request' }, { status: 400 });

  const repository = createD1Repository(db);
  const account = await repository.first<{ id: string; plan_tier: string; store_product_ids: string }>(
    'SELECT id, plan_tier, store_product_ids FROM Account WHERE lower(store_slug) = ? LIMIT 1',
    [slug.toLowerCase()],
  );
  if (!account || account.plan_tier.toLowerCase() !== 'elite') return json({ error: 'Storefront not found' }, { status: 404 });
  if (!includesProduct(account.store_product_ids, productId)) return json({ error: 'Product not found' }, { status: 404 });

  const product = await repository.first<{ id: string; quantity_in_stock: number; upcoming_release: number }>(
    'SELECT id, quantity_in_stock, upcoming_release FROM Product WHERE account_id = ? AND id = ?',
    [account.id, productId],
  );
  if (!product) return json({ error: 'Product not found' }, { status: 404 });

  if (action === 'back-in-stock-alerts') {
    if (Number(product.quantity_in_stock) > 0) return json({ error: 'This product is currently in stock.' }, { status: 409 });
    const now = new Date().toISOString();
    await repository.run(
      `INSERT INTO StoreBackInStockAlert (id, account_id, product_id, email, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(account_id, product_id, email)
       DO UPDATE SET status = 'active', notified_at = NULL, updated_at = excluded.updated_at`,
      [crypto.randomUUID(), account.id, product.id, email, now, now],
    );
    return json({ subscribed: true }, { status: 201 });
  }

  if (!product.upcoming_release) {
    return json({ error: 'This product is not currently accepting waitlist signups.' }, { status: 409 });
  }
  const now = new Date().toISOString();
  await repository.run(
    `INSERT INTO StoreWaitlistEntry (id, account_id, product_id, email, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?)
     ON CONFLICT(account_id, product_id, email)
     DO UPDATE SET status = 'active', notified_at = NULL, updated_at = excluded.updated_at`,
    [crypto.randomUUID(), account.id, product.id, email, now, now],
  );
  return json({ subscribed: true }, { status: 201 });
}
